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
/**
 * Isolation status for a live eval run.
 *
 * - `"enforced"` — cwd-relative vendor, target skill absent from HOME path; clean
 *   tmpBase fully hides the skill.
 * - `"best-effort"` — cwd-relative vendor but a HOME copy of the skill also exists;
 *   tmpBase hides the project copy but the HOME copy remains visible to the CLI.
 * - `"unavailable"` — HOME-based vendor (e.g. antigravity, hermes) where cwd cannot
 *   isolate; baseline may be contaminated.
 * - `"n/a"` — mock mode or no live dispatch; not applicable.
 */
export type IsolationStatus =
  | "enforced"
  | "best-effort"
  | "unavailable"
  | "n/a";

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
  /**
   * Isolation status for the live dispatch arms. Set to `"n/a"` in mock mode.
   * When `"best-effort"` or `"unavailable"`, the result is low-confidence
   * (baseline may be contaminated by the target skill).
   */
  isolation: IsolationStatus;
  /** Vendor resolved for live dispatch. Undefined in mock mode. */
  isolationVendor?: string;
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

// --- Dispatch function types ---

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
