import type { SkillUtilityReport, TaskFixture } from "../eval.js";
import { DispatchBudgetExceededError, type DispatchMeter } from "./budget.js";
import { unifiedDiff } from "./diff.js";
import {
  applyEdit,
  editKey,
  editNetChange,
  validateCandidate,
} from "./edits.js";
import { evaluationBlocker } from "./promotion.js";
import {
  type EvolutionDiagnostic,
  type MaintainerFn,
  OPT_EARLY_STOP_PATIENCE,
  type OptEpoch,
  type OptimizerFn,
  type ScoringFn,
  type SkillEdit,
  type SkillEvolutionRecorder,
  type SkillOptResult,
  type SkillProposalGateRecord,
} from "./types.js";

// --- Epoch loop core (T5) ---

/**
 * Held-in/held-out acceptance: lose nothing on either split, gain on one.
 */
export function candidateAcceptable(
  deltaVal: number,
  deltaTrain: number,
): boolean {
  return deltaVal >= 0 && deltaTrain >= 0 && Math.max(deltaVal, deltaTrain) > 0;
}

/**
 * Score a body on a given task split using the injectable scoring function.
 * Returns the utilityLift from the report (0 if coverage is insufficient).
 */
async function scoreOnSplit(
  body: string,
  skill: string,
  tasks: TaskFixture[],
  taskDir: string,
  mode: "mock" | "live",
  scoringFn: ScoringFn,
  includeEvidence = false,
  negativeTransfer = false,
  workspace?: string,
): Promise<{ lift: number; report: SkillUtilityReport }> {
  const report = await scoringFn({
    skill,
    body,
    tasks,
    taskDir,
    mode,
    includeEvidence,
    minimumCoverage: Math.max(1, tasks.length),
    negativeTransfer,
    confirmNegativeTransfer: negativeTransfer,
    workspace,
  });
  return {
    lift: report.coverage === "ok" ? report.utilityLift : 0,
    report,
  };
}

/**
 * Run the optimization epoch loop.
 *
 * Per epoch (up to maxEpochs):
 * 1. Score current best body on the TRAIN split → findings.
 * 2. Optimizer proposes K edits (filtered by rejected buffer).
 * 3. For each candidate edit:
 *    a. applyEdit → validateCandidate (skip if invalid)
 *    b. enforce LR budget (skip if net change > lrMaxChars)
 *    c. score candidate on the HELD-OUT VAL split → deltaLift, and on the
 *       HELD-IN TRAIN split → deltaTrainLift
 * 4. Accept the BEST candidate (by deltaLift + deltaTrainLift) IFF
 *    deltaTrainLift >= 0 AND deltaLift >= 0 AND one of them > 0, AND no
 *    confirmed negativeTransfer entry <= NEG_TRANSFER_FAIL. A strict
 *    validation gain is not required: when the current body already passes
 *    every validation task, an edit that repairs a training failure without
 *    losing held-out ground is still an improvement.
 *    Record incomplete evaluations separately from rejected edits.
 * 5. On accept: update best body + record OptEpoch; on no-accept: increment patience.
 * 6. Early-stop after OPT_EARLY_STOP_PATIENCE consecutive no-accept epochs.
 *
 * Returns a full SkillOptResult.
 */
