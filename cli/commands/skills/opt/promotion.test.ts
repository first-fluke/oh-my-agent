import { describe, expect, it, vi } from "vitest";
import type { SkillUtilityReport, TaskFixture } from "../eval.js";
import { runOptEpochLoop } from "./epoch-loop.js";
import type {
  OptimizerFn,
  ScoringFn,
  SkillEdit,
  SkillEvolutionRecorder,
  SkillProposalGateRecord,
} from "./types.js";

const original = "---\nname: test\ndescription: test skill\n---\n\n## Rules\n";
const edit: SkillEdit = {
  op: "add",
  anchor: "## Rules",
  after: "\n- improved",
};
const task = (id: string): TaskFixture => ({
  id,
  skill: "test",
  domain: "test",
  prompt: "Complete the task",
  checker: { type: "assert", expect_contains: ["done"] },
  weight: 1,
});

function report(
  lift: number,
  patch: Partial<SkillUtilityReport> = {},
): SkillUtilityReport {
  return {
    skill: "test",
    taskCount: 1,
    skippedFiles: [],
    baselineScore: 0,
    treatmentScore: lift,
    utilityLift: lift,
    utilityStdDev: 0,
    findings: [],
    negativeTransfer: [{ otherSkill: "neighbor", domain: "test", delta: 0 }],
    negativeTransferCoverage: { status: "measured", expected: 1, scored: 1 },
    decision: lift > 0 ? "pass" : "fail",
    coverage: "ok",
    isolation: "enforced",
    ...patch,
  };
}

function run(
  scoringFn: ScoringFn,
  extra: Partial<Parameters<typeof runOptEpochLoop>[0]> = {},
) {
  return runOptEpochLoop({
    skillId: "test",
    originalBody: original,
    trainTasks: [task("train")],
    valTasks: [task("validation")],
    testTasks: [task("final")],
    taskDir: "/tmp/unused-opt-fixtures",
    mode: "live",
    maxEpochs: 1,
    lrMaxChars: 600,
    optimizerFn: () => [edit],
    scoringFn,
    ...extra,
  });
}

