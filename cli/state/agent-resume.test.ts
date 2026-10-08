import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testTask } from "./__fixtures__/task-contract.js";
import {
  beginAgentRun,
  finishAgentRun,
  verifyRequiredChecks,
} from "./agent-results.js";
import {
  planSessionResume,
  type ResumeTask,
  resumeSession,
} from "./agent-resume.js";
import { atomicWriteJson } from "./events.js";
import { runtimeStateDir } from "./project-runtime.js";

const planReadHook = vi.hoisted(() => ({
  callback: undefined as ((file: string) => void) | undefined,
}));
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return {
    ...fs,
    readFileSync: (
      file: Parameters<typeof fs.readFileSync>[0],
      options?: Parameters<typeof fs.readFileSync>[1],
    ) => {
      const contents = fs.readFileSync(file, options);
      planReadHook.callback?.(String(file));
      return contents;
    },
  };
});

describe("session recovery", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-resume-"));
    mkdirSync(join(root, ".agents/results"), { recursive: true });
    writeFileSync(join(root, "a.txt"), "a");
    writeFileSync(join(root, "b.txt"), "b");
    plan();
  });
  afterEach(() => {
    planReadHook.callback = undefined;
    process.env.OMA_PROFILE = "0";
    rmSync(root, { recursive: true, force: true });
  });
  const plan = (
    extraA: Record<string, unknown> = {},
    extraB: Record<string, unknown> = {},
  ) =>
    writeFileSync(
      join(root, ".agents/results/plan-s1.json"),
      JSON.stringify({
        tasks: [
          testTask("A", { inputs: ["a.txt"], ...extraA }),
          testTask("B", { inputs: ["b.txt"], dependencies: ["A"], ...extraB }),
        ],
      }),
    );
  const start = (id: string, previous?: string, managed = false) =>
    beginAgentRun({
      root,
      workspace: root,
      agentId: "qa-reviewer",
      sessionId: "s1",
      taskId: id,
      vendor: "test",
      managed,
      resumedFrom: previous,
      dispatch: { prompt: `Perform ${id}` },
    });
  const finish = (id: string, previous?: string) => {
    const run = start(id, previous);
    verifyRequiredChecks(root, run.runId);
    return finishAgentRun(root, run.runId, 0, {
      status: "completed",
      changedFiles: [],
      unresolved: [],
      artifacts: [],
    });
  };
  const dispatch = async (task: ResumeTask) => {
    finish(task.taskId, task.previousRunId);
    return 0;
  };

  it("uses normalized task definitions from the validated plan", () => {
    plan({ id: " A " });
    expect(
      planSessionResume(root, "s1").tasks.map((task) => task.taskId),
    ).toEqual(["A", "B"]);
  });

  it("keeps task definitions and contracts from one snapshot during scheduling", () => {
    planReadHook.callback = (file) => {
      if (file !== join(root, ".agents/results/plan-s1.json")) return;
      planReadHook.callback = undefined;
      plan(
        { task: "Replacement A", retry_policy: "manual" },
        { task: "Replacement B", dependencies: [] },
      );
    };
    const original = planSessionResume(root, "s1");
    expect(original.tasks).toMatchObject([
      { taskId: "A", prompt: "Perform A", status: "ready", dependsOn: [] },
      { taskId: "B", prompt: "Perform B", status: "ready", dependsOn: ["A"] },
    ]);
    const replacement = planSessionResume(root, "s1");
    expect(replacement.tasks).toMatchObject([
      { taskId: "A", prompt: "Replacement A", status: "blocked" },
      { taskId: "B", prompt: "Replacement B", status: "ready", dependsOn: [] },
    ]);
  });

  it("blocks dispatch when the plan changes while scheduling the resume", async () => {
    planReadHook.callback = (file) => {
      if (file !== join(root, ".agents/results/plan-s1.json")) return;
      planReadHook.callback = undefined;
      plan({ task: "Replacement A" });
    };
    const calls: string[] = [];
    const report = await resumeSession({
      root,
      sessionId: "s1",
      dispatch: async (task) => {
        calls.push(task.taskId);
        return dispatch(task);
      },
    });
    expect(calls).toEqual([]);
    expect(report.ok).toBe(false);
    expect(
      report.tasks.every(
        (task) =>
          task.status === "blocked" && task.reason.includes("Plan changed"),
      ),
    ).toBe(true);
  });

  it("recomputes scheduling instead of reading the persisted progress report", async () => {
    const progressReportPath = join(
      runtimeStateDir(root, "agent-resume"),
      "s1.json",
    );
    mkdirSync(runtimeStateDir(root, "agent-resume"), { recursive: true });
    writeFileSync(progressReportPath, '{"ok":true,"tasks":"stale progress"}');
    const calls: string[] = [];
    const report = await resumeSession({
      root,
      sessionId: "s1",
      dispatch: async (task) => {
        calls.push(task.taskId);
        return dispatch(task);
      },
    });
    expect(calls).toEqual(["A", "B"]);
    expect(report.ok).toBe(true);
    expect(JSON.parse(readFileSync(progressReportPath, "utf8"))).toEqual(
      report,
    );
  });

  it("reuses verified tasks when only unrelated files change", () => {
    finish("A");
    finish("B");
    writeFileSync(join(root, "unrelated.txt"), "new");
    expect(
      planSessionResume(root, "s1").tasks.map((task) => task.status),
    ).toEqual(["reused", "reused"]);
  });
  it("reruns affected work and its dependents in dependency order", async () => {
    finish("A");
    finish("B");
    writeFileSync(join(root, "a.txt"), "changed");
    const calls: string[] = [];
    const report = await resumeSession({
      root,
      sessionId: "s1",
      dispatch: async (task) => {
        calls.push(task.taskId);
        return dispatch(task);
      },
    });
    expect(calls).toEqual(["A", "B"]);
    expect(report.ok).toBe(true);
    expect(
      JSON.parse(
        readFileSync(
          join(runtimeStateDir(root, "agent-resume"), "s1.json"),
          "utf8",
        ),
      ).ok,
    ).toBe(true);
  });
  it("does not dispatch dependents after a failed retry", async () => {
    const calls: string[] = [];
    const report = await resumeSession({
      root,
      sessionId: "s1",
      dispatch: async (task) => {
        calls.push(task.taskId);
        return 1;
      },
    });
    expect(calls).toEqual(["A"]);
    expect(report.tasks.map((task) => task.status)).toEqual([
      "failed",
      "blocked",
    ]);
  });
  it("does not report completion when a later task invalidates reused evidence", async () => {
    finish("A");
    const report = await resumeSession({
      root,
      sessionId: "s1",
      dispatch: async (task) => {
        writeFileSync(join(root, "a.txt"), "invalidated by B");
        return dispatch(task);
      },
    });
    expect(report.ok).toBe(false);
    expect(report.tasks.map((task) => task.status)).toEqual([
      "blocked",
      "blocked",
    ]);
  });
  it("recovers a dead managed attempt and retains its ancestry", async () => {
    const dead = start("A", undefined, true);
    atomicWriteJson(
      join(runtimeStateDir(root, "agent-runs"), `${dead.runId}.json`),
      { ...dead, runnerPid: 2147483647 },
    );
    expect(planSessionResume(root, "s1").tasks[0]?.status).toBe("ready");
    const report = await resumeSession({ root, sessionId: "s1", dispatch });
    expect(report.ok).toBe(true);
  });
  it("never duplicates a live attempt or guesses that a native attempt stopped", () => {
    start("A", undefined, true);
    start("B");
    expect(
      planSessionResume(root, "s1").tasks.map((task) => task.status),
    ).toEqual(["running", "running"]);
  });
  it("blocks retries without a safety declaration and enforces attempt limits", () => {
    plan({ retry_policy: "manual" });
    expect(planSessionResume(root, "s1").tasks[0]?.status).toBe("blocked");
    plan();
    const first = finishAgentRun(root, start("A").runId, 1);
    finishAgentRun(root, start("A", first.runId).runId, 1);
    expect(planSessionResume(root, "s1", 2).tasks[0]?.reason).toBe(
      "Attempt limit reached",
    );
  });
  it("rejects dependency cycles before dispatch", () => {
    plan({ dependencies: ["B"] });
    expect(() => planSessionResume(root, "s1")).toThrow("Cycle");
  });
  it("counts independent run IDs against the same attempt budget", () => {
    finishAgentRun(root, start("A").runId, 1);
    finishAgentRun(root, start("A").runId, 1);
    expect(planSessionResume(root, "s1", 2).tasks[0]?.reason).toBe(
      "Attempt limit reached",
    );
  });
  it("shares a logical goal budget across predeclared task IDs", () => {
    plan({ goal_id: "same-goal" }, { goal_id: "same-goal", dependencies: [] });
    finishAgentRun(root, start("A").runId, 1);
    finishAgentRun(root, start("A").runId, 1);
    expect(planSessionResume(root, "s1", 2).tasks[1]?.reason).toBe(
      "Attempt limit reached",
    );
  });
  it("rechecks a shared goal budget between dispatches", async () => {
    plan({ goal_id: "same-goal" }, { goal_id: "same-goal", dependencies: [] });
    const calls: string[] = [];
    const report = await resumeSession({
      root,
      sessionId: "s1",
      maxAttempts: 1,
      dispatch: async (task) => {
        calls.push(task.taskId);
        return dispatch(task);
      },
    });
    expect(calls).toEqual(["A"]);
    expect(report.tasks[1]).toMatchObject({
      status: "blocked",
      reason: "Attempt limit reached",
    });
  });
  it("blocks product replay when checks pass but the claim is invalid", async () => {
    const run = start("A");
    verifyRequiredChecks(root, run.runId);
    finishAgentRun(root, run.runId, 0, { status: "completed" });
    const calls: string[] = [];
    const report = await resumeSession({
      root,
      sessionId: "s1",
      dispatch: async (task) => {
        calls.push(task.taskId);
        return 0;
      },
    });
    expect(calls).toEqual([]);
    expect(report.tasks[0]).toMatchObject({ status: "blocked" });
    expect(report.tasks[0]?.reason).toContain("WORKFLOW_EVIDENCE_FAILURE");
  });
  it("blocks product replay when only a bound artifact changed", () => {
    const report = join(root, ".agents/results/report.md");
    writeFileSync(report, "review");
    const run = start("A");
    verifyRequiredChecks(root, run.runId);
    finishAgentRun(root, run.runId, 0, {
      status: "completed",
      changedFiles: [],
      unresolved: [],
      artifacts: [".agents/results/report.md"],
    });
    writeFileSync(report, "updated metadata");
    expect(planSessionResume(root, "s1").tasks[0]?.reason).toContain(
      "WORKFLOW_EVIDENCE_FAILURE",
    );
  });
  it("holds one coordinator lease and releases it after completion", async () => {
    let unblock: () => void = () => {};
    const paused = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const first = resumeSession({
      root,
      sessionId: "s1",
      dispatch: async (task) => {
        await paused;
        return dispatch(task);
      },
    });
    await expect(
      resumeSession({ root, sessionId: "s1", dispatch }),
    ).rejects.toThrow("already owns");
    unblock();
    await first;
    expect((await resumeSession({ root, sessionId: "s1", dispatch })).ok).toBe(
      true,
    );
  });

  it("ignores old project leases and checkpoints in every profile", async () => {
    const legacy = join(root, ".agents/state/agent-resume");
    mkdirSync(legacy, { recursive: true });
    atomicWriteJson(join(legacy, "s1.lease.json"), {
      pid: process.pid,
      host: hostname(),
      token: "legacy-coordinator",
    });
    atomicWriteJson(join(legacy, "s1.json"), { old: true });
    const report = await resumeSession({ root, sessionId: "s1", dispatch });
    expect(report.ok).toBe(true);
    expect(
      existsSync(join(runtimeStateDir(root, "agent-resume"), "s1.json")),
    ).toBe(true);
    expect(
      existsSync(join(runtimeStateDir(root, "agent-resume"), "s1.lease.json")),
    ).toBe(false);
    expect(
      JSON.parse(readFileSync(join(legacy, "s1.lease.json"), "utf8")).token,
    ).toBe("legacy-coordinator");
    expect(JSON.parse(readFileSync(join(legacy, "s1.json"), "utf8"))).toEqual({
      old: true,
    });
    process.env.OMA_PROFILE = "1";
    expect(
      existsSync(join(runtimeStateDir(root, "agent-resume"), "s1.json")),
    ).toBe(false);
    expect((await resumeSession({ root, sessionId: "s1", dispatch })).ok).toBe(
      true,
    );
  });

  it("does not parse or replace a malformed old project lease", async () => {
    const legacy = join(root, ".agents/state/agent-resume");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, "s1.lease.json"), "invalid old lease");
    const report = await resumeSession({ root, sessionId: "s1", dispatch });
    expect(report.ok).toBe(true);
    expect(
      existsSync(join(runtimeStateDir(root, "agent-resume"), "s1.json")),
    ).toBe(true);
    expect(existsSync(join(legacy, "s1.json"))).toBe(false);
    expect(readFileSync(join(legacy, "s1.lease.json"), "utf8")).toBe(
      "invalid old lease",
    );
  });
});
