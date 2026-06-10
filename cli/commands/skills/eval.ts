import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { AGENTS_DIR } from "../../constants/paths.js";
import { resolveVendor } from "../../platform/agent-config.js";
import {
  buildJudgeDispatchFn,
  buildLiveDispatchFn,
  resolveSkillIsolation,
} from "./eval/dispatch.js";
import { loadRolloutEntries, loadTaskFixtures } from "./eval/fixtures.js";
import { computeNegativeTransfer } from "./eval/negative-transfer.js";
import {
  renderSkillUtilityReport,
  serializeSkillUtilityReport,
} from "./eval/report.js";
import {
  collectLiveRollouts,
  loadSkillMdBody,
  promptConfirm,
  writeRolloutRecord,
} from "./eval/rollouts.js";
import { computeUtility } from "./eval/scoring.js";
import type {
  IsolationStatus,
  NegativeTransfer,
  SkillsEvalOptions,
  SkillUtilityReport,
} from "./eval/types.js";

// --- Re-exports (module facade; original public API surface) ---

export {
  buildJudgeDispatchFn,
  buildLiveDispatchFn,
  resolveSkillIsolation,
  runEvalDispatch,
  setupIsolatedSkillsDir,
} from "./eval/dispatch.js";
export { loadRolloutEntries, loadTaskFixtures } from "./eval/fixtures.js";
export {
  computeNegativeTransfer,
  discoverNeighborTasks,
  scoreNeighborInLive,
  scoreNeighborInMock,
} from "./eval/negative-transfer.js";
export {
  renderSkillUtilityReport,
  serializeSkillUtilityReport,
} from "./eval/report.js";
export {
  collectLiveRollouts,
  judgeScore,
  loadSkillMdBody,
  promptConfirm,
  taskSetHash,
  writeRolloutRecord,
} from "./eval/rollouts.js";
export type { ScoreSkillBodyOptions } from "./eval/score-skill-body.js";
export { scoreSkillBody } from "./eval/score-skill-body.js";
export type { ComputeUtilityOptions } from "./eval/scoring.js";
export { computeUtility, scoreChecker } from "./eval/scoring.js";
export type {
  IsolationStatus,
  JudgeDispatchFn,
  LiveDispatchFn,
  LoadTaskFixturesResult,
  NegativeTransfer,
  RolloutEntry,
  SkillsEvalOptions,
  SkillUtilityFinding,
  SkillUtilityReport,
  TaskChecker,
  TaskCheckerAssert,
  TaskCheckerJudge,
  TaskCheckerRegex,
  TaskFixture,
} from "./eval/types.js";
export {
  JUDGE_DEFAULT_RUBRIC,
  MIN_TASKS,
  NEG_TRANSFER_FAIL,
  REGEX_OUTPUT_MAX_LEN,
  REGEX_PATTERN_MAX_LEN,
  SKILLEVAL_MOCK_ENV,
  UTILITY_FAIL_LIFT,
  UTILITY_WARN_LIFT,
} from "./eval/types.js";

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

    // Skill isolation (plan 013): exclude the target skill from runtime discovery
    // for BOTH arms. Only meaningful for the real dispatch path and a single skill
    // (not the `_all` aggregate, which has no single target to withhold).
    const targetSkill = skillId !== "_all" ? skillId : undefined;
    const usingRealDispatch = options._liveDispatchFn === undefined;
    const isolationVendor = usingRealDispatch
      ? resolveVendor("eval-agent").vendor
      : undefined;
    const isolation: IsolationStatus =
      usingRealDispatch && isolationVendor && targetSkill
        ? resolveSkillIsolation(isolationVendor, targetSkill)
        : "n/a";
    if (isolation !== "enforced" && isolation !== "n/a") {
      console.warn(
        `[oma skills eval] isolation: ${isolation} for vendor ${isolationVendor} — baseline may be contaminated; result is low-confidence.`,
      );
    }

    // Dispatch functions (real or injected for tests)
    const dispatchFn =
      options._liveDispatchFn ?? buildLiveDispatchFn(workspace, targetSkill);
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
        isolation,
        isolationVendor,
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
