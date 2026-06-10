import { resolveVendor } from "../../../platform/agent-config.js";
import {
  buildJudgeDispatchFn,
  buildLiveDispatchFn,
  resolveSkillIsolation,
} from "./dispatch.js";
import { loadRolloutEntries, loadTaskFixtures } from "./fixtures.js";
import { collectLiveRollouts } from "./rollouts.js";
import { computeUtility } from "./scoring.js";
import type {
  IsolationStatus,
  JudgeDispatchFn,
  LiveDispatchFn,
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
        `[oma skills eval] isolation: ${isolation} for vendor ${isolationVendor} — baseline may be contaminated; result is low-confidence.`,
      );
    }
    const resolvedDispatchFn =
      dispatchFn ?? buildLiveDispatchFn(workspace, skill);
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
        isolation,
        isolationVendor,
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
