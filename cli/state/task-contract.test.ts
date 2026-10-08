import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
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
  readAgentRun,
  resultEvidenceValid,
  verifyAgentRun,
  verifyRequiredChecks,
} from "./agent-results.js";
import { runtimeStateDir } from "./project-runtime.js";
import {
  contractHash,
  loadTaskContract,
  loadTaskDecisionRequirements,
  TaskContractSchema,
} from "./task-contract.js";

describe("acceptance contracts", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-contract-"));
    writeTestPlan(root);
  });
  afterEach(() => {
    process.env.OMA_PROFILE = "0";
    rmSync(root, { recursive: true, force: true });
  });
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
  it.each([
    { label: "a non-array decision requirement", value: {} },
    { label: "a non-object decision requirement", value: ["api-contract"] },
    {
      label: "a missing description",
      value: [{ subject: "backend.api-contract" }],
    },
    {
      label: "a blank subject",
      value: [{ subject: " \t", description: "Choose the API contract" }],
    },
    {
      label: "a blank description",
      value: [{ subject: "backend.api-contract", description: " \n" }],
    },
    {
      label: "duplicate subjects after trimming",
      value: [
        { subject: "backend.api-contract", description: "Choose the API" },
        { subject: " backend.api-contract ", description: "Choose again" },
      ],
    },
  ])("rejects $label", ({ value }) => {
    expect(
      TaskContractSchema.safeParse(
        testTask("T1", { required_decisions: value }),
      ).success,
    ).toBe(false);
  });
  it("persists normalized decision requirements in the dispatched contract", () => {
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify({
        tasks: [
          testTask("T1", {
            required_decisions: [
              {
                subject: " backend.api-contract ",
                description: " Choose the API compatibility strategy ",
              },
            ],
          }),
        ],
      }),
    );
    const run = start();
    const requirements = [
      {
        subject: "backend.api-contract",
        description: "Choose the API compatibility strategy",
      },
    ];
    expect(run.contract?.required_decisions).toEqual(requirements);
    expect(readAgentRun(root, run.runId).contract?.required_decisions).toEqual(
      requirements,
    );
    const saved = JSON.parse(
      readFileSync(
        join(runtimeStateDir(root, "agent-runs"), `${run.runId}.json`),
        "utf8",
      ),
    );
    expect(saved.contract.required_decisions).toEqual(requirements);
  });
  it.each([
    { label: "remove requirements", requirements: {} },
    { label: "clear requirements", requirements: { required_decisions: [] } },
    {
      label: "change a subject",
      requirements: {
        required_decisions: [
          { subject: "backend.authentication", description: "Choose the API" },
        ],
      },
    },
    {
      label: "change a description",
      requirements: {
        required_decisions: [
          {
            subject: "backend.api-contract",
            description: "Choose a different compatibility policy",
          },
        ],
      },
    },
  ])("cannot $label after dispatch", ({ requirements }) => {
    const file = join(root, ".agents/results/plan-s1.json");
    writeFileSync(
      file,
      JSON.stringify({
        tasks: [
          testTask("T1", {
            required_decisions: [
              {
                subject: "backend.api-contract",
                description: "Choose the API",
              },
            ],
          }),
        ],
      }),
    );
    const run = start();
    writeFileSync(
      file,
      JSON.stringify({ tasks: [testTask("T1", requirements)] }),
    );
    expect(() => loadTaskContract(root, "s1", "T1")).toThrow(
      "Plan is immutable after dispatch",
    );
    expect(() => verifyRequiredChecks(root, run.runId)).toThrow(
      "contract changed",
    );
    const result = finishAgentRun(root, run.runId, 0, claim);
    expect(result.status).toBe("failed");
    expect(result.unresolved).toContain(
      "Task acceptance contract changed during execution",
    );
  });
  it("preserves serialized contracts and hashes when no decisions are required", () => {
    const task = testTask("T1", {
      required_checks: [
        {
          id: "acceptance",
          criteria: ["AC1"],
          command: ["test-runner", "--acceptance"],
          cwd: ".",
        },
      ],
    });
    const contract = TaskContractSchema.parse(task);
    expect(JSON.stringify(contract)).toBe(
      JSON.stringify({
        id: "T1",
        acceptance_criteria: task.acceptance_criteria,
        required_checks: task.required_checks,
        dependencies: [],
        retry_policy: "safe",
      }),
    );
    expect(contractHash(contract)).toBe(
      "8e118da0862b47725fca32a090773ac3aa003feaf5ade028013307cba56dc94d",
    );
    const run = start();
    expect(readAgentRun(root, run.runId).contract).not.toHaveProperty(
      "required_decisions",
    );
    verifyRequiredChecks(root, run.runId);
    expect(resultEvidenceValid(finishAgentRun(root, run.runId, 0, claim))).toBe(
      true,
    );
  });
  it("loads no decision requirements when the plan or declaration is absent", () => {
    expect(loadTaskDecisionRequirements(root, "s1", "T1")).toEqual([]);
    expect(loadTaskDecisionRequirements(root, "no-plan", "T1")).toEqual([]);
    expect(() => loadTaskDecisionRequirements(root, "s1", "unknown")).toThrow(
      "Unknown plan task",
    );
  });
  it.each([
    { label: "non-array", value: {} },
    {
      label: "blank",
      value: [{ subject: " ", description: "Choose the API" }],
    },
    {
      label: "missing description",
      value: [{ subject: "backend.api-contract" }],
    },
    {
      label: "duplicate",
      value: [
        { subject: "backend.api-contract", description: "Choose the API" },
        { subject: " backend.api-contract ", description: "Choose again" },
      ],
    },
  ])(
    "rejects $label decision requirements without executable checks",
    ({ value }) => {
      writeFileSync(
        join(root, ".agents/results/plan-s1.json"),
        JSON.stringify({ tasks: [{ id: "T1", required_decisions: value }] }),
      );
      expect(loadTaskContract(root, "s1", "T1")).toBeNull();
      expect(() => loadTaskDecisionRequirements(root, "s1", "T1")).toThrow();
      expect(start).toThrow();
    },
  );
  it("snapshots decision requirements without adding an executable contract", () => {
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify({
        tasks: [
          {
            id: "T1",
            required_decisions: [
              {
                subject: " architecture.system-boundary ",
                description: " Choose the ownership boundary ",
              },
            ],
          },
        ],
      }),
    );
    const requirements = [
      {
        subject: "architecture.system-boundary",
        description: "Choose the ownership boundary",
      },
    ];
    expect(loadTaskContract(root, "s1", "T1")).toBeNull();
    expect(loadTaskDecisionRequirements(root, "s1", "T1")).toEqual(
      requirements,
    );
    const run = start();
    expect(run.contract).toBeUndefined();
    expect(run.requiredDecisions).toEqual(requirements);
    const saved = readAgentRun(root, run.runId);
    expect(saved.contract).toBeUndefined();
    expect(saved.requiredDecisions).toEqual(requirements);
  });
  it.each([
    { label: "remove", task: { id: "T1" } },
    {
      label: "change",
      task: {
        id: "T1",
        required_decisions: [
          {
            subject: "architecture.system-boundary",
            description: "Choose a different boundary",
          },
        ],
      },
    },
  ])(
    "cannot $label decision requirements in a non-executable dispatched plan",
    ({ task }) => {
      const file = join(root, ".agents/results/plan-s1.json");
      writeFileSync(
        file,
        JSON.stringify({
          tasks: [
            {
              id: "T1",
              required_decisions: [
                {
                  subject: "architecture.system-boundary",
                  description: "Choose the ownership boundary",
                },
              ],
            },
          ],
        }),
      );
      start();
      writeFileSync(file, JSON.stringify({ tasks: [task] }));
      expect(() => loadTaskDecisionRequirements(root, "s1", "T1")).toThrow(
        "Plan is immutable after dispatch",
      );
      expect(start).toThrow("Plan is immutable after dispatch");
    },
  );
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

  it("isolates dispatched plan pins and attempt budgets between profiles", () => {
    const first = start();
    expect(first.sequence).toBe(1);
    const initial = readFileSync(
      join(root, ".agents/results/plan-s1.json"),
      "utf8",
    );
    process.env.OMA_PROFILE = "1";
    writeTestPlan(root, ["T2"]);
    expect(
      beginAgentRun({
        root,
        workspace: root,
        agentId: "qa-reviewer",
        sessionId: "s1",
        taskId: "T2",
        vendor: "test",
      }).sequence,
    ).toBe(1);
    process.env.OMA_PROFILE = "0";
    expect(start).toThrow("Plan is immutable after dispatch");
    writeFileSync(join(root, ".agents/results/plan-s1.json"), initial);
    expect(start().sequence).toBe(2);
  });

  it("ignores old project plan pins even in the default profile", () => {
    start();
    const legacy = join(root, ".agents/state/agent-plans");
    mkdirSync(join(root, ".agents/state"), { recursive: true });
    renameSync(runtimeStateDir(root, "agent-plans"), legacy);
    writeTestPlan(root, ["T2"]);
    expect(loadTaskContract(root, "s1", "T2")?.id).toBe("T2");
    expect(readFileSync(join(legacy, "sessions/s1.json"), "utf8")).toContain(
      '"lineageId": "s1"',
    );
    process.env.OMA_PROFILE = "1";
    expect(loadTaskContract(root, "s1", "T2")?.id).toBe("T2");
  });
});
