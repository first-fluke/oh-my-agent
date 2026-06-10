/**
 * Quality scoring, entity signatures, and MMR representative selection for
 * `oma market cluster`.
 */

import { shortHash } from "../../../utils/hash.js";
import type { Candidate } from "../shared/schema.js";
import { MAX_SIGNATURE_TERMS } from "./constants.js";
import { extractEntities, overlapCoefficient } from "./entities.js";

/**
 * Compute quality score for a candidate.
 */
export function quality(
  candidate: Candidate,
  rank: number,
  total: number,
): number {
  if (candidate.rrf_score !== undefined) return candidate.rrf_score;
  if (candidate.scores?.final !== undefined) return candidate.scores.final;
  return 1 - rank / total;
}

/**
 * Candidate text for entity extraction (title + snippet).
 */
export function candidateText(candidate: Candidate): string {
  return `${candidate.title ?? ""} ${candidate.snippet ?? ""}`;
}

/**
 * Build the entity signature for a cluster from its members.
 * Returns top 8 most frequent terms (alphabetical tiebreaker).
 */
export function buildEntitySignature(memberEntities: Set<string>[]): string[] {
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
export function computeClusterId(entitySignature: string[]): string {
  return shortHash([...entitySignature].sort());
}

/**
 * Select up to maxReps representatives using MMR (Maximal Marginal Relevance).
 */
export function mmrRepresentatives(
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
