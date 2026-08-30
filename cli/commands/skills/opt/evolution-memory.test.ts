import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readEvents, sessionsDir } from "../../../state/events.js";
import type { MemoryProvider } from "../../../types/memory.js";
import type { SkillUtilityReport, TaskFixture } from "../eval.js";
import {
  createSkillEvolutionRecorder,
  loadLocalSkillEvolutionKnowledge,
  redactEvolutionText,
  skillEvolutionSuiteHash,
} from "./evolution-memory.js";

function tasks(): TaskFixture[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `task-${index}`,
    skill: "test-skill",
    domain: "test",
    prompt: `prompt ${index}`,
    checker: { type: "assert" as const, expect_contains: ["ok"] },
    weight: 1,
  }));
}

function report(): SkillUtilityReport {
  return {
    skill: "test-skill",
    taskCount: 5,
    skippedFiles: [],
    baselineScore: 0,
    treatmentScore: 0.2,
    utilityLift: 0.2,
    utilityStdDev: 0,
    findings: [
      {
        taskId: "task-0",
        baseline: 0,
        treatment: 0,
        lift: 0,
        evidence: {
          domain: "test",
          prompt: "api_key=SUPERSECRETVALUE",
          checker: { type: "assert", expect_contains: ["ok"] },
          baselineOutput: "failed",
          treatmentOutput: "still failed",
        },
      },
    ],
    negativeTransfer: [],
    decision: "pass",
    coverage: "ok",
    isolation: "n/a",
  };
}

