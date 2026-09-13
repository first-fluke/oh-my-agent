import type { SkillUtilityReport, TaskFixture } from "../eval.js";
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
 *    c. score candidate on the HELD-OUT VAL split → deltaLift
 * 4. Accept the BEST candidate IFF deltaLift > 0 AND no negativeTransfer entry <= NEG_TRANSFER_FAIL.
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
  } = options;

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

  const epochs: OptEpoch[] = [];
  const acceptedEdits: SkillEdit[] = [];
  const rejectedBuffer = new Set<string>(
    evolutionRecorder?.knowledge.rejectedEditKeys ?? [],
  );
  let totalRejected = 0;
  let patience = 0;

  for (let epochIdx = 0; epochIdx < maxEpochs && !baselineBlocker; epochIdx++) {
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

    // 3. Score each candidate on the HELD-OUT VAL split
    let bestCandidateDeltaLift = -Infinity;
    let bestCandidateEdit: SkillEdit | undefined;
    let bestCandidateBody: string | undefined;
    let bestCandidateReport: SkillUtilityReport | undefined;
    const evaluatedCandidates: Array<{
      edit: SkillEdit;
      key: string;
      deltaLift: number;
      report: SkillUtilityReport;
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

      const deltaLift = candValLift - curValLift;
      evaluatedCandidates.push({
        edit,
        key: editKey(edit),
        deltaLift,
        report: candReport,
      });

      if (
        !evaluationBlocker(candReport, mode, true) &&
        deltaLift > bestCandidateDeltaLift
      ) {
        bestCandidateDeltaLift = deltaLift;
        bestCandidateEdit = edit;
        bestCandidateBody = candidateBody;
        bestCandidateReport = candReport;
      }
    }

    // 4. Accept the best candidate IFF deltaLift > 0 AND no negativeTransfer <= NEG_TRANSFER_FAIL
    const epochProposed = candidateEdits.length;
    let accepted = false;

    if (
      bestCandidateEdit !== undefined &&
      bestCandidateBody !== undefined &&
      bestCandidateDeltaLift > 0
    ) {
      // Check negative transfer gate
      if (
        bestCandidateReport &&
        !evaluationBlocker(bestCandidateReport, mode, true)
      ) {
        // Accept
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
        patience = 0;
        accepted = true;
      }
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
      const blocker = evaluationBlocker(candidate.report, mode, true);
      let reason: SkillProposalGateRecord["reason"];
      if (candidate.key === acceptedKey) reason = "accepted";
      else if (blocker) reason = blocker;
      else if (candidate.deltaLift <= 0) reason = "no-validation-lift";
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
      });
    }

    if (
      !accepted &&
      evaluatedCandidates.some((candidate) => {
        const blocker = evaluationBlocker(candidate.report, mode, true);
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

    // Suppress unused variable warning
    void trainLift;
  }

  // Final diff: original → bestBody
  const diff = unifiedDiff(originalBody, bestBody);
  let finalTest: SkillOptResult["finalTest"];
  if (baselineBlocker) {
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
      finalTest = {
        baselineLift: finalTestBaseline,
        candidateLift: finalTestCandidate,
        passed: finalTestCandidate > finalTestBaseline && !finalBlocker,
        ...(finalBlocker ? { blocker: finalBlocker } : {}),
      };
    }
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
    epochs,
    acceptedEdits,
    rejectedCount: totalRejected,
    finalSkillMd: bestBody,
    diff,
    applied: false,
    finalTest,
    diagnostics,
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
