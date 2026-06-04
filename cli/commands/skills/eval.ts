import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { parse as parseYaml } from "yaml";
import { AGENTS_DIR } from "../../constants/paths.js";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import { planDispatch } from "../../io/runtime-dispatch.js";
import {
  resolvePromptFlag,
  resolveVendor,
} from "../../platform/agent-config.js";

// --- Negative-transfer neighbor discovery ---

/**
 * Discover neighbor tasks from OTHER skills whose `domain` overlaps with the
 * given `domains` set.
 *
 * Scans `.agents/eval/<otherSkill>/` for every installed skill directory
 * other than `skillId`. Any task whose `domain` is in `domains` is a
 * candidate neighbor. Returns a flat list of `{ otherSkill, task }` pairs.
 *
 * Only tasks with at least one recorded rollout arm score are usable in mock
 * mode; caller is responsible for filtering further.
 *
 * @param skillId  - The skill under evaluation (excluded from scan).
 * @param domains  - Set of domain strings from skillId's tasks.
 * @param evalRoot - Absolute path to `.agents/eval/`.
 */
export function discoverNeighborTasks(
  skillId: string,
  domains: Set<string>,
  evalRoot: string,
): Array<{ otherSkill: string; task: TaskFixture }> {
  if (!existsSync(evalRoot)) return [];
  let entries: string[];
  try {
    entries = readdirSync(evalRoot);
  } catch {
    return [];
  }

  const neighbors: Array<{ otherSkill: string; task: TaskFixture }> = [];

  for (const entry of entries.sort()) {
    if (entry === skillId) continue; // skip self
    const otherDir = join(evalRoot, entry);
    // Only scan directories
    try {
      const stat = readdirSync(otherDir);
      void stat; // confirm it's a directory (readdirSync throws on files)
    } catch {
      continue;
    }

    const { fixtures } = loadTaskFixtures(otherDir);
    for (const task of fixtures) {
      if (domains.has(task.domain)) {
        neighbors.push({ otherSkill: entry, task });
      }
    }
  }

  return neighbors;
}

/**
 * Score a single neighbor task in the "treatment with skill X" arm.
 *
 * - Mock mode: looks up the neighbor's recorded baseline score from its own
 *   `_rollouts/` as `scoreWithoutX`, and the recorded treatment score as
 *   `scoreWithX`. If either is missing, skip and warn (never calls LLM in mock).
 * - Live mode: uses the neighbor's recorded baseline score as `scoreWithoutX`,
 *   and runs the neighbor task WITH skillX's SKILL.md body prepended as
 *   `scoreWithX` via the provided live dispatch function.
 *
 * Returns `null` when the task cannot be scored (missing data).
 */
export function scoreNeighborInMock(
  task: TaskFixture,
  neighborTaskDir: string,
): { scoreWithoutX: number; scoreWithX: number } | null {
  const rollouts = loadRolloutEntries(neighborTaskDir);
  // Find rollout entries for this specific task
  const baselineEntry = rollouts.find(
    (r) => r.taskId === task.id && r.arm === "baseline",
  );
  const treatmentEntry = rollouts.find(
    (r) => r.taskId === task.id && r.arm === "treatment",
  );

  if (task.checker.type === "judge") {
    // Judge tasks require recorded scores for deterministic mock
    if (
      baselineEntry?.score === undefined ||
      treatmentEntry?.score === undefined
    ) {
      console.warn(
        `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): no recorded judge score; run --live --record on ${task.skill} to populate.`,
      );
      return null;
    }
    // scoreWithoutX = baseline score of the neighbor (without ANY skill injection)
    // scoreWithX = treatment score of the neighbor (was run WITH the neighbor's own skill)
    // We approximate: if neighbor's own skill improved it, the treatment score is the
    // "with neighbor-skill" score. For negative-transfer we use the neighbor's OWN
    // baseline as scoreWithoutX and re-run with skill X for scoreWithX.
    // In mock mode, we only have the neighbor's recorded scores — use treatment
    // as the "neighbor's own baseline" (already-loaded context baseline),
    // but design requires scoreWithoutX = neighbor's baseline (no skill injection).
    return {
      scoreWithoutX: baselineEntry.score,
      scoreWithX: treatmentEntry.score,
    };
  }

  // assert / regex: score deterministically from output
  if (!baselineEntry || !treatmentEntry) {
    console.warn(
      `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): no recorded rollout arms.`,
    );
    return null;
  }

  try {
    const scoreWithoutX = scoreChecker(task.checker, baselineEntry.output);
    const scoreWithX = scoreChecker(task.checker, treatmentEntry.output);
    return { scoreWithoutX, scoreWithX };
  } catch {
    return null;
  }
}

/**
 * Score a neighbor task in live mode: run task WITH skillX SKILL.md injected
 * (treatment arm) and get scoreWithoutX from the neighbor's recorded baseline.
 *
 * Returns `null` when:
 * - The neighbor has no recorded baseline rollout (we need a prior --live --record run)
 * - The dispatch function throws
 */
