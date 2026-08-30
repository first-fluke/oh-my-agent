import { describe, expect, it } from "vitest";
import type { SkillUtilityFinding, SkillUtilityReport } from "../eval.js";
import {
  buildHeuristicMaintainerFn,
  parseMaintainerPatterns,
  selectMaintainerEvidence,
} from "./maintainer.js";

function finding(index: number, lift: number): SkillUtilityFinding {
  return {
    taskId: `task-${index}`,
    baseline: 0,
    treatment: lift > 0 ? 1 : 0,
    lift,
  };
}

describe("WikiSkill maintainer", () => {
  it("selects at most five failures and three successes", () => {
    const findings = [
      ...Array.from({ length: 7 }, (_, index) => finding(index, 0)),
      ...Array.from({ length: 5 }, (_, index) => finding(index + 10, 1)),
    ];
    const selected = selectMaintainerEvidence(findings);
    expect(selected).toHaveLength(8);
    expect(selected.filter((entry) => entry.lift <= 0)).toHaveLength(5);
    expect(selected.filter((entry) => entry.lift > 0)).toHaveLength(3);
  });

  it("requires evidence-linked patterns and clamps confidence", () => {
    const parsed = parseMaintainerPatterns(
      [
        'PATTERN: {"summary":"Use a bounded retry.","evidenceIds":["task-1"],"confidence":2}',
        'PATTERN: {"summary":"Unsupported.","evidenceIds":[]}',
        "PATTERN: not-json",
      ].join("\n"),
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      summary: "Use a bounded retry.",
      evidenceIds: ["task-1"],
      confidence: 1,
    });
    expect(parsed[0]?.id).toMatch(/^pattern-/);
  });

  it("provides a deterministic offline consolidator", async () => {
    const report: SkillUtilityReport = {
      skill: "test-skill",
      taskCount: 5,
      skippedFiles: [],
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      findings: [finding(1, 0)],
      negativeTransfer: [],
      decision: "fail",
      coverage: "ok",
      isolation: "n/a",
    };
    const maintainer = buildHeuristicMaintainerFn();
    const knowledge = {
      skillId: "test-skill",
      suiteHash: "suite",
      patterns: [],
      rejectedEditKeys: [],
      acceptedEditKeys: [],
    };
    const first = await maintainer(report, knowledge, 0);
    const second = await maintainer(report, knowledge, 0);
    expect(first).toEqual(second);
  });
});
