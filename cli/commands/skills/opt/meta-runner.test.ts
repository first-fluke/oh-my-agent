import { describe, expect, it, vi } from "vitest";

const runSkillsOpt = vi.fn();
vi.mock("../opt.js", () => ({
  runSkillsOpt: (...args: unknown[]) => runSkillsOpt(...args),
}));

import { buildLiveInnerRunner } from "./meta-runner.js";

const request = {
  skill: "oma-docs",
  repeat: 1,
  optimizerTemplate: "opt {{body}} {{findings}} {{editsPerEpoch}}",
  maintainerTemplate: "maint {{evidence}} {{priorFacts}}",
  procedureHash: "cand",
  budget: { maxEpochs: 1, editsPerEpoch: 2 },
};

function result(patch: Record<string, unknown>) {
  return {
    skill: "oma-docs",
    baselineLift: 0.5,
    finalLift: 0.5,
    epochs: [],
    acceptedEdits: [],
    rejectedCount: 0,
    finalSkillMd: "",
    diff: "",
    applied: false,
    diagnostics: [],
    promotion: { eligible: false, reasons: [] },
    budget: { limit: null, used: 40 },
    ...patch,
  };
}

describe("live inner runner", () => {
  it("passes the candidate procedure hash and quiet mode to the inner run", async () => {
    runSkillsOpt.mockResolvedValueOnce(
      result({ finalLift: 0.8, baselineTrainLift: 0.4, finalTrainLift: 0.6 }),
    );
    const outcome = await buildLiveInnerRunner({
      workspace: "/w",
      memory: "none",
    })(request);
    expect(runSkillsOpt).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({
        skill: "oma-docs",
        live: true,
        dryRun: true,
        _quiet: true,
        _procedureHash: "cand",
      }),
    );
    expect(outcome).toMatchObject({ status: "completed", callsUsed: 40 });
    expect(outcome.gain).toBeCloseTo(0.5);
  });

  it("reports a run whose evaluation was blocked as failed, not as zero gain", async () => {
    runSkillsOpt.mockResolvedValueOnce(
      result({
        baselineLift: 0,
        diagnostics: [
          {
            stage: "validation",
            status: "insufficient-coverage",
            message: "The validation baseline is not valid promotion evidence.",
          },
        ],
        budget: { limit: null, used: 4 },
      }),
    );
    const outcome = await buildLiveInnerRunner({
      workspace: "/w",
      memory: "none",
    })(request);
    expect(outcome).toMatchObject({
      status: "failed",
      gain: 0,
      callsUsed: 4,
      error: "validation:insufficient-coverage",
    });
  });
});
