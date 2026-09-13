import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AGENTS_DIR } from "../../constants/paths.js";
import { buildJudgeDispatchFn } from "../skills/eval.js";
import { runEvolutionPrompt } from "../skills/opt/execution.js";
import type { SkillOptResult } from "../skills/opt/types.js";
import { runSkillsOpt } from "../skills/opt.js";
import {
  type IncidentPromotion,
  listUnpromotedIncidents,
  promoteHarnessIncident,
} from "./incident-promote.js";

/**
 * Deployment feedback, whole chain: every captured incident that has no
 * fixture yet becomes one, and each affected skill is optimized against its
 * enlarged suite. The outcome is a dry-run diff per skill unless `apply` is
 * set; either way the evidence chain incident → fixture → edit is recorded.
 */

export interface FeedbackSkillOutcome {
  skill: string;
  incidents: string[];
  status: "promoted-only" | "optimized" | "failed";
  result?: Pick<
    SkillOptResult,
    | "baselineLift"
    | "finalLift"
    | "baselineTrainLift"
    | "finalTrainLift"
    | "acceptedEdits"
    | "finalTest"
    | "promotion"
    | "applied"
    | "budget"
    | "diff"
  >;
  error?: string;
}

export interface FeedbackReport {
  ts: string;
  promoted: IncidentPromotion[];
  skipped: Array<{ incidentId: string; reason: string }>;
  skills: FeedbackSkillOutcome[];
  reportPath?: string;
}

export type FeedbackOptimizer = (
  skill: string,
) => Promise<SkillOptResult | undefined>;

export function buildLiveFeedbackOptimizer(options: {
  apply: boolean;
  maxEpochs: number;
}): FeedbackOptimizer {
  return (skill) =>
    runSkillsOpt(true, {
      skill,
      live: true,
      dryRun: !options.apply,
      apply: options.apply,
      yes: true,
      maxEpochs: options.maxEpochs,
      _quiet: true,
    });
}

export async function runHarnessFeedback(options: {
  root: string;
  optimize: boolean;
  optimizer?: FeedbackOptimizer;
  drafter?: (prompt: string) => string | Promise<string>;
  judge?: ReturnType<typeof buildJudgeDispatchFn>;
  incidentIds?: string[];
  onProgress?: (message: string) => void;
}): Promise<FeedbackReport> {
  const { root } = options;
  const progress = options.onProgress ?? (() => {});
  const report: FeedbackReport = {
    ts: new Date().toISOString(),
    promoted: [],
    skipped: [],
    skills: [],
  };
  const pending = listUnpromotedIncidents(root).filter(
    (incident) =>
      !options.incidentIds || options.incidentIds.includes(incident.id),
  );
  const bySkill = new Map<string, string[]>();
  for (const incident of pending) {
    try {
      const { promotion } = await promoteHarnessIncident({
        root,
        id: incident.id,
        drafter: options.drafter ?? runEvolutionPrompt,
        judge: options.judge ?? buildJudgeDispatchFn(),
      });
      report.promoted.push(promotion);
      bySkill.set(promotion.skill, [
        ...(bySkill.get(promotion.skill) ?? []),
        incident.id,
      ]);
      progress(
        `[oma harness feedback] incident ${incident.id} → ${promotion.fixturePath} (${promotion.derivation})`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      report.skipped.push({ incidentId: incident.id, reason });
      progress(
        `[oma harness feedback] incident ${incident.id} skipped: ${reason}`,
      );
    }
  }
  for (const [skill, incidents] of bySkill) {
    if (!options.optimize) {
      report.skills.push({ skill, incidents, status: "promoted-only" });
      continue;
    }
    progress(
      `[oma harness feedback] optimizing ${skill} (${incidents.length} new fixture${incidents.length === 1 ? "" : "s"})`,
    );
    try {
      const optimizer =
        options.optimizer ??
        buildLiveFeedbackOptimizer({ apply: false, maxEpochs: 1 });
      const result = await optimizer(skill);
      if (!result) throw new Error("optimization returned no result");
      report.skills.push({
        skill,
        incidents,
        status: "optimized",
        result: {
          baselineLift: result.baselineLift,
          finalLift: result.finalLift,
          baselineTrainLift: result.baselineTrainLift,
          finalTrainLift: result.finalTrainLift,
          acceptedEdits: result.acceptedEdits,
          finalTest: result.finalTest,
          promotion: result.promotion,
          applied: result.applied,
          budget: result.budget,
          diff: result.diff,
        },
      });
    } catch (error) {
      report.skills.push({
        skill,
        incidents,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const dir = join(root, AGENTS_DIR, "results", "feedback");
  mkdirSync(dir, { recursive: true });
  const stamp = report.ts.replace(/[:.]/g, "-");
  const reportPath = join(dir, `feedback-${stamp}.json`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  report.reportPath = reportPath.slice(root.length + 1);
  return report;
}

export function renderFeedbackReport(report: FeedbackReport): void {
  console.log(`\nHarness feedback  (${report.ts})`);
  console.log(
    `  incidents promoted: ${report.promoted.length}  skipped: ${report.skipped.length}`,
  );
  for (const promotion of report.promoted)
    console.log(
      `  ${promotion.incidentId} → ${promotion.fixturePath} [${promotion.derivation}${promotion.validatedAgainstObserved ? ", validated" : ""}]`,
    );
  for (const skipped of report.skipped)
    console.log(`  ${skipped.incidentId}: skipped — ${skipped.reason}`);
  for (const outcome of report.skills) {
    if (outcome.status === "promoted-only") {
      console.log(
        `  ${outcome.skill}: fixtures added; run oma skill optimize --skill ${outcome.skill} --live`,
      );
      continue;
    }
    if (outcome.status === "failed") {
      console.log(`  ${outcome.skill}: optimization failed — ${outcome.error}`);
      continue;
    }
    const r = outcome.result;
    if (!r) continue;
    console.log(
      `  ${outcome.skill}: accepted ${r.acceptedEdits.length}, val ${(r.baselineLift * 100).toFixed(1)}%→${(r.finalLift * 100).toFixed(1)}%` +
        (r.baselineTrainLift !== undefined && r.finalTrainLift !== undefined
          ? `, train ${(r.baselineTrainLift * 100).toFixed(1)}%→${(r.finalTrainLift * 100).toFixed(1)}%`
          : "") +
        `, final test ${r.finalTest ? (r.finalTest.passed ? "pass" : "fail") : "missing"}, promotion ${r.promotion?.eligible ? "eligible" : "blocked"}, applied ${r.applied}`,
    );
  }
  if (report.reportPath) console.log(`  report: ${report.reportPath}`);
}
