import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runtimeStateDir } from "../../state/project-runtime.js";
import { checkTddEvidence } from "./plan-checks.js";
import { collectVerifyReport } from "./report.js";
import { findResultFile, resolveVerifySelection } from "./run-selection.js";

describe("run-scoped TDD evidence", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-verify-binding-"));
    mkdirSync(join(workspace, ".agents/results"), { recursive: true });
    mkdirSync(join(workspace, ".agents/state/memories"), { recursive: true });
  });

  afterEach(() => {
    process.env.OMA_PROFILE = "0";
    rmSync(workspace, { recursive: true, force: true });
  });

  function plan(session: string, tasks = ["task-api"]) {
    writeFileSync(
      join(workspace, `.agents/results/plan-${session}.json`),
      JSON.stringify({
        tasks: tasks.map((id) => ({
          id,
          agent: "backend",
          test_approach: "tdd",
        })),
      }),
    );
  }

  function report(
    task: string,
    run: string,
    session: string,
    content?: string,
  ) {
    receipt(run, session, task);
    writeFileSync(
      join(
        workspace,
        `.agents/state/memories/result-backend-${task}-${run}-${session}.md`,
      ),
      content ??
        `TDD_EVIDENCE:\n- task: ${task}\n  red: failed\n  green: passed\n`,
    );
  }

  function receipt(runId: string, sessionId: string, taskId = "task-api") {
    mkdirSync(runtimeStateDir(workspace, "agent-runs"), { recursive: true });
    writeFileSync(
      join(runtimeStateDir(workspace, "agent-runs"), `${runId}.json`),
      JSON.stringify({
        runId,
        sessionId,
        taskId,
        agentId: "backend",
        workspace,
      }),
    );
  }

  it("does not accept a past session's report for the current task", () => {
    plan("current");
    report("task-api", "z-old", "old");
    report("task-api", "a-current", "current", "No evidence for this run");
    expect(checkTddEvidence(workspace, "backend").status).toBe("fail");
  });

  it("collects separate reports for same-agent tasks in one session", () => {
    plan("current", ["task-a", "task-z"]);
    report("task-a", "run-a", "current");
    report("task-z", "run-z", "current");
    expect(checkTddEvidence(workspace, "backend").status).toBe("pass");
  });

  it("requires a session when multiple plans are present", () => {
    plan("a-current");
    plan("z-old");
    report("task-api", "old", "z-old");
    const result = checkTddEvidence(workspace, "backend");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("--session-id");
  });

  it("does not treat task-10 evidence as task-1 evidence", () => {
    plan("current", ["task-1"]);
    report(
      "task-1",
      "run",
      "current",
      "TDD_EVIDENCE:\n- task: task-10\n  red: failed\n  green: passed\n",
    );
    expect(checkTddEvidence(workspace, "backend").status).toBe("fail");
  });

  it("does not borrow a hyphen-extended task's report even if it mentions this task", () => {
    plan("current", ["task-1", "task-1-extra"]);
    report(
      "task-1-extra",
      "run",
      "current",
      "TDD_EVIDENCE:\n- task: task-1\n  red: failed\n  green: passed\n",
    );
    const result = checkTddEvidence(workspace, "backend", {
      sessionId: "current",
      taskId: "task-1",
    });
    expect(result.status).toBe("fail");
    expect(result.message).toContain("--run-id");
  });

  it("requires all three IDs for a manual report without a receipt", () => {
    plan("current");
    report("task-api", "manual", "current");
    rmSync(join(runtimeStateDir(workspace, "agent-runs"), "manual.json"));
    const result = checkTddEvidence(workspace, "backend", {
      sessionId: "current",
      taskId: "task-api",
    });
    expect(result.status).toBe("fail");
    expect(result.message).toContain("--run-id");
    expect(
      checkTddEvidence(workspace, "backend", {
        sessionId: "current",
        taskId: "task-api",
        runId: "manual",
      }).status,
    ).toBe("pass");
  });

  it("does not accept an unscoped past report for a session plan", () => {
    plan("current");
    writeFileSync(
      join(workspace, ".agents/state/memories/result-backend.md"),
      "TDD_EVIDENCE:\n- task: task-api\n  red: failed\n  green: passed\n",
    );
    expect(checkTddEvidence(workspace, "backend").status).toBe("fail");
  });

  it("selects an explicit session when other plans exist", () => {
    plan("current");
    plan("old");
    report("task-api", "run", "current");
    expect(
      checkTddEvidence(workspace, "backend", { sessionId: "current" }).status,
    ).toBe("pass");
  });

  it("requires a run when the selected task has multiple attempt reports", () => {
    plan("current");
    report("task-api", "old", "current");
    report("task-api", "new", "current", "Missing evidence");
    expect(
      checkTddEvidence(workspace, "backend", { sessionId: "current" }).status,
    ).toBe("fail");
    expect(
      checkTddEvidence(workspace, "backend", {
        sessionId: "current",
        taskId: "task-api",
        runId: "new",
      }).status,
    ).toBe("fail");
    expect(
      checkTddEvidence(workspace, "backend", {
        sessionId: "current",
        taskId: "task-api",
        runId: "old",
      }).status,
    ).toBe("pass");
  });

  it("does not reuse a previous attempt while the new run has no report", () => {
    plan("current");
    report("task-api", "old", "current");
    receipt("new", "current");
    const result = checkTddEvidence(workspace, "backend", {
      sessionId: "current",
      taskId: "task-api",
    });
    expect(result.status).toBe("fail");
    expect(result.message).toContain("--run-id");
  });

  it("infers session and task from a matching run receipt", () => {
    plan("current", ["task-api", "task-other"]);
    plan("old");
    receipt("run-current", "current");
    report("task-api", "run-current", "current");
    expect(
      checkTddEvidence(workspace, "backend", { runId: "run-current" }).status,
    ).toBe("pass");
  });

  it("resolves HOME receipts only for the active profile", () => {
    receipt("run-current", "current");
    expect(
      resolveVerifySelection(workspace, "backend", { runId: "run-current" }),
    ).toMatchObject({ sessionId: "current", taskId: "task-api" });
    process.env.OMA_PROFILE = "1";
    expect(() =>
      resolveVerifySelection(workspace, "backend", { runId: "run-current" }),
    ).toThrow("Run receipt not found");
  });

  it("ignores old project receipts when resolving and discovering run reports", () => {
    receipt("run-current", "current");
    const current = join(
      runtimeStateDir(workspace, "agent-runs"),
      "run-current.json",
    );
    const legacy = join(workspace, ".agents/state/agent-runs/run-current.json");
    mkdirSync(join(workspace, ".agents/state/agent-runs"), { recursive: true });
    renameSync(current, legacy);
    expect(() =>
      resolveVerifySelection(workspace, "backend", { runId: "run-current" }),
    ).toThrow("Run receipt not found");
    expect(
      findResultFile(workspace, "backend", { sessionId: "current" }),
    ).toBeNull();
    copyFileSync(legacy, current);
    writeFileSync(legacy, "invalid old receipt");
    expect(
      resolveVerifySelection(workspace, "backend", { runId: "run-current" })
        .sessionId,
    ).toBe("current");
    process.env.OMA_PROFILE = "1";
    expect(() =>
      resolveVerifySelection(workspace, "backend", { runId: "run-current" }),
    ).toThrow("Run receipt not found");
  });

  it("rejects a receipt belonging to a different workspace or identity", () => {
    receipt("run-current", "current");
    expect(() =>
      resolveVerifySelection(workspace, "frontend", { runId: "run-current" }),
    ).toThrow("does not match");
    expect(() =>
      resolveVerifySelection(workspace, "backend", {
        runId: "run-current",
        sessionId: "old",
      }),
    ).toThrow("does not match");
    const other = join(workspace, "other");
    expect(() =>
      resolveVerifySelection(other, "backend", {
        artifactRoot: workspace,
        runId: "run-current",
      }),
    ).toThrow("does not match");
  });

  it("requires each task to carry its own RED and GREEN fields", () => {
    plan("current", ["task-a", "task-b"]);
    const partial =
      "TDD_EVIDENCE:\n- task: task-a\n  red: failed\n- task: task-b\n  green: passed\n";
    report("task-a", "run-a", "current", partial);
    report("task-b", "run-b", "current", partial);
    expect(checkTddEvidence(workspace, "backend").status).toBe("fail");
  });

  it("does not borrow GREEN from an unrelated report section", () => {
    plan("current");
    report(
      "task-api",
      "run",
      "current",
      "TDD_EVIDENCE:\n- task: task-api\n  red: failed\n\n# Other checks\n  green: unrelated\n",
    );
    expect(checkTddEvidence(workspace, "backend").status).toBe("fail");
  });

  it("fails a missing explicit plan instead of falling back to a different session", () => {
    plan("old");
    report("task-api", "run", "old");
    expect(
      checkTddEvidence(workspace, "backend", { sessionId: "current" }).status,
    ).toBe("fail");
  });

  it("fails a selected task absent from the plan", () => {
    plan("current");
    expect(
      checkTddEvidence(workspace, "backend", {
        sessionId: "current",
        taskId: "task-missing",
      }).status,
    ).toBe("fail");
  });

  it("returns a failing report for invalid or incomplete selection", () => {
    for (const identity of [
      { sessionId: "../other" },
      { taskId: "task-api" },
      { runId: "missing" },
    ]) {
      const result = collectVerifyReport("backend", workspace, identity);
      expect(result.ok).toBe(false);
      expect(result.checks[0]?.name).toBe("Verification Identity");
    }
  });

  it("forwards CLI identity options to select the current run", () => {
    plan("current");
    plan("old");
    report("task-api", "run", "current");
    const entry = resolve("commands/verify/command.ts");
    const child = spawnSync(
      "bun",
      [
        "-e",
        `import { Command } from "commander"; import { registerVerify } from ${JSON.stringify(entry)}; const program = new Command(); registerVerify(program); await program.parseAsync(${JSON.stringify(["bun", "oma", "verify", "agent", "backend", "-w", workspace, "--session-id", "current", "--task-id", "task-api", "--run-id", "run", "--json"])});`,
      ],
      { encoding: "utf8", timeout: 15_000 },
    );
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout).checks).toContainEqual({
      name: "TDD Evidence",
      status: "pass",
      message: expect.any(String),
    });
  });
});
