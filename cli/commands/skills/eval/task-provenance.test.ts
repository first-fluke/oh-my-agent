import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assessRolloutStaleness, loadRolloutEntries } from "./fixtures.js";
import { negativeTransferTaskHash } from "./negative-transfer.js";
import {
  buildRolloutExpectation,
  collectLiveRollouts,
  taskFixtureHash,
  writeRolloutRecord,
} from "./rollouts.js";
import { scoreSkillBody } from "./score-skill-body.js";
import { JUDGE_DEFAULT_RUBRIC, type TaskFixture } from "./types.js";

describe("task and evaluator provenance", () => {
  let dir: string;
  const body = "candidate body";
  const task: TaskFixture = {
    id: "held-out",
    skill: "skill-x",
    domain: "test",
    prompt: "Answer the task",
    checker: { type: "judge" },
    weight: 1,
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-eval-contract-"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.doUnmock("./types.js");
    vi.resetModules();
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  function record() {
    const capture = collectLiveRollouts(
      [task],
      body,
      (arm) => (arm === "baseline" ? "incorrect" : "correct answer"),
      dir,
      (prompt) => (prompt.includes("\ncorrect answer\n") ? "PASS" : "FAIL"),
    );
    try {
      writeRolloutRecord(dir, capture.rollouts);
      return capture.rollouts;
    } finally {
      capture.cleanupTmp();
    }
  }

  it("records the task/evaluator contract on both arms and preserves offline replay", async () => {
    const entries = record();
    expect(entries.map((entry) => entry.taskHash)).toEqual([
      taskFixtureHash(task),
      taskFixtureHash(task),
    ]);
    const report = await scoreSkillBody({
      skill: task.skill,
      body,
      taskDir: dir,
      tasks: [task],
      minimumCoverage: 1,
    });
    expect(report.coverage).toBe("ok");
    expect(report.utilityLift).toBe(1);
  });

  it.each([
    { checker: { type: "judge" as const, rubric: "A stricter grading rule" } },
    {
      checker: { type: "assert" as const, expect_contains: ["correct answer"] },
    },
    { weight: 2 },
  ])(
    "rejects cached judge verdicts after task/checker changes: %j",
    async (change) => {
      const entries = record();
      const updated: TaskFixture = { ...task, ...change };
      const expected = buildRolloutExpectation([updated], body);
      expect(entries).toHaveLength(2);
      for (const entry of entries) {
        expect(assessRolloutStaleness(entry, expected)).toBe("task-changed");
      }
      const report = await scoreSkillBody({
        skill: task.skill,
        body,
        taskDir: dir,
        tasks: [updated],
        minimumCoverage: 1,
      });
      expect(report.coverage).toBe("insufficient");
      expect(report.findings).toEqual([]);
    },
  );

  it("rejects legacy prompt/body-only recordings instead of inventing task provenance", async () => {
    const entries = record().map((entry) => ({
      ...entry,
      taskHash: undefined,
    }));
    writeRolloutRecord(dir, entries);
    const report = await scoreSkillBody({
      skill: task.skill,
      body,
      taskDir: dir,
      tasks: [task],
      minimumCoverage: 1,
    });
    expect(report.coverage).toBe("insufficient");
    expect(report.findings).toEqual([]);
  });

  it("validates expectations that contain only the full task contract", () => {
    record();
    const updated = { ...task, weight: 5 };
    expect(
      loadRolloutEntries(dir, {
        taskHashes: new Map([[task.id, taskFixtureHash(updated)]]),
      }),
    ).toEqual([]);
  });

  it("hashes effective default rubrics identically and shares the transfer contract", () => {
    const explicit = {
      ...task,
      checker: { type: "judge" as const, rubric: JUDGE_DEFAULT_RUBRIC },
    };
    expect(taskFixtureHash(explicit)).toBe(taskFixtureHash(task));
    expect(negativeTransferTaskHash(task)).toBe(taskFixtureHash(task));
  });

  it.each(["SKILL_EVAL_PROTOCOL_REVISION", "JUDGE_DEFAULT_RUBRIC"] as const)(
    "invalidates recordings when the implicit %s changes",
    async (field) => {
      record();
      vi.resetModules();
      vi.doMock("./types.js", async (importOriginal) => ({
        ...(await importOriginal<typeof import("./types.js")>()),
        [field]: "updated-evaluator-contract",
      }));
      const revised = await import("./rollouts.js");
      expect(revised.taskFixtureHash(task)).not.toBe(taskFixtureHash(task));
      expect(
        loadRolloutEntries(dir, revised.buildRolloutExpectation([task], body)),
      ).toEqual([]);
    },
  );
});
