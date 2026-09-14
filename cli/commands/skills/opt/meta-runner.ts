import { runSkillsOpt } from "../opt.js";
import { buildLlmOptimizerFn } from "./llm-optimizer.js";
import { buildLlmMaintainerFn } from "./maintainer.js";
import type { InnerRunner } from "./meta.js";

/**
 * Real inner runner: one dry-run live optimization of a skill under a given
 * procedure. The candidate templates are injected as the optimizer and
 * maintainer functions, so the inner loop cannot read a different procedure
 * from disk, and the budget (epochs, edits per epoch) is fixed by the caller
 * for every arm.
 */
export function buildLiveInnerRunner(options: {
  workspace: string;
  memory: "recall" | "none";
}): InnerRunner {
  return async (request) => {
    const result = await runSkillsOpt(true, {
      skill: request.skill,
      live: true,
      dryRun: true,
      yes: true,
      maxEpochs: request.budget.maxEpochs,
      editsPerEpoch: request.budget.editsPerEpoch,
      memory: options.memory,
      _quiet: true,
      _procedureHash: request.procedureHash,
      _optimizerFn: buildLlmOptimizerFn(
        request.budget.editsPerEpoch,
        request.optimizerTemplate,
      ),
      _maintainerFn: buildLlmMaintainerFn(request.maintainerTemplate),
    });
    if (!result) throw new Error("inner optimization returned no result");
    return {
      skill: request.skill,
      repeat: request.repeat,
      procedureHash: request.procedureHash,
      status: "completed",
      baselineLift: result.baselineLift,
      finalLift: result.finalLift,
      // Same quantity the inner gate ranks on: held-out plus held-in delta.
      gain: Math.max(
        0,
        result.finalLift -
          result.baselineLift +
          ((result.finalTrainLift ?? 0) - (result.baselineTrainLift ?? 0)),
      ),
      promotionEligible: result.promotion?.eligible === true,
      acceptedEdits: result.acceptedEdits.length,
      ...(result.budget ? { callsUsed: result.budget.used } : {}),
    };
  };
}
