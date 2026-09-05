import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PASS_COMMAND,
  testTask,
  writeTestPlan,
} from "./__fixtures__/task-contract.js";
import {
  beginAgentRun,
  finishAgentRun,
  resultEvidenceValid,
  verifyAgentRun,
  verifyRequiredChecks,
} from "./agent-results.js";
import { TaskContractSchema } from "./task-contract.js";

describe("acceptance contracts", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-contract-"));
    writeTestPlan(root);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  const start = () =>
    beginAgentRun({
      root,
      workspace: root,
      agentId: "qa-reviewer",
      sessionId: "s1",
      taskId: "T1",
      vendor: "test",
    });
  const claim = {
    status: "completed",
    changedFiles: [],
    unresolved: [],
    artifacts: [],
  };
  it("does not accept a different successful command as the required check", () => {
    const run = start();
    verifyAgentRun(root, run.runId, [
      process.execPath,
      "-e",
      "process.exitCode=0",
    ]);
    expect(finishAgentRun(root, run.runId, 0, claim).status).not.toBe(
      "completed",
    );
  });
  it("executes pinned checks and records their criterion-linked IDs", () => {
    const run = start();
    const checks = verifyRequiredChecks(root, run.runId);
    expect(checks[0]).toMatchObject({
      checkId: "acceptance",
      exitCode: 0,
      cwd: root,
    });
    expect(resultEvidenceValid(finishAgentRun(root, run.runId, 0, claim))).toBe(
      true,
    );
  });
  it("cannot replace the required command after starting the run", () => {
    const run = start();
    const task = testTask("T1");
    const check = task.required_checks[0];
    if (!check) throw new Error("Missing fixture check");
    check.command = [process.execPath, "-e", "process.exitCode=0"];
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify({ tasks: [task] }),
    );
    expect(() => verifyRequiredChecks(root, run.runId)).toThrow(
      "contract changed",
    );
  });
  it("does not match an identical command run in the wrong directory", () => {
    mkdirSync(join(root, "subdir"));
    const run = start();
    verifyAgentRun(root, run.runId, PASS_COMMAND, join(root, "subdir"));
    expect(finishAgentRun(root, run.runId, 0, claim).status).not.toBe(
      "completed",
    );
  });
  it("rejects uncovered acceptance criteria and unknown references", () => {
    expect(
      TaskContractSchema.safeParse(
        testTask("T1", {
          acceptance_criteria: [
            { id: "missing", description: "Missing check" },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      TaskContractSchema.safeParse(testTask("T1", { required_checks: [] }))
        .success,
    ).toBe(false);
  });
  it("rejects duplicate command selectors instead of ambiguously matching one receipt", () => {
    const task = testTask("T1");
    const check = task.required_checks[0];
    if (!check) throw new Error("Missing fixture check");
    task.required_checks.push({ ...check, id: "duplicate" });
    expect(TaskContractSchema.safeParse(task).success).toBe(false);
  });
  it("rejects scoped inputs reached through a symlinked parent directory", () => {
    mkdirSync(join(root, "source"));
    writeFileSync(join(root, "source/input.txt"), "input");
    symlinkSync(join(root, "source"), join(root, "linked"), "dir");
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify({
        tasks: [testTask("T1", { inputs: ["linked/input.txt"] })],
      }),
    );
    expect(start).toThrow("Scoped inputs cannot follow symlinks");
  });
});
