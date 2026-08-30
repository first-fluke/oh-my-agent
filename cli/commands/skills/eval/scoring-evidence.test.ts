import { describe, expect, it } from "vitest";
import { serializeSkillUtilityReport } from "./report.js";
import { computeUtility } from "./scoring.js";
import type { RolloutEntry, TaskFixture } from "./types.js";

describe("skill optimization evidence", () => {
  it("attaches observable evidence only when explicitly requested", () => {
    const tasks: TaskFixture[] = Array.from({ length: 5 }, (_, index) => ({
      id: `task-${index}`,
      skill: "test-skill",
      domain: "test",
      prompt: `prompt ${index}`,
      checker: { type: "assert", expect_contains: ["ok"] },
      weight: 1,
    }));
    const rollouts: RolloutEntry[] = tasks.flatMap((task) => [
      { taskId: task.id, arm: "baseline", output: "bad" },
      { taskId: task.id, arm: "treatment", output: "ok" },
    ]);

    const privateReport = computeUtility("test-skill", {
      tasks,
      rollouts,
      includeEvidence: true,
    });
    expect(privateReport.findings[0]?.evidence).toEqual({
      domain: "test",
      prompt: "prompt 0",
      checker: { type: "assert", expect_contains: ["ok"] },
      baselineOutput: "bad",
      treatmentOutput: "ok",
    });
    expect(serializeSkillUtilityReport(privateReport)).not.toContain(
      "baselineOutput",
    );

    const publicReport = computeUtility("test-skill", { tasks, rollouts });
    expect(publicReport.findings[0]?.evidence).toBeUndefined();
  });

  it("allows an internal split to override the public coverage threshold", () => {
    const task: TaskFixture = {
      id: "one",
      skill: "test-skill",
      domain: "test",
      prompt: "prompt",
      checker: { type: "assert", expect_contains: ["ok"] },
      weight: 1,
    };
    const rollouts: RolloutEntry[] = [
      { taskId: "one", arm: "baseline", output: "bad" },
      { taskId: "one", arm: "treatment", output: "ok" },
    ];
    expect(
      computeUtility("test-skill", { tasks: [task], rollouts }).coverage,
    ).toBe("insufficient");
    expect(
      computeUtility("test-skill", {
        tasks: [task],
        rollouts,
        minimumCoverage: 1,
      }).coverage,
    ).toBe("ok");
  });
});
