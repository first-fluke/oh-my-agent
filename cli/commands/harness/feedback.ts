import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AGENTS_DIR } from "../../constants/paths.js";
import type { LiveDispatchFn } from "../skills/eval.js";
import { buildJudgeDispatchFn, buildLiveDispatchFn } from "../skills/eval.js";
import { runEvolutionPrompt } from "../skills/opt/execution.js";
import type { SkillOptResult } from "../skills/opt/types.js";
import { runSkillsOpt } from "../skills/opt.js";
import {
  type IncidentPromotion,
  listUnpromotedIncidents,
  promoteHarnessIncident,
} from "./incident-promote.js";
import { captureRunAsIncident, scanHarnessIncidents } from "./incident-scan.js";

/** What is waiting to be fed back into skill evolution. */
export interface FeedbackBacklog {
  /** Captured incidents with no fixture yet. */
  pendingIncidents: number;
  /** Failed runs with preserved output and prompt that no incident references. */
  uncapturedFailedRuns: number;
}

/** Counts from the incident store and run records; a damaged store counts as empty here and is reported by `incident show` / `agent results`. */
export function collectFeedbackBacklog(root: string): FeedbackBacklog {
  let pendingIncidents = 0;
  let uncapturedFailedRuns = 0;
  try {
    pendingIncidents = listUnpromotedIncidents(root).length;
  } catch {
    // Reported by `oma harness incident show`.
  }
  try {
    uncapturedFailedRuns = scanHarnessIncidents(root).candidates.filter(
      (candidate) => candidate.hasOutput && candidate.hasPrompt,
    ).length;
  } catch {
    // Reported by `oma agent results`.
  }
  return { pendingIncidents, uncapturedFailedRuns };
}

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
  /** Failed runs captured as incidents from their task contracts. */
  captured: Array<{ runId: string; incidentId: string; rubric: string }>;
  uncapturable: Array<{ runId: string; reason: string }>;
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
  /** Routes incident prompts to skills; defaults to the real eval dispatch. */
  router?: LiveDispatchFn | null;
  incidentIds?: string[];
  /** Also capture uncaptured failed runs from their task contracts first. */
  scanRuns?: boolean;
  onProgress?: (message: string) => void;
}): Promise<FeedbackReport> {
  const { root } = options;
  const progress = options.onProgress ?? (() => {});
  const report: FeedbackReport = {
    ts: new Date().toISOString(),
    captured: [],
    uncapturable: [],
    promoted: [],
    skipped: [],
    skills: [],
  };
  if (options.scanRuns) {
    const drafter = options.drafter ?? runEvolutionPrompt;
    const judge = options.judge ?? buildJudgeDispatchFn();
    for (const candidate of scanHarnessIncidents(root).candidates) {
      if (!candidate.hasOutput || !candidate.hasPrompt) {
        report.uncapturable.push({
          runId: candidate.runId,
          reason: candidate.hasOutput
            ? "no prompt recorded"
            : "no output preserved",
        });
        continue;
      }
      try {
        const captured = await captureRunAsIncident({
          root,
          runId: candidate.runId,
          drafter,
          judge,
        });
        report.captured.push({
          runId: candidate.runId,
          incidentId: captured.incident.id,
          rubric: captured.rubric,
        });
        progress(
          `[oma harness feedback] run ${candidate.runId.slice(0, 8)} → incident ${captured.incident.id}`,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        report.uncapturable.push({ runId: candidate.runId, reason });
        progress(
          `[oma harness feedback] run ${candidate.runId.slice(0, 8)} not captured: ${reason}`,
        );
      }
    }
  }
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
        router:
          options.router === null
            ? undefined
            : (options.router ?? buildLiveDispatchFn(root)),
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
  if (report.captured.length || report.uncapturable.length)
    console.log(
      `  runs captured: ${report.captured.length}  not captured: ${report.uncapturable.length}`,
    );
  for (const captured of report.captured)
    console.log(
      `  run ${captured.runId.slice(0, 8)} → incident ${captured.incidentId}`,
    );
  for (const item of report.uncapturable)
    console.log(`  run ${item.runId.slice(0, 8)}: ${item.reason}`);
  console.log(
    `  incidents promoted: ${report.promoted.length}  skipped: ${report.skipped.length}`,
  );
  for (const promotion of report.promoted)
    console.log(
      `  ${promotion.incidentId} → ${promotion.fixturePath} [${promotion.derivation}, ${promotion.attribution ?? "explicit"}${promotion.validatedAgainstObserved ? ", validated" : ""}]`,
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