describe("skill promotion evidence", () => {
  it("requires measured negative transfer on the default candidate score request", async () => {
    const scorer = vi.fn<ScoringFn>(async (options) =>
      report(options.body === original ? 0 : 0.3),
    );
    const result = await run(scorer);
    expect(result.finalTest?.passed).toBe(true);
    const candidates = scorer.mock.calls
      .map(([options]) => options)
      .filter((options) => options.body !== original);
    const onValidation = candidates.filter((options) =>
      (options.tasks ?? []).some((task) => task.id === "validation"),
    );
    const onTrain = candidates.filter((options) =>
      (options.tasks ?? []).some((task) => task.id === "train"),
    );
    expect(onValidation.length).toBeGreaterThan(0);
    expect(onTrain.length).toBeGreaterThan(0);
    expect(
      onValidation.every(
        (options) =>
          options.negativeTransfer === true &&
          options.confirmNegativeTransfer === true,
      ),
    ).toBe(true);
    expect(onTrain.every((options) => !options.negativeTransfer)).toBe(true);
  });

  it("does not accept a candidate with missing negative-transfer measurements", async () => {
    const result = await run(async (options) =>
      report(options.body === original ? 0 : 0.3, {
        negativeTransfer: [],
        negativeTransferCoverage: undefined,
      }),
    );
    expect(result.acceptedEdits).toEqual([]);
    expect(result.finalTest?.passed).toBe(false);
  });

  it.each(["best-effort", "unavailable", "n/a"] as const)(
    "does not promote a live %s evaluation",
    async (isolation) => {
      const result = await run(async (options) =>
        report(options.body === original ? 0 : 0.3, { isolation }),
      );
      expect(result.acceptedEdits).toEqual([]);
      expect(result.finalTest?.passed).toBe(false);
    },
  );

  it("does not treat missing baseline coverage as a zero-quality baseline", async () => {
    const result = await run(async (options) =>
      report(
        options.body === original ? 0 : 0.3,
        options.body === original ? { coverage: "insufficient" } : {},
      ),
    );
    expect(result.acceptedEdits).toEqual([]);
  });

  it("chooses the best eligible candidate rather than a higher-scoring regression", async () => {
    const unsafe: SkillEdit = { ...edit, after: "\n- regresses" };
    const result = await run(
      async (options) =>
        report(
          options.body === original
            ? 0
            : options.body.includes("regresses")
              ? 0.8
              : 0.3,
          options.body.includes("regresses")
            ? {
                negativeTransfer: [
                  { otherSkill: "neighbor", domain: "test", delta: -1 },
                ],
              }
            : {},
        ),
      { optimizerFn: () => [unsafe, edit] },
    );
    expect(result.acceptedEdits).toEqual([edit]);
    expect(result.finalTest?.passed).toBe(true);
  });

  it("does not pass the final test when its candidate evidence is incomplete", async () => {
    const result = await run(async (options) =>
      report(
        options.body === original ? 0 : 0.3,
        options.tasks?.[0]?.id === "final" && options.body !== original
          ? {
              negativeTransferCoverage: {
                status: "insufficient",
                expected: 2,
                scored: 1,
              },
            }
          : {},
      ),
    );
    expect(result.acceptedEdits).toEqual([edit]);
    expect(result.finalTest?.passed).toBe(false);
  });

  it("requires every task in a split instead of adopting from a partial denominator", async () => {
    const optimizer = vi.fn(() => [edit]);
    const scorer = vi.fn<ScoringFn>(async (options) =>
      report(0, {
        coverage: (options.minimumCoverage ?? 1) > 1 ? "insufficient" : "ok",
      }),
    );
    const result = await run(scorer, {
      valTasks: [task("v1"), task("v2"), task("v3")],
      optimizerFn: optimizer,
    });
    expect(scorer.mock.calls[0]?.[0].minimumCoverage).toBe(3);
    expect(optimizer).not.toHaveBeenCalled();
    expect(result.promotion?.eligible).toBe(false);
  });

  it("rejects final-test overlap before invoking any scorer or optimizer", async () => {
    const scorer = vi.fn<ScoringFn>();
    await expect(run(scorer, { testTasks: [task("train")] })).rejects.toThrow(
      "overlaps",
    );
    expect(scorer).not.toHaveBeenCalled();
  });

  it("requires a final test for promotion", async () => {
    const result = await run(
      async (options) => report(options.body === original ? 0 : 0.3),
      { testTasks: [] },
    );
    expect(result.acceptedEdits).toEqual([edit]);
    expect(result.promotion).toEqual({
      eligible: false,
      reasons: ["final-test-missing"],
    });
  });

  it.each(["dispatch-error", "parse-error"] as const)(
    "stops on optimizer %s instead of consuming no-action patience",
    async (status) => {
      const optimizer = vi.fn(() => ({
        status,
        message: "invalid optimizer execution",
      }));
      await expect(
        run(async () => report(0), { optimizerFn: optimizer, maxEpochs: 8 }),
      ).rejects.toThrow(`optimizer ${status}`);
      expect(optimizer).toHaveBeenCalledTimes(1);
    },
  );

  it("treats explicit no-action as a valid stopping outcome", async () => {
    const optimizer = vi.fn(() => ({
      status: "no-action" as const,
      edits: [] as [],
    }));
    const result = await run(async () => report(0), {
      optimizerFn: optimizer,
      maxEpochs: 8,
    });
    expect(optimizer).toHaveBeenCalledTimes(2);
    expect(result.diagnostics).toEqual([]);
    expect(result.acceptedEdits).toEqual([]);
  });

  it("keeps degraded maintainer suggestions out of optimizer knowledge and promotion", async () => {
    const optimizer = vi.fn<OptimizerFn>(() => [edit]);
    const result = await run(
      async (options) => report(options.body === original ? 0 : 0.3),
      {
        optimizerFn: optimizer,
        maintainerFn: () => ({
          status: "degraded",
          reason: "parse-error",
          message: "invalid patterns",
          patterns: [
            {
              id: "fallback",
              summary: "unverified",
              evidenceIds: ["train"],
              confidence: 0.5,
            },
          ],
        }),
      },
    );
    expect(optimizer.mock.calls[0]?.[2]?.patterns).toEqual([]);
    expect(result.finalTest?.passed).toBe(true);
    expect(result.promotion).toEqual({
      eligible: false,
      reasons: ["maintainer:parse-error"],
    });
  });
});

