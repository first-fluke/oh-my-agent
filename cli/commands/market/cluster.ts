/**
 * `oma market cluster` — entity-based greedy clustering with MMR representative selection.
 *
 * Architecture:
 *   runCluster (CLI entrypoint) → clusterCandidates (business logic)
 *     → extractEntities → overlapCoefficient → greedyCluster → mmrRepresentatives
 *     → ClusterOutput
 */

import { z } from "zod";
import {
  MAX_REPRESENTATIVES,
  MMR_LAMBDA,
  OVERLAP_THRESHOLD,
} from "./cluster/constants.js";
import { extractEntities, overlapCoefficient } from "./cluster/entities.js";
import {
  buildEntitySignature,
  candidateText,
  computeClusterId,
  mmrRepresentatives,
  quality,
} from "./cluster/representatives.js";
import type { Candidate, Cluster, ClusterOutput } from "./shared/schema.js";
import {
  CandidateSchema,
  IntentSchema,
  parseStageInput,
} from "./shared/schema.js";

export { extractEntities, overlapCoefficient } from "./cluster/entities.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ClusterOptions {
  overlapThreshold?: number;
  maxRepresentatives?: number;
  diversityLambda?: number;
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
