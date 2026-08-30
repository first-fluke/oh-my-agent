import { describe, expect, it, vi } from "vitest";
import type { SkillUtilityReport, TaskFixture } from "../eval.js";
import { editKey } from "./edits.js";
import { runOptEpochLoop } from "./epoch-loop.js";
import type {
  SkillEdit,
  SkillEvolutionPattern,
  SkillEvolutionRecorder,
  SkillOptimizerContext,
  SkillProposalGateRecord,
} from "./types.js";

function tasks(prefix: string): TaskFixture[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `${prefix}-${index}`,
    skill: "test-skill",
    domain: "test",
    prompt: `prompt ${index}`,
    checker: { type: "assert" as const, expect_contains: ["ok"] },
    weight: 1,
  }));
}

function report(lift: number): SkillUtilityReport {
  return {
    skill: "test-skill",
    taskCount: 5,
    skippedFiles: [],
    baselineScore: 0,
    treatmentScore: lift,
    utilityLift: lift,
    utilityStdDev: 0,
    findings: [],
    negativeTransfer: [],
    decision: lift > 0 ? "pass" : "fail",
    coverage: "ok",
    isolation: "n/a",
  };
}

describe("WikiSkill epoch integration", () => {
  it("uses recalled rejection history, consolidates evidence, and records gates", async () => {
    const originalBody =
      "---\nname: Test Skill\ndescription: Test skill.\n---\n\n## Rules\n";
    const rejectedEdit: SkillEdit = {
      op: "add",
      anchor: "## Rules",
      after: "\n- rejected before",
    };
    const acceptedEdit: SkillEdit = {
      op: "add",
      anchor: "## Rules",
      after: "\n- accepted rule",
    };
    const proposalRecords: SkillProposalGateRecord[] = [];
    const recorder: SkillEvolutionRecorder = {
      knowledge: {
        skillId: "test-skill",
        suiteHash: "suite",
        patterns: ["prior pattern"],
        rejectedEditKeys: [editKey(rejectedEdit)],
        acceptedEditKeys: [],
      },
      recordEvidence: vi.fn(),
      recordPatterns: vi.fn(
        async (_epoch: number, patterns: SkillEvolutionPattern[]) => {
          recorder.knowledge.patterns.push(
            ...patterns.map((pattern) => pattern.summary),
          );
        },
      ),
      recordProposal: vi.fn(async (record) => {
        proposalRecords.push(record);
      }),
      complete: vi.fn(),
    };
    let optimizerContext: SkillOptimizerContext | undefined;
    const includeEvidenceFlags: boolean[] = [];

    const result = await runOptEpochLoop({
      skillId: "test-skill",
      originalBody,
      trainTasks: tasks("train"),
      valTasks: tasks("val"),
      taskDir: "/tmp/not-used",
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: 600,
      scoringFn: async (options) => {
        includeEvidenceFlags.push(options.includeEvidence === true);
        return report(options.body === originalBody ? 0 : 0.2);
      },
      maintainerFn: async () => [
        {
          id: "pattern-1",
          summary: "new evidence-linked pattern",
          evidenceIds: ["train-0"],
          confidence: 0.8,
        },
      ],
      optimizerFn: async (_body, _findings, context) => {
        optimizerContext = context;
        return [rejectedEdit, acceptedEdit];
      },
      evolutionRecorder: recorder,
    });

    expect(result.acceptedEdits).toEqual([acceptedEdit]);
    expect(proposalRecords).toEqual([
      expect.objectContaining({
        edit: acceptedEdit,
        outcome: "accepted",
        reason: "accepted",
      }),
    ]);
    expect(optimizerContext?.knowledge.rejectedEditKeys).toContain(
      editKey(rejectedEdit),
    );
    expect(optimizerContext?.knowledge.patterns).toContain(
      "new evidence-linked pattern",
    );
    expect(recorder.recordEvidence).toHaveBeenCalledTimes(1);
    expect(recorder.recordPatterns).toHaveBeenCalledTimes(1);
    expect(recorder.complete).not.toHaveBeenCalled();
    expect(includeEvidenceFlags).toContain(true);
  });

  it("keeps the final test hidden until evolution and reports regression", async () => {
    const originalBody =
      "---\nname: Test Skill\ndescription: Test skill.\n---\n\n## Rules\n";
    const edit: SkillEdit = {
      op: "add",
      anchor: "## Rules",
      after: "\n- candidate",
    };
    const optimizerTaskIds: string[][] = [];

    const result = await runOptEpochLoop({
      skillId: "test-skill",
      originalBody,
      trainTasks: tasks("train"),
      valTasks: tasks("val"),
      testTasks: tasks("hidden"),
      taskDir: "/tmp/not-used",
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: 600,
      scoringFn: async (options) => {
        const ids = (options.tasks ?? []).map((task) => task.id);
        const isCandidate = options.body !== originalBody;
        const withFindings = (lift: number) => {
          const value = report(lift);
          value.findings = ids.map((taskId) => ({
            taskId,
            baseline: 0,
            treatment: lift > 0 ? 1 : 0,
            lift,
          }));
          return value;
        };
        if (ids[0]?.startsWith("hidden")) {
          return withFindings(isCandidate ? -0.2 : 0);
        }
        return withFindings(isCandidate ? 0.2 : 0);
      },
      optimizerFn: async (_body, findings) => {
        optimizerTaskIds.push(
          findings.findings.map((finding) => finding.taskId),
        );
        return [edit];
      },
    });

    expect(result.acceptedEdits).toEqual([edit]);
    expect(result.finalTest).toEqual({
      baselineLift: 0,
      candidateLift: -0.2,
      passed: false,
    });
    expect(optimizerTaskIds.flat().some((id) => id.startsWith("hidden"))).toBe(
      false,
    );
  });

  it("does not turn stochastic re-scoring into a final-test win when no edit was accepted", async () => {
    const originalBody =
      "---\nname: Test Skill\ndescription: Test skill.\n---\n\n## Rules\n";
    let hiddenScores = 0;

    const result = await runOptEpochLoop({
      skillId: "test-skill",
      originalBody,
      trainTasks: tasks("train"),
      valTasks: tasks("val"),
      testTasks: tasks("hidden"),
      taskDir: "/tmp/not-used",
      mode: "live",
      maxEpochs: 1,
      lrMaxChars: 600,
      scoringFn: async (options) => {
        const isHidden = options.tasks?.[0]?.id.startsWith("hidden") ?? false;
        if (isHidden) hiddenScores++;
        return report(isHidden ? hiddenScores / 10 : 0);
      },
      optimizerFn: async () => [],
    });

    expect(hiddenScores).toBe(1);
    expect(result.finalTest).toEqual({
      baselineLift: 0.1,
      candidateLift: 0.1,
      passed: false,
    });
  });
});
