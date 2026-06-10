/**
 * `oma market fuse` — URL canonicalization → weighted RRF → per-author cap →
 * diversity guard (no-op v1) → sort.
 *
 * Architecture:
 *   runFuse (CLI entrypoint) → fuseCandidates (pure business logic)
 */

import { z } from "zod";
import type { Candidate } from "./shared/schema.js";
import { CandidateSchema, parseStageInput } from "./shared/schema.js";

// ---------------------------------------------------------------------------
// Module-level constants
// ---------------------------------------------------------------------------

const RRF_K = 60;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FuseOptions {
  rrfK?: number;
  maxPerAuthor?: number;
  diversityRelevanceThreshold?: number;
}

// ---------------------------------------------------------------------------
// URL canonicalization
// ---------------------------------------------------------------------------

/**
 * Canonicalize a URL for deduplication:
 * - Lowercase host, strip www./old./m. prefixes
 * - Remove utm_* query params
 * - Trim trailing slash from path
 * - Drop URL fragment
 * - On parse failure, return original lowercased
 */
export function canonicalUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url.toLowerCase();
  }

  // Lowercase host and strip common prefixes
  let host = parsed.hostname.toLowerCase();
  for (const prefix of ["www.", "old.", "m."]) {
    if (host.startsWith(prefix)) {
      host = host.slice(prefix.length);
      break;
    }
  }

  // Remove utm_* query params
  const params = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!key.startsWith("utm_")) {
      params.set(key, value);
    }
  }

  // Build canonical path — trim trailing slash (but keep root "/" as "")
  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  const paramStr = params.toString();
  const query = paramStr ? `?${paramStr}` : "";
  // Fragment intentionally omitted
  return `${parsed.protocol}//${host}${path}${query}`;
}

// ---------------------------------------------------------------------------
// RRF helpers
// ---------------------------------------------------------------------------

/**
 * Returns a sum of engagement metric values for a candidate.
 * Used to pick the "best" representative when merging duplicates.
 */
function totalEngagement(candidate: Candidate): number {
  return Object.values(candidate.engagement ?? {}).reduce(
    (acc, v) => acc + v,
    0,
  );
}

// ---------------------------------------------------------------------------
// Core fuse logic (pure function)
// ---------------------------------------------------------------------------

export function fuseCandidates(
  items: Candidate[],
  opts?: FuseOptions,
): Candidate[] {
  const rrfK = opts?.rrfK ?? RRF_K;
  const maxPerAuthor = opts?.maxPerAuthor ?? 3;
  // Only defined when explicitly provided — no default applied.
  const diversityRelevanceThreshold = opts?.diversityRelevanceThreshold;

  if (items.length === 0) return [];

  // -------------------------------------------------------------------------
  // Step 1: URL canonicalization — build canonical key for each item
  // -------------------------------------------------------------------------

  const withCanon = items.map((item) => ({
    item,
    canon: canonicalUrl(item.url),
  }));

  // -------------------------------------------------------------------------
  // Step 2: Build per-source ranked lists (sorted by scores.final desc)
  // -------------------------------------------------------------------------

  // Group by source
  const bySource = new Map<string, Array<{ item: Candidate; canon: string }>>();
  for (const entry of withCanon) {
    const src = entry.item.source;
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)?.push(entry);
  }

  // Sort each source list by scores.final descending (null scores go last)
  for (const [, list] of bySource) {
    list.sort(
      (a, b) => (b.item.scores?.final ?? 0) - (a.item.scores?.final ?? 0),
    );
  }

  // -------------------------------------------------------------------------
  // Step 3: RRF scoring + deduplication by canonical URL
  // -------------------------------------------------------------------------

  // Map: canonUrl → accumulated rrf score + best representative candidate
  const merged = new Map<
    string,
    { rrfScore: number; best: Candidate; engScore: number }
  >();

  for (const [, list] of bySource) {
    for (let rank = 0; rank < list.length; rank++) {
      const entry = list[rank];
      if (!entry) continue;
      const contribution = 1 / (rrfK + rank + 1); // 1-based rank

      const existing = merged.get(entry.canon);
      const eng = totalEngagement(entry.item);

      if (!existing) {
        merged.set(entry.canon, {
          rrfScore: contribution,
          best: entry.item,
          engScore: eng,
        });
      } else {
        // Aggregate RRF contributions across sources for same canonical URL
        existing.rrfScore += contribution;
        // Keep highest-engagement representative
        if (eng > existing.engScore) {
          existing.best = entry.item;
          existing.engScore = eng;
        }
      }
    }
  }

  // Build deduplicated candidate list with rrf_score populated
  const deduped: Candidate[] = [];
  for (const [, entry] of merged) {
    deduped.push({
      ...entry.best,
      rrf_score: entry.rrfScore,
    });
  }

  // -------------------------------------------------------------------------
  // Step 4: Per-author cap
  // -------------------------------------------------------------------------

  // Group by lowercase trimmed author (null/empty treated as single bucket)
  const byAuthor = new Map<string, Candidate[]>();
  for (const candidate of deduped) {
    const authorKey = (candidate.author ?? "").toLowerCase().trim();
    if (!byAuthor.has(authorKey)) byAuthor.set(authorKey, []);
    byAuthor.get(authorKey)?.push(candidate);
  }

  const capped: Candidate[] = [];
  for (const [, group] of byAuthor) {
    // Sort by rrf_score desc within author group, keep top-N
    group.sort((a, b) => (b.rrf_score ?? 0) - (a.rrf_score ?? 0));
    capped.push(...group.slice(0, maxPerAuthor));
  }

  // -------------------------------------------------------------------------
  // Step 5: Diversity guard — filter candidates below the relevance threshold.
  // Only applied when the option is explicitly provided; absent = no-op so
  // output remains byte-identical to prior behaviour.
  // -------------------------------------------------------------------------

  const guarded =
    diversityRelevanceThreshold !== undefined
      ? capped.filter((c) => (c.rrf_score ?? 0) >= diversityRelevanceThreshold)
      : capped;

  // -------------------------------------------------------------------------
  // Step 6: Sort — (-rrf_score, -scores.final, -scores.freshness, source, title)
  // -------------------------------------------------------------------------

  guarded.sort((a, b) => {
    const rrfDiff = (b.rrf_score ?? 0) - (a.rrf_score ?? 0);
    if (rrfDiff !== 0) return rrfDiff;

    const finalDiff = (b.scores?.final ?? 0) - (a.scores?.final ?? 0);
    if (finalDiff !== 0) return finalDiff;

    const freshDiff = (b.scores?.freshness ?? 0) - (a.scores?.freshness ?? 0);
    if (freshDiff !== 0) return freshDiff;

    const srcCmp = a.source.localeCompare(b.source);
    if (srcCmp !== 0) return srcCmp;

    return (a.title ?? "").localeCompare(b.title ?? "");
  });

  return guarded;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const FuseInputSchema = z.union([
  z.object({ items: z.array(CandidateSchema) }).passthrough(),
  z.array(CandidateSchema),
]);