describe("held-in/held-out acceptance", () => {
  function splitScorer(lifts: {
    train: number;
    validation: number;
    final: number;
  }): ScoringFn {
    return async (options) => {
      if (options.body === original) return report(0);
      const id = options.tasks?.[0]?.id as keyof typeof lifts;
      return report(lifts[id]);
    };
  }

  function gateRecorder() {
    const records: SkillProposalGateRecord[] = [];
    const recorder: SkillEvolutionRecorder = {
      knowledge: {
        skillId: "test",
        suiteHash: "s",
        patterns: [],
        rejectedEditKeys: [],
        acceptedEditKeys: [],
      },
      recordEvidence() {},
      recordPatterns() {},
      recordProposal(record) {
        records.push(record);
      },
      complete() {},
    };
    return { records, recorder };
  }

  it("accepts a candidate that repairs training while validation holds", async () => {
    const { records, recorder } = gateRecorder();
    const result = await run(
      splitScorer({ train: 0.5, validation: 0, final: 0.3 }),
      { evolutionRecorder: recorder },
    );
    expect(result.acceptedEdits).toEqual([edit]);
    expect(result.finalLift).toBe(0);
    expect(result.baselineTrainLift).toBe(0);
    expect(result.finalTrainLift).toBe(0.5);
    expect(result.finalTest?.passed).toBe(true);
    expect(result.promotion).toEqual({ eligible: true, reasons: [] });
    expect(records[0]).toMatchObject({
      reason: "accepted",
      deltaLift: 0,
      deltaTrainLift: 0.5,
      negativeTransfer: [{ otherSkill: "neighbor", delta: 0 }],
    });
  });

  it("passes a final test the candidate holds and fails one it loses", async () => {
    const held = await run(
      splitScorer({ train: 0.5, validation: 0, final: 0 }),
    );
    expect(held.acceptedEdits).toEqual([edit]);
    expect(held.finalTest).toMatchObject({
      baselineLift: 0,
      candidateLift: 0,
      passed: true,
    });
    expect(held.promotion?.eligible).toBe(true);

    const lost = await run(
      splitScorer({ train: 0.5, validation: 0, final: -0.5 }),
    );
    expect(lost.finalTest).toMatchObject({ passed: false });
    expect(lost.promotion?.reasons).toContain("final-test-failed");
  });

  it("rejects a candidate that trades a training loss for a validation gain", async () => {
    const { records, recorder } = gateRecorder();
    const result = await run(
      splitScorer({ train: -0.5, validation: 0.5, final: 0.3 }),
      { evolutionRecorder: recorder },
    );
    expect(result.acceptedEdits).toEqual([]);
    expect(result.rejectedCount).toBe(1);
    expect(records[0]).toMatchObject({
      outcome: "rejected",
      reason: "split-regression",
      deltaLift: 0.5,
      deltaTrainLift: -0.5,
    });
  });

  it("rejects a candidate that changes nothing on either split", async () => {
    const { records, recorder } = gateRecorder();
    const result = await run(
      splitScorer({ train: 0, validation: 0, final: 0.3 }),
      { evolutionRecorder: recorder },
    );
    expect(result.acceptedEdits).toEqual([]);
    expect(records[0]).toMatchObject({ reason: "no-validation-lift" });
  });

  it("ignores a neighbor regression the repeat measurement did not reproduce", async () => {
    const neighbor = (confirmed: boolean | undefined) => [
      {
        otherSkill: "neighbor",
        domain: "test",
        delta: -0.5,
        trials: confirmed === undefined ? 1 : 2,
        ...(confirmed === undefined ? {} : { confirmed }),
      },
    ];
    const scorerFor =
      (confirmed: boolean | undefined): ScoringFn =>
      async (options) =>
        report(options.body === original ? 0 : 0.3, {
          negativeTransfer: neighbor(confirmed),
        });
    const unconfirmed = await run(scorerFor(false));
    expect(unconfirmed.acceptedEdits).toEqual([edit]);
    const confirmedRun = await run(scorerFor(true));
    expect(confirmedRun.acceptedEdits).toEqual([]);
    const singleTrial = await run(scorerFor(undefined));
    expect(singleTrial.acceptedEdits).toEqual([]);
  });
});
