import { unwrapVendorEnvelope } from "./envelope.js";
import {
  type IsolationStatus,
  MIN_TASKS,
  NEG_TRANSFER_FAIL,
  type NegativeTransfer,
  type NegativeTransferCoverage,
  REGEX_OUTPUT_MAX_LEN,
  REGEX_PATTERN_MAX_LEN,
  type RolloutEntry,
  type SkillRepeatability,
  type SkillUtilityFinding,
  type SkillUtilityReport,
  type TaskChecker,
  type TaskFixture,
  UTILITY_FAIL_LIFT,
  UTILITY_WARN_LIFT,
} from "./types.js";

// --- Checker scoring ---

/**
 * Score a single checker against an output string.
 * Returns 1 (pass) or 0 (fail). Deterministic — no random/date.
 *
 * ReDoS stop-gap (T1-d, untrusted fixtures): patterns exceeding
 * REGEX_PATTERN_MAX_LEN are scored 0 without execution; output strings are
 * truncated to REGEX_OUTPUT_MAX_LEN before matching.
 *
 * For judge checkers: pass `recordedScore` (from the rollout entry) to replay
 * a verdict deterministically in --mock mode. Without a recorded score, the
 * function throws — callers in mock mode must check for recorded verdicts first.
 */
export function scoreChecker(
  checker: TaskChecker,
  rawOutput: string,
  recordedScore?: 0 | 1,
): number {
  const output = unwrapVendorEnvelope(rawOutput);
  switch (checker.type) {
    case "assert": {
      const allPresent = checker.expect_contains.every((expected) =>
        output.includes(expected),
      );
      return allPresent ? 1 : 0;
    }
    case "regex": {
      if (checker.pattern.length > REGEX_PATTERN_MAX_LEN) {
        return 0;
      }
      try {
        const safe = output.slice(0, REGEX_OUTPUT_MAX_LEN);
        const re = new RegExp(checker.pattern);
        return re.test(safe) ? 1 : 0;
      } catch {
        return 0;
      }
    }
    case "judge": {
      // Judge verdict must come from a live judge call or a recorded score.
      // Passing recordedScore here enables deterministic --mock replay.
      if (recordedScore !== undefined) {
        return recordedScore;
      }
      throw new Error(
        "judge checker requires --live (M2) or a recorded score; unsupported in --mock mode without recorded verdict",
      );
    }
  }
}

// --- Statistics ---

function weightedMean(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return 0;
  return values.reduce((s, v, i) => s + v * (weights[i] ?? 1), 0) / totalWeight;
}

function weightedStdDev(
  values: number[],
  weights: number[],
  avg: number,
): number {
  if (values.length < 2) return 0;
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return 0;
  const variance =
    values.reduce((s, v, i) => s + (weights[i] ?? 1) * (v - avg) ** 2, 0) /
    totalWeight;
  return Math.sqrt(variance);
}

/** Two-sided 97.5% Student t quantiles by degrees of freedom (1-30); 1.96 beyond. */
const T_975 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201,
  2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074,
  2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Paired 95% t-interval over per-task lifts; null below two tasks. */
export function pairedLiftInterval(
  lifts: number[],
): { lower: number; upper: number } | null {
  const n = lifts.length;
  if (n < 2) return null;
  const mean = lifts.reduce((s, v) => s + v, 0) / n;
  const halfWidth =
    ((T_975[n - 2] ?? 1.96) * sampleStdDev(lifts)) / Math.sqrt(n);
  return { lower: mean - halfWidth, upper: mean + halfWidth };
}

function unavailableRepeatability(): SkillRepeatability {
  return {
    trials: 0,
    liftCi95: null,
    withinTaskStdDev: null,
    status: "unavailable",
  };
}

// --- Core computation ---

export interface ComputeUtilityOptions {
  tasks: TaskFixture[];
  rollouts: RolloutEntry[];
  skippedFiles?: string[];
  maxTasks?: number;
  /** Pre-computed negative-transfer entries (populated by computeNegativeTransfer). */
  negativeTransfer?: NegativeTransfer[];
  negativeTransferCoverage?: NegativeTransferCoverage;
  /** Isolation status from the live dispatch path. Defaults to `"n/a"` (mock mode). */
  isolation?: IsolationStatus;
  /** Vendor resolved for live dispatch. */
  isolationVendor?: string;
  /** Include observable prompts/outputs in findings for the optimizer only. */
  includeEvidence?: boolean;
  /** Minimum scored tasks required for coverage; public eval defaults to MIN_TASKS. */
  minimumCoverage?: number;
}

