/**
 * `oma market cluster` — entity-based greedy clustering with MMR representative selection.
 *
 * Architecture:
 *   runCluster (CLI entrypoint) → clusterCandidates (business logic)
 *     → extractEntities → overlapCoefficient → greedyCluster → mmrRepresentatives
 *     → ClusterOutput
 */

import { z } from "zod";
import { shortHash } from "../../utils/hash.js";
import type { Candidate, Cluster, ClusterOutput } from "./shared/schema.js";
import {
  CandidateSchema,
  IntentSchema,
  parseStageInput,
} from "./shared/schema.js";

// ---------------------------------------------------------------------------
// Module-scope constants
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "for",
  "how",
  "is",
  "in",
  "of",
  "on",
  "and",
  "with",
  "from",
  "by",
  "at",
  "this",
  "that",
  "it",
  "what",
  "are",
  "do",
  "can",
  "his",
  "her",
  "he",
  "she",
  "its",
  "was",
  "has",
  "new",
  "just",
  "says",
  "said",
  "will",
  "about",
  "after",
  "now",
  "all",
  "been",
  "here",
  "not",
  "out",
  "up",
  "more",
  "also",
  "but",
  "who",
  "year",
  "first",
  "make",
  "being",
  "making",
  "over",
  "into",
  "than",
  "they",
  "their",
  "would",
  "could",
  "get",
  "got",
  "some",
  "like",
  "back",
  "going",
  "breaking",
  "https",
  "http",
  "www",
  "com",
]);

const OVERLAP_THRESHOLD = 0.4;
const MMR_LAMBDA = 0.75;
const MAX_REPRESENTATIVES = 3;
const MAX_SIGNATURE_TERMS = 8;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ClusterOptions {
  overlapThreshold?: number;
  maxRepresentatives?: number;
  diversityLambda?: number;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Korean stopwords (조사, 어미, 매우 흔한 동사어간 등). Filters tokens
 * after Hangul-aware splitting.
 */
const STOPWORDS_KO = new Set([
  "그리고",
  "그러나",
  "하지만",
  "이게",
  "그게",
  "저게",
  "이건",
  "그건",
  "저건",
  "있다",
  "없다",
  "이다",
  "하다",
  "되다",
  "같다",
  "오늘",
  "어제",
  "내일",
  "정말",
  "진짜",
  "그냥",
  "이런",
  "저런",
  "그런",
  "어떤",
  "무슨",
  "관련",
  "그것",
  "이것",
  "저것",
]);

/**
 * Extract Hangul syllable n-grams. Korean has no inter-word spaces in
 * many compounds (`카페24`, `쇼핑몰`, `워드프레스`). Use bigrams + trigrams
 * over Hangul runs so that overlapping topics ("카페24 호스팅" vs
 * "카페24 셀러 수수료") share at least the "카페24" trigram.
 */
function extractHangulNgrams(text: string): string[] {
  const ngrams: string[] = [];
  // Capture sequences of Hangul syllables (possibly with digits/letters mixed)
  const runs = text.match(/[가-힣]+[\w]*|[\w]*[가-힣]+/g) ?? [];
  for (const run of runs) {
    // Pure Hangul → bigrams/trigrams
    if (run.length >= 2) {
      // The whole run is also a candidate (helps for short compounds like 쇼핑몰)
      if (run.length <= 8) ngrams.push(run);
      // Trigrams for finer matching
      for (let i = 0; i + 3 <= run.length && i < 10; i++) {
        ngrams.push(run.slice(i, i + 3));
      }
    }
  }
  return ngrams;
}

/**
 * Extract meaningful entities from text. Mixed-script aware (Latin/digit
 * tokens via whitespace split + filter; Korean via Hangul n-gram extraction).
 * Returns a lowercase set of tokens that pass the keep criteria.
 */
export function extractEntities(text: string): Set<string> {
  const result = new Set<string>();

  // --- Latin / digit tokens (whitespace-separated) ---
  // Replace non-word chars (excluding Hangul) with spaces; Hangul runs are
  // handled separately below so we don't lose them via `[^\w]` (which in JS
  // regex `\w` does NOT include Hangul).
  const cleanedLatin = text.replace(/[^\w가-힣\s]/g, " ");
  for (const word of cleanedLatin.split(/\s+/)) {
    if (!word) continue;
    // Pure-Hangul tokens are handled by the n-gram path below; skip here.
    if (/^[가-힣]+$/.test(word)) continue;

    const lower = word.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    if (word.length <= 2) continue;

    const firstChar = word[0];
    const firstUpper =
      firstChar !== undefined &&
      firstChar === firstChar.toUpperCase() &&
      firstChar !== firstChar.toLowerCase();
    const allUpper = word === word.toUpperCase() && /[A-Z]/.test(word);
    const hasDigit = /\d/.test(word);
    const longEnough = word.length >= 4;

    if (firstUpper || allUpper || hasDigit || longEnough) {
      result.add(lower);
    }
  }

  // --- Korean n-gram tokens ---
  for (const ng of extractHangulNgrams(text)) {
    if (STOPWORDS_KO.has(ng)) continue;
    result.add(ng);
  }

  return result;
}

/**
 * Overlap coefficient: |A ∩ B| / min(|A|, |B|).
 * Returns 0 if either set is empty.
 */
export function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  return intersection / Math.min(a.size, b.size);
}

