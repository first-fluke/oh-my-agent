import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { AGENTS_DIR } from "../../constants/paths.js";
import { getProtectedTextCapability } from "../../io/protected-text.js";
import { resolveVendor } from "../../platform/agent-config.js";
import { createNoneMemoryProvider } from "../../state/memory-provider.js";
import { createMemoryProvider } from "../../state/semantic-memory.js";
import { SKILL_EVAL_PROTOCOL_REVISION } from "./eval/types.js";
import {
  discoverNeighborTasks,
  loadTaskFixtures,
  MIN_TASKS,
  scoreSkillBody,
} from "./eval.js";
import {
  createDispatchMeter,
  meterCall,
  meterScoringFn,
} from "./opt/budget.js";
import { confirmLiveRun } from "./opt/cost-preview.js";
import { editKey, splitTrainValTest, validateCandidate } from "./opt/edits.js";
import { runOptEpochLoop } from "./opt/epoch-loop.js";
import {
  createSkillEvolutionRecorder,
  skillEvolutionEnvironmentHash,
} from "./opt/evolution-memory.js";
import { recordSkillPromotion } from "./opt/lineage.js";
import { buildLlmOptimizerFn } from "./opt/llm-optimizer.js";
import {
  buildHeuristicMaintainerFn,
  buildLlmMaintainerFn,
} from "./opt/maintainer.js";
import { loadEvolutionProcedure } from "./opt/procedure.js";
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
export {
  applyEdit,
  splitTrainVal,
  splitTrainValTest,
  validateCandidate,
} from "./opt/edits.js";
export { runOptEpochLoop } from "./opt/epoch-loop.js";
export {
  createSkillEvolutionRecorder,
  loadLocalSkillEvolutionKnowledge,
  redactEvolutionText,
  skillEvolutionEnvironmentHash,
  skillEvolutionScopeTag,
  skillEvolutionSuiteHash,
} from "./opt/evolution-memory.js";
export {
  buildLlmOptimizerFn,
  parseOptimizerEdits,
} from "./opt/llm-optimizer.js";
export {
  buildHeuristicMaintainerFn,
  buildLlmMaintainerFn,
  parseMaintainerPatterns,
  selectMaintainerEvidence,
} from "./opt/maintainer.js";
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
  type EvolutionDiagnostic,
  type MaintainerFn,
  type MaintainerOutcome,
  OPT_EARLY_STOP_PATIENCE,
  OPT_EDITS_PER_EPOCH,
  OPT_LR_MAX_CHARS,
  OPT_MAX_EPOCHS,
  OPT_TRAIN_SPLIT,
  OPT_TRAIN_VAL_SPLIT,
  OPT_VALIDATION_SPLIT,
  type OptEpoch,
  type OptimizerFn,
  type OptimizerOutcome,
  type ScoringFn,
  type SkillEdit,
  type SkillEvolutionKnowledge,
  type SkillEvolutionPattern,
  type SkillEvolutionRecorder,
  type SkillOptimizerContext,
  type SkillOptResult,
  type SkillProposalGateRecord,
  type SkillsOptOptions,
} from "./opt/types.js";

import { backupSkillMd } from "./opt/skill-files.js";

// --- Main entry point ---

/**
 * CLI entry point for `oma skill optimize`.
 *
 * M3 scope: full OUTPUT layer (tasks 7–8).
 * - Resolves skill's eval task directory and loads fixtures.
 * - Errors with a clear message (non-zero exit) when < MIN_TASKS fixtures exist.
 * - Splits fixtures into train/val sets.
 * - --live: prints cost preview + requires confirmation unless --yes.
 * - Runs the optimization epoch loop using injectable optimizer + scoring functions.
 * - --dry-run (default): prints diff + lift change and never writes SKILL.md;
 *   evolution evidence still persists under generated state/results surfaces.
 * - --apply: backs up original SKILL.md to .bak, writes finalSkillMd only when
 *   at least one edit passed the held-in/held-out gate, finalLift >= baselineLift,
 *   the final test passes, AND validateCandidate passes.
 *   - oma-owned skills (oma-*): requires --yes to proceed, otherwise warns + refuses.
 */
export async function runSkillsOpt(
  jsonMode: boolean,
  options: SkillsOptOptions = {},
): Promise<SkillOptResult | undefined> {
  if (!options._quiet) return runSkillsOptInner(jsonMode, options);
  // Meta-optimization drives many inner runs, possibly overlapping; their
  // reports are consumed programmatically, so console output is muted while
  // any quiet run is in flight.
  if (quietDepth === 0) {
    unmutedLog = console.log;
    console.log = () => undefined;
  }
  quietDepth += 1;
  try {
    return await runSkillsOptInner(jsonMode, options);
  } finally {
    quietDepth -= 1;
    if (quietDepth === 0 && unmutedLog) console.log = unmutedLog;
  }
}

