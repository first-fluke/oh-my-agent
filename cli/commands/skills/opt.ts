import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { AGENTS_DIR } from "../../constants/paths.js";
import { loadTaskFixtures, MIN_TASKS, scoreSkillBody } from "./eval.js";
import { confirmLiveRun } from "./opt/cost-preview.js";
import { splitTrainVal, validateCandidate } from "./opt/edits.js";
import { runOptEpochLoop } from "./opt/epoch-loop.js";
import { buildLlmOptimizerFn } from "./opt/llm-optimizer.js";
import { renderSkillOptResult, serializeSkillOptResult } from "./opt/render.js";
import {
  assertSafeSkillId,
  isOmaOwnedSkill,
  resolveSkillMdPath,
} from "./opt/skill-files.js";
import type {
  OptimizerFn,
  ScoringFn,
  SkillOptResult,
  SkillsOptOptions,
} from "./opt/types.js";
import {
  OPT_EDITS_PER_EPOCH,
  OPT_LR_MAX_CHARS,
  OPT_MAX_EPOCHS,
} from "./opt/types.js";

// --- Re-exported public API (module entry point) ---

export {
  confirmLiveRun,
  estimateLiveDispatchCalls,
} from "./opt/cost-preview.js";
export { unifiedDiff } from "./opt/diff.js";
export { applyEdit, splitTrainVal, validateCandidate } from "./opt/edits.js";
export { runOptEpochLoop } from "./opt/epoch-loop.js";
export {
  buildLlmOptimizerFn,
  parseOptimizerEdits,
} from "./opt/llm-optimizer.js";
export {
  renderSkillOptResult,
  serializeSkillOptResult,
} from "./opt/render.js";
export {
  backupSkillMd,
  isOmaOwnedSkill,
  resolveSkillMdPath,
} from "./opt/skill-files.js";
export {
  OPT_EARLY_STOP_PATIENCE,
  OPT_EDITS_PER_EPOCH,
  OPT_LR_MAX_CHARS,
  OPT_MAX_EPOCHS,
  OPT_TRAIN_VAL_SPLIT,
  type OptEpoch,
  type OptimizerFn,
  type ScoringFn,
  type SkillEdit,
  type SkillOptResult,
  type SkillsOptOptions,
} from "./opt/types.js";

import { backupSkillMd } from "./opt/skill-files.js";

// --- Main entry point ---

/**
 * CLI entry point for `oma skills opt`.
 *
 * M3 scope: full OUTPUT layer (tasks 7–8).
 * - Resolves skill's eval task directory and loads fixtures.
 * - Errors with a clear message (non-zero exit) when < MIN_TASKS fixtures exist.
 * - Splits fixtures into train/val sets.
 * - --live: prints cost preview + requires confirmation unless --yes.
 * - Runs the optimization epoch loop using injectable optimizer + scoring functions.
 * - --dry-run (default): prints diff + lift change, writes nothing.
 * - --apply: backs up original SKILL.md to .bak, writes finalSkillMd only when
 *   finalLift > baselineLift AND validateCandidate passes.
 *   - oma-owned skills (oma-*): requires --yes to proceed, otherwise warns + refuses.
 */