/**
 * Compute the SkillUtilityReport from task fixtures and rollout entries.
 * Deterministic: same inputs → identical output. No Date.now/Math.random.
 * Scoring is weight-aware: each task's lift is weighted by `task.weight`.
 *
 * Judge-checker tasks: the recorded `score` field from each rollout entry is
 * used directly (set by `--live --record`). If a judge task has NO recorded
 * score on an arm, that task is EXCLUDED from scoring with a console.warn.
 * This keeps --mock strictly offline/deterministic.
 *
 * Any task missing an arm entirely is likewise excluded rather than scored 0 —
 * absent data must not read as a failed answer. When exclusions drop the scored
 * count below MIN_TASKS the report is `coverage: "insufficient"`.
 */
export function computeUtility(
  skill: string,
  options: ComputeUtilityOptions,
): SkillUtilityReport {
  const { rollouts, maxTasks } = options;
  const skippedFiles = options.skippedFiles ?? [];
  const negativeTransferInput = options.negativeTransfer ?? [];
  const isolation: IsolationStatus = options.isolation ?? "n/a";
  const isolationVendor = options.isolationVendor;
  let tasks = options.tasks;

  // Apply maxTasks cap in deterministic order (fixtures are sorted at load time)
  if (maxTasks !== undefined && maxTasks > 0) {
    tasks = tasks.slice(0, maxTasks);
  }

  const taskCount = tasks.length;
  const minimumCoverage = Math.max(1, options.minimumCoverage ?? MIN_TASKS);

  if (taskCount < minimumCoverage) {
    return {
      skill,
      taskCount,
      skippedFiles,
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      repeatability: unavailableRepeatability(),
      findings: [],
      negativeTransfer: negativeTransferInput,
      negativeTransferCoverage: options.negativeTransferCoverage,
      decision: "insufficient",
      coverage: "insufficient",
      isolation,
      isolationVendor,
    };
  }

  // Build rollout lookup: taskId → per-arm trial entries (trial index → entry).
  // A single-trial recording has no trial field and occupies index 0.
  type ArmTrials = Map<number, RolloutEntry>;
  const rolloutMap = new Map<
    string,
    { baseline: ArmTrials; treatment: ArmTrials }
  >(tasks.map((t) => [t.id, { baseline: new Map(), treatment: new Map() }]));
  for (const entry of rollouts) {
    const existing = rolloutMap.get(entry.taskId);
    if (!existing) continue;
    const arm =
      entry.arm === "baseline" ? existing.baseline : existing.treatment;
    const trial = entry.trial ?? 0;
    // Keep the first entry per (task, arm, trial); later files cannot overwrite.
    if (!arm.has(trial)) arm.set(trial, entry);
  }

  const baselineScores: number[] = [];
  const treatmentScores: number[] = [];
  const liftValues: number[] = [];
  const taskWeights: number[] = [];
  const findings: SkillUtilityFinding[] = [];
  const withinTaskStdDevs: number[] = [];
  let commonTrials = Number.POSITIVE_INFINITY;

  const scoreEntry = (
    task: TaskFixture,
    entry: RolloutEntry,
  ): number | null => {
    if (task.checker.type === "judge") return entry.score ?? null;
    try {
      return scoreChecker(task.checker, entry.output);
    } catch {
      // broken checker — deterministic 0 (kept from the single-trial contract)
      return 0;
    }
  };

  for (const task of tasks) {
    const arms = rolloutMap.get(task.id) ?? {
      baseline: new Map<number, RolloutEntry>(),
      treatment: new Map<number, RolloutEntry>(),
    };

    // An absent arm is missing DATA, not a failing answer. Scoring it 0 would
    // report "the skill did not help" for a task that was never run — and since
    // both arms then score 0, the lift is 0 and the verdict is `fail`. Exclude
    // the task instead, which surfaces as insufficient coverage.
    // Trials pair by index; only trials with both arms count.
    const pairedTrials = [...arms.baseline.keys()]
      .filter((trial) => arms.treatment.has(trial))
      .sort((a, b) => a - b);
    if (pairedTrials.length === 0) {
      const missing = [
        arms.baseline.size === 0 ? "baseline" : undefined,
        arms.treatment.size === 0 ? "treatment" : undefined,
      ]
        .filter(Boolean)
        .join(" + ");
      console.warn(
        `[oma skill eval] task ${task.id} has no recorded ${missing || "paired"} rollout; run --live --record to populate. Excluding from report.`,
      );
      continue;
    }

    const perTrialBaseline: number[] = [];
    const perTrialTreatment: number[] = [];
    let verdictMissing = false;
    for (const trial of pairedTrials) {
      const b = arms.baseline.get(trial);
      const t = arms.treatment.get(trial);
      if (!b || !t) continue;
      const bs = scoreEntry(task, b);
      const ts = scoreEntry(task, t);
      if (bs === null || ts === null) {
        verdictMissing = true;
        break;
      }
      perTrialBaseline.push(bs);
      perTrialTreatment.push(ts);
    }
    if (verdictMissing) {
      // If either arm is missing its recorded verdict, exclude the task
      // from scoring — warn and skip rather than silently score 0.
      console.warn(
        `[oma skill eval] judge task ${task.id} has no recorded verdict; run --live --record to populate scores. Excluding from report.`,
      );
      continue;
    }

    const trialsForTask = perTrialBaseline.length;
    commonTrials = Math.min(commonTrials, trialsForTask);
    const baselineScore =
      perTrialBaseline.reduce((s, v) => s + v, 0) / trialsForTask;
    const treatmentScore =
      perTrialTreatment.reduce((s, v) => s + v, 0) / trialsForTask;
    const perTrialLift = perTrialBaseline.map(
      (b, i) => (perTrialTreatment[i] ?? 0) - b,
    );
    const liftStdDev = sampleStdDev(perTrialLift);
    if (trialsForTask > 1) withinTaskStdDevs.push(liftStdDev);
    const lift = treatmentScore - baselineScore;
    const first = pairedTrials[0] ?? 0;
    const baselineOutput = arms.baseline.get(first)?.output ?? "";
    const treatmentOutput = arms.treatment.get(first)?.output ?? "";
    const w = task.weight;
    baselineScores.push(baselineScore);
    treatmentScores.push(treatmentScore);
    liftValues.push(lift);
    taskWeights.push(w);

    findings.push({
      taskId: task.id,
      baseline: baselineScore,
      treatment: treatmentScore,
      lift,
      trials: trialsForTask,
      liftStdDev,
      ...(options.includeEvidence
        ? {
            evidence: {
              domain: task.domain,
              prompt: task.prompt,
              checker: task.checker,
              baselineOutput,
              treatmentOutput,
            },
          }
        : {}),
    });
  }

  // If all judge tasks were excluded (no recorded verdicts) the scored count
  // may drop below MIN_TASKS — treat as insufficient coverage.
  if (findings.length < minimumCoverage) {
    return {
      skill,
      taskCount,
      skippedFiles,
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      repeatability: unavailableRepeatability(),
      findings,
      negativeTransfer: negativeTransferInput,
      negativeTransferCoverage: options.negativeTransferCoverage,
      decision: "insufficient",
      coverage: "insufficient",
      isolation,
      isolationVendor,
    };
  }

  const baselineScore = weightedMean(baselineScores, taskWeights);
  const treatmentScore = weightedMean(treatmentScores, taskWeights);
  const utilityLift = weightedMean(liftValues, taskWeights);
  const utilityStdDev = weightedStdDev(liftValues, taskWeights, utilityLift);

  let decision: "pass" | "warn" | "fail";
  if (utilityLift <= UTILITY_FAIL_LIFT) {
    decision = "fail";
  } else if (utilityLift < UTILITY_WARN_LIFT) {
    decision = "warn";
  } else {
    decision = "pass";
  }

  // Negative transfer: if any delta <= NEG_TRANSFER_FAIL, downgrade pass → warn
  // (design: negative transfer is a reported signal; does NOT regress skill to fail)
  const hasRegression = negativeTransferInput.some(
    (nt) => nt.delta <= NEG_TRANSFER_FAIL,
  );
  if (hasRegression && decision === "pass") {
    decision = "warn";
  }

  // Repeatability: a single lucky run is not a repeatable improvement. With
  // repeated trials, a pass requires the paired interval to exclude zero.
  const trials = Number.isFinite(commonTrials) ? commonTrials : 0;
  const liftCi95 = pairedLiftInterval(liftValues);
  const withinTaskStdDev =
    withinTaskStdDevs.length > 0
      ? withinTaskStdDevs.reduce((s, v) => s + v, 0) / withinTaskStdDevs.length
      : null;
  const repeatability: SkillRepeatability = {
    trials,
    liftCi95,
    withinTaskStdDev,
    status:
      trials < 2
        ? "single-trial"
        : liftCi95 &&
            (utilityLift > 0 ? liftCi95.lower > 0 : liftCi95.upper < 0)
          ? "stable"
          : "unstable",
  };
  if (repeatability.status === "unstable" && decision === "pass") {
    decision = "warn";
  }

  return {
    skill,
    taskCount,
    skippedFiles,
    baselineScore,
    treatmentScore,
    utilityLift,
    utilityStdDev,
    repeatability,
    findings,
    negativeTransfer: negativeTransferInput,
    negativeTransferCoverage: options.negativeTransferCoverage,
    decision,
    coverage: "ok",
    isolation,
    isolationVendor,
  };
}
