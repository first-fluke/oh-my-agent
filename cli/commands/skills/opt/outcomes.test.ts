import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillUtilityReport } from "../eval.js";
import { runEvolutionPrompt } from "./execution.js";
import { buildLlmOptimizerFn } from "./llm-optimizer.js";
import { buildLlmMaintainerFn } from "./maintainer.js";

vi.mock("./execution.js", () => ({
  runEvolutionPrompt: vi.fn(),
  evolutionErrorMessage: () => "provider dispatch failed",
}));

const report: SkillUtilityReport = {
  skill: "test",
  taskCount: 1,
  skippedFiles: [],
  baselineScore: 0,
  treatmentScore: 0,
  utilityLift: 0,
  utilityStdDev: 0,
  findings: [{ taskId: "train", baseline: 0, treatment: 0, lift: 0 }],
  negativeTransfer: [],
  decision: "fail",
  coverage: "ok",
  isolation: "enforced",
};
const knowledge = {
  skillId: "test",
  suiteHash: "suite",
  patterns: [],
  rejectedEditKeys: [],
  acceptedEditKeys: [],
};

describe("compiler outcomes", () => {
  beforeEach(() => vi.resetAllMocks());

  it("distinguishes valid proposals, explicit no-action, and malformed responses", async () => {
    const optimizer = buildLlmOptimizerFn(2);
    vi.mocked(runEvolutionPrompt).mockReturnValueOnce(
      'EDIT: {"op":"add","anchor":"## Rules","after":"new rule"}',
    );
    expect(await optimizer("## Rules", report)).toMatchObject({
      status: "proposed",
      edits: [{ op: "add" }],
    });
    vi.mocked(runEvolutionPrompt).mockReturnValueOnce("NO_ACTION");
    expect(await optimizer("## Rules", report)).toEqual({
      status: "no-action",
      edits: [],
    });
    vi.mocked(runEvolutionPrompt).mockReturnValueOnce("EDIT: invalid json");
    expect(await optimizer("## Rules", report)).toMatchObject({
      status: "parse-error",
    });
    vi.mocked(runEvolutionPrompt).mockReturnValueOnce(
      'EDIT: {"op":"delete","anchor":"obsolete"}\nEDIT: broken',
    );
    expect(await optimizer("## Rules", report)).toMatchObject({
      status: "parse-error",
    });
  });

  it("does not turn failed optimizer dispatch into an empty edit list", async () => {
    vi.mocked(runEvolutionPrompt).mockImplementation(() => {
      throw new Error("failed subprocess");
    });
    expect(await buildLlmOptimizerFn(2)("## Rules", report)).toMatchObject({
      status: "dispatch-error",
    });
  });

  it("requires maintainer citations to refer to the supplied training evidence", async () => {
    const maintainer = buildLlmMaintainerFn();
    vi.mocked(runEvolutionPrompt).mockReturnValueOnce(
      'PATTERN: {"summary":"unsupported","evidenceIds":["final-test"]}',
    );
    expect(await maintainer(report, knowledge, 0)).toMatchObject({
      status: "degraded",
      reason: "parse-error",
      patterns: [],
    });
    vi.mocked(runEvolutionPrompt).mockReturnValueOnce(
      'PATTERN: {"summary":"supported","evidenceIds":["train"]}',
    );
    expect(await maintainer(report, knowledge, 0)).toMatchObject({
      status: "consolidated",
      patterns: [{ summary: "supported" }],
    });
  });

  it("marks maintainer dispatch fallback as degraded", async () => {
    vi.mocked(runEvolutionPrompt).mockImplementation(() => {
      throw new Error("failed subprocess");
    });
    expect(await buildLlmMaintainerFn()(report, knowledge, 0)).toMatchObject({
      status: "degraded",
      reason: "dispatch-error",
      patterns: [{ evidenceIds: ["train"] }],
    });
  });
});
