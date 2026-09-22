import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
const fakePlanDispatch = vi.hoisted(() =>
  vi.fn(() => ({
    mode: "native",
    runtimeVendor: "codex",
    targetVendor: "codex",
    reason: "test",
    invocation: { command: "unused", args: [] as string[], env: {} },
  })),
);
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
  planDispatch: fakePlanDispatch,
}));

describe("spawn structured result integration", () => {
  let root: string;
  let child: EventEmitter & { pid: number };
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-spawn-result-"));
    writeTestPlan(root, ["T1", "qa-reviewer"]);
    child = Object.assign(new EventEmitter(), { pid: 424242 });
    fakeSpawn.mockReturnValue(child);
    fakePlanDispatch.mockReset();
    fakePlanDispatch.mockReturnValue({
      mode: "native",
      runtimeVendor: "codex",
      targetVendor: "codex",
      reason: "test",
      invocation: { command: "unused", args: [] as string[], env: {} },
    });
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

  it("passes each parallel workspace to dispatch planning", async () => {
    const pending = parallelRun([`qa-reviewer:Review:${root}`], {
      inline: true,
    });

    expect(fakePlanDispatch).toHaveBeenCalledWith(
      "qa-reviewer",
      "codex",
      {},
      "-p",
      expect.any(String),
      undefined,
      { readOnly: false, workspace: root },
    );

    child.emit("error", new Error("ENOENT"));
    await expect(pending).rejects.toThrow("process-exit");
  });

  it("wraps and removes an external OpenCode parallel subagent", async () => {
    fakePlanDispatch.mockReturnValue({
      mode: "external",
      runtimeVendor: "codex",
      targetVendor: "opencode",
      reason: "test",
      invocation: {
        command: "opencode",
        args: [
          "run",
          "-m",
          "opencode-go/model",
          "--agent",
          "qa-reviewer",
          "--dir",
          root,
          "Review",
        ],
        env: {},
      },
    });

    const pending = parallelRun([`qa-reviewer:Review:${root}`], {
      inline: true,
    });
    const args = fakeSpawn.mock.calls.at(-1)?.[1] as string[];
    expect(args).toEqual(expect.arrayContaining(["--agent"]));
    const agentIndex = args.indexOf("--agent");
    const wrapperName = args[agentIndex + 1];
    expect(wrapperName).toMatch(/^oma-spawn-qa-reviewer-/);
    const wrapperPath = join(root, ".opencode", "agents", `${wrapperName}.md`);
    expect(existsSync(wrapperPath)).toBe(true);

    child.emit("error", new Error("ENOENT"));
    await expect(pending).rejects.toThrow("process-exit");
    expect(existsSync(wrapperPath)).toBe(false);
  });

  it("keeps duplicate parallel OpenCode wrappers distinct until each child exits", async () => {
    const firstChild = Object.assign(new EventEmitter(), { pid: 111111 });
    const secondChild = Object.assign(new EventEmitter(), { pid: 222222 });
    fakeSpawn.mockReturnValueOnce(firstChild).mockReturnValueOnce(secondChild);
    fakePlanDispatch.mockImplementation(() => ({
      mode: "external",
      runtimeVendor: "codex",
      targetVendor: "opencode",
      reason: "test",
      invocation: {
        command: "opencode",
        args: ["run", "--agent", "qa-reviewer", "--dir", root, "Review"],
        env: {},
      },
    }));

    const pending = parallelRun(
      [`qa-reviewer:Review:${root}`, `qa-reviewer:Review:${root}`],
      { inline: true },
    );
    const wrapperNames = fakeSpawn.mock.calls.slice(-2).map(([, args]) => {
      const invocationArgs = args as string[];
      return invocationArgs[invocationArgs.indexOf("--agent") + 1];
    });
    expect(wrapperNames).toHaveLength(2);
    expect(wrapperNames[0]).toMatch(/^oma-spawn-qa-reviewer-/);
    expect(wrapperNames[1]).toMatch(/^oma-spawn-qa-reviewer-/);
    expect(wrapperNames[0]).not.toBe(wrapperNames[1]);
    const wrapperPaths = wrapperNames.map((name) =>
      join(root, ".opencode", "agents", `${name}.md`),
    );
    expect(existsSync(wrapperPaths[0] as string)).toBe(true);
    expect(existsSync(wrapperPaths[1] as string)).toBe(true);

    firstChild.emit("error", new Error("ENOENT"));
    expect(existsSync(wrapperPaths[0] as string)).toBe(false);
    expect(existsSync(wrapperPaths[1] as string)).toBe(true);

    secondChild.emit("error", new Error("ENOENT"));
    await expect(pending).rejects.toThrow("process-exit");
    expect(existsSync(wrapperPaths[1] as string)).toBe(false);
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