export async function runOptEpochLoop(options: {
  skillId: string;
  originalBody: string;
  trainTasks: TaskFixture[];
  valTasks: TaskFixture[];
  testTasks?: TaskFixture[];
  taskDir: string;
  mode: "mock" | "live";
  maxEpochs: number;
  lrMaxChars: number;
  optimizerFn: OptimizerFn;
  scoringFn: ScoringFn;
  maintainerFn?: MaintainerFn;
  evolutionRecorder?: SkillEvolutionRecorder;
  workspace?: string;
  /** Run-level dispatch budget; exhaustion stops the loop with a diagnostic. */
  dispatchMeter?: DispatchMeter;
}): Promise<SkillOptResult> {
  const {
    skillId,
    originalBody,
    trainTasks,
    valTasks,
    testTasks,
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
  } = options;

  let budgetExhausted = false;
  const budgetDiagnostic = (
    error: unknown,
    where: string,
  ): error is DispatchBudgetExceededError => {
    if (!(error instanceof DispatchBudgetExceededError)) return false;
    budgetExhausted = true;
    diagnostics.push({
      stage: "budget",
      status: "exhausted",
      message: `${error.used} of ${error.limit} model calls used; ${where}.`,
    });
    return true;
  };

  const developmentIds = new Set(
    [...trainTasks, ...valTasks].map((task) => task.id),
  );
  const finalIds = new Set<string>();
  for (const task of testTasks ?? []) {
    if (developmentIds.has(task.id) || finalIds.has(task.id)) {
      throw new Error(
        `[oma skill opt] final-test task ${task.id} is duplicated or overlaps a development split.`,
      );
    }
    finalIds.add(task.id);
  }

  // Baseline: score the original body on the VAL split
  const { lift: baselineLift, report: baselineReport } = await scoreOnSplit(
    originalBody,
    skillId,
    valTasks,
    taskDir,
    mode,
    scoringFn,
    false,
    false,
    workspace,
  );

  const diagnostics: EvolutionDiagnostic[] = [];
  const baselineBlocker = evaluationBlocker(baselineReport, mode);
  if (baselineBlocker)
    diagnostics.push({
      stage: "validation",
      status: baselineBlocker,
      message: "The validation baseline is not valid promotion evidence.",
    });

  let bestBody = originalBody;
  let curValLift = baselineLift;
  let baselineTrainLift: number | undefined;
  let curTrainLift: number | undefined;

  const epochs: OptEpoch[] = [];
  const acceptedEdits: SkillEdit[] = [];
  const rejectedBuffer = new Set<string>(
    evolutionRecorder?.knowledge.rejectedEditKeys ?? [],
  );
  let totalRejected = 0;
  let patience = 0;

  try {
    for (
      let epochIdx = 0;
      epochIdx < maxEpochs && !baselineBlocker;
      epochIdx++
    ) {
      // Early-stop check
      if (patience >= OPT_EARLY_STOP_PATIENCE) {
        break;
      }

      // 1. Score current best on TRAIN to get findings for optimizer
      const { report: trainReport, lift: trainLift } = await scoreOnSplit(
        bestBody,
        skillId,
        trainTasks,
        taskDir,
        mode,
        scoringFn,
        true,
        false,
        workspace,
      );

      baselineTrainLift ??= trainLift;
      curTrainLift = trainLift;

      const trainBlocker = evaluationBlocker(trainReport, mode);
      if (trainBlocker) {
        diagnostics.push({
          stage: "validation",
          status: trainBlocker,
          message: "Training evaluation failed; optimization stopped.",
        });
        break;
      }

      await evolutionRecorder?.recordEvidence(epochIdx, trainReport);
      const maintained = maintainerFn
        ? await maintainerFn(
            trainReport,
            evolutionRecorder?.knowledge ?? {
              skillId,
              suiteHash: "unscoped",
              patterns: [],
              rejectedEditKeys: [...rejectedBuffer],
              acceptedEditKeys: [],
            },
            epochIdx,
          )
        : [];
      const degraded =
        !Array.isArray(maintained) && maintained.status === "degraded";
      const patterns = Array.isArray(maintained)
        ? maintained
        : degraded
          ? []
          : maintained.patterns;
      if (degraded)
        diagnostics.push({
          stage: "maintainer",
          status: maintained.reason,
          message: maintained.message,
        });
      await evolutionRecorder?.recordPatterns(epochIdx, patterns);

      // 2. Optimizer proposes K edits, filtered by rejected buffer
      const optimized = await optimizerFn(bestBody, trainReport, {
        epoch: epochIdx,
        knowledge: evolutionRecorder?.knowledge ?? {
          skillId,
          suiteHash: "unscoped",
          patterns: patterns.map((pattern) => pattern.summary),
          rejectedEditKeys: [...rejectedBuffer],
          acceptedEditKeys: [],
        },
        patterns,
      });
      if (!Array.isArray(optimized) && !("edits" in optimized)) {
        throw new Error(
          `[oma skill opt] optimizer ${optimized.status}: ${optimized.message}`,
        );
      }
      const rawEdits = Array.isArray(optimized) ? optimized : optimized.edits;
      const candidateEdits = rawEdits.filter(
        (e) => !rejectedBuffer.has(editKey(e)),
      );

      // 3. Score each candidate on the HELD-OUT VAL split (with neighbor checks)
      //    and on the HELD-IN TRAIN split (no neighbor checks).
      let bestCandidateGain = -Infinity;
      let bestCandidateDeltaLift = 0;
      let bestCandidateDeltaTrainLift = 0;
      let bestCandidateEdit: SkillEdit | undefined;
      let bestCandidateBody: string | undefined;
      const evaluatedCandidates: Array<{
        edit: SkillEdit;
        key: string;
        deltaLift: number;
        deltaTrainLift: number;
        report: SkillUtilityReport;
        trainReport: SkillUtilityReport;
      }> = [];

      for (const edit of candidateEdits) {
        // LR budget check
        const netChange = editNetChange(bestBody, edit);
        if (netChange > lrMaxChars) {
          totalRejected++;
          rejectedBuffer.add(editKey(edit));
          await evolutionRecorder?.recordProposal({
            epoch: epochIdx,
            edit,
            editKey: editKey(edit),
            outcome: "rejected",
            reason: "learning-rate",
            deltaLift: 0,
          });
          continue;
        }

        // Apply edit
        const candidateBody = applyEdit(bestBody, edit);

        // Candidate validation
        const validation = validateCandidate(candidateBody);
        if (!validation.ok) {
          totalRejected++;
          rejectedBuffer.add(editKey(edit));
          await evolutionRecorder?.recordProposal({
            epoch: epochIdx,
            edit,
            editKey: editKey(edit),
            outcome: "rejected",
            reason: "invalid-candidate",
            deltaLift: 0,
          });
          continue;
        }

        // Score on VAL split
        const { lift: candValLift, report: candReport } = await scoreOnSplit(
          candidateBody,
          skillId,
          valTasks,
          taskDir,
          mode,
          scoringFn,
          false,
          true,
          workspace,
        );
        // Score on TRAIN split
        const { lift: candTrainLift, report: candTrainReport } =
          await scoreOnSplit(
            candidateBody,
            skillId,
            trainTasks,
            taskDir,
            mode,
            scoringFn,
            false,
            false,
            workspace,
          );

        const deltaLift = candValLift - curValLift;
        const deltaTrainLift = candTrainLift - trainLift;
        evaluatedCandidates.push({
          edit,
          key: editKey(edit),
          deltaLift,
          deltaTrainLift,
          report: candReport,
          trainReport: candTrainReport,
        });

        const gain = deltaLift + deltaTrainLift;
        if (
          candidateAcceptable(deltaLift, deltaTrainLift) &&
          !evaluationBlocker(candReport, mode, true) &&
          !evaluationBlocker(candTrainReport, mode) &&
          gain > bestCandidateGain
        ) {
          bestCandidateGain = gain;
          bestCandidateDeltaLift = deltaLift;
          bestCandidateDeltaTrainLift = deltaTrainLift;
          bestCandidateEdit = edit;
          bestCandidateBody = candidateBody;
        }
      }

      // 4. Accept the best candidate that lost nothing on either split and
      //    gained on at least one, with no confirmed negative transfer.
      const epochProposed = candidateEdits.length;
      let accepted = false;

      if (bestCandidateEdit !== undefined && bestCandidateBody !== undefined) {
        const newValLift = curValLift + bestCandidateDeltaLift;
        const epochRecord: OptEpoch = {
          epoch: epochIdx,
          proposed: epochProposed,
          accepted: bestCandidateEdit,
          lift: newValLift,
          deltaLift: bestCandidateDeltaLift,
          patterns,
        };
        epochs.push(epochRecord);
        acceptedEdits.push(bestCandidateEdit);
        bestBody = bestCandidateBody;
        curValLift = newValLift;
        curTrainLift = trainLift + bestCandidateDeltaTrainLift;
        patience = 0;
        accepted = true;
      }

      if (!accepted) {
        const epochRecord: OptEpoch = {
          epoch: epochIdx,
          proposed: epochProposed,
          lift: curValLift,
          deltaLift: 0,
          patterns,
        };
        epochs.push(epochRecord);
        patience++;
      }

      const acceptedKey =
        accepted && bestCandidateEdit ? editKey(bestCandidateEdit) : undefined;
      for (const candidate of evaluatedCandidates) {
        const blocker =
          evaluationBlocker(candidate.report, mode, true) ??
          evaluationBlocker(candidate.trainReport, mode);
        let reason: SkillProposalGateRecord["reason"];
        if (candidate.key === acceptedKey) reason = "accepted";
        else if (blocker) reason = blocker;
        else if (candidate.deltaLift < 0 || candidate.deltaTrainLift < 0)
          reason = "split-regression";
        else if (candidate.deltaLift <= 0 && candidate.deltaTrainLift <= 0)
          reason = "no-validation-lift";
        else reason = "not-best-candidate";
        const inconclusive =
          blocker !== undefined && blocker !== "negative-transfer";
        if (
          candidate.key !== acceptedKey &&
          !inconclusive &&
          !rejectedBuffer.has(candidate.key)
        ) {
          rejectedBuffer.add(candidate.key);
          totalRejected++;
        }
        await evolutionRecorder?.recordProposal({
          epoch: epochIdx,
          edit: candidate.edit,
          editKey: candidate.key,
          outcome:
            candidate.key === acceptedKey
              ? "accepted"
              : inconclusive
                ? "inconclusive"
                : "rejected",
          reason,
          deltaLift: candidate.deltaLift,
          deltaTrainLift: candidate.deltaTrainLift,
          ...(candidate.report.negativeTransfer.length > 0
            ? {
                negativeTransfer: candidate.report.negativeTransfer.map(
                  (entry) => ({
                    taskId: entry.taskId,
                    otherSkill: entry.otherSkill,
                    delta: entry.delta,
                    trials: entry.trials,
                    confirmed: entry.confirmed,
                  }),
                ),
              }
            : {}),
        });
      }

      if (
        !accepted &&
        evaluatedCandidates.some((candidate) => {
          const blocker =
            evaluationBlocker(candidate.report, mode, true) ??
            evaluationBlocker(candidate.trainReport, mode);
          return blocker && blocker !== "negative-transfer";
        })
      ) {
        diagnostics.push({
          stage: "validation",
          status: "inconclusive",
          message:
            "Candidate evaluation is incomplete; retry after repairing the evaluation conditions.",
        });
        break;
      }
    }
  } catch (error) {
    if (!budgetDiagnostic(error, "optimization stopped")) throw error;
  }

  // Final diff: original → bestBody
  const diff = unifiedDiff(originalBody, bestBody);
  let finalTest: SkillOptResult["finalTest"];
  try {
    if (budgetExhausted) {
      // The loop already reported the exhausted budget; nothing is left for a final test.
      finalTest = undefined;
    } else if (baselineBlocker) {
      finalTest = { baselineLift: 0, candidateLift: 0, passed: false };
    } else if (testTasks && testTasks.length > 0) {
      if (bestBody === originalBody) {
        const { lift } = await scoreOnSplit(
          originalBody,
          skillId,
          testTasks,
          taskDir,
          mode,
          scoringFn,
          false,
          false,
          workspace,
        );
        finalTest = { baselineLift: lift, candidateLift: lift, passed: false };
      } else {
        const [
          { lift: finalTestBaseline, report: finalBaselineReport },
          { lift: finalTestCandidate, report: finalCandidateReport },
        ] = await Promise.all([
          scoreOnSplit(
            originalBody,
            skillId,
            testTasks,
            taskDir,
            mode,
            scoringFn,
            false,
            false,
            workspace,
          ),
          scoreOnSplit(
            bestBody,
            skillId,
            testTasks,
            taskDir,
            mode,
            scoringFn,
            false,
            true,
            workspace,
          ),
        ]);
        const finalBlocker =
          evaluationBlocker(finalBaselineReport, mode) ??
          evaluationBlocker(finalCandidateReport, mode, true);
        const candidateByTask = new Map(
          finalCandidateReport.findings.map((finding) => [
            finding.taskId,
            finding.lift,
          ]),
        );
        // The final test is frozen ground truth: the candidate must not lose
        // there. The gain it was accepted for was already shown on the
        // development splits, so a strict test gain is not required.
        finalTest = {
          baselineLift: finalTestBaseline,
          candidateLift: finalTestCandidate,
          passed: finalTestCandidate >= finalTestBaseline && !finalBlocker,
          ...(finalBlocker ? { blocker: finalBlocker } : {}),
          findings: finalBaselineReport.findings.map((finding) => ({
            taskId: finding.taskId,
            original: finding.lift,
            candidate: candidateByTask.get(finding.taskId) ?? Number.NaN,
          })),
        };
      }
    }
  } catch (error) {
    if (!budgetDiagnostic(error, "final test not run")) throw error;
    finalTest = undefined;
  }

  const reasons = diagnostics.map(
    (diagnostic) => `${diagnostic.stage}:${diagnostic.status}`,
  );
  if (!finalTest) reasons.push("final-test-missing");
  else if (!finalTest.passed) reasons.push("final-test-failed");
  if (acceptedEdits.length === 0) reasons.push("no-validated-candidate");

  const result: SkillOptResult = {
    skill: skillId,
    baselineLift,
    finalLift: curValLift,
    ...(baselineTrainLift === undefined ? {} : { baselineTrainLift }),
    ...(curTrainLift === undefined ? {} : { finalTrainLift: curTrainLift }),
    epochs,
    acceptedEdits,
    rejectedCount: totalRejected,
    finalSkillMd: bestBody,
    diff,
    applied: false,
    finalTest,
    diagnostics,
    ...(dispatchMeter ? { budget: dispatchMeter.snapshot() } : {}),
    promotion: { eligible: reasons.length === 0, reasons },
    ...(evolutionRecorder
      ? {
          evolution: {
            suiteHash: evolutionRecorder.knowledge.suiteHash,
            persistentPatterns: evolutionRecorder.knowledge.patterns.length,
            persistentRejectedEdits:
              evolutionRecorder.knowledge.rejectedEditKeys.length,
          },
        }
      : {}),
  };
  return result;
}