export function scoreNeighborInLive(
  task: TaskFixture,
  neighborTaskDir: string,
  skillXBody: string,
  dispatchFn: LiveDispatchFn,
  judgeDispatchFn: JudgeDispatchFn | undefined,
  tmpBase: string,
): { scoreWithoutX: number; scoreWithX: number } | null {
  const rollouts = loadRolloutEntries(neighborTaskDir);
  const baselineEntry = rollouts.find(
    (r) => r.taskId === task.id && r.arm === "baseline",
  );

  // We need a recorded baseline to establish the "without-X" score
  if (!baselineEntry) {
    console.warn(
      `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): no recorded baseline; run --live --record on ${task.skill} first.`,
    );
    return null;
  }

  // scoreWithoutX: use the recorded baseline score or re-score from output
  let scoreWithoutX: number;
  if (task.checker.type === "judge") {
    if (baselineEntry.score === undefined) {
      console.warn(
        `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): baseline has no recorded judge score.`,
      );
      return null;
    }
    scoreWithoutX = baselineEntry.score;
  } else {
    try {
      scoreWithoutX = scoreChecker(task.checker, baselineEntry.output);
    } catch {
      return null;
    }
  }

  // scoreWithX: run task WITH skillX body prepended (treatment arm)
  const treatmentPrompt = skillXBody
    ? `${skillXBody}\n\n---\n\n${task.prompt}`
    : task.prompt;

  let treatmentOutput: string;
  try {
    treatmentOutput = dispatchFn("treatment", treatmentPrompt, tmpBase);
  } catch {
    return null;
  }

  let scoreWithX: number;
  if (task.checker.type === "judge") {
    if (!judgeDispatchFn) {
      console.warn(
        `[oma skills eval] neg-transfer: skipping judge neighbor task ${task.id}: no judge dispatch function.`,
      );
      return null;
    }
    const rubric =
      (task.checker as TaskCheckerJudge).rubric ?? JUDGE_DEFAULT_RUBRIC;
    scoreWithX = judgeScore(
      task.prompt,
      treatmentOutput,
      rubric,
      judgeDispatchFn,
    );
  } else {
    try {
      scoreWithX = scoreChecker(task.checker, treatmentOutput);
    } catch {
      return null;
    }
  }

  return { scoreWithoutX, scoreWithX };
}

/**
 * Compute negative-transfer entries for skill X by running same-domain neighbor
 * tasks WITH skill X loaded and comparing to the neighbor's recorded baseline.
 *
 * delta = scoreWithX - scoreWithoutX
 * delta < 0 = regression (negative transfer)
 *
 * @param skillId        - Skill under evaluation.
 * @param skillDomains   - Set of domain strings from skillId's own tasks.
 * @param evalRoot       - Absolute path to `.agents/eval/`.
 * @param mode           - "mock" or "live".
 * @param maxTasks       - Max number of neighbor tasks to sample (hard cap).
 * @param skillXBody     - SKILL.md content of skill X (for live treatment arm).
 * @param dispatchFn     - Live dispatch function (for live mode).
 * @param judgeDispatchFn - Judge dispatch function (for live mode + judge tasks).
 * @param tmpBase        - Temp directory for live dispatch.
 */
export function computeNegativeTransfer(
  skillId: string,
  skillDomains: Set<string>,
  evalRoot: string,
  mode: "mock" | "live",
  maxTasks: number | undefined,
  skillXBody: string,
  dispatchFn: LiveDispatchFn | undefined,
  judgeDispatchFn: JudgeDispatchFn | undefined,
  tmpBase: string,
): NegativeTransfer[] {
  const allNeighbors = discoverNeighborTasks(skillId, skillDomains, evalRoot);

  // Apply maxTasks cap with logged warning (no silent truncation — design T1-c)
  let sampledNeighbors = allNeighbors;
  if (
    maxTasks !== undefined &&
    maxTasks > 0 &&
    allNeighbors.length > maxTasks
  ) {
    const dropped = allNeighbors.length - maxTasks;
    console.warn(
      `[oma skills eval] neg-transfer: ${allNeighbors.length} neighbor tasks found; capping at --max-tasks=${maxTasks} (${dropped} dropped).`,
    );
    sampledNeighbors = allNeighbors.slice(0, maxTasks);
  }

  const entries: NegativeTransfer[] = [];

  for (const { otherSkill, task } of sampledNeighbors) {
    const neighborTaskDir = join(evalRoot, otherSkill);

    let scored: { scoreWithoutX: number; scoreWithX: number } | null;
    if (mode === "mock") {
      scored = scoreNeighborInMock(task, neighborTaskDir);
    } else {
      if (!dispatchFn) {
        console.warn(
          `[oma skills eval] neg-transfer: skipping neighbor task ${task.id}: no live dispatch function.`,
        );
        continue;
      }
      scored = scoreNeighborInLive(
        task,
        neighborTaskDir,
        skillXBody,
        dispatchFn,
        judgeDispatchFn,
        tmpBase,
      );
    }

    if (scored === null) continue;

    const delta = scored.scoreWithX - scored.scoreWithoutX;
    entries.push({
      otherSkill,
      domain: task.domain,
      delta,
    });
  }

  return entries;
}

// --- Constants (design 016, T1-a) ---

export const MIN_TASKS = 5;
export const UTILITY_WARN_LIFT = 0.05;
export const UTILITY_FAIL_LIFT = 0;
export const NEG_TRANSFER_FAIL = -0.1;

/** Environment variable that signals mock mode (OMA_MARKET_MOCK precedent). */
export const SKILLEVAL_MOCK_ENV = "OMA_SKILLEVAL_MOCK";

/**
 * ReDoS stop-gap (T1-d: untrusted fixtures).
 * Patterns longer than this are scored 0 without executing. Output strings
 * longer than this are truncated before regex matching to bound backtracking.
 */
export const REGEX_PATTERN_MAX_LEN = 200;
export const REGEX_OUTPUT_MAX_LEN = 10_000;

/**
 * Default rubric used when a judge checker carries no rubric field.
 * Generic enough to apply to any open-ended task.
 * Design 016 amendment 2026-06-04: judge is the DEFAULT checker.
 */
export const JUDGE_DEFAULT_RUBRIC =
  "Does the answer correctly and completely satisfy the task prompt?";

// --- Interfaces (design 016) ---

export interface SkillUtilityFinding {
  taskId: string;
  baseline: number;
  treatment: number;
  lift: number;
}

export interface NegativeTransfer {
  otherSkill: string;
  domain: string;
  delta: number;
}

