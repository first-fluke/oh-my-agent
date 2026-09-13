import { describe, expect, it, vi } from "vitest";
import type { SkillUtilityReport, TaskFixture } from "../eval.js";
import {
  createDispatchMeter,
  DispatchBudgetExceededError,
  meterCall,
  meterScoringFn,
} from "./budget.js";
import { runOptEpochLoop } from "./epoch-loop.js";
import type { ScoringFn, SkillEdit } from "./types.js";

const original = "---\nname: test\ndescription: test skill\n---\n\n## Rules\n";
const edit: SkillEdit = { op: "add", anchor: "## Rules", after: "\n- more" };
const task = (id: string): TaskFixture => ({
  id,
  skill: "test",
  domain: "test",
  prompt: "Complete the task",
  checker: { type: "assert", expect_contains: ["done"] },
  weight: 1,
});

function report(lift: number): SkillUtilityReport {
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
  };
}

describe("dispatch meter", () => {
  it("counts calls and refuses the one that would exceed the limit", () => {
    const meter = createDispatchMeter(2);
    const fn = meterCall(
      vi.fn(() => "ok"),
      meter,
    );
    expect(fn()).toBe("ok");
    expect(fn()).toBe("ok");
    expect(() => fn()).toThrow(DispatchBudgetExceededError);
    expect(meter.snapshot()).toEqual({ limit: 2, used: 2 });
  });

  it("never refuses without a limit", () => {
    const meter = createDispatchMeter(null);
    const fn = meterCall(() => 1, meter);
    for (let i = 0; i < 50; i++) fn();
    expect(meter.snapshot()).toEqual({ limit: null, used: 50 });
  });

  it("charges the meter through the scorer's beforeDispatch hook", async () => {
    const meter = createDispatchMeter(3);
    const scorer: ScoringFn = async (options) => {
      // Two arms and a judge call, as the live scorer would issue them.
      options.beforeDispatch?.();
      options.beforeDispatch?.();
      options.beforeDispatch?.();
      return report(0);
    };
    const metered = meterScoringFn(scorer, meter);
    await metered({ skill: "test", body: original, tasks: [task("a")] });
    expect(meter.snapshot()).toEqual({ limit: 3, used: 3 });
    await expect(
      metered({ skill: "test", body: original, tasks: [task("a")] }),
    ).rejects.toThrow(DispatchBudgetExceededError);
  });

  it("keeps the real dispatch path (and its isolation status) when metered", async () => {
    const { scoreSkillBody } = await import("../eval.js");
    const calls: string[] = [];
    const report = await scoreSkillBody({
      skill: "test",
      body: original,
      tasks: [task("a")],
      mode: "live",
      minimumCoverage: 1,
      dispatchFn: (arm) => {
        calls.push(arm);
        return "done";
      },
      beforeDispatch: () => calls.push("charge"),
    });
    expect(calls).toEqual(["charge", "baseline", "charge", "treatment"]);
    expect(report.coverage).toBe("ok");
  });
});

describe("epoch loop under a dispatch budget", () => {
  function run(limit: number) {
    const meter = createDispatchMeter(limit);
    // One unit per scoring request, like a metered live scorer would charge
    // one unit per underlying call.
    const scoringFn = meterCall<Parameters<ScoringFn>, ReturnType<ScoringFn>>(
      async (options) => report(options.body === original ? 0 : 0.3),
      meter,
    );
    return runOptEpochLoop({
      skillId: "test",
      originalBody: original,
      trainTasks: [task("train")],
      valTasks: [task("validation")],
      testTasks: [task("final")],
      taskDir: "/tmp/unused-opt-fixtures",
      mode: "live",
      maxEpochs: 2,
      lrMaxChars: 600,
      optimizerFn: () => [edit],
      scoringFn,
      dispatchMeter: meter,
    });
  }

  it("stops the loop and skips the final test when the budget runs out", async () => {
    // baseline(1) + train(2) + candidate val(3) → the candidate train score is refused.
    const result = await run(3);
    expect(result.acceptedEdits).toEqual([]);
    expect(result.finalTest).toBeUndefined();
    expect(result.diagnostics).toEqual([
      {
        stage: "budget",
        status: "exhausted",
        message: "3 of 3 model calls used; optimization stopped.",
      },
    ]);
    expect(result.budget).toEqual({ limit: 3, used: 3 });
    expect(result.promotion).toEqual({
      eligible: false,
      reasons: [
        "budget:exhausted",
        "final-test-missing",
        "no-validated-candidate",
      ],
    });
  });

  it("reports the final test as not run when the budget ends after acceptance", async () => {
    // baseline, train, cand val, cand train, epoch-2 train, cand val, cand train = 7;
    // final test needs 2 more.
    const result = await run(8);
    expect(result.acceptedEdits.length).toBeGreaterThan(0);
    expect(result.finalTest).toBeUndefined();
    expect((result.diagnostics ?? []).map((d) => d.message)).toEqual([
      "8 of 8 model calls used; final test not run.",
    ]);
    expect(result.promotion?.eligible).toBe(false);
  });

  it("completes and reports usage when the budget suffices", async () => {
    const result = await run(50);
    expect(result.finalTest?.passed).toBe(true);
    expect(result.promotion?.eligible).toBe(true);
    expect(result.budget?.limit).toBe(50);
    expect(result.budget?.used).toBeGreaterThan(0);
  });
});
