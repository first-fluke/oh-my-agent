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
import { loadTaskContract, TaskContractSchema } from "./task-contract.js";

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
  it("identifies the invalid session plan file when JSON parsing fails", () => {
    const file = join(root, ".agents/results/plan-s1.json");
    writeFileSync(file, '{"tasks": []}}');
    expect(() => loadTaskContract(root, "s1", "T1")).toThrow(
      `Invalid session plan JSON at ${file}`,
    );
  });
  it("rejects a new task ID or changed plan after the first dispatch", () => {
    finishAgentRun(root, start().runId, 1);
    writeTestPlan(root, ["T2"]);
    expect(() =>
      beginAgentRun({
        root,
        workspace: root,
        agentId: "pm",
        sessionId: "s1",
        taskId: "T2",
        vendor: "test",
      }),
    ).toThrow("Plan is immutable after dispatch");
  });
  it("rejects an unknown task instead of starting an uncontracted repair", () => {
    expect(() =>
      beginAgentRun({
        root,
        workspace: root,
        agentId: "pm",
        sessionId: "s1",
        taskId: "repair-1",
        vendor: "test",
      }),
    ).toThrow("Unknown plan task");
  });
  it("rejects recursive plan/review dependencies before the first dispatch", () => {
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify({
        tasks: [
          testTask("T1", { dependencies: ["review"] }),
          testTask("review", { dependencies: ["T1"] }),
        ],
      }),
    );
    expect(start).toThrow("Cycle in task dependencies");
  });
  it("enforces the attempt budget on direct dispatch without resume ancestry", () => {
    for (let i = 0; i < 3; i++) finishAgentRun(root, start().runId, 1);
    expect(start).toThrow("Attempt limit reached");
  });
  it("retains the budget across sessions in the same explicit lineage", () => {
    const plan = { lineage_id: "original-goal", tasks: [testTask("T1")] };
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify(plan),
    );
    for (let i = 0; i < 3; i++) finishAgentRun(root, start().runId, 1);
    writeFileSync(
      join(root, ".agents/results/plan-s2.json"),
      JSON.stringify(plan),
    );
    expect(() =>
      beginAgentRun({
        root,
        workspace: root,
        agentId: "qa",
        sessionId: "s2",
        taskId: "T1",
        vendor: "test",
      }),
    ).toThrow("Attempt limit reached");
  });
  it("requires both a new session and lineage for a contract change", () => {
    finishAgentRun(root, start().runId, 1);
    const changed = { lineage_id: "s1", tasks: [testTask("T2")] };
    writeFileSync(
      join(root, ".agents/results/plan-s2.json"),
      JSON.stringify(changed),
    );
    const next = () =>
      beginAgentRun({
        root,
        workspace: root,
        agentId: "qa",
        sessionId: "s2",
        taskId: "T2",
        vendor: "test",
      });
    expect(next).toThrow("Plan is immutable after dispatch");
    changed.lineage_id = "new-contract";
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify(changed),
    );
    expect(start).toThrow("Plan is immutable after dispatch");
    writeFileSync(
      join(root, ".agents/results/plan-s2.json"),
      JSON.stringify(changed),
    );
    expect(next().lineageId).toBe("new-contract");
  });
  it("allows plan formatting changes but rejects deletion of a dispatched plan", () => {
    finishAgentRun(root, start().runId, 1);
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify({ tasks: [testTask("T1")] }, null, 2),
    );
    const retry = start();
    finishAgentRun(root, retry.runId, 1);
    rmSync(join(root, ".agents/results/plan-s1.json"));
    expect(start).toThrow("Plan is immutable after dispatch: missing plan");
  });
  it("permits one metadata repair under the same contract and then stops", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    finishAgentRun(root, run.runId, 0, { status: "completed" });
    const repair = start();
    expect(repair.evidenceRepair).toBe(true);
    verifyRequiredChecks(root, repair.runId);
    finishAgentRun(root, repair.runId, 0, { status: "completed" });
    expect(start).toThrow("WORKFLOW_EVIDENCE_FAILURE");
  });
  it("does not accept product changes during metadata repair", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    finishAgentRun(root, run.runId, 0, { status: "completed" });
    const repair = start();
    writeFileSync(join(root, "product.txt"), "unexpected product edit");
    verifyRequiredChecks(root, repair.runId);
    const result = finishAgentRun(root, repair.runId, 0, claim);
    expect(result.status).toBe("failed");
    expect(result.unresolved.join(" ")).toContain(
      "Evidence repair changed product inputs",
    );
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
