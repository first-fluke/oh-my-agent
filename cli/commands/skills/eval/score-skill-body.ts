import { join } from "node:path";
import { AGENTS_DIR } from "../../../constants/paths.js";
import { resolveVendor } from "../../../platform/agent-config.js";
import {
  buildJudgeDispatchFn,
  buildLiveDispatchFn,
  resolveSkillIsolation,
} from "./dispatch.js";
import { loadRolloutEntries, loadTaskFixtures } from "./fixtures.js";
import { measureNegativeTransfer } from "./negative-transfer.js";
import { buildRolloutExpectation, collectLiveRollouts } from "./rollouts.js";
import { computeUtility } from "./scoring.js";
import type {
  IsolationStatus,
  JudgeDispatchFn,
  LiveDispatchFn,
  NegativeTransferCoverage,
  SkillUtilityReport,
  TaskFixture,
} from "./types.js";

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
  /** Attach observable task prompts and arm outputs for skill evolution. */
  includeEvidence?: boolean;
  /** Override the public MIN_TASKS gate for an internal deterministic split. */
  minimumCoverage?: number;
  /** Measure candidate interference on same-domain tasks belonging to other skills. */
  negativeTransfer?: boolean;
  /** Live only: re-measure a regressed neighbor once before it can reject a candidate. */
  confirmNegativeTransfer?: boolean;
  /**
   * Called before every live arm, neighbor arm, and judge call; may throw to
   * refuse the call (dispatch budgets). The real dispatch path and its
   * isolation status are unchanged.
   */
  beforeDispatch?: () => void;
  /** Neighbor fixtures and candidate recordings. Defaults to workspace/.agents/eval. */
  evalRoot?: string;
}

/**
 * Score an arbitrary SKILL.md body string on a task set and return its
 * {@link SkillUtilityReport} (including `utilityLift`).
 *
 * This is the primitive that `oma skill optimize` uses to score candidate bodies
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

  const evalRoot = options.evalRoot ?? join(workspace, AGENTS_DIR, "eval");
  const domains = new Set(tasks.map((task) => task.domain));
  const notRequested: NegativeTransferCoverage = {
    status: "not-requested",
    expected: 0,
    scored: 0,
  };

  if (mode === "live") {
    // Isolation status is only meaningful for the real dispatch path; an injected
    // dispatchFn (tests) bypasses runtime skill discovery entirely.
    const usingRealDispatch = dispatchFn === undefined;
    const isolationVendor = usingRealDispatch
      ? resolveVendor("eval-agent").vendor
      : undefined;
    const isolation: IsolationStatus =
      usingRealDispatch && isolationVendor
        ? resolveSkillIsolation(isolationVendor, skill)
        : "n/a";
    if (isolation !== "enforced" && isolation !== "n/a") {
      console.warn(
        `[oma skill eval] isolation: ${isolation} for vendor ${isolationVendor} — baseline may be contaminated; result is low-confidence.`,
      );
    }
    const before = options.beforeDispatch;
    const baseDispatchFn =
      dispatchFn ?? buildLiveDispatchFn(workspace, skill, before);
    const baseJudgeFn = judgeFn ?? buildJudgeDispatchFn(before);
    // Real dispatch receives the hook at its retry boundary. Injected test
    // dispatchers have no known retry semantics, so one invocation is one
    // charged dispatch.
    const resolvedDispatchFn: LiveDispatchFn =
      dispatchFn && before
        ? (arm, prompt, armWorkspace) => {
            before();
            return baseDispatchFn(arm, prompt, armWorkspace);
          }
        : baseDispatchFn;
    const resolvedJudgeFn: JudgeDispatchFn =
      judgeFn && before
        ? (gradingPrompt) => {
            before();
            return baseJudgeFn(gradingPrompt);
          }
        : baseJudgeFn;

    const { rollouts, cleanupTmp } = await collectLiveRollouts(
      tasks,
      body,
      resolvedDispatchFn,
      workspace,
      resolvedJudgeFn,
    );
    try {
      const transfer = options.negativeTransfer
        ? await measureNegativeTransfer({
            skill,
            domains,
            evalRoot,
            mode,
            maxTasks,
            body,
            dispatchFn: resolvedDispatchFn,
            judgeFn: resolvedJudgeFn,
            confirmRegressions: options.confirmNegativeTransfer,
          })
        : { entries: [], coverage: notRequested };
      return computeUtility(skill, {
        tasks,
        rollouts,
        skippedFiles,
        maxTasks,
        isolation,
        isolationVendor,
        includeEvidence: options.includeEvidence,
        minimumCoverage: options.minimumCoverage,
        negativeTransfer: transfer.entries,
        negativeTransferCoverage: transfer.coverage,
      });
    } finally {
      cleanupTmp();
    }
  }

  // Mock mode: load recorded rollouts from taskDir.
  //
  // Validated against `body` — the candidate being scored. A recording made
  // against a different body cannot stand in for this one, so it is discarded
  // and the candidate reports as uncovered rather than borrowing another body's
  // score. In practice this means `oma skill optimize --mock` can only score the
  // exact body its rollouts were recorded from; scoring fresh candidates needs
  // `--live`.
  const rollouts =
    options.taskDir !== undefined
      ? loadRolloutEntries(
          options.taskDir,
          buildRolloutExpectation(tasks, body),
        )
      : [];

  const transfer = options.negativeTransfer
    ? await measureNegativeTransfer({
        skill,
        domains,
        evalRoot,
        mode,
        maxTasks,
        body,
      })
    : { entries: [], coverage: notRequested };
  return computeUtility(skill, {
    tasks,
    rollouts,
    skippedFiles,
    maxTasks,
    includeEvidence: options.includeEvidence,
    minimumCoverage: options.minimumCoverage,
    negativeTransfer: transfer.entries,
    negativeTransferCoverage: transfer.coverage,
  });
}
