import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readSkillPromotions } from "./lineage.js";

/**
 * Long-run evolution statistics.
 *
 * Each optimization run appends evidence, proposal-gate, and run-summary
 * records to `.agents/results/skill-evolution/<skill>/<session>.jsonl`. This
 * reader aggregates them so the improvement process itself can be judged:
 * how many runs produced a verified improvement, at what proposal acceptance
 * rate, under which memory mode and procedure, and how often a promotion was
 * rolled back. Without these numbers "the loop learns" is an assertion.
 */

export interface EvolutionRunSummary {
  session: string;
  ts?: string;
  memory?: "recall" | "none";
  procedureHash?: string;
  baselineLift?: number;
  finalLift?: number;
  proposals: {
    proposed: number;
    accepted: number;
    rejected: number;
    inconclusive: number;
  };
  finalTestPassed?: boolean;
  promotionEligible?: boolean;
  applied?: boolean;
  /** Model calls charged against the constitution budget (live runs). */
  callsUsed?: number;
  status: "completed" | "failed" | "incomplete";
}

export interface EvolutionStats {
  skill: string;
  runs: number;
  completed: number;
  failed: number;
  proposals: {
    proposed: number;
    accepted: number;
    rejected: number;
    inconclusive: number;
  };
  acceptanceRate: number | null;
  verifiedImprovements: number;
  applied: number;
  rollbacks: number;
  meanFinalLift: number | null;
  /** Model calls summed over runs that reported usage. */
  callsUsed: number;
  runsWithUsage: number;
  /**
   * Cost of the process, not of a run: calls spent per verified improvement.
   * Null until at least one verified improvement has usage behind it.
   */
  callsPerVerifiedImprovement: number | null;
  byMemory: Record<
    string,
    {
      runs: number;
      verifiedImprovements: number;
      meanFinalLift: number | null;
      callsUsed: number;
    }
  >;
  byProcedure: Record<
    string,
    { runs: number; verifiedImprovements: number; callsUsed: number }
  >;
  runsDetail: EvolutionRunSummary[];
}

function mean(values: number[]): number | null {
  return values.length
    ? values.reduce((s, v) => s + v, 0) / values.length
    : null;
}

export function evolutionArtifactsDir(
  workspace: string,
  skillId: string,
): string {
  return join(workspace, ".agents", "results", "skill-evolution", skillId);
}

export function readEvolutionRun(path: string): EvolutionRunSummary {
  const summary: EvolutionRunSummary = {
    session:
      path
        .split("/")
        .pop()
        ?.replace(/\.jsonl$/, "") ?? path,
    proposals: { proposed: 0, accepted: 0, rejected: 0, inconclusive: 0 },
    status: "incomplete",
  };
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (record.type === "proposal-gate") {
      summary.proposals.proposed += 1;
      const outcome = record.outcome;
      if (outcome === "accepted") summary.proposals.accepted += 1;
      else if (outcome === "rejected") summary.proposals.rejected += 1;
      else if (outcome === "inconclusive") summary.proposals.inconclusive += 1;
    } else if (record.type === "run-summary") {
      summary.ts = typeof record.ts === "string" ? record.ts : undefined;
      summary.memory =
        record.memory === "recall" || record.memory === "none"
          ? record.memory
          : undefined;
      summary.procedureHash =
        typeof record.procedureHash === "string"
          ? record.procedureHash
          : undefined;
      summary.baselineLift =
        typeof record.baselineLift === "number"
          ? record.baselineLift
          : undefined;
      summary.finalLift =
        typeof record.finalLift === "number" ? record.finalLift : undefined;
      summary.finalTestPassed =
        typeof record.finalTestPassed === "boolean"
          ? record.finalTestPassed
          : undefined;
      summary.promotionEligible =
        typeof record.promotionEligible === "boolean"
          ? record.promotionEligible
          : undefined;
      summary.applied =
        typeof record.applied === "boolean" ? record.applied : undefined;
      const budget = record.budget;
      summary.callsUsed =
        budget !== null &&
        typeof budget === "object" &&
        typeof (budget as { used?: unknown }).used === "number"
          ? (budget as { used: number }).used
          : undefined;
      summary.status = record.status === "failed" ? "failed" : "completed";
    }
  }
  return summary;
}

