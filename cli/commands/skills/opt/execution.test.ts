import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { planDispatch } from "../../../io/runtime-dispatch.js";
import { resolveVendor } from "../../../platform/agent-config.js";
import {
  evolutionErrorMessage,
  protectEvolutionInvocation,
  readEvolutionOutput,
  runEvolutionPrompt,
} from "./execution.js";

const { cleanupProtectedWorkspace } = vi.hoisted(() => ({
  cleanupProtectedWorkspace: vi.fn(),
}));

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("../../../io/protected-text.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../io/protected-text.js")>()),
  prepareProtectedTextWorkspace: vi.fn((invocation) => ({
    invocation,
    cleanup: cleanupProtectedWorkspace,
  })),
}));
vi.mock("../../../platform/agent-config.js", () => ({
  resolveVendor: vi.fn(() => ({ vendor: "claude", config: {} })),
  resolvePromptFlag: vi.fn(() => null),
}));
vi.mock("../../../io/runtime-dispatch/resolve-plan.js", () => ({
  resolveAgentPlan: vi.fn(() => ({ cli: "codex", effort: "high" })),
}));
vi.mock("../../../io/runtime-dispatch.js", () => ({
  planDispatch: vi.fn(() => ({
    invocation: {
      command: "claude",
      args: ["--model", "configured-model", "--agent", "opt-agent"],
      env: {},
    },
  })),
}));

describe("protected evolution execution", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("preserves model settings but removes project and tool discovery arguments", () => {
    const invocation = protectEvolutionInvocation(
      {
        command: "claude",
        args: [
          "--agent",
          "project-agent",
          "--model",
          "configured-model",
          "--effort",
          "high",
          "--add-dir",
          "/private/fixtures",
          "--settings",
          "/private/settings.json",
          "--allowedTools",
          "Read",
          "--system-prompt",
          "hidden instructions",
        ],
        env: {},
      },
      "claude",
      "training evidence",
    );
    expect(invocation.args).toContain("configured-model");
    expect(invocation.args).toContain("high");
    expect(invocation.args).not.toContain("project-agent");
    expect(invocation.args).not.toContain("/private/fixtures");
    expect(invocation.args).not.toContain("hidden instructions");
    expect(invocation.args).toEqual(
      expect.arrayContaining([
        "--safe-mode",
        "--restricted",
        "--strict-mcp-config",
        "--disable-slash-commands",
        "--no-session-persistence",
      ]),
    );
    expect(invocation.args[invocation.args.indexOf("--tools") + 1]).toBe("");
    expect(invocation.args[invocation.args.indexOf("--mcp-config") + 1]).toBe(
      '{"mcpServers":{}}',
    );
    expect(invocation.env?.OMA_NO_AGENTMEMORY).toBe("1");
  });

  it("fails closed for unsupported compiler vendors before planning or dispatching", () => {
    vi.mocked(resolveVendor).mockReturnValueOnce({
      vendor: "gemini",
      config: {},
    } as ReturnType<typeof resolveVendor>);
    expect(() => runEvolutionPrompt("training evidence")).toThrow(
      "unavailable for gemini",
    );
    expect(planDispatch).not.toHaveBeenCalled();
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("uses native protected Codex transport without changing the selected model", () => {
    vi.mocked(resolveVendor).mockReturnValueOnce({
      vendor: "codex",
      config: {},
    } as ReturnType<typeof resolveVendor>);
    vi.mocked(planDispatch).mockReturnValueOnce({
      mode: "native",
      runtimeVendor: "codex",
      targetVendor: "codex",
      reason: "configured Codex",
      invocation: {
        command: "codex",
        args: ["exec", "-m", "chosen-model"],
        env: { CODEX_HOME: "/existing-login" },
      },
    });
    vi.mocked(execFileSync).mockReturnValueOnce("NO_ACTION");
    expect(runEvolutionPrompt("training evidence")).toBe("NO_ACTION");
    const [command, , options] = vi.mocked(execFileSync).mock.calls[0] ?? [];
    expect(command).toBe(process.execPath);
    expect(options?.env?.CODEX_HOME).toBe("/existing-login");
    expect(JSON.parse(String(options?.input))).toMatchObject({
      command: "codex",
      model: "chosen-model",
      effort: "high",
      prompt: "training evidence",
    });
  });

  it("uses fresh compiler workspaces and cleans up after each successful call", () => {
    const directories: string[] = [];
    vi.mocked(execFileSync).mockImplementation((_command, _args, options) => {
      const cwd = String(options?.cwd);
      expect(existsSync(cwd)).toBe(true);
      expect(cwd).not.toBe(process.cwd());
      directories.push(cwd);
      return JSON.stringify({ result: "NO_ACTION", is_error: false });
    });
    expect(runEvolutionPrompt("first training evidence")).toBe("NO_ACTION");
    expect(runEvolutionPrompt("second training evidence")).toBe("NO_ACTION");
    expect(new Set(directories).size).toBe(2);
    expect(directories.every((directory) => !existsSync(directory))).toBe(true);
  });

  it("cleans up failed calls and does not expose subprocess argv or stderr", () => {
    let directory = "";
    const failure = Object.assign(
      new Error("Command failed: training-secret"),
      { status: 1, stderr: "training-secret" },
    );
    vi.mocked(execFileSync).mockImplementation((_command, _args, options) => {
      directory = String(options?.cwd);
      throw failure;
    });
    expect(() => runEvolutionPrompt("training-secret")).toThrow();
    expect(directory).not.toBe("");
    expect(existsSync(directory)).toBe(false);
    expect(evolutionErrorMessage(failure)).not.toContain("training-secret");
    expect(evolutionErrorMessage(failure)).toContain("exit 1");
    expect(cleanupProtectedWorkspace).toHaveBeenCalledOnce();
  });

  it("rejects API error envelopes even when the process succeeded", () => {
    expect(() =>
      readEvolutionOutput('{"is_error":true,"result":"NO_ACTION"}'),
    ).toThrow("error response");
    expect(readEvolutionOutput('{"is_error":false,"result":"NO_ACTION"}')).toBe(
      "NO_ACTION",
    );
  });
});
