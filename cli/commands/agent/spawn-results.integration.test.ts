import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeTestPlan } from "../../state/__fixtures__/task-contract.js";
import {
  claimPath,
  listAgentRuns,
  verifyAgentRun,
} from "../../state/agent-results.js";
import { parallelRun } from "./parallel.js";
import { spawnAgent } from "./spawn-status.js";

const fakeSpawn = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  spawn: fakeSpawn,
}));
vi.mock("../../platform/agent-config.js", () => ({
  resolveVendor: () => ({ vendor: "codex", config: {} }),
  loadExecutionProtocol: () => "",
  loadAgentPersona: () => "",
  resolvePromptContent: (text: string) => text,
  resolvePromptFlag: () => "-p",
}));
vi.mock("../../io/runtime-dispatch.js", () => ({
  planDispatch: () => ({
    mode: "native",
    runtimeVendor: "codex",
    targetVendor: "codex",
    reason: "test",
    invocation: { command: "unused", args: [] },
  }),
}));

describe("spawn structured result integration", () => {
  let root: string;
  let child: EventEmitter & { pid: number };
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-spawn-result-"));
    writeTestPlan(root, ["T1", "qa-reviewer"]);
    child = Object.assign(new EventEmitter(), { pid: 424242 });
    fakeSpawn.mockReturnValue(child);
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.spyOn(process, "exit").mockImplementation((): never => {
      throw new Error("process-exit");
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
    for (const suffix of ["log", "pid", "status"])
      rmSync(join(tmpdir(), `subagent-s1-qa-reviewer.${suffix}`), {
        force: true,
      });
  });
  it("does not label a native exit zero without a claim as completed", async () => {
    await spawnAgent("qa-reviewer", "Review", "s1", root);
    expect(() => child.emit("exit", 0)).toThrow("process-exit");
    expect(listAgentRuns(root)[0]?.status).toBe("partial");
    expect(process.exit).toHaveBeenCalledWith(3);
  });

  it("parallel execution also treats exit zero without a claim as incomplete", async () => {
    const pending = parallelRun([`qa-reviewer:Review:${root}`], {
      inline: true,
    });
    child.emit("exit", 0);
    await expect(pending).rejects.toThrow("process-exit");
    expect(listAgentRuns(root)[0]?.status).toBe("partial");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("parallel spawn errors are recorded once and counted as failures", async () => {
    const failedChild = new EventEmitter();
    fakeSpawn.mockReturnValue(failedChild);
    const pending = parallelRun([`qa-reviewer:Review:${root}`], {
      inline: true,
    });
    expect(() => failedChild.emit("error", new Error("ENOENT"))).not.toThrow();
    await expect(pending).rejects.toThrow("process-exit");
    expect(listAgentRuns(root)[0]?.status).toBe("failed");
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it("finalizes a verified claim using the actual child exit code", async () => {
    await spawnAgent(
      "qa-reviewer",
      "Review",
      "s1",
      root,
      undefined,
      undefined,
      undefined,
      false,
      "T1",
    );
    const run = listAgentRuns(root)[0];
    if (!run) throw new Error("Run was not registered");
    verifyAgentRun(root, run.runId, [
      process.execPath,
      "-e",
      "process.exit(0)",
    ]);
    writeFileSync(
      claimPath(root, run.runId),
      JSON.stringify({
        status: "completed",
        changedFiles: [],
        unresolved: [],
        artifacts: [],
      }),
    );
    expect(() => child.emit("exit", 0)).toThrow("process-exit");
    expect(listAgentRuns(root)[0]).toMatchObject({
      status: "completed",
      taskId: "T1",
      exitCode: 0,
    });
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
