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
import {
  discoverNeighborTasks,
  measureNegativeTransfer,
} from "./eval/negative-transfer.js";
import {
  renderSkillUtilityReport,
  serializeSkillUtilityReport,
} from "./eval/report.js";
import {
  buildRolloutExpectation,
  collectLiveRollouts,
  loadSkillMdBody,
  MAX_TRIALS,
  promptConfirm,
  writeRolloutRecord,
} from "./eval/rollouts.js";
import {
  catalogHash,
  loadRoutingRecord,
  loadSkillCatalog,
  measureRouting,
  type RoutingEntry,
  type SkillRoutingSummary,
  summarizeRouting,
  writeRoutingRecord,
} from "./eval/routing.js";
import { computeUtility } from "./eval/scoring.js";
import type {
  IsolationStatus,
  NegativeTransferCoverage,
  SkillsEvalOptions,
  SkillUtilityReport,
  TaskFixture,
} from "./eval/types.js";

// --- Re-exports (module facade; original public API surface) ---

export {
  buildJudgeDispatchFn,
  buildLiveDispatchFn,
  isolateEvalMemory,
  isolateEvalRuntime,
  resolveSkillIsolation,
  runEvalDispatch,
  setupIsolatedSkillsDir,
} from "./eval/dispatch.js";
export {
  assessRolloutStaleness,
  loadRolloutEntries,
  loadTaskFixtures,
} from "./eval/fixtures.js";
export {
  computeNegativeTransfer,
  discoverNeighborTasks,
  measureNegativeTransfer,
  negativeTransferRecordDir,
  negativeTransferTaskHash,
  scoreNeighborInLive,
  scoreNeighborInMock,
} from "./eval/negative-transfer.js";
export {
  renderSkillUtilityReport,
  serializeSkillUtilityReport,
} from "./eval/report.js";
export {
  buildRolloutExpectation,
  collectLiveRollouts,
  contentHash,
  judgeScore,
  judgeVerdict,
  loadSkillMdBody,
  parseJudgeVerdict,
  promptConfirm,
  taskFixtureHash,
  taskSetHash,
  writeRolloutRecord,
} from "./eval/rollouts.js";
export type { ScoreSkillBodyOptions } from "./eval/score-skill-body.js";
export { scoreSkillBody } from "./eval/score-skill-body.js";
export type { ComputeUtilityOptions } from "./eval/scoring.js";
export {
  computeUtility,
  pairedLiftInterval,
  scoreChecker,
} from "./eval/scoring.js";
export type {
  IsolationStatus,
  JudgeDispatchFn,
  LiveDispatchFn,
  LoadTaskFixturesResult,
  NegativeTransfer,
  NegativeTransferCoverage,
  RolloutEntry,
  RolloutExpectation,
  RolloutStaleReason,
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
  SKILL_EVAL_PROTOCOL_REVISION,
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

function attachRouting(
  report: SkillUtilityReport,
  tasks: TaskFixture[],
  entries: RoutingEntry[],
  status: SkillRoutingSummary["status"],
  catalogSize: number,
): void {
  report.routing = summarizeRouting(tasks, entries, status, catalogSize);
  const byTask = new Map(entries.map((entry) => [entry.taskId, entry]));
  for (const finding of report.findings) {
    const entry = byTask.get(finding.taskId);
    if (entry) finding.routing = entry.outcome;
  }
}

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
  const notRequested: NegativeTransferCoverage = {
    status: "not-requested",
    expected: 0,
    scored: 0,
  };

  // --- --live path (M2) ---
  if (options.live) {
    // Resolve vendor for cost preview
    const { vendor } = resolveVendor("eval-agent");

    const neighbors =
      options.negTransfer && skillId !== "_all"
        ? discoverNeighborTasks(skillId, skillDomains, evalRoot)
        : [];
    const sampledNeighbors =
      options.maxTasks && options.maxTasks > 0
        ? neighbors.slice(0, options.maxTasks)
        : neighbors;
    const previewTasks = [
      ...tasks,
      ...sampledNeighbors.map((neighbor) => neighbor.task),
    ];
    const trials = options.trials ?? 1;
    if (!Number.isInteger(trials) || trials < 1 || trials > MAX_TRIALS) {
      throw new Error(
        `--trials must be an integer between 1 and ${MAX_TRIALS}`,
      );
    }
    // Neighbor (negative-transfer) tasks run once; only target tasks repeat.
    const armCount = tasks.length * 2 * trials + sampledNeighbors.length * 2;
    const judgeTaskCount = previewTasks.filter(
      (t) => t.checker.type === "judge",
    ).length;
    const judgeDispatchCount =
      tasks.filter((t) => t.checker.type === "judge").length * 2 * trials +
      (judgeTaskCount -
        tasks.filter((t) => t.checker.type === "judge").length) *
        2;
    const routingDispatchCount =
      options.routing && skillId !== "_all" ? tasks.length : 0;
    const totalDispatches =
      armCount + judgeDispatchCount + routingDispatchCount;

    // Cost preview (task 7)
    console.log("\nSkill eval live run preview:");
    console.log(`  skill: ${skillId}`);
    console.log(
      `  tasks: ${tasks.length}  trials: ${trials}  spawns: ${armCount} arm + ${judgeDispatchCount} judge${routingDispatchCount ? ` + ${routingDispatchCount} routing` : ""} = ${totalDispatches} dispatches`,
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
        `[oma skill eval] isolation: ${isolation} for vendor ${isolationVendor} — baseline may be contaminated; result is low-confidence.`,
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
      trials,
    );
    let report: SkillUtilityReport;
    try {
      // Optionally record rollouts (--live --record)
      // Judge verdicts (entry.score) are persisted so --mock replay is offline.
      if (options.record) {
        const recordedPath = writeRolloutRecord(taskDir, liveRollouts);
        console.log(`Rollouts recorded: ${recordedPath}`);
      }

      const transfer =
        options.negTransfer && skillId !== "_all"
          ? measureNegativeTransfer({
              skill: skillId,
              domains: skillDomains,
              evalRoot,
              mode: "live",
              maxTasks: options.maxTasks,
              body: skillMdBody,
              dispatchFn,
              judgeFn: judgeDispatchFn,
              record: options.record,
            })
          : {
              entries: [],
              coverage: options.negTransfer
                ? { status: "insufficient" as const, expected: 0, scored: 0 }
                : notRequested,
            };

      // Score via computeUtility (judge tasks consume entry.score from liveRollouts)
      report = computeUtility(skillId, {
        tasks,
        rollouts: liveRollouts,
        skippedFiles,
        maxTasks: options.maxTasks,
        negativeTransfer: transfer.entries,
        negativeTransferCoverage: transfer.coverage,
        isolation,
        isolationVendor,
      });

      // Routing (activation): which skill would be loaded for each task, given
      // every installed description. Measured with the baseline dispatch so the
      // target body stays withheld.
      if (options.routing) {
        if (skillId === "_all") {
          attachRouting(report, tasks, [], "unavailable", 0);
        } else {
          const catalog = loadSkillCatalog(workspace);
          const hash = catalogHash(catalog);
          const routingBase = mkdtempSync(join(tmpdir(), "oma-eval-routing-"));
          let entries: RoutingEntry[] = [];
          try {
            entries = measureRouting({
              tasks,
              target: skillId,
              catalog,
              dispatchFn,
              workspace: routingBase,
            });
          } finally {
            rmSync(routingBase, { recursive: true, force: true });
          }
          if (options.record)
            console.log(
              `Routing recorded: ${writeRoutingRecord(taskDir, skillId, hash, entries)}`,
            );
          attachRouting(
            report,
            tasks,
            entries,
            entries.length === tasks.length ? "measured" : "stale",
            catalog.length,
          );
        }
      }
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

    if (
      options.requireCoverage &&
      report.negativeTransferCoverage?.status === "insufficient"
    ) {
      process.exit(1);
    }
    if (report.decision === "fail") {
      process.exit(1);
    }

    return;
  }

  // --- --mock path (default) ---
  // Judge tasks replay recorded scores from _rollouts/; no LLM dispatch.

  // Replay is only sound while the recorded inputs still match what is on disk.
  // `_all` has no single SKILL.md body, so body validation is skipped there and
  // task/evaluator contracts and prompt drift are still checked.
  const mockSkillMdBody =
    options.skillMdOverride !== undefined
      ? options.skillMdOverride
      : skillId !== "_all"
        ? loadSkillMdBody(skillId, workspace)
        : undefined;
  const rollouts = loadRolloutEntries(
    taskDir,
    buildRolloutExpectation(tasks, mockSkillMdBody),
  );

  const transfer =
    options.negTransfer && skillId !== "_all"
      ? measureNegativeTransfer({
          skill: skillId,
          domains: skillDomains,
          evalRoot,
          mode: "mock",
          maxTasks: options.maxTasks,
          body: mockSkillMdBody ?? "",
        })
      : {
          entries: [],
          coverage: options.negTransfer
            ? { status: "insufficient" as const, expected: 0, scored: 0 }
            : notRequested,
        };

  const report = computeUtility(skillId, {
    tasks,
    rollouts,
    skippedFiles,
    maxTasks: options.maxTasks,
    negativeTransfer: transfer.entries,
    negativeTransferCoverage: transfer.coverage,
  });
  if (options.routing) {
    if (skillId === "_all") {
      attachRouting(report, tasks, [], "unavailable", 0);
    } else {
      const catalog = loadSkillCatalog(workspace);
      const recorded = loadRoutingRecord(
        taskDir,
        skillId,
        catalogHash(catalog),
        tasks,
      );
      attachRouting(
        report,
        tasks,
        recorded.entries,
        recorded.status,
        catalog.length,
      );
    }
  }

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

  if (
    options.requireCoverage &&
    report.negativeTransferCoverage?.status === "insufficient"
  ) {
    process.exit(1);
  }
  if (report.decision === "fail") {
    process.exit(1);
  }
}
