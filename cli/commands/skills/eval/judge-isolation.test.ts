import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveVendor } from "../../../platform/agent-config.js";
import { buildJudgeDispatchFn } from "./dispatch.js";
import { resolveDispatchResult } from "./envelope.js";

vi.mock("../../../io/runtime-dispatch/resolve-plan.js", () => ({
  resolveAgentPlan: vi.fn(() => ({ effort: "high" })),
}));
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn((_command, args, options) =>
    JSON.stringify({
      cwd: options.cwd,
      args,
      isolatedMemory: options.env.OMA_NO_AGENTMEMORY,
    }),
  ),
}));

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

  it("pins its vendor and grades in a clean workspace with startup discovery disabled", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(resolveVendor).mockClear();
    const judge = buildJudgeDispatchFn();
    const first = JSON.parse(
      resolveDispatchResult(judge("Grade this answer")).output,
    ) as {
      cwd: string;
      args: string[];
      isolatedMemory: string;
    };
    const second = JSON.parse(
      resolveDispatchResult(judge("Grade another answer")).output,
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