export function computeEvolutionStats(
  workspace: string,
  skillId: string,
): EvolutionStats {
  const dir = evolutionArtifactsDir(workspace, skillId);
  const runs: EvolutionRunSummary[] = existsSync(dir)
    ? readdirSync(dir)
        .filter(
          (name) => name.endsWith(".jsonl") && name !== "promotions.jsonl",
        )
        .sort()
        .map((name) => readEvolutionRun(join(dir, name)))
    : [];
  const stats: EvolutionStats = {
    skill: skillId,
    runs: runs.length,
    completed: runs.filter((run) => run.status === "completed").length,
    failed: runs.filter((run) => run.status === "failed").length,
    proposals: { proposed: 0, accepted: 0, rejected: 0, inconclusive: 0 },
    acceptanceRate: null,
    verifiedImprovements: 0,
    applied: 0,
    rollbacks: readSkillPromotions(workspace, skillId).filter(
      (record) => record.action === "rollback",
    ).length,
    meanFinalLift: null,
    callsUsed: 0,
    runsWithUsage: 0,
    callsPerVerifiedImprovement: null,
    byMemory: {},
    byProcedure: {},
    runsDetail: runs,
  };
  const finalLifts: number[] = [];
  const memoryLifts: Record<string, number[]> = {};
  for (const run of runs) {
    stats.proposals.proposed += run.proposals.proposed;
    stats.proposals.accepted += run.proposals.accepted;
    stats.proposals.rejected += run.proposals.rejected;
    stats.proposals.inconclusive += run.proposals.inconclusive;
    const verified =
      run.finalTestPassed === true && run.promotionEligible === true;
    if (verified) stats.verifiedImprovements += 1;
    if (run.applied) stats.applied += 1;
    if (typeof run.finalLift === "number") finalLifts.push(run.finalLift);
    const calls = run.callsUsed ?? 0;
    if (typeof run.callsUsed === "number") {
      stats.callsUsed += calls;
      stats.runsWithUsage += 1;
    }
    const memoryKey = run.memory ?? "unknown";
    if (!stats.byMemory[memoryKey]) {
      stats.byMemory[memoryKey] = {
        runs: 0,
        verifiedImprovements: 0,
        meanFinalLift: null,
        callsUsed: 0,
      };
    }
    const byMemory = stats.byMemory[memoryKey];
    byMemory.runs += 1;
    byMemory.callsUsed += calls;
    if (verified) byMemory.verifiedImprovements += 1;
    if (typeof run.finalLift === "number") {
      if (!memoryLifts[memoryKey]) memoryLifts[memoryKey] = [];
      memoryLifts[memoryKey].push(run.finalLift);
    }
    const procedureKey = run.procedureHash ?? "unknown";
    if (!stats.byProcedure[procedureKey]) {
      stats.byProcedure[procedureKey] = {
        runs: 0,
        verifiedImprovements: 0,
        callsUsed: 0,
      };
    }
    const byProcedure = stats.byProcedure[procedureKey];
    byProcedure.runs += 1;
    byProcedure.callsUsed += calls;
    if (verified) byProcedure.verifiedImprovements += 1;
  }
  const decided = stats.proposals.accepted + stats.proposals.rejected;
  stats.acceptanceRate =
    decided > 0 ? stats.proposals.accepted / decided : null;
  stats.meanFinalLift = mean(finalLifts);
  if (stats.verifiedImprovements > 0 && stats.callsUsed > 0)
    stats.callsPerVerifiedImprovement =
      stats.callsUsed / stats.verifiedImprovements;
  for (const [key, entry] of Object.entries(stats.byMemory))
    entry.meanFinalLift = mean(memoryLifts[key] ?? []);
  return stats;
}

export function renderEvolutionStats(stats: EvolutionStats): void {
  console.log(`\nSkill evolution stats  (skill: ${stats.skill})`);
  console.log(
    `  runs: ${stats.runs}  completed: ${stats.completed}  failed: ${stats.failed}`,
  );
  console.log(
    `  proposals: ${stats.proposals.proposed}  accepted: ${stats.proposals.accepted}  rejected: ${stats.proposals.rejected}  inconclusive: ${stats.proposals.inconclusive}` +
      `  acceptance: ${stats.acceptanceRate === null ? "n/a" : `${(stats.acceptanceRate * 100).toFixed(0)}%`}`,
  );
  console.log(
    `  verified improvements: ${stats.verifiedImprovements}  applied: ${stats.applied}  rollbacks: ${stats.rollbacks}` +
      `  mean final lift: ${stats.meanFinalLift === null ? "n/a" : `${(stats.meanFinalLift * 100).toFixed(1)}%`}`,
  );
  console.log(
    `  model calls: ${stats.callsUsed} over ${stats.runsWithUsage} metered runs` +
      `  per verified improvement: ${stats.callsPerVerifiedImprovement === null ? "n/a" : stats.callsPerVerifiedImprovement.toFixed(0)}`,
  );
  for (const [memory, entry] of Object.entries(stats.byMemory)) {
    console.log(
      `  memory=${memory}: runs ${entry.runs}, verified ${entry.verifiedImprovements}, mean final lift ${entry.meanFinalLift === null ? "n/a" : `${(entry.meanFinalLift * 100).toFixed(1)}%`}, calls ${entry.callsUsed}`,
    );
  }
  for (const [procedure, entry] of Object.entries(stats.byProcedure)) {
    console.log(
      `  procedure=${procedure}: runs ${entry.runs}, verified ${entry.verifiedImprovements}, calls ${entry.callsUsed}`,
    );
  }
}