/**
 * `decision` is `"insufficient"` when `coverage === "insufficient"` — no
 * pass/fail verdict is meaningful below MIN_TASKS. Downstream consumers MUST
 * check `coverage` first; `decision` carries the verdict only when
 * `coverage === "ok"`.
 */
export interface SkillUtilityReport {
  skill: string;
  taskCount: number;
  skippedFiles: string[];
  baselineScore: number;
  treatmentScore: number;
  utilityLift: number;
  utilityStdDev: number;
  findings: SkillUtilityFinding[];
  negativeTransfer: NegativeTransfer[];
  decision: "pass" | "warn" | "fail" | "insufficient";
  coverage: "ok" | "insufficient";
}

// --- Task fixture schema ---

export interface TaskCheckerAssert {
  type: "assert";
  expect_contains: string[];
}

export interface TaskCheckerRegex {
  type: "regex";
  pattern: string;
}

export interface TaskCheckerJudge {
  type: "judge";
  /** Grading instruction for the LLM judge. Falls back to JUDGE_DEFAULT_RUBRIC when absent. */
  rubric?: string;
}

export type TaskChecker =
  | TaskCheckerAssert
  | TaskCheckerRegex
  | TaskCheckerJudge;

export interface TaskFixture {
  id: string;
  skill: string;
  domain: string;
  prompt: string;
  checker: TaskChecker;
  weight: number;
}

// --- Rollout fixture schema ---

export interface RolloutEntry {
  taskId: string;
  arm: "baseline" | "treatment";
  output: string;
  /**
   * Recorded judge verdict for this arm (0 = FAIL, 1 = PASS).
   * Written when the task uses a judge checker and `--live --record` is set.
   * During `--mock`, this replaces a live judge call so mock mode stays
   * deterministic and fully offline (design 016 amendment 2026-06-04).
   */
  score?: 0 | 1;
}

// --- Load result ---

export interface LoadTaskFixturesResult {
  fixtures: TaskFixture[];
  skippedFiles: string[];
}

// --- Task loading ---

/**
 * Apply judge-default resolution to a raw parsed fixture object (in-place).
 *
 * Design 016 amendment 2026-06-04: judge is the DEFAULT checker.
 * - No `checker` field at all → inject `{ type: "judge" }`.
 * - `checker` present but `type` absent → set `type: "judge"`.
 * - `checker` present with explicit `type` → leave unchanged.
 *
 * If a top-level `rubric` field exists and `checker` was absent, it is folded
 * into the injected judge checker so fixtures can be written as:
 *   rubric: "Does the output …?"   (no checker block at all)
 */
function applyCheckerDefaults(obj: Record<string, unknown>): void {
  if (typeof obj.checker !== "object" || obj.checker === null) {
    const rubric = typeof obj.rubric === "string" ? obj.rubric : undefined;
    obj.checker = rubric ? { type: "judge", rubric } : { type: "judge" };
    return;
  }
  const checker = obj.checker as Record<string, unknown>;
  if (typeof checker.type !== "string") {
    // Checker block exists but omits type — default to judge
    checker.type = "judge";
  }
}

function isTaskFixture(value: unknown): value is TaskFixture {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.id !== "string" ||
    typeof obj.skill !== "string" ||
    typeof obj.domain !== "string" ||
    typeof obj.prompt !== "string" ||
    typeof obj.weight !== "number"
  ) {
    return false;
  }
  // Apply judge default before type-checking the checker shape
  applyCheckerDefaults(obj);
  const checker = obj.checker as Record<string, unknown>;
  return typeof checker.type === "string";
}

function isRolloutEntry(value: unknown): value is RolloutEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.taskId !== "string" ||
    (obj.arm !== "baseline" && obj.arm !== "treatment") ||
    typeof obj.output !== "string"
  ) {
    return false;
  }
  // score is optional; when present it must be exactly 0 or 1
  if (obj.score !== undefined && obj.score !== 0 && obj.score !== 1) {
    return false;
  }
  return true;
}

/**
 * Load task fixture YAML files from a directory.
 * Files that fail to parse or fail schema validation are skipped with a
 * console.warn (no silent truncation — design T1-c).
 */