/**
 * Compute quality score for a candidate.
 */
function quality(candidate: Candidate, rank: number, total: number): number {
  if (candidate.rrf_score !== undefined) return candidate.rrf_score;
  if (candidate.scores?.final !== undefined) return candidate.scores.final;
  return 1 - rank / total;
}

/**
 * Candidate text for entity extraction (title + snippet).
 */
function candidateText(candidate: Candidate): string {
  return `${candidate.title ?? ""} ${candidate.snippet ?? ""}`;
}

/**
 * Build the entity signature for a cluster from its members.
 * Returns top 8 most frequent terms (alphabetical tiebreaker).
 */
function buildEntitySignature(memberEntities: Set<string>[]): string[] {
  const freq = new Map<string, number>();
  for (const entitySet of memberEntities) {
    for (const entity of entitySet) {
      freq.set(entity, (freq.get(entity) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .sort(([aKey, aCount], [bKey, bCount]) => {
      if (bCount !== aCount) return bCount - aCount;
      return aKey.localeCompare(bKey);
    })
    .slice(0, MAX_SIGNATURE_TERMS)
    .map(([term]) => term);
}

/** Deterministic cluster_id from sorted entity signature (short SHA-256). */
function computeClusterId(entitySignature: string[]): string {
  return shortHash([...entitySignature].sort());
}

/**
 * Select up to maxReps representatives using MMR (Maximal Marginal Relevance).
 */
function mmrRepresentatives(
  members: Candidate[],
  maxReps: number,
  lambda: number,
): Candidate[] {
  if (members.length === 0) return [];

  const total = members.length;
  const memberEntities = members.map((m) => extractEntities(candidateText(m)));
  const qualityScores = members.map((m, i) => quality(m, i, total));

  const representatives: Candidate[] = [];
  const remaining = new Set(members.map((_, i) => i));

  // Pick first: highest quality
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (const idx of remaining) {
    const score = qualityScores[idx] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }
  if (bestIdx === -1) return [];
  const firstMember = members[bestIdx];
  if (firstMember === undefined) return [];
  representatives.push(firstMember);
  remaining.delete(bestIdx);

  // Pick subsequent via MMR
  while (representatives.length < maxReps && remaining.size > 0) {
    const reprEntities = representatives.map((r) =>
      extractEntities(candidateText(r)),
    );

    let mmrBestIdx = -1;
    let mmrBestScore = -Infinity;

    for (const idx of remaining) {
      const q = qualityScores[idx];
      const cEntities = memberEntities[idx];
      if (q === undefined || cEntities === undefined) continue;

      const maxSim = reprEntities.reduce((max, rEntities) => {
        const sim = overlapCoefficient(cEntities, rEntities);
        return sim > max ? sim : max;
      }, 0);

      const mmrScore = lambda * q - (1 - lambda) * maxSim;
      if (mmrScore > mmrBestScore) {
        mmrBestScore = mmrScore;
        mmrBestIdx = idx;
      }
    }

    if (mmrBestIdx === -1) break;
    const next = members[mmrBestIdx];
    if (next === undefined) break;
    representatives.push(next);
    remaining.delete(mmrBestIdx);
  }

  return representatives;
}

// ---------------------------------------------------------------------------
// Internal cluster state type
// ---------------------------------------------------------------------------

interface ClusterState {
  memberIndices: number[];
  memberEntities: Set<string>[];
  signatureEntities: Set<string>;
}

// ---------------------------------------------------------------------------
// Core clustering logic
// ---------------------------------------------------------------------------

/**
 * Cluster candidates using greedy single-pass entity overlap.
 * Candidates are sorted by score descending (then url as stable tiebreaker)
 * before the greedy pass so that cluster assignment is input-order-independent
 * and the output is byte-identical regardless of the original ordering.
 */
export function clusterCandidates(
  items: Candidate[],
  opts?: ClusterOptions,
): Cluster[] {
  const threshold = opts?.overlapThreshold ?? OVERLAP_THRESHOLD;
  const maxReps = opts?.maxRepresentatives ?? MAX_REPRESENTATIVES;
  const lambda = opts?.diversityLambda ?? MMR_LAMBDA;

  // Sort by score descending then url ascending as a stable tiebreaker.
  // This makes the greedy assignment deterministic regardless of input order.
  const total = items.length;
  const sorted = [...items].sort((a, b) => {
    const aIdx = items.indexOf(a);
    const bIdx = items.indexOf(b);
    const qa = quality(a, aIdx, total);
    const qb = quality(b, bIdx, total);
    if (qb !== qa) return qb - qa;
    return (a.url ?? "").localeCompare(b.url ?? "");
  });

  const states: ClusterState[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const candidate = sorted[i];
    if (candidate === undefined) continue;

    const entities = extractEntities(candidateText(candidate));

    let assignedCluster = -1;

    for (let j = 0; j < states.length; j++) {
      const state = states[j];
      if (state === undefined) continue;
      const sim = overlapCoefficient(entities, state.signatureEntities);
      if (sim >= threshold) {
        assignedCluster = j;
        break;
      }
    }

    if (assignedCluster === -1) {
      states.push({
        memberIndices: [i],
        memberEntities: [entities],
        signatureEntities: new Set(entities),
      });
    } else {
      const state = states[assignedCluster];
      if (state !== undefined) {
        state.memberIndices.push(i);
        state.memberEntities.push(entities);
        for (const entity of entities) {
          state.signatureEntities.add(entity);
        }
      }
    }
  }

  return states
    .map((state): Cluster | null => {
      const members = state.memberIndices
        .map((i) => sorted[i])
        .filter((m): m is Candidate => m !== undefined);

      if (members.length === 0) return null;

      const total = members.length;
      const sortedMembers = [...members].sort((a, b) => {
        const qa = quality(a, members.indexOf(a), total);
        const qb = quality(b, members.indexOf(b), total);
        return qb - qa;
      });

      const entitySignature = buildEntitySignature(state.memberEntities);
      const clusterId = computeClusterId(entitySignature);
      const representatives = mmrRepresentatives(
        sortedMembers,
        maxReps,
        lambda,
      );
      const crossSourceCount = new Set(members.map((m) => m.source)).size;

      return {
        cluster_id: clusterId,
        entity_signature: entitySignature,
        representatives,
        members: sortedMembers,
        cross_source_count: crossSourceCount,
      };
    })
    .filter((c): c is Cluster => c !== null);
}

// ---------------------------------------------------------------------------
// CLI input schema
// ---------------------------------------------------------------------------

const ClusterInputSchema = z.object({
  items: z.array(CandidateSchema),
  topic: z.string().optional(),
  intent: IntentSchema.optional(),
  sources_used: z.array(z.string()).optional(),
  sources_failed: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

/**
 * Parse a simple flag value from argv array.
 * Returns undefined if flag not found.
 */
function parseFlag(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

/**
 * CLI runner for `oma market cluster`.
 * Reads JSON from stdin, writes ClusterOutput JSON to stdout.
 * Exit 0 on success, 4 on error.
 */
export async function runCluster(argv: string[]): Promise<number> {
  try {
    const overlapThresholdStr = parseFlag(argv, "--overlap-threshold");
    const maxRepsStr = parseFlag(argv, "--max-reps");
    const lambdaStr = parseFlag(argv, "--lambda");

    const opts: ClusterOptions = {};
    if (overlapThresholdStr !== undefined) {
      opts.overlapThreshold = parseFloat(overlapThresholdStr);
    }
    if (maxRepsStr !== undefined) {
      opts.maxRepresentatives = parseInt(maxRepsStr, 10);
    }
    if (lambdaStr !== undefined) {
      opts.diversityLambda = parseFloat(lambdaStr);
    }

    // Read stdin
    const chunks: Uint8Array[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Uint8Array);
    }
    const rawInput = Buffer.concat(chunks).toString("utf8");

    // Parse and validate input
    const input = parseStageInput(ClusterInputSchema, rawInput);

    // Cluster candidates
    const clusters = clusterCandidates(input.items, opts);

    // Build output
    const output: ClusterOutput = {
      clusters,
      topic: input.topic ?? "",
      intent: input.intent ?? "pain",
      sources_used: input.sources_used ?? [],
      sources_failed: input.sources_failed ?? [],
    };

    process.stdout.write(JSON.stringify(output, null, 2));
    process.stdout.write("\n");
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[oma market cluster] error: ${msg}\n`);
    return 4;
  }
}