let quietDepth = 0;
let unmutedLog: typeof console.log | undefined;

async function runSkillsOptInner(
  jsonMode: boolean,
  options: SkillsOptOptions = {},
): Promise<SkillOptResult | undefined> {
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
    const message = `[oma skill opt] no eval coverage for skill "${skillId}": found ${fixtures.length} task fixture(s), need at least ${MIN_TASKS}. Author tasks first — see web/docs/guide/skill-eval.md`;
    if (jsonMode) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  // Split train/val deterministically
  const { train, val, test } = splitTrainValTest(fixtures);

  // Resolve effective options (--dry-run is the default when neither flag is set)
  const apply = options.apply === true;
  const dryRun = !apply;
  const isLive = options.live === true;
  const yes = options.yes === true;
  const mode: "mock" | "live" = isLive ? "live" : "mock";

  if (options.live && options.mock)
    throw new Error("Choose either --live or --mock");
  if (!isLive && !options._optimizerFn) {
    throw new Error(
      "[oma skill opt] mock optimization has no recorded proposal source. Use skill eval --mock to replay evaluations, or --live to generate edits.",
    );
  }
  if (isLive && !options._optimizerFn) {
    const compilerVendor = resolveVendor("opt-agent").vendor;
    const capability = getProtectedTextCapability(compilerVendor);
    if (!capability.supported) {
      throw new Error(
        `[oma skill opt] protected compiler is unavailable for ${compilerVendor}: ${capability.reason}`,
      );
    }
  }

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
      {
        train,
        val,
        test,
        neighbors: discoverNeighborTasks(
          skillId,
          new Set(fixtures.map((task) => task.domain)),
          dirname(taskDir),
        ).map(({ task }) => task),
      },
    );
    if (!proceed) {
      if (!jsonMode) {
        console.log("[oma skill opt] aborted: user declined live run.");
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

  // The procedure (optimizer/maintainer prompts, constitution) is an artifact
  // with a hash, so every run records what shaped its proposals.
  const procedure = loadEvolutionProcedure(workspace);
  const memoryMode: "recall" | "none" =
    options.memory === "none" ? "none" : "recall";

  // Resolve injectable functions (for test / mock determinism). Live runs
  // meter every model call against the constitution budget; injected
  // functions are metered too so the limit means the same thing in tests.
  const dispatchMeter = isLive
    ? createDispatchMeter(procedure.constitution.budget.max_dispatches_per_run)
    : undefined;
  const meterFn = <Args extends unknown[], Result>(
    fn: (...args: Args) => Result,
  ) => (dispatchMeter ? meterCall(fn, dispatchMeter) : fn);
  const optimizerFn: OptimizerFn = meterFn(
    options._optimizerFn ??
      buildLlmOptimizerFn(editsPerEpoch, procedure.optimizer.template),
  );
  const baseScoringFn: ScoringFn = options._scoringFn ?? scoreSkillBody;
  const scoringFn: ScoringFn = dispatchMeter
    ? meterScoringFn(baseScoringFn, dispatchMeter)
    : baseScoringFn;
  const maintainerFn = meterFn(
    options._maintainerFn ??
      (isLive
        ? buildLlmMaintainerFn(procedure.maintainer.template)
        : buildHeuristicMaintainerFn()),
  );

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

  // Internal test workspaces stay hermetic unless a provider/recorder is
  // explicitly injected. Normal CLI runs always persist evolution through L1
  // and use AgentMemory for best-effort L2/L3 enrichment.
  const memoryProvider =
    options._memoryProvider ??
    (options._workspace
      ? createNoneMemoryProvider()
      : createMemoryProvider({ projectDir: workspace }));
  const evolutionRecorder =
    options._evolutionRecorder ??
    (!options._workspace || options._memoryProvider
      ? await createSkillEvolutionRecorder({
          workspace,
          skillId,
          tasks: fixtures,
          provider: memoryProvider,
          sourceRuntime: resolveVendor("opt-agent").vendor,
          targetRuntime: resolveVendor("eval-agent").vendor,
          environmentHash: skillEvolutionEnvironmentHash(mode),
          recall: memoryMode === "recall",
          procedureHash: procedure.procedureHash,
        })
      : undefined);

  // Run the optimization epoch loop
  let loopResult: SkillOptResult;
  const provenance = {
    procedure: {
      hash: procedure.procedureHash,
      optimizer: {
        source: procedure.optimizer.source,
        hash: procedure.optimizer.hash,
      },
      maintainer: {
        source: procedure.maintainer.source,
        hash: procedure.maintainer.hash,
      },
      constitution: {
        source: procedure.constitution.source,
        hash: procedure.constitution.hash,
      },
    },
    memory: memoryMode,
  };
  try {
    loopResult = {
      ...(await runOptEpochLoop({
        skillId,
        originalBody,
        trainTasks: train,
        valTasks: val,
        testTasks: test,
        taskDir,
        mode,
        maxEpochs,
        lrMaxChars,
        optimizerFn,
        scoringFn,
        maintainerFn,
        evolutionRecorder,
        workspace,
        dispatchMeter,
      })),
      ...provenance,
    };
  } catch (error) {
    await evolutionRecorder?.fail?.(error);
    throw error;
  }

  // --- Output layer (T7): --dry-run vs --apply ---

  let finalResult: SkillOptResult = { ...loopResult, applied: false };
  if (
    loopResult.finalTest?.passed === false &&
    (!loopResult.finalTest.blocker ||
      loopResult.finalTest.blocker === "negative-transfer") &&
    loopResult.acceptedEdits.length > 0
  ) {
    const finalDelta =
      loopResult.finalTest.candidateLift - loopResult.finalTest.baselineLift;
    for (const edit of loopResult.acceptedEdits) {
      await evolutionRecorder?.recordProposal({
        epoch: loopResult.epochs.length,
        edit,
        editKey: editKey(edit),
        outcome: "rejected",
        reason: "final-test",
        deltaLift: finalDelta,
        ...(loopResult.finalTest.findings
          ? { finalTestFindings: loopResult.finalTest.findings }
          : {}),
      });
    }
    finalResult = {
      ...finalResult,
      rejectedCount:
        finalResult.rejectedCount + loopResult.acceptedEdits.length,
      ...(finalResult.evolution
        ? {
            evolution: {
              ...finalResult.evolution,
              persistentRejectedEdits:
                evolutionRecorder?.knowledge.rejectedEditKeys.length ??
                finalResult.evolution.persistentRejectedEdits,
            },
          }
        : {}),
    };
  }

  if (apply) {
    // Every accepted edit passed the held-in/held-out gate, so an accepted
    // edit that only repaired training tasks still counts as an improvement.
    const hasImprovement =
      loopResult.acceptedEdits.length > 0 &&
      loopResult.finalLift >= loopResult.baselineLift;
    const passesFinalTest = loopResult.finalTest?.passed === true;
    const validation = validateCandidate(loopResult.finalSkillMd);

    if (!hasImprovement) {
      await evolutionRecorder?.complete(finalResult);
      const evaluationBlocked = (loopResult.diagnostics?.length ?? 0) > 0;
      const noImpMsg = evaluationBlocked
        ? "[oma skill opt] evaluation was incomplete or degraded; no improvement decision could be made; nothing written."
        : `[oma skill opt] no improving edit found (finalLift ${loopResult.finalLift.toFixed(4)} vs baselineLift ${loopResult.baselineLift.toFixed(4)}, ${loopResult.acceptedEdits.length} accepted); nothing written.`;
      if (!jsonMode) {
        console.log(noImpMsg);
        renderSkillOptResult(finalResult);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              ...(evaluationBlocked
                ? { _evaluationBlocked: true }
                : { _noImprovement: true }),
              _split: {
                trainCount: train.length,
                valCount: val.length,
                testCount: test.length,
              },
            },
            null,
            2,
          ),
        );
      }
      return finalResult;
    }

    if (!passesFinalTest) {
      await evolutionRecorder?.complete(finalResult);
      const finalTestMsg = loopResult.finalTest?.blocker
        ? `[oma skill opt] runner-owned final-test gate blocked promotion: ${loopResult.finalTest.blocker}; nothing written.`
        : `[oma skill opt] candidate did not pass the runner-owned final test (baseline ${loopResult.finalTest?.baselineLift.toFixed(4) ?? "missing"}, candidate ${loopResult.finalTest?.candidateLift.toFixed(4) ?? "missing"}); nothing written.`;
      if (!jsonMode) {
        console.log(finalTestMsg);
        renderSkillOptResult(finalResult);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              _finalTestFailed: true,
              _split: {
                trainCount: train.length,
                valCount: val.length,
                testCount: test.length,
              },
            },
            null,
            2,
          ),
        );
      }
      return finalResult;
    }

    if (!validation.ok) {
      await evolutionRecorder?.complete(finalResult);
      // Candidate failed validation — write nothing
      const validMsg = `[oma skill opt] candidate failed validation (${validation.reason}); nothing written.`;
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
              _split: {
                trainCount: train.length,
                valCount: val.length,
                testCount: test.length,
              },
            },
            null,
            2,
          ),
        );
      }
      return finalResult;
    }

    if (finalResult.promotion?.eligible !== true) {
      await evolutionRecorder?.complete(finalResult);
      if (jsonMode)
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _promotionBlocked: true,
            },
            null,
            2,
          ),
        );
      else renderSkillOptResult(finalResult);
      return finalResult;
    }

    // --- oma-owned guard ---
    if (isOmaOwnedSkill(skillId) && !yes) {
      await evolutionRecorder?.complete(finalResult);
      const warnMsg =
        `[oma skill opt] WARNING: "${skillId}" is an oma-owned skill. ` +
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
              _split: {
                trainCount: train.length,
                valCount: val.length,
                testCount: test.length,
              },
            },
            null,
            2,
          ),
        );
      }
      return finalResult;
    }

    // --- Write the improved SKILL.md ---
    const skillMdPath =
      options._skillMdPath ?? resolveSkillMdPath(skillId, workspace);

    // Ensure the skill directory exists (in case it is brand-new)
    const skillDir = dirname(skillMdPath);
    mkdirSync(skillDir, { recursive: true });

    // Backup original BEFORE touching the live file
    const backupPath = existsSync(skillMdPath)
      ? backupSkillMd(skillMdPath)
      : null;

    // Atomic write: write to a sibling .tmp file on the SAME filesystem,
    // then rename into place. On POSIX, rename(2) is atomic — the live
    // SKILL.md is never in a truncated/partial state even if the process
    // is killed between the writeFileSync and the renameSync.
    const tmpPath = `${skillMdPath}.tmp`;
    writeFileSync(tmpPath, loopResult.finalSkillMd, "utf-8");
    renameSync(tmpPath, skillMdPath);

    finalResult = { ...loopResult, applied: true };
    await evolutionRecorder?.complete(finalResult);

    // Lineage: what was written, from what, on which evidence, and how to undo it.
    const promotion = recordSkillPromotion({
      workspace,
      skillId,
      omaOwned: isOmaOwnedSkill(skillId),
      skillMdPath,
      backupPath,
      originalBody,
      finalBody: loopResult.finalSkillMd,
      evidence: {
        baselineLift: loopResult.baselineLift,
        finalLift: loopResult.finalLift,
        ...(loopResult.finalTest
          ? {
              finalTest: {
                baselineLift: loopResult.finalTest.baselineLift,
                candidateLift: loopResult.finalTest.candidateLift,
                passed: loopResult.finalTest.passed,
              },
            }
          : {}),
        promotionEligible: loopResult.promotion?.eligible ?? null,
        suiteHash: loopResult.evolution?.suiteHash,
        protocolRevision: SKILL_EVAL_PROTOCOL_REVISION,
        sourceRuntime: evolutionRecorder?.knowledge.sourceRuntime,
        targetRuntime: evolutionRecorder?.knowledge.targetRuntime,
        procedureHash: procedure.procedureHash,
        memory: memoryMode,
      },
    });

    if (!jsonMode) {
      console.log(
        `[oma skill opt] applied: wrote ${skillMdPath} (backup created; lineage ${promotion.record.patchPath}).`,
      );
      renderSkillOptResult(finalResult);
    } else {
      console.log(
        JSON.stringify(
          {
            ...JSON.parse(serializeSkillOptResult(finalResult)),
            _dryRun: false,
            _promotion: {
              parentHash: promotion.record.parentHash,
              candidateHash: promotion.record.candidateHash,
              patchPath: promotion.record.patchPath,
              backupPath: promotion.record.backupPath,
            },
            _split: {
              trainCount: train.length,
              valCount: val.length,
              testCount: test.length,
            },
          },
          null,
          2,
        ),
      );
    }
    return finalResult;
  }

  // --- dry-run (default): print diff + lift, write nothing ---
  await evolutionRecorder?.complete(finalResult);
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ...JSON.parse(serializeSkillOptResult(finalResult)),
          _dryRun: dryRun,
          _split: {
            trainCount: train.length,
            valCount: val.length,
            testCount: test.length,
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `[oma skill opt] skill: ${skillId}, tasks: ${fixtures.length} (train: ${train.length}, val: ${val.length}, test: ${test.length}), dry-run: ${dryRun}`,
    );
    renderSkillOptResult(finalResult);
  }
  return finalResult;
}
