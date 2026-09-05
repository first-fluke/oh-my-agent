import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("session recovery", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-resume-"));
    mkdirSync(join(root, ".agents/results"), { recursive: true });
    writeFileSync(join(root, "a.txt"), "a");
    writeFileSync(join(root, "b.txt"), "b");
    plan();
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
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
        readFileSync(join(root, ".agents/state/agent-resume/s1.json"), "utf8"),
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
      join(root, ".agents/state/agent-runs", `${dead.runId}.json`),
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
});