export async function runSkillsOpt(
  jsonMode: boolean,
  options: SkillsOptOptions = {},
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

  // Resolve task directory
  const taskDir =
    options._taskDir ?? join(workspace, AGENTS_DIR, "eval", skillId);

  // Load task fixtures
  const { fixtures } = loadTaskFixtures(taskDir);

  // Hard check: need at least MIN_TASKS fixtures for a meaningful train/val split
  if (fixtures.length < MIN_TASKS) {
    const message = `[oma skills opt] no eval coverage for skill "${skillId}": found ${fixtures.length} task fixture(s), need at least ${MIN_TASKS}. Author tasks first — see web/docs/guide/skill-eval.md`;
    if (jsonMode) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  // Split train/val deterministically
  const { train, val } = splitTrainVal(fixtures);

  // Resolve effective options (--dry-run is the default when neither flag is set)
  const apply = options.apply === true;
  const dryRun = !apply;
  const isLive = options.live === true;
  const yes = options.yes === true;
  const mode: "mock" | "live" = isLive ? "live" : "mock";

  const maxEpochs = options.maxEpochs ?? OPT_MAX_EPOCHS;
  const editsPerEpoch = options.editsPerEpoch ?? OPT_EDITS_PER_EPOCH;
  const lrMaxChars = options.lr ?? OPT_LR_MAX_CHARS;

  // --- Live cost preview + confirmation (T7) ---
  if (isLive) {
    const proceed = await confirmLiveRun(
      maxEpochs,
      editsPerEpoch,
      yes,
      options._readline,
    );
    if (!proceed) {
      if (!jsonMode) {
        console.log("[oma skills opt] aborted: user declined live run.");
      } else {
        console.log(
          JSON.stringify(
            { aborted: true, reason: "user declined live cost preview" },
            null,
            2,
          ),
        );
      }
      return; // exit 0 — no dispatch
    }
  }

  // Resolve injectable functions (for test / mock determinism)
  const optimizerFn: OptimizerFn =
    options._optimizerFn ?? buildLlmOptimizerFn(editsPerEpoch);
  const scoringFn: ScoringFn = options._scoringFn ?? scoreSkillBody;

  // Load original SKILL.md body (for diff and baseline).
  // When _skillMdPath is injected (tests), read from there; otherwise use
  // the standard installed-skills resolution via loadSkillMdBody.
  let originalBody: string;
  if (options._skillMdPath) {
    originalBody = existsSync(options._skillMdPath)
      ? readFileSync(options._skillMdPath, "utf-8")
      : "";
  } else {
    const { loadSkillMdBody } = await import("./eval.js");
    originalBody = loadSkillMdBody(skillId, workspace);
  }

  // Run the optimization epoch loop
  const loopResult = await runOptEpochLoop({
    skillId,
    originalBody,
    trainTasks: train,
    valTasks: val,
    taskDir,
    mode,
    maxEpochs,
    lrMaxChars,
    optimizerFn,
    scoringFn,
  });

  // --- Output layer (T7): --dry-run vs --apply ---

  let finalResult: SkillOptResult = { ...loopResult, applied: false };

  if (apply) {
    const hasImprovement = loopResult.finalLift > loopResult.baselineLift;
    const validation = validateCandidate(loopResult.finalSkillMd);

    if (!hasImprovement) {
      // No real improvement — write nothing
      const noImpMsg = `[oma skills opt] no improving edit found (finalLift ${loopResult.finalLift.toFixed(4)} <= baselineLift ${loopResult.baselineLift.toFixed(4)}); nothing written.`;
      if (!jsonMode) {
        console.log(noImpMsg);
        renderSkillOptResult(finalResult);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              _noImprovement: true,
              _split: { trainCount: train.length, valCount: val.length },
            },
            null,
            2,
          ),
        );
      }
      return;
    }

    if (!validation.ok) {
      // Candidate failed validation — write nothing
      const validMsg = `[oma skills opt] candidate failed validation (${validation.reason}); nothing written.`;
      if (!jsonMode) {
        console.error(validMsg);
        renderSkillOptResult(finalResult);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              _validationFailed: true,
              _validationReason: validation.reason,
              _split: { trainCount: train.length, valCount: val.length },
            },
            null,
            2,
          ),
        );
      }
      return;
    }

    // --- oma-owned guard ---
    if (isOmaOwnedSkill(skillId) && !yes) {
      const warnMsg =
        `[oma skills opt] WARNING: "${skillId}" is an oma-owned skill. ` +
        `oma-owned skills are overwritten by \`oma update\` — applying edits here may be lost. ` +
        `Re-run with --yes to proceed, or use --dry-run to review the proposed diff.`;
      if (!jsonMode) {
        console.warn(warnMsg);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              _omaOwnedRefused: true,
              _split: { trainCount: train.length, valCount: val.length },
            },
            null,
            2,
          ),
        );
      }
      return;
    }

    // --- Write the improved SKILL.md ---
    const skillMdPath =
      options._skillMdPath ?? resolveSkillMdPath(skillId, workspace);

    // Ensure the skill directory exists (in case it is brand-new)
    const skillDir = dirname(skillMdPath);
    mkdirSync(skillDir, { recursive: true });

    // Backup original BEFORE touching the live file
    if (existsSync(skillMdPath)) {
      backupSkillMd(skillMdPath);
    }

    // Atomic write: write to a sibling .tmp file on the SAME filesystem,
    // then rename into place. On POSIX, rename(2) is atomic — the live
    // SKILL.md is never in a truncated/partial state even if the process
    // is killed between the writeFileSync and the renameSync.
    const tmpPath = `${skillMdPath}.tmp`;
    writeFileSync(tmpPath, loopResult.finalSkillMd, "utf-8");
    renameSync(tmpPath, skillMdPath);

    finalResult = { ...loopResult, applied: true };

    if (!jsonMode) {
      console.log(
        `[oma skills opt] applied: wrote ${skillMdPath} (backup created).`,
      );
      renderSkillOptResult(finalResult);
    } else {
      console.log(
        JSON.stringify(
          {
            ...JSON.parse(serializeSkillOptResult(finalResult)),
            _dryRun: false,
            _split: { trainCount: train.length, valCount: val.length },
          },
          null,
          2,
        ),
      );
    }
    return;
  }

  // --- dry-run (default): print diff + lift, write nothing ---
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ...JSON.parse(serializeSkillOptResult(finalResult)),
          _dryRun: dryRun,
          _split: { trainCount: train.length, valCount: val.length },
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `[oma skills opt] skill: ${skillId}, tasks: ${fixtures.length} (train: ${train.length}, val: ${val.length}), dry-run: ${dryRun}`,
    );
    renderSkillOptResult(finalResult);
  }
}
