import type { DispatchResult, DispatchUsage } from "./envelope.js";
import type { RoutingOutcome, SkillRoutingSummary } from "./routing.js";
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

/** Bump when scorer semantics, judge prompt/parsing, or implicit evaluator behavior changes. */
export const SKILL_EVAL_PROTOCOL_REVISION = "2";

// --- Interfaces (design 016) ---

export interface SkillUtilityFinding {
  taskId: string;
  /** Mean over trials; a single-trial arm is its own mean. */
  baseline: number;
  treatment: number;
  lift: number;
  /** Complete paired trials behind this finding; absent means one. */
  trials?: number;
  /** Standard deviation of the per-trial lift; absent or 0 for a single trial. */
  liftStdDev?: number;
  /** Which skill the routing arm chose for this task, when routing was measured. */
  routing?: RoutingOutcome;
  /**
   * Observable evidence for skill evolution. Present only when the scorer is
   * explicitly asked for it; public eval serialization intentionally omits it.
   */
  evidence?: {
    domain: string;
    prompt: string;
    checker: TaskChecker;
    baselineOutput: string;
    treatmentOutput: string;
  };
}

export interface NegativeTransfer {
  otherSkill: string;
  domain: string;
  /** Mean paired delta over `trials` comparisons (1 unless a regression was re-measured). */
  delta: number;
  taskId?: string;
  candidateSkill?: string;
  skillBodyHash?: string;
  /** Number of paired comparisons behind `delta`. */
  trials?: number;
  /**
   * Set only when the first comparison regressed and was re-measured:
   * `true` when the repeat also regressed, `false` when it did not.
   */
  confirmed?: boolean;
}

