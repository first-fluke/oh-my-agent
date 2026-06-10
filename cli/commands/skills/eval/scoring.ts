import {
  type IsolationStatus,
  MIN_TASKS,
  NEG_TRANSFER_FAIL,
  type NegativeTransfer,
  REGEX_OUTPUT_MAX_LEN,
  REGEX_PATTERN_MAX_LEN,
  type RolloutEntry,
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
  output: string,
  recordedScore?: 0 | 1,
): number {
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

// --- Core computation ---

export interface ComputeUtilityOptions {
  tasks: TaskFixture[];
  rollouts: RolloutEntry[];
  skippedFiles?: string[];
  maxTasks?: number;
  /** Pre-computed negative-transfer entries (populated by computeNegativeTransfer). */
  negativeTransfer?: NegativeTransfer[];
  /** Isolation status from the live dispatch path. Defaults to `"n/a"` (mock mode). */
  isolation?: IsolationStatus;
  /** Vendor resolved for live dispatch. */
  isolationVendor?: string;
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

  if (taskCount < MIN_TASKS) {
    return {
      skill,
      taskCount,
      skippedFiles,
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      findings: [],
      negativeTransfer: negativeTransferInput,
      decision: "insufficient",
      coverage: "insufficient",
      isolation,
      isolationVendor,
    };
  }

  // Build rollout lookup: taskId → { baseline?, treatment? }
  // For judge tasks, also carry the recorded score per arm.
  const rolloutMap = new Map<
    string,
    {
      baseline?: string;
      treatment?: string;
      baselineScore?: 0 | 1;
      treatmentScore?: 0 | 1;
    }
  >(tasks.map((t) => [t.id, {}]));

  for (const entry of rollouts) {
    const existing = rolloutMap.get(entry.taskId);
    if (existing) {
      if (entry.arm === "baseline") {
        existing.baseline = entry.output;
        if (entry.score !== undefined) existing.baselineScore = entry.score;
      } else {
        existing.treatment = entry.output;
        if (entry.score !== undefined) existing.treatmentScore = entry.score;
      }
    }
  }

  const baselineScores: number[] = [];
  const treatmentScores: number[] = [];
  const liftValues: number[] = [];
  const taskWeights: number[] = [];
  const findings: SkillUtilityFinding[] = [];

  for (const task of tasks) {
    const arms = rolloutMap.get(task.id) ?? {};
    const baselineOutput = arms.baseline ?? "";
    const treatmentOutput = arms.treatment ?? "";

    let baselineScore: number;
    let treatmentScore: number;

    if (task.checker.type === "judge") {
      // Judge tasks: use recorded score from rollout entry.
      // If either arm is missing its recorded verdict, exclude the task
      // from scoring — warn and skip rather than silently score 0.
      if (
        arms.baselineScore === undefined ||
        arms.treatmentScore === undefined
      ) {
        console.warn(
          `[oma skills eval] judge task ${task.id} has no recorded verdict; run --live --record to populate scores. Excluding from report.`,
        );
        continue;
      }
      baselineScore = arms.baselineScore;
      treatmentScore = arms.treatmentScore;
    } else {
      // assert / regex: compute deterministically from output
      try {
        baselineScore = scoreChecker(task.checker, baselineOutput);
        treatmentScore = scoreChecker(task.checker, treatmentOutput);
      } catch {
        // broken checker — score as 0 for both (deterministic fallback)
        baselineScore = 0;
        treatmentScore = 0;
      }
    }

    const lift = treatmentScore - baselineScore;
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
    });
  }

  // If all judge tasks were excluded (no recorded verdicts) the scored count
  // may drop below MIN_TASKS — treat as insufficient coverage.
  if (findings.length < MIN_TASKS) {
    return {
      skill,
      taskCount,
      skippedFiles,
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      findings,
      negativeTransfer: negativeTransferInput,
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

  return {
    skill,
    taskCount,
    skippedFiles,
    baselineScore,
    treatmentScore,
    utilityLift,
    utilityStdDev,
    findings,
    negativeTransfer: negativeTransferInput,
    decision,
    coverage: "ok",
    isolation,
    isolationVendor,
  };
}