describe("skill evolution memory", () => {
  const cleanup: string[] = [];

  afterEach(() => {
    for (const path of cleanup.splice(0)) {
      rmSync(path, { recursive: true, force: true });
    }
  });

  it("computes a deterministic suite hash independent of task order", () => {
    const fixtures = tasks();
    expect(skillEvolutionSuiteHash(fixtures)).toBe(
      skillEvolutionSuiteHash([...fixtures].reverse()),
    );
  });

  it("redacts common secret forms before evidence persistence", () => {
    expect(redactEvolutionText("api_key=SUPERSECRETVALUE")).toBe(
      "api_key=[REDACTED]",
    );
    expect(redactEvolutionText("sk-abcdefghijklmnop1234")).toBe("[REDACTED]");
  });

  it("persists scoped evidence, patterns, and rejected proposals through L1", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "oma-skill-memory-"));
    cleanup.push(workspace);
    const remembered: string[] = [];
    const provider: MemoryProvider = {
      name: "agentmemory",
      async status() {
        return { provider: "agentmemory", reachable: true };
      },
      async observe() {
        return true;
      },
      async remember(payload) {
        remembered.push(payload.content);
        return true;
      },
      async recall() {
        return [
          {
            text: "[skill-evolution:test-skill:wrong] unrelated",
            score: 10,
          },
        ];
      },
    };
    const fixtures = tasks();
    const suiteHash = skillEvolutionSuiteHash(fixtures);
    const scope = {
      sourceRuntime: "optimizer-a",
      targetRuntime: "inference-b",
      environmentHash: "env-1",
    };
    provider.recall = async () => [
      {
        text: `[skill-evolution:test-skill:${suiteHash}:optimizer-a:inference-b:env-1] prior successful strategy`,
        score: 9,
      },
      {
        text: "[skill-evolution:other:scope] must be filtered",
        score: 20,
      },
    ];

    const recorder = await createSkillEvolutionRecorder({
      workspace,
      skillId: "test-skill",
      tasks: fixtures,
      provider,
      ...scope,
    });
    expect(recorder.knowledge.patterns).toEqual([
      `[skill-evolution:test-skill:${suiteHash}:optimizer-a:inference-b:env-1] prior successful strategy`,
    ]);

    await recorder.recordEvidence(0, report());
    await recorder.recordPatterns(0, [
      {
        id: "pattern-1",
        summary: "Retry with the structured fallback.",
        evidenceIds: ["task-0"],
        confidence: 0.8,
      },
    ]);
    const edit = {
      op: "add" as const,
      anchor: "## Rules",
      after: "\n- fallback",
    };
    await recorder.recordProposal({
      epoch: 0,
      edit,
      editKey: JSON.stringify(edit),
      outcome: "rejected",
      reason: "no-validation-lift",
      deltaLift: 0,
    });
    await recorder.complete({
      skill: "test-skill",
      baselineLift: 0,
      finalLift: 0,
      epochs: [],
      acceptedEdits: [],
      rejectedCount: 1,
      finalSkillMd: "---\nname: test\ndescription: test\n---\n",
      diff: "",
      applied: false,
    });

    const sessionEntries = readdirSync(sessionsDir(workspace)).filter(
      (entry) => entry !== "_index.json",
    );
    expect(sessionEntries).toHaveLength(1);
    const events = readEvents(workspace, sessionEntries[0] ?? "");
    expect(events.map((event) => event.kind).sort()).toEqual(
      [
        "session.created",
        "skill.evolution.started",
        "skill.rollout.recorded",
        "skill.pattern.consolidated",
        "skill.proposal.created",
        "skill.proposal.gated",
        "skill.evolution.completed",
        "session.ended",
      ].sort(),
    );

    const artifact = join(
      workspace,
      ".agents",
      "results",
      "skill-evolution",
      "test-skill",
      `${sessionEntries[0]}.jsonl`,
    );
    const artifactText = readFileSync(artifact, "utf-8");
    expect(artifactText).toContain("[REDACTED]");
    expect(artifactText).not.toContain("SUPERSECRETVALUE");
    expect(remembered.some((text) => text.includes("Pattern:"))).toBe(true);
    expect(remembered.some((text) => text.includes("Proposal rejected:"))).toBe(
      true,
    );

    const loaded = loadLocalSkillEvolutionKnowledge(
      workspace,
      "test-skill",
      suiteHash,
      scope,
    );
    expect(loaded.patterns).toContain("Retry with the structured fallback.");
    expect(loaded.rejectedEditKeys).toEqual([JSON.stringify(edit)]);
    expect(
      loadLocalSkillEvolutionKnowledge(workspace, "test-skill", suiteHash, {
        ...scope,
        environmentHash: "env-2",
      }).patterns,
    ).toEqual([]);
  });

  it("treats validation acceptance as rejected when the runner-owned final test fails", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "oma-skill-final-gate-"));
    cleanup.push(workspace);
    const fixtures = tasks();
    const recorder = await createSkillEvolutionRecorder({
      workspace,
      skillId: "test-skill",
      tasks: fixtures,
      provider: {
        name: "none",
        async status() {
          return { provider: "none", reachable: false };
        },
        async observe() {
          return false;
        },
        async remember() {
          return false;
        },
      },
    });
    const edit = {
      op: "add" as const,
      anchor: "## Rules",
      after: "\n- overfit",
    };
    const editKey = JSON.stringify(edit);
    await recorder.recordProposal({
      epoch: 0,
      edit,
      editKey,
      outcome: "accepted",
      reason: "accepted",
      deltaLift: 1,
    });
    await recorder.complete({
      skill: "test-skill",
      baselineLift: 0,
      finalLift: 1,
      epochs: [],
      acceptedEdits: [edit],
      rejectedCount: 0,
      finalSkillMd: "---\nname: test\ndescription: test\n---\n",
      diff: "diff",
      applied: false,
      finalTest: { baselineLift: 0, candidateLift: 0, passed: false },
    });

    const loaded = loadLocalSkillEvolutionKnowledge(
      workspace,
      "test-skill",
      skillEvolutionSuiteHash(fixtures),
    );
    expect(loaded.rejectedEditKeys).toContain(editKey);
    expect(loaded.acceptedEditKeys).not.toContain(editKey);
  });
});
