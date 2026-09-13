import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveVendor } from "../../../platform/agent-config.js";
import { buildJudgeDispatchFn } from "./dispatch.js";
import { awaitDispatchResult } from "./envelope.js";

vi.mock("../../../io/runtime-dispatch/resolve-plan.js", () => ({
  resolveAgentPlan: vi.fn(() => ({ effort: "high" })),
}));
vi.mock("node:child_process", () => {
  const execFileSync = vi.fn(
    (
      _command: string,
      args: string[],
      options: {
        cwd?: string;
        env?: Record<string, string | undefined>;
        input?: string;
      },
    ) =>
      JSON.stringify({
        cwd: options.cwd,
        args,
        isolatedMemory: options.env?.OMA_NO_AGENTMEMORY,
      }),
  );
  // The async runner streams the prompt over stdin; replay it through the
  // synchronous mock so existing assertions on `options.input` still hold.
  const execFile = vi.fn(
    (
      command: string,
      args: string[],
      options: Record<string, unknown>,
      callback: (error: unknown, stdout: string, stderr: string) => void,
    ) => ({
      stdin: {
        end(data?: string) {
          try {
            const stdout = execFileSync(command, args, {
              ...options,
              input: data,
            });
            queueMicrotask(() => callback(null, String(stdout ?? ""), ""));
          } catch (error) {
            const failure = error as { stdout?: string; stderr?: string };
            queueMicrotask(() =>
              callback(error, failure.stdout ?? "", failure.stderr ?? ""),
            );
          }
        },
      },
    }),
  );
  return { execFileSync, execFile };
});

vi.mock("../../../platform/agent-config.js", () => ({
  resolveVendor: vi.fn(() => ({ vendor: "claude", config: {} })),
  resolvePromptFlag: vi.fn(() => null),
}));

vi.mock("../../../io/runtime-dispatch.js", () => ({
  planDispatch: vi.fn(() => ({
    invocation: {
      command: process.execPath,
      args: [
        "-e",
        "process.stdout.write(JSON.stringify({cwd:process.cwd(),args:process.argv,isolatedMemory:process.env.OMA_NO_AGENTMEMORY}))",
        "--",
      ],
      env: process.env,
    },
  })),
}));

describe("judge isolation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("pins its vendor and grades in a clean workspace with startup discovery disabled", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(resolveVendor).mockClear();
    const judge = buildJudgeDispatchFn();
    const first = JSON.parse(
      (await awaitDispatchResult(judge("Grade this answer"))).output,
    ) as {
      cwd: string;
      args: string[];
      isolatedMemory: string;
    };
    const second = JSON.parse(
      (await awaitDispatchResult(judge("Grade another answer"))).output,
    ) as { cwd: string };
    expect(resolveVendor).toHaveBeenCalledTimes(1);
    expect(first.cwd).not.toBe(process.cwd());
    expect(second.cwd).not.toBe(first.cwd);
    expect(existsSync(first.cwd)).toBe(false);
    expect(existsSync(second.cwd)).toBe(false);
    expect(first.isolatedMemory).toBe("1");
    expect(first.args).toEqual(
      expect.arrayContaining([
        "--safe-mode",
        "--restricted",
        "--strict-mcp-config",
        "--disable-slash-commands",
        "--no-session-persistence",
      ]),
    );
    const toolsIndex = first.args.indexOf("--tools");
    expect(first.args[toolsIndex + 1]).toBe("");
  });
});
