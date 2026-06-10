import {
  NEG_TRANSFER_FAIL,
  type SkillUtilityReport,
  type TaskFixture,
} from "../eval.js";
import { unifiedDiff } from "./diff.js";
import {
  applyEdit,
  editKey,
  editNetChange,
  validateCandidate,
} from "./edits.js";
import {
  OPT_EARLY_STOP_PATIENCE,
  type OptEpoch,
  type OptimizerFn,
  type ScoringFn,
  type SkillEdit,
  type SkillOptResult,
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
): Promise<{ lift: number; report: SkillUtilityReport }> {
  const report = await scoringFn({
    skill,
    body,
    tasks,
    taskDir,
    mode,
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
 *    Otherwise add all proposed edits to the rejected buffer.
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
  taskDir: string;
  mode: "mock" | "live";
  maxEpochs: number;
  lrMaxChars: number;
  optimizerFn: OptimizerFn;
  scoringFn: ScoringFn;
}): Promise<SkillOptResult> {
  const {
    skillId,
    originalBody,
    trainTasks,
    valTasks,
    taskDir,
    mode,
    maxEpochs,
    lrMaxChars,
    optimizerFn,
    scoringFn,
  } = options;

  // Baseline: score the original body on the VAL split
  const { lift: baselineLift } = await scoreOnSplit(
    originalBody,
    skillId,
    valTasks,
    taskDir,
    mode,
    scoringFn,
  );

  let bestBody = originalBody;
  let curValLift = baselineLift;

  const epochs: OptEpoch[] = [];
  const acceptedEdits: SkillEdit[] = [];
  const rejectedBuffer = new Set<string>();
  let totalRejected = 0;
  let patience = 0;

  for (let epochIdx = 0; epochIdx < maxEpochs; epochIdx++) {
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
    );

    // 2. Optimizer proposes K edits, filtered by rejected buffer
    const rawEdits = await optimizerFn(bestBody, trainReport);
    const candidateEdits = rawEdits.filter(
      (e) => !rejectedBuffer.has(editKey(e)),
    );

    // 3. Score each candidate on the HELD-OUT VAL split
    let bestCandidateDeltaLift = -Infinity;
    let bestCandidateEdit: SkillEdit | undefined;
    let bestCandidateBody: string | undefined;
    let bestCandidateReport: SkillUtilityReport | undefined;

    const allProposedKeys: string[] = [];

    for (const edit of candidateEdits) {
      allProposedKeys.push(editKey(edit));

      // LR budget check
      const netChange = editNetChange(bestBody, edit);
      if (netChange > lrMaxChars) {
        totalRejected++;
        rejectedBuffer.add(editKey(edit));
        continue;
      }

      // Apply edit
      const candidateBody = applyEdit(bestBody, edit);

      // Candidate validation
      const validation = validateCandidate(candidateBody);
      if (!validation.ok) {
        totalRejected++;
        rejectedBuffer.add(editKey(edit));
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
      );

      const deltaLift = candValLift - curValLift;

      if (deltaLift > bestCandidateDeltaLift) {
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
      const negTransferEntries = bestCandidateReport?.negativeTransfer ?? [];
      const tripsNegTransfer = negTransferEntries.some(
        (nt) => nt.delta <= NEG_TRANSFER_FAIL,
      );

      if (!tripsNegTransfer) {
        // Accept
        const newValLift = curValLift + bestCandidateDeltaLift;
        const epochRecord: OptEpoch = {
          epoch: epochIdx,
          proposed: epochProposed,
          accepted: bestCandidateEdit,
          lift: newValLift,
          deltaLift: bestCandidateDeltaLift,
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
      // Add all proposed edit keys to rejected buffer
      for (const key of allProposedKeys) {
        if (!rejectedBuffer.has(key)) {
          rejectedBuffer.add(key);
          totalRejected++;
        }
      }

      // Also count candidates that were already rejected (LR, invalid) in this epoch
      // (those were already added above)
      const epochRecord: OptEpoch = {
        epoch: epochIdx,
        proposed: epochProposed,
        lift: curValLift,
        deltaLift: 0,
      };
      epochs.push(epochRecord);
      patience++;
    }

    // Suppress unused variable warning
    void trainLift;
  }

  // Final diff: original → bestBody
  const diff = unifiedDiff(originalBody, bestBody);

  return {
    skill: skillId,
    baselineLift,
    finalLift: curValLift,
    epochs,
    acceptedEdits,
    rejectedCount: totalRejected,
    finalSkillMd: bestBody,
    diff,
    applied: false,
  };
}