export async function runFuse(argv: string[]): Promise<number> {
  // Parse optional flags
  let rrfKVal: string | undefined;
  let maxPerAuthorVal: string | undefined;
  let diversityThresholdVal: string | undefined;

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--rrf-k" && argv[i + 1]) {
      rrfKVal = argv[++i];
    } else if (arg === "--max-per-author" && argv[i + 1]) {
      maxPerAuthorVal = argv[++i];
    } else if (arg === "--diversity-threshold" && argv[i + 1]) {
      diversityThresholdVal = argv[++i];
    }
    i++;
  }

  // Read stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  if (!raw) {
    process.stderr.write("[fuse] error: empty stdin\n");
    return 4;
  }

  // Parse input
  let parsed: z.infer<typeof FuseInputSchema>;
  try {
    parsed = parseStageInput(FuseInputSchema, raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[fuse] error: ${msg}\n`);
    return 4;
  }

  // Extract items and envelope
  let items: Candidate[];
  let envelope: Record<string, unknown> = {};

  if (Array.isArray(parsed)) {
    items = parsed;
  } else {
    const { items: parsedItems, ...rest } = parsed;
    items = parsedItems;
    envelope = rest as Record<string, unknown>;
  }

  // Build options
  const opts: FuseOptions = {};

  if (rrfKVal !== undefined) {
    const k = Number.parseInt(rrfKVal, 10);
    if (Number.isNaN(k) || k <= 0) {
      process.stderr.write(
        `[fuse] error: --rrf-k must be a positive integer, got "${rrfKVal}"\n`,
      );
      return 4;
    }
    opts.rrfK = k;
  }

  if (maxPerAuthorVal !== undefined) {
    const n = Number.parseInt(maxPerAuthorVal, 10);
    if (Number.isNaN(n) || n <= 0) {
      process.stderr.write(
        `[fuse] error: --max-per-author must be a positive integer, got "${maxPerAuthorVal}"\n`,
      );
      return 4;
    }
    opts.maxPerAuthor = n;
  }

  if (diversityThresholdVal !== undefined) {
    const t = Number.parseFloat(diversityThresholdVal);
    if (Number.isNaN(t) || t < 0 || t > 1) {
      process.stderr.write(
        `[fuse] error: --diversity-threshold must be between 0 and 1, got "${diversityThresholdVal}"\n`,
      );
      return 4;
    }
    opts.diversityRelevanceThreshold = t;
  }

  // Run fuse
  const fused = fuseCandidates(items, opts);

  // Write output — preserve envelope fields, replace items
  const output = { ...envelope, items: fused };
  process.stdout.write(JSON.stringify(output));

  return 0;
}