export interface NegativeTransferCoverage {
  status: "measured" | "insufficient" | "not-requested";
  expected: number;
  scored: number;
  /** `cross-domain` means no same-domain neighbor existed and a bounded sample of other domains was used. */
  scope?: "same-domain" | "cross-domain";
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

/**
 * Whether the measured lift is repeatable. Task-level variation gives the
 * paired confidence interval; repeated trials give within-task variation.
 */
export interface SkillRepeatability {
  /** Complete paired trials common to every scored task. */
  trials: number;
  /** Paired 95% t-interval over task-level lifts; null below two scored tasks. */
  liftCi95: { lower: number; upper: number } | null;
  /** Mean per-task standard deviation of per-trial lift; null for a single trial. */
  withinTaskStdDev: number | null;
  /**
   * `single-trial`: no rerun evidence. `stable`: repeated trials and the
   * interval excludes zero on the lift's side. `unstable`: repeated trials but
   * the interval includes zero. `unavailable`: insufficient coverage.
   */
  status: "single-trial" | "stable" | "unstable" | "unavailable";
}

export interface SkillUsageSummary {
  status: "actual" | "partial" | "unknown";
  dispatches: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  judge: {
    status: "actual" | "partial" | "unknown";
    dispatches: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}

export interface SkillUtilityReport {
  skill: string;
  taskCount: number;
  skippedFiles: string[];
  baselineScore: number;
  treatmentScore: number;
  utilityLift: number;
  utilityStdDev: number;
  /** Always set by computeUtility; absent only on hand-built reports. */
  repeatability?: SkillRepeatability;
  /** Description-level activation measurement; absent unless --routing. */
  routing?: SkillRoutingSummary;
  /**
   * Tokens and cost behind the scored arms and their judge calls, summed from
   * what the vendor reported. `partial` means some dispatches reported nothing.
   */
  usage?: SkillUsageSummary;
  findings: SkillUtilityFinding[];
  negativeTransfer: NegativeTransfer[];
  /** A requested check is measured only when every selected neighbor was scored. */
  negativeTransferCoverage?: NegativeTransferCoverage;
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
  /**
   * Optional family label. Fixtures sharing a group are kept in the same
   * optimization partition so a near-duplicate cannot leak from train to test.
   */
  group?: string;
}

// --- Rollout fixture schema ---

export interface RolloutEntry {
  taskId: string;
  arm: "baseline" | "treatment";
  output: string;
  /** Zero-based repetition index when an arm ran more than once; absent means 0. */
  trial?: number;
  /**
   * Recorded judge verdict for this arm (0 = FAIL, 1 = PASS).
   * Written when the task uses a judge checker and `--live --record` is set.
   * During `--mock`, this replaces a live judge call so mock mode stays
   * deterministic and fully offline (design 016 amendment 2026-06-04).
   */
  score?: 0 | 1;
  /** Judge text behind `score`, unwrapped and bounded; absent for non-judge tasks. */
  judgeResponse?: string;
  /** Tokens and cost of this arm's dispatch, when the vendor reported them. */
  usage?: DispatchUsage;
  /** Tokens and cost of the judge call behind `score`. */
  judgeUsage?: DispatchUsage;
  /**
   * Provenance: `contentHash` of the SKILL.md body prepended to the treatment
   * prompt at record time. Recorded on `arm: "treatment"` only — the baseline
   * arm withholds the skill, so its output cannot depend on the body.
   *
   * `--mock` compares this against the current body and discards the entry on
   * mismatch. Without it, editing SKILL.md silently replays the previous body's
   * score as if it measured the current one.
   */
  skillBodyHash?: string;
  /**
   * Provenance: `contentHash` of `task.prompt` at record time. Recorded on both
   * arms — both embed the prompt. Lets `--mock` discard entries whose fixture
   * prompt has since been edited.
   */
  promptHash?: string;
  /** Skill whose interference was measured; distinct from the task's own skill. */
  candidateSkill?: string;
  /** Links the two arms of one fresh negative-transfer comparison. */
  comparisonId?: string;
  /** Hash of the task, effective checker/default rubric, and evaluator protocol revision. */
  taskHash?: string;
}

/**
 * Expected provenance for a rollout replay, supplied by the caller that knows
 * what is currently on disk. Passed to `loadRolloutEntries` to reject stale
 * recordings.
 *
 * Each field is independently optional: omit one to skip that dimension when
 * the caller genuinely cannot know it (e.g. the `_all` aggregate has no single
 * SKILL.md body). Omitting all fields disables validation entirely and restores the
 * pre-provenance load behaviour.
 */
export interface RolloutExpectation {
  /**
   * `contentHash` of the SKILL.md body being evaluated. Treatment entries
   * recorded under a different body are discarded.
   */
  skillBodyHash?: string;
  /**
   * taskId → `contentHash` of the current fixture prompt. Entries whose taskId
   * is absent from the map are not prompt-validated (the caller did not load
   * that fixture, so it has nothing to compare against).
   */
  promptHashes?: Map<string, string>;
  /** taskId → current full task/evaluator contract hash. Required for scored replay. */
  taskHashes?: Map<string, string>;
}

/** Why a recorded rollout entry was rejected during replay. */
export type RolloutStaleReason =
  | "missing-provenance"
  | "skill-body-changed"
  | "prompt-changed"
  | "task-changed";

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
) => DispatchResult;

/**
 * Judge dispatch function type — injectable for tests.
 * Accepts a complete grading prompt and returns the raw LLM response string.
 */
export type JudgeDispatchFn = (gradingPrompt: string) => DispatchResult;

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
  /**
   * Repeat every arm this many times (1-10) in --live. Trials alternate arm
   * order; scores are averaged per task and reported with a paired interval.
   */
  trials?: number;
  /**
   * Measure activation: ask the model which installed skill it would load for
   * each task given every skill's description. Live measures; mock replays a
   * routing recording made under the same catalog.
   */
  routing?: boolean;
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
   * Intended for the `oma skill optimize` optimizer, which scores candidate bodies without
   * writing them to disk. Only meaningful with --live.
   */
  skillMdOverride?: string;
}