export function loadTaskFixtures(taskDir: string): LoadTaskFixturesResult {
  if (!existsSync(taskDir)) return { fixtures: [], skippedFiles: [] };
  let entries: string[];
  try {
    entries = readdirSync(taskDir);
  } catch {
    return { fixtures: [], skippedFiles: [] };
  }

  const fixtures: TaskFixture[] = [];
  const skippedFiles: string[] = [];

  for (const entry of entries.sort()) {
    // Skip rollouts sub-directory and non-yaml files
    if (entry.startsWith("_")) continue;
    if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue;
    const filePath = join(taskDir, entry);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = parseYaml(raw);
      if (isTaskFixture(parsed)) {
        fixtures.push(parsed);
      } else {
        console.warn(
          `[oma skills eval] skipped ${entry}: does not match TaskFixture schema`,
        );
        skippedFiles.push(entry);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[oma skills eval] skipped ${entry}: ${reason}`);
      skippedFiles.push(entry);
    }
  }
  return { fixtures, skippedFiles };
}

/**
 * Load rollout entries from `_rollouts/` under a task directory.
 * Deterministic: files are sorted before reading; no Date.now/random.
 */
export function loadRolloutEntries(taskDir: string): RolloutEntry[] {
  const rolloutsDir = join(taskDir, "_rollouts");
  if (!existsSync(rolloutsDir)) return [];
  let entries: string[];
  try {
    entries = readdirSync(rolloutsDir);
  } catch {
    return [];
  }

  const rollouts: RolloutEntry[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".json")) continue;
    const filePath = join(rolloutsDir, entry);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      // Each file may contain a single entry or an array of entries
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isRolloutEntry(item)) rollouts.push(item);
        }
      } else if (isRolloutEntry(parsed)) {
        rollouts.push(parsed);
      }
    } catch {
      // Skip malformed rollout files
    }
  }
  return rollouts;
}

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
  };
}

// --- Serialization ---

export function serializeSkillUtilityReport(
  report: SkillUtilityReport,
): string {
  return JSON.stringify(
    {
      ok: report.coverage === "ok" && report.decision === "pass",
      skill: report.skill,
      taskCount: report.taskCount,
      skippedFiles: report.skippedFiles,
      coverage: report.coverage,
      decision: report.decision,
      baselineScore: Number(report.baselineScore.toFixed(4)),
      treatmentScore: Number(report.treatmentScore.toFixed(4)),
      utilityLift: Number(report.utilityLift.toFixed(4)),
      utilityStdDev: Number(report.utilityStdDev.toFixed(4)),
      findings: report.findings.map((f) => ({
        taskId: f.taskId,
        baseline: f.baseline,
        treatment: f.treatment,
        lift: Number(f.lift.toFixed(4)),
      })),
      negativeTransfer: report.negativeTransfer,
    },
    null,
    2,
  );
}

// --- Rendering ---

export function renderSkillUtilityReport(report: SkillUtilityReport): void {
  console.log(`\nSkill utility eval  (skill: ${report.skill})`);
  console.log(`  tasks: ${report.taskCount}\n`);

  if (report.skippedFiles.length > 0) {
    console.log(
      `  skipped files: ${report.skippedFiles.length} (malformed or invalid schema)`,
    );
  }

  if (report.coverage === "insufficient") {
    console.log(
      `  INSUFFICIENT COVERAGE — fewer than ${MIN_TASKS} tasks found.`,
    );
    console.log(
      `  Add task fixtures to .agents/eval/${report.skill}/ and rollouts to _rollouts/.`,
    );
    return;
  }

  const liftPct = `${(report.utilityLift * 100).toFixed(1)}%`;
  const stdDevPct = `${(report.utilityStdDev * 100).toFixed(1)}%`;
  console.log(
    `  baseline: ${(report.baselineScore * 100).toFixed(1)}%  treatment: ${(report.treatmentScore * 100).toFixed(1)}%`,
  );
  console.log(`  utilityLift: ${liftPct}  (stddev: ${stdDevPct})`);

  const tag = report.decision.toUpperCase();
  console.log(`  [${tag}]`);

  if (report.decision === "fail") {
    console.log(
      `  No measurable lift (≤ ${(UTILITY_FAIL_LIFT * 100).toFixed(0)}%). Skill does not improve task outcomes.`,
    );
  } else if (report.decision === "warn") {
    console.log(
      `  Low lift (< ${(UTILITY_WARN_LIFT * 100).toFixed(0)}%). Skill shows marginal improvement.`,
    );
  } else {
    console.log(
      `  Skill shows positive utility lift ≥ ${(UTILITY_WARN_LIFT * 100).toFixed(0)}%.`,
    );
  }

  if (report.findings.length > 0) {
    console.log("\n  Per-task findings:");
    for (const f of report.findings) {
      const liftSign = f.lift >= 0 ? "+" : "";
      console.log(
        `    ${f.taskId}: baseline=${f.baseline} treatment=${f.treatment} lift=${liftSign}${f.lift.toFixed(3)}`,
      );
    }
  }

  if (report.negativeTransfer.length > 0) {
    console.log("\n  Negative transfer:");
    for (const nt of report.negativeTransfer) {
      console.log(
        `    ${nt.otherSkill} [${nt.domain}]: delta=${nt.delta.toFixed(3)}`,
      );
    }
  }

  console.log(
    `\n  Thresholds: fail ≤ ${(UTILITY_FAIL_LIFT * 100).toFixed(0)}%, warn < ${(UTILITY_WARN_LIFT * 100).toFixed(0)}%`,
  );
}

// --- Live execution (M2) ---

/**
 * Load SKILL.md body for a given skill from the installed skills directory.
 * Returns empty string when the file does not exist.
 */
export function loadSkillMdBody(skillId: string, workspace: string): string {
  const skillMdPath = join(
    workspace,
    INSTALLED_SKILLS_DIR,
    skillId,
    "SKILL.md",
  );
  if (!existsSync(skillMdPath)) return "";
  try {
    return readFileSync(skillMdPath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Compute a deterministic hash for a set of task IDs (sorted).
 * Used to name rollout files so replay is hash-addressed and not date/random-based.
 */
export function taskSetHash(taskIds: string[]): string {
  const sorted = [...taskIds].sort();
  return createHash("sha256")
    .update(sorted.join("\n"))
    .digest("hex")
    .slice(0, 16);
}

/** Internal dispatch function type — injectable for tests. */
export type LiveDispatchFn = (
  arm: "baseline" | "treatment",
  prompt: string,
  workspace: string,
) => string;

/**
 * Judge dispatch function type — injectable for tests.
 * Accepts a complete grading prompt and returns the raw LLM response string.
 */
export type JudgeDispatchFn = (gradingPrompt: string) => string;

/**
 * Build the real live-dispatch function that spawns a subprocess via planDispatch
 * and captures its stdout. Uses execFileSync so the call blocks until the agent
 * exits and stdout is fully captured.
 *
 * Both arms: readOnly: true (constrained profile), temp workspace per run.
 */
export function buildLiveDispatchFn(workspace: string): LiveDispatchFn {
  return (_arm, prompt, _workspace) => {
    const { vendor, config } = resolveVendor("eval-agent");
    const vendorConfig = config?.vendors?.[vendor] ?? {};
    const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);

    const dispatch = planDispatch(
      "eval-agent",
      vendor,
      vendorConfig,
      promptFlag,
      prompt,
      process.env,
      { readOnly: true },
    );

    const { command, args, env } = dispatch.invocation;
    try {
      const output = execFileSync(command, args, {
        cwd: workspace,
        env,
        encoding: "utf-8",
        // Capture stdout; stderr goes to parent process
        stdio: ["ignore", "pipe", "pipe"],
        // No timeout here — caller controls task-level time budgets
      });
      return typeof output === "string" ? output : "";
    } catch (err) {
      // Non-zero exit or spawn error — return stderr/message as output so
      // checkers can still score it (likely score 0 = skill-absent signal)
      if (err && typeof err === "object" && "stdout" in err) {
        const captured = (err as { stdout?: unknown }).stdout;
        return typeof captured === "string" ? captured : "";
      }
      return "";
    }
  };
}

/**
 * Build the real judge dispatch function.
 * Sends a grading prompt to the same vendor as live eval arms, with
 * readOnly: true (deterministic grading, temp=0 is a model-level concern).
 *
 * DATA-EGRESS: the candidate arm output is sent to the judge vendor for
 * grading. Design 016 Tier-2 flagged this for an opt-in warning; a one-line
 * console.warn is emitted on the FIRST judge dispatch within a --live run.
 */
export function buildJudgeDispatchFn(): JudgeDispatchFn {
  // Warned flag is scoped to this invocation so each runSkillsEval call warns
  // independently. A module-level flag would suppress the warning in subsequent
  // calls within the same process (e.g. tests, long-running shells).
  let judgeEgressWarned = false;
  return (gradingPrompt: string) => {
    if (!judgeEgressWarned) {
      console.warn(
        "[oma skills eval] DATA-EGRESS: candidate output is sent to the judge vendor for grading.",
      );
      judgeEgressWarned = true;
    }

    const { vendor, config } = resolveVendor("eval-agent");
    const vendorConfig = config?.vendors?.[vendor] ?? {};
    const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);

    const dispatch = planDispatch(
      "eval-agent",
      vendor,
      vendorConfig,
      promptFlag,
      gradingPrompt,
      process.env,
      { readOnly: true },
    );

    const { command, args, env } = dispatch.invocation;
    try {
      const output = execFileSync(command, args, {
        cwd: process.cwd(),
        env,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return typeof output === "string" ? output : "";
    } catch (err) {
      if (err && typeof err === "object" && "stdout" in err) {
        const captured = (err as { stdout?: unknown }).stdout;
        return typeof captured === "string" ? captured : "";
      }
      return "";
    }
  };
}

/**
 * Grade a single arm's output using an LLM judge.
 * Returns 1 (PASS) or 0 (FAIL/ambiguous). Deterministic for a fixed
 * dispatchFn — the grading prompt is structured to elicit exactly "PASS"
 * or "FAIL".
 *
 * Judge prompt format (design 016):
 *   task prompt + candidate output + rubric + "Answer with exactly PASS or FAIL"
 *
 * Verdict parsing: first occurrence of PASS → 1; FAIL → 0; ambiguous → 0.
 * When both appear, whichever is first wins.
 */
export function judgeScore(
  taskPrompt: string,
  output: string,
  rubric: string,
  dispatchFn: JudgeDispatchFn,
): 0 | 1 {
  const gradingPrompt = [
    "You are a grading judge. Evaluate whether the following output correctly answers the task.",
    "",
    "## Task prompt",
    taskPrompt,
    "",
    "## Candidate output",
    output,
    "",
    "## Grading rubric",
    rubric,
    "",
    "Answer with exactly PASS or FAIL (no other text).",
  ].join("\n");

  const response = dispatchFn(gradingPrompt);
  // Parse verdict: PASS → 1, FAIL → 0, ambiguous → 0
  const upper = response.toUpperCase();
  const passIdx = upper.indexOf("PASS");
  const failIdx = upper.indexOf("FAIL");
  if (passIdx === -1 && failIdx === -1) return 0;
  if (passIdx !== -1 && failIdx === -1) return 1;
  if (failIdx !== -1 && passIdx === -1) return 0;
  // Both present: whichever appears first in the response wins
  return passIdx < failIdx ? 1 : 0;
}

/**
 * Run TWO arms (baseline + treatment) for each task fixture using the provided
 * dispatch function. Returns a flat array of RolloutEntry[].
 *
 * - baseline: task.prompt alone (skill withheld)
 * - treatment: SKILL.md body prepended to task.prompt (skill loaded)
 *
 * For judge-checker tasks, when a judgeDispatchFn is provided the verdict
 * (0|1) is computed immediately after each arm completes and stored in
 * entry.score. This enables deterministic --mock replay without re-calling
 * the LLM (design 016 amendment 2026-06-04).
 *
 * Both arms run in a per-session temp directory for isolation; the temp dir
 * is cleaned up when cleanupTmp() is called (returned from this function).
 */
export function collectLiveRollouts(
  tasks: TaskFixture[],
  skillMdBody: string,
  dispatchFn: LiveDispatchFn,
  workspace: string,
  judgeDispatchFn?: JudgeDispatchFn,
): { rollouts: RolloutEntry[]; cleanupTmp: () => void } {
  // Create a throwaway temp workspace so arms cannot modify project files
  const tmpBase = mkdtempSync(join(tmpdir(), "oma-eval-live-"));
  const cleanupTmp = () => {
    try {
      rmSync(tmpBase, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  };

  const rollouts: RolloutEntry[] = [];

  for (const task of tasks) {
    const isJudgeTask = task.checker.type === "judge";
    const rubric = isJudgeTask
      ? ((task.checker as TaskCheckerJudge).rubric ?? JUDGE_DEFAULT_RUBRIC)
      : JUDGE_DEFAULT_RUBRIC;

    // --- Baseline arm: prompt alone (no skill context) ---
    const baselineOutput = dispatchFn("baseline", task.prompt, tmpBase);
    const baselineEntry: RolloutEntry = {
      taskId: task.id,
      arm: "baseline",
      output: baselineOutput,
    };
    if (isJudgeTask && judgeDispatchFn) {
      baselineEntry.score = judgeScore(
        task.prompt,
        baselineOutput,
        rubric,
        judgeDispatchFn,
      );
    }
    rollouts.push(baselineEntry);

    // --- Treatment arm: SKILL.md prepended to the prompt ---
    // Trust boundary: both skillMdBody (SKILL.md) and task.prompt are user-authored
    // content from the local workspace. The --live flag is an explicit opt-in; this
    // concat does not introduce external/untrusted input beyond what the user controls.
    const treatmentPrompt = skillMdBody
      ? `${skillMdBody}\n\n---\n\n${task.prompt}`
      : task.prompt;
    const treatmentOutput = dispatchFn("treatment", treatmentPrompt, tmpBase);
    const treatmentEntry: RolloutEntry = {
      taskId: task.id,
      arm: "treatment",
      output: treatmentOutput,
    };
    if (isJudgeTask && judgeDispatchFn) {
      treatmentEntry.score = judgeScore(
        task.prompt,
        treatmentOutput,
        rubric,
        judgeDispatchFn,
      );
    }
    rollouts.push(treatmentEntry);
  }

  // Pass tmpBase back as workspace context (unused after collection)
  void workspace;

  return { rollouts, cleanupTmp };
}

/**
 * Write captured rollouts to `<taskDir>/_rollouts/<hash>.json`.
 * Filename is a deterministic hash of the task ID set — no Date.now/random.
 * Entries are sorted by (taskId, arm) for byte-identical output on repeated runs.
 * Judge verdicts (entry.score) are included so --mock replay is fully offline.
 */
export function writeRolloutRecord(
  taskDir: string,
  rollouts: RolloutEntry[],
): string {
  const taskIds = [...new Set(rollouts.map((r) => r.taskId))];
  const hash = taskSetHash(taskIds);
  const rolloutsDir = join(taskDir, "_rollouts");
  mkdirSync(rolloutsDir, { recursive: true });

  // Sort entries for deterministic JSON
  const sorted = [...rollouts].sort((a, b) => {
    const idCmp = a.taskId.localeCompare(b.taskId);
    if (idCmp !== 0) return idCmp;
    return a.arm.localeCompare(b.arm);
  });

  const filePath = join(rolloutsDir, `${hash}.json`);
  writeFileSync(filePath, JSON.stringify(sorted, null, 2), "utf-8");
  return filePath;
}

/**
 * Prompt the user for a yes/no confirmation on stdin.
 * Returns a Promise<boolean> that resolves to true on "y"/"yes" (case-insensitive).
 * Resolves to false on any other input or when stdin is not a TTY.
 */
export function promptConfirm(question: string): Promise<boolean> {
  return new Promise((res) => {
    if (!process.stdin.isTTY) {
      // Non-interactive: reject by default (safe)
      res(false);
      return;
    }
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      res(
        answer.trim().toLowerCase() === "y" ||
          answer.trim().toLowerCase() === "yes",
      );
    });
  });
}

// --- Options for runSkillsEval ---

export interface SkillsEvalOptions {
  skill?: string;
  mock?: boolean;
  live?: boolean;
  /** Write captured rollouts to _rollouts/ for later --mock replay. Only meaningful with --live. */
  record?: boolean;
  /** Skip the cost-preview confirmation prompt. Only meaningful with --live. */
  yes?: boolean;
  taskDir?: string;
  maxTasks?: number;
  requireCoverage?: boolean;
  /**
   * Run negative-transfer sampling. Off by default in --mock (no neighbor data = []).
   * When set in --live, discovers same-domain neighbor tasks from other skills and
   * runs them with skill X injected to measure regression delta.
   * When set in --mock, uses recorded neighbor rollout scores (deterministic, no LLM).
   */
  negTransfer?: boolean;
  /** Injectable live dispatch function for testing. When absent, buildLiveDispatchFn is used. */
  _liveDispatchFn?: LiveDispatchFn;
  /** Injectable judge dispatch function for testing. When absent, buildJudgeDispatchFn is used in --live. */
  _judgeDispatchFn?: JudgeDispatchFn;
  /** Override for the eval root directory (for testing). When absent, resolves to .agents/eval/. */
  _evalRoot?: string;
  /**
   * Override for the workspace root (for testing). When absent, uses process.cwd().
   * This is used for path-traversal validation of --task-dir and for SKILL.md lookup.
   */
  _workspace?: string;
  /**
   * In-memory SKILL.md body to use as the treatment arm instead of reading from disk.
   * When provided, `loadSkillMdBody` is NOT called; the disk file is never accessed.
   * Intended for the `oma skills opt` optimizer, which scores candidate bodies without
   * writing them to disk. Only meaningful with --live.
   */
  skillMdOverride?: string;
}

// --- scoreSkillBody: score a candidate SKILL.md body without disk I/O ---

/**
 * Options for {@link scoreSkillBody}.
 *
 * Either `taskDir` (absolute path to a fixture directory) or `tasks` (pre-loaded
 * array) must be supplied. When both are provided, `tasks` takes precedence and
 * `taskDir` is ignored for fixture loading (rollouts are still loaded from
 * `taskDir` in mock mode).
 */
export interface ScoreSkillBodyOptions {
  /** Skill identifier used in the returned SkillUtilityReport. */
  skill: string;
  /** The candidate SKILL.md body to score (never written to disk). */
  body: string;
  /**
   * Absolute path to the task-fixture directory (used to load fixtures in mock
   * mode and to load rollout entries in both modes). Required unless `tasks`
   * is provided.
   */
  taskDir?: string;
  /**
   * Pre-loaded task fixtures. When provided, fixture loading from `taskDir` is
   * skipped. Rollouts are still loaded from `taskDir` in mock mode.
   */
  tasks?: TaskFixture[];
  /** "mock" (default) uses recorded rollouts; "live" runs agentic dispatch. */
  mode?: "mock" | "live";
  /** Cap on the number of tasks scored. */
  maxTasks?: number;
  /**
   * Injectable live dispatch function (for tests / offline determinism).
   * When absent, `buildLiveDispatchFn` is used. Only meaningful in live mode.
   */
  dispatchFn?: LiveDispatchFn;
  /**
   * Injectable judge dispatch function (for tests / offline determinism).
   * When absent, `buildJudgeDispatchFn` is used in live mode.
   */
  judgeFn?: JudgeDispatchFn;
  /**
   * Workspace root used by the live dispatch builder and for task-dir path
   * resolution. Defaults to `process.cwd()`.
   */
  workspace?: string;
}

/**
 * Score an arbitrary SKILL.md body string on a task set and return its
 * {@link SkillUtilityReport} (including `utilityLift`).
 *
 * This is the primitive that `oma skills opt` uses to score candidate bodies
 * without writing them to disk.
 *
 * - **Mock mode** (default): replays recorded rollouts from `taskDir/_rollouts/`;
 *   fully offline and deterministic. No LLM calls.
 * - **Live mode**: runs read-only agentic dispatch with the override body injected
 *   as the treatment arm. The provided `body` is used instead of `loadSkillMdBody`;
 *   the disk file is never read or written.
 *
 * Delegates all scoring to {@link computeUtility} — no duplicate logic.
 * Injectable `dispatchFn` / `judgeFn` enable deterministic offline tests.
 *
 * @param options - See {@link ScoreSkillBodyOptions}.
 * @returns A {@link SkillUtilityReport} with `utilityLift` and `decision`.
 */
export async function scoreSkillBody(
  options: ScoreSkillBodyOptions,
): Promise<SkillUtilityReport> {
  const {
    skill,
    body,
    mode = "mock",
    maxTasks,
    dispatchFn,
    judgeFn,
    workspace = process.cwd(),
  } = options;

  // Resolve task fixtures — use provided array or load from taskDir
  let tasks: TaskFixture[];
  let skippedFiles: string[] = [];

  if (options.tasks !== undefined) {
    tasks = options.tasks;
  } else if (options.taskDir !== undefined) {
    const loaded = loadTaskFixtures(options.taskDir);
    tasks = loaded.fixtures;
    skippedFiles = loaded.skippedFiles;
  } else {
    tasks = [];
  }

  if (maxTasks !== undefined && maxTasks > 0) {
    tasks = tasks.slice(0, maxTasks);
  }

  if (mode === "live") {
    const resolvedDispatchFn = dispatchFn ?? buildLiveDispatchFn(workspace);
    const resolvedJudgeFn = judgeFn ?? buildJudgeDispatchFn();

    const { rollouts, cleanupTmp } = collectLiveRollouts(
      tasks,
      body,
      resolvedDispatchFn,
      workspace,
      resolvedJudgeFn,
    );
    try {
      return computeUtility(skill, {
        tasks,
        rollouts,
        skippedFiles,
        maxTasks,
      });
    } finally {
      cleanupTmp();
    }
  }

  // Mock mode: load recorded rollouts from taskDir
  const rollouts =
    options.taskDir !== undefined ? loadRolloutEntries(options.taskDir) : [];

  return computeUtility(skill, {
    tasks,
    rollouts,
    skippedFiles,
    maxTasks,
  });
}

// --- Input validation ---

/**
 * Assert that `skillId` does not contain path traversal characters.
 * A skill ID is a simple identifier: no path separators, no `..`.
 */
function assertSafeSkillId(skillId: string): void {
  if (
    skillId.includes("..") ||
    skillId.includes("/") ||
    skillId.includes(sep)
  ) {
    throw new Error(
      `--skill must be a simple identifier (no path separators or '..'): ${skillId}`,
    );
  }
}

/**
 * Resolve `taskDir` to an absolute path and assert it stays under `workspace`.
 * Prevents directory traversal via `--task-dir ../../etc`.
 */
function resolveAndAssertTaskDir(taskDir: string, workspace: string): string {
  const resolved = resolve(taskDir);
  const workspaceResolved = resolve(workspace);
  if (
    resolved !== workspaceResolved &&
    !resolved.startsWith(workspaceResolved + sep)
  ) {
    throw new Error(
      `--task-dir must be inside the workspace root (${workspaceResolved}): got ${resolved}`,
    );
  }
  return resolved;
}

// --- Main entry point (async for --live prompt) ---

export async function runSkillsEval(
  jsonMode: boolean,
  options: SkillsEvalOptions = {},
): Promise<void> {
  const workspace = options._workspace ?? process.cwd();
  const skillId = options.skill ?? "_all";

  // Validate skill ID (no path traversal)
  try {
    assertSafeSkillId(skillId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (jsonMode) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  // Resolve and validate task directory
  let taskDir: string;
  try {
    const rawDir = options.taskDir
      ? options.taskDir
      : join(workspace, AGENTS_DIR, "eval", skillId);
    taskDir = options.taskDir
      ? resolveAndAssertTaskDir(rawDir, workspace)
      : rawDir;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (jsonMode) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  // Load task fixtures (needed for cost preview even in --live mode)
  const { fixtures: allTasks, skippedFiles } = loadTaskFixtures(taskDir);
  const tasks =
    options.maxTasks && options.maxTasks > 0
      ? allTasks.slice(0, options.maxTasks)
      : allTasks;

  // Resolve eval root for neighbor discovery (injectable for tests via _evalRoot)
  const evalRoot = options._evalRoot ?? join(workspace, AGENTS_DIR, "eval");

  // Collect the unique domains across the skill's own tasks
  const skillDomains = new Set(tasks.map((t) => t.domain));

  // --- --live path (M2) ---
  if (options.live) {
    // Resolve vendor for cost preview
    const { vendor } = resolveVendor("eval-agent");

    const armCount = tasks.length * 2;
    const judgeTaskCount = tasks.filter(
      (t) => t.checker.type === "judge",
    ).length;
    const judgeDispatchCount = judgeTaskCount * 2;
    const totalDispatches = armCount + judgeDispatchCount;

    // Cost preview (task 7)
    console.log("\nSkill eval live run preview:");
    console.log(`  skill: ${skillId}`);
    console.log(
      `  tasks: ${tasks.length}  spawns: ${armCount} arm + ${judgeDispatchCount} judge = ${totalDispatches} dispatches`,
    );
    console.log(`  vendor/model: ${vendor}`);
    console.log(`  read-only: enforced (all spawns use readOnly: true)`);
    if (options.record) {
      console.log(
        `  record: rollouts will be written to ${taskDir}/_rollouts/`,
      );
    }
    if (options.negTransfer) {
      console.log(
        `  neg-transfer: enabled — will sample same-domain neighbor tasks`,
      );
    }
    console.log();

    // Confirm unless --yes
    if (!options.yes) {
      const confirmed = await promptConfirm("Proceed? [y/N] ");
      if (!confirmed) {
        console.log("Aborted by user. No spawns issued.");
        process.exit(0);
      }
    }

    // Load SKILL.md for treatment arm.
    // When skillMdOverride is provided (e.g. from scoreSkillBody), use it directly
    // so no disk read is performed and the candidate body is scored as-is.
    const skillMdBody =
      options.skillMdOverride !== undefined
        ? options.skillMdOverride
        : skillId !== "_all"
          ? loadSkillMdBody(skillId, workspace)
          : "";

    // Dispatch functions (real or injected for tests)
    const dispatchFn =
      options._liveDispatchFn ?? buildLiveDispatchFn(workspace);
    const judgeDispatchFn = options._judgeDispatchFn ?? buildJudgeDispatchFn();

    // Run both arms per task; judge tasks get their verdict computed inline
    console.log("Running live arms...");
    const { rollouts: liveRollouts, cleanupTmp } = collectLiveRollouts(
      tasks,
      skillMdBody,
      dispatchFn,
      workspace,
      judgeDispatchFn,
    );
    let report: SkillUtilityReport;
    try {
      // Optionally record rollouts (--live --record)
      // Judge verdicts (entry.score) are persisted so --mock replay is offline.
      if (options.record) {
        const recordedPath = writeRolloutRecord(taskDir, liveRollouts);
        console.log(`Rollouts recorded: ${recordedPath}`);
      }

      // Negative-transfer sampling (--neg-transfer, live mode)
      let negativeTransfer: NegativeTransfer[] = [];
      if (options.negTransfer && skillId !== "_all") {
        // Create a temp base for neighbor dispatch (reuse cleanupTmp scope)
        const neighborTmpBase = mkdtempSync(join(tmpdir(), "oma-eval-negtx-"));
        try {
          negativeTransfer = computeNegativeTransfer(
            skillId,
            skillDomains,
            evalRoot,
            "live",
            options.maxTasks,
            skillMdBody,
            dispatchFn,
            judgeDispatchFn,
            neighborTmpBase,
          );
        } finally {
          try {
            rmSync(neighborTmpBase, { recursive: true, force: true });
          } catch {
            // best-effort cleanup
          }
        }
      }

      // Score via computeUtility (judge tasks consume entry.score from liveRollouts)
      report = computeUtility(skillId, {
        tasks,
        rollouts: liveRollouts,
        skippedFiles,
        maxTasks: options.maxTasks,
        negativeTransfer,
      });
    } finally {
      cleanupTmp();
    }

    if (jsonMode) {
      console.log(serializeSkillUtilityReport(report));
    } else {
      renderSkillUtilityReport(report);
    }

    if (report.coverage === "insufficient") {
      if (options.requireCoverage) {
        process.exit(1);
      }
      return;
    }

    if (report.decision === "fail") {
      process.exit(1);
    }

    return;
  }

  // --- --mock path (default) ---
  // Judge tasks replay recorded scores from _rollouts/; no LLM dispatch.

  const rollouts = loadRolloutEntries(taskDir);

  // Negative-transfer sampling (--neg-transfer, mock mode)
  // Uses recorded neighbor rollout scores — no LLM dispatch; fully deterministic.
  let negativeTransfer: NegativeTransfer[] = [];
  if (options.negTransfer && skillId !== "_all") {
    negativeTransfer = computeNegativeTransfer(
      skillId,
      skillDomains,
      evalRoot,
      "mock",
      options.maxTasks,
      /* skillXBody */ "",
      /* dispatchFn */ undefined,
      /* judgeDispatchFn */ undefined,
      /* tmpBase */ "",
    );
  }

  const report = computeUtility(skillId, {
    tasks,
    rollouts,
    skippedFiles,
    maxTasks: options.maxTasks,
    negativeTransfer,
  });

  if (jsonMode) {
    console.log(serializeSkillUtilityReport(report));
  } else {
    renderSkillUtilityReport(report);
  }

  // Exit codes
  if (report.coverage === "insufficient") {
    if (options.requireCoverage) {
      process.exit(1);
    }
    // No pass/fail verdict — exit 0 unless --require-coverage
    return;
  }

  if (report.decision === "fail") {
    process.exit(1);
  }
}
