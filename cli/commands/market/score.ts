/**
 * `oma market score` — score SourceItems using engagement, freshness,
 * source quality, relevance, and intent-blend weights.
 *
 * Architecture:
 *   runScore (CLI entrypoint) → scoreItems (business logic)
 *     → computeEngagement, computeFreshness, computeSourceQuality
 *     → intentBlend → Candidate[]
 */

import { z } from "zod";
import {
  type Candidate,
  type SourceItem,
  SourceItemSchema,
} from "./shared/schema.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScoreOptions {
  intent: "pain" | "trend" | "competitor" | "discovery";
  freshnessMode?: "balanced_recent" | "strict_recent" | "evergreen_ok";
  nowMs?: number;
}

/**
 * Validate stdin items at the stage boundary with the shared schema —
 * unknown sources or malformed fields are rejected here instead of being
 * silently scored with defaults. Throws with the first offending path.
 */
export function validateScoreItems(inputItems: unknown[]): SourceItem[] {
  const parsed = z.array(SourceItemSchema).safeParse(inputItems);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") || "(root)";
    throw new Error(`schema mismatch at items.${path}: ${first?.message}`);
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Module-top constants
// ---------------------------------------------------------------------------

/** Per-source engagement field weights. Keys match SourceItem.engagement record. */
const ENGAGEMENT_WEIGHTS: Record<string, Record<string, number>> = {
  x: { likes: 0.55, reposts: 0.25, replies: 0.15, quotes: 0.05 },
  instagram: { views: 0.5, likes: 0.3, comments: 0.2 },
  hn: { points: 0.55, num_comments: 0.45 },
  bluesky: { like_count: 0.45, repost_count: 0.35, reply_count: 0.2 },
  truthsocial: { likes: 0.45, reposts: 0.3, replies: 0.25 },
  polymarket: { volume: 0.6, liquidity: 0.4 },
  mastodon: {
    favourites_count: 0.4,
    reblogs_count: 0.3,
    replies_count: 0.3,
  },
  github: { reactions: 0.5, comments: 0.5 },
  youtube: { views: 0.4, likes: 0.3, comments: 0.3 },
  tiktok: { plays: 0.5, likes: 0.3, comments: 0.2 },
  clien: { view_count: 0.4, comment_count: 0.6 },
  okky: { view_count: 0.4, comment_count: 0.6 },
  reddit: {
    score: 0.5,
    num_comments: 0.35,
    upvote_ratio: 0.05, // multiplied by 10 before log1p — handled in logic
    top_comment_score: 0.1,
  },
};

/** Source quality baseline (0-1). Default 0.6 for unknown. */
const SOURCE_QUALITY: Record<string, number> = {
  xiaohongshu: 0.7,
  hackernews: 0.8,
  hn: 0.8,
  youtube: 0.85,
  digg: 0.85,
  reddit: 0.6,
  x: 0.68,
  bluesky: 0.66,
  truthsocial: 0.6,
  polymarket: 0.5,
  instagram: 0.58,
  tiktok: 0.58,
  mastodon: 0.62,
  github: 0.7,
  grounding: 0.9,
  perplexity: 0.85,
  clien: 0.65,
  okky: 0.7,
};

const DEFAULT_SOURCE_QUALITY = 0.6;

/** Intent blend weights: { engagement, freshness, source_quality, relevance } */
interface IntentWeight {
  engagement: number;
  freshness: number;
  source_quality: number;
  relevance: number;
}

const INTENT_WEIGHTS = {
  pain: {
    engagement: 0.4,
    freshness: 0.3,
    source_quality: 0.3,
    relevance: 0.0,
  },
  trend: {
    engagement: 0.3,
    freshness: 0.5,
    source_quality: 0.2,
    relevance: 0.0,
  },
  competitor: {
    engagement: 0.35,
    freshness: 0.0,
    source_quality: 0.3,
    relevance: 0.35,
  },
  discovery: {
    engagement: 0.3,
    freshness: 0.0,
    source_quality: 0.25,
    relevance: 0.45,
  },
} satisfies Record<string, IntentWeight>;

// ---------------------------------------------------------------------------
// Pure scoring helpers
// ---------------------------------------------------------------------------

/**
 * Compute raw engagement weighted sum using log1p per metric.
 * Returns 0 if all metrics are missing/zero.
 * Reddit's upvote_ratio is scaled by 10 before log1p.
 */
function computeEngagement(item: SourceItem): number {
  const weights = ENGAGEMENT_WEIGHTS[item.source];
  if (!weights) return 0;

  const eng = item.engagement ?? {};
  let sum = 0;
  let anyNonZero = false;

  for (const [field, weight] of Object.entries(weights)) {
    let raw = typeof eng[field] === "number" ? eng[field] : 0;
    // Special case: reddit upvote_ratio scaled by 10
    if (item.source === "reddit" && field === "upvote_ratio") {
      raw = raw * 10;
    }
    if (raw !== 0) anyNonZero = true;
    sum += Math.log1p(Math.max(0, raw)) * weight;
  }

  return anyNonZero ? sum : 0;
}

/**
 * Normalize engagement to [0, 1] by dividing by 30.
 * Clamp to [0, 1].
 */
function normalizeEngagement(raw: number): number {
  return Math.min(1, Math.max(0, raw / 30));
}

/**
 * Compute freshness score 0-100, then normalize to [0,1].
 */
function computeFreshness(
  publishedAt: string,
  nowMs: number,
  mode: "balanced_recent" | "strict_recent" | "evergreen_ok",
): number {
  let parsed: number;
  try {
    parsed = new Date(publishedAt).getTime();
    if (Number.isNaN(parsed)) return 0;
  } catch {
    return 0;
  }

  const days = (nowMs - parsed) / 86_400_000;
  const base = Math.max(0, 100 - days * 3);

  let score: number;
  switch (mode) {
    case "strict_recent":
      score = base;
      break;
    case "evergreen_ok":
      score = base * 0.6 + 40;
      break;
    default:
      score = base * 0.8 + 10;
      break;
  }

  // Normalize to [0, 1]
  return Math.min(1, Math.max(0, score / 100));
}

/**
 * Get source quality baseline for the given source name.
 */
function computeSourceQuality(source: string): number {
  return SOURCE_QUALITY[source] ?? DEFAULT_SOURCE_QUALITY;
}

/**
 * Get relevance from item.metadata.relevance if present (number 0-1); else 0.5.
 */
function computeRelevance(item: SourceItem): number {
  const meta = item.metadata as Record<string, unknown>;
  if (typeof meta?.relevance === "number") {
    return Math.min(1, Math.max(0, meta.relevance));
  }
  return 0.5;
}

/**
 * Compute intent-blended final score in [0, 1].
 */
function intentBlend(
  intent: ScoreOptions["intent"],
  engagement: number,
  freshness: number,
  sourceQuality: number,
  relevance: number,
): number {
  const w: IntentWeight =
    (INTENT_WEIGHTS as Record<string, IntentWeight>)[intent] ??
    INTENT_WEIGHTS.pain;
  const score =
    engagement * w.engagement +
    freshness * w.freshness +
    sourceQuality * w.source_quality +
    relevance * w.relevance;
  return Math.min(1, Math.max(0, score));
}

// ---------------------------------------------------------------------------
// Public: scoreItems
// ---------------------------------------------------------------------------

export function scoreItems(
  items: SourceItem[],
  opts: ScoreOptions,
): Candidate[] {
  const nowMs = opts.nowMs ?? Date.now();
  const freshnessMode = opts.freshnessMode ?? "balanced_recent";

  return items.map((item): Candidate => {
    const rawEngagement = computeEngagement(item);
    const engagement = normalizeEngagement(rawEngagement);
    const freshness = computeFreshness(item.published_at, nowMs, freshnessMode);
    const source_quality = computeSourceQuality(item.source);
    const relevance = computeRelevance(item);
    const final = intentBlend(
      opts.intent,
      engagement,
      freshness,
      source_quality,
      relevance,
    );

    return {
      ...item,
      scores: {
        relevance,
        freshness,
        engagement,
        source_quality,
        final,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Public: runScore (CLI entrypoint)
// ---------------------------------------------------------------------------

/**
 * Reads stdin until EOF, parses JSON, scores items, writes to stdout.
 *
 * Supported argv:
 *   --intent <pain|trend|competitor|discovery>  (required)
 *   --freshness-mode <balanced_recent|strict_recent|evergreen_ok>  (optional)
 *   --now-ms <number>  (test hook)
 *
 * Accepts stdin shapes:
 *   { items: SourceItem[] }
 *   SourceItem[]
 *   { items: SourceItem[], topic?: string, ... }  (other fields passed through)
 *
 * Writes { ...input, items: Candidate[] } to stdout.
 * Exits 0 on success, 4 on invalid input.
 */
export async function runScore(argv: string[]): Promise<number> {
  // Parse argv
  let intent: ScoreOptions["intent"] | undefined;
  let freshnessMode: ScoreOptions["freshnessMode"];
  let nowMs: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--intent" && i + 1 < argv.length) {
      const val = argv[++i];
      if (
        val === "pain" ||
        val === "trend" ||
        val === "competitor" ||
        val === "discovery"
      ) {
        intent = val;
      } else {
        process.stderr.write(
          `[score] error: --intent must be one of pain, trend, competitor, discovery\n`,
        );
        return 4;
      }
    } else if (arg === "--freshness-mode" && i + 1 < argv.length) {
      const val = argv[++i];
      if (
        val === "balanced_recent" ||
        val === "strict_recent" ||
        val === "evergreen_ok"
      ) {
        freshnessMode = val;
      } else {
        process.stderr.write(
          `[score] error: --freshness-mode must be one of balanced_recent, strict_recent, evergreen_ok\n`,
        );
        return 4;
      }
    } else if (arg === "--now-ms" && i + 1 < argv.length) {
      const val = Number(argv[++i]);
      if (Number.isNaN(val)) {
        process.stderr.write(`[score] error: --now-ms must be a number\n`);
        return 4;
      }
      nowMs = val;
    }
  }

  if (!intent) {
    process.stderr.write(
      `[score] error: --intent is required (pain|trend|competitor|discovery)\n`,
    );
    return 4;
  }

  // Read stdin until EOF
  let raw = "";
  try {
    raw = await readAllStdin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[score] error reading stdin: ${msg}\n`);
    return 4;
  }

  if (!raw.trim()) {
    process.stderr.write(`[score] error: stdin is empty\n`);
    return 4;
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[score] error: invalid JSON on stdin: ${msg}\n`);
    return 4;
  }

  // Normalize to { items, ...rest }
  let inputItems: unknown[];
  const passthrough: Record<string, unknown> = {};

  if (Array.isArray(parsed)) {
    inputItems = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === "object" &&
    "items" in parsed &&
    Array.isArray((parsed as Record<string, unknown>).items)
  ) {
    const obj = parsed as Record<string, unknown>;
    inputItems = obj.items as unknown[];
    // Pass through all other fields except items
    for (const [k, v] of Object.entries(obj)) {
      if (k !== "items") passthrough[k] = v;
    }
  } else {
    process.stderr.write(
      `[score] error: stdin must be SourceItem[] or { items: SourceItem[] }\n`,
    );
    return 4;
  }

  let items: SourceItem[];
  try {
    items = validateScoreItems(inputItems);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[score] error: ${msg}\n`);
    return 4;
  }

  // Score
  const opts: ScoreOptions = { intent, freshnessMode, nowMs };
  const candidates = scoreItems(items, opts);

  // Write output — preserve passthrough fields
  const output = { ...passthrough, items: candidates };
  process.stdout.write(JSON.stringify(output));

  return 0;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readAllStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8")),
    );
    process.stdin.on("error", reject);
  });
}
