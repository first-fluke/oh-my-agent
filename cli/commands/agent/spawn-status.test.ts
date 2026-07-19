import * as child_process from "node:child_process";
import type * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnAgent } from "./spawn-status.js";

// Normalize Windows backslashes for cross-platform path string checks.
const n = (s: string) => s.replace(/\\/g, "/");

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  openSync: vi.fn(),
  closeSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

describe("agent/spawn-status.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OMA_RUNTIME_VENDOR", "");
    vi.stubEnv("CODEX_CI", "");
    vi.stubEnv("CODEX_THREAD_ID", "");
    vi.stubEnv("CLAUDECODE", "");
    vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("exits if spawn returns no pid", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      return n(target).endsWith("/tmp");
    });
    mockFsFunctions.statSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).endsWith("/tmp")) {
        return { isDirectory: () => true, isFile: () => false };
      }
      return { isDirectory: () => false, isFile: () => false };
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: undefined, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(
        (_code?: string | number | null | undefined): never => {
          throw new Error("exit");
        },
      );

    await expect(
      spawnAgent("agent1", "prompt.md", "session1", "/tmp"),
    ).rejects.toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("spawns process and writes PID", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("user-preferences.yaml")) return false;
      if (n(target).includes("cli-config.yaml")) return false;
      if (
        n(target).includes(
          ".agents/skills/_shared/runtime/execution-protocols/claude.md",
        )
      ) {
        return true;
      }
      if (n(target).includes("prompt.md")) return true;
      if (n(target).endsWith("/tmp")) return true;
      return false;
    });
    mockFsFunctions.statSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("prompt.md")) {
        return { isDirectory: () => false, isFile: () => true };
      }
      if (n(target).endsWith("/tmp")) {
        return { isDirectory: () => true, isFile: () => false };
      }
      return { isDirectory: () => false, isFile: () => false };
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("prompt.md")) return "prompt content";
      if (
        n(target).includes(
          ".agents/skills/_shared/runtime/execution-protocols/claude.md",
        )
      ) {
        return "execution protocol";
      }
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 12345, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent("agent1", "prompt.md", "session1", "/tmp");

    expect(child_process.spawn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining([
        "-p",
        expect.stringContaining("prompt content\n\nexecution protocol"),
      ]),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]tmp(?:[\\/]|$)/),
      }),
    );
    expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".pid"),
      "12345",
    );
  });

  it("resolves vendor from oma-config.yaml found in parent directory", async () => {
    // codex preset: backend uses openai/gpt-5.3-codex → cli=codex
    const OMA_CONFIG_YAML = ["language: en", "model_preset: codex"].join("\n");

    const cwdSpy = vi
      .spyOn(process, "cwd")
      .mockReturnValue("/project/apps/api");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).endsWith("/project/.agents/oma-config.yaml")) return true;
      if (
        n(target).includes("apps/api/.agents") &&
        n(target).includes("oma-config")
      ) {
        return false;
      }
      if (n(target).includes("user-preferences.yaml")) return false;
      if (n(target).includes("cli-config.yaml")) return false;
      if (n(target).endsWith("/project/apps/api")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 99999, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "backend",
      "implement feature",
      "session1",
      "/project/apps/api",
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "codex",
      expect.arrayContaining(["implement feature"]),
      expect.objectContaining({
        cwd: expect.stringMatching(/project[\\/]apps[\\/]api/),
      }),
    );
    expect(vi.mocked(child_process.spawn).mock.calls.at(-1)?.[1]).not.toContain(
      "-p",
    );

    cwdSpy.mockRestore();
  });

  it("routes a per-agent opencode custom model slug to the opencode vendor", async () => {
    // Regression for #544: a custom `models:` entry whose `cli` is opencode must
    // resolve to the opencode vendor via the registry (getModelSpec), NOT to the
    // slug's owner prefix. The slug is keyed `owner/model` (the AgentSpec.model
    // schema requires that form). The prompt must be a trailing positional arg,
    // never paired with -p (which means --password in opencode).
    const OMA_CONFIG_YAML = [
      "language: en",
      "model_preset: antigravity",
      "models:",
      "  opencode-go/deepseek-v4-flash:",
      "    cli: opencode",
      "    cli_model: opencode-go/deepseek-v4-flash",
      '    auth_hint: "OpenCode Go subscription"',
      "    supports:",
      "      effort: null",
      "      apply_patch: false",
      "      task_budget: false",
      "      prompt_cache: false",
      "      computer_use: false",
      "      native_dispatch_from: [opencode]",
      "      api_only: false",
      "agents:",
      "  backend:",
      "    model: opencode-go/deepseek-v4-flash",
    ].join("\n");

    const cwdSpy = vi
      .spyOn(process, "cwd")
      .mockReturnValue("/project/apps/api");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).endsWith("/project/.agents/oma-config.yaml")) return true;
      if (n(target).includes("oma-config.yaml")) return false;
      if (n(target).includes("user-preferences.yaml")) return false;
      if (n(target).includes("cli-config.yaml")) return false;
      if (n(target).endsWith("/project/apps/api")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 77777, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "backend",
      "implement feature",
      "session1",
      "/project/apps/api",
    );

    const lastCall = vi.mocked(child_process.spawn).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe("opencode");
    const args = lastCall?.[1] as string[];
    // Per-agent model flows from the resolved plan. #583: `--agent` no longer
    // points at the `mode: subagent` persona directly (OpenCode rejects that and
    // falls back to the default agent); it points at a generated primary wrapper.
    expect(args).toEqual(
      expect.arrayContaining([
        "run",
        "-m",
        "opencode-go/deepseek-v4-flash",
        "--agent",
        "oma-spawn-backend-session1",
      ]),
    );
    expect(args).not.toContain("backend");
    // Prompt is the last positional arg and never preceded by -p (=password).
    expect(args).not.toContain("-p");
    expect(args.at(-1)).toContain("implement feature");
    // -m must sit immediately before the trailing prompt (not swallowed by the
    // variadic positional).
    expect(args[args.length - 3]).toBe("-m");
    expect(args[args.length - 2]).toBe("opencode-go/deepseek-v4-flash");

    // A throwaway primary wrapper was written under .opencode/agents/.
    const wrapperWrite = mockFsFunctions.writeFileSync.mock.calls.find((call) =>
      n(String(call[0])).endsWith(
        "/.opencode/agents/oma-spawn-backend-session1.md",
      ),
    );
    expect(wrapperWrite).toBeDefined();
    expect(String(wrapperWrite?.[1])).toContain("mode: primary");
    expect(String(wrapperWrite?.[1])).toContain('subagent_type: "backend"');

    cwdSpy.mockRestore();
  });

  it("model_preset agent_defaults take precedence over default_cli", async () => {
    // model_preset=claude; default_cli=codex; backend has no agents override.
    // resolveVendor must resolve through the preset (claude), not fall back to
    // default_cli (codex). default_cli is now a non-agent-context global hint only.
    const OMA_CONFIG_YAML = [
      "language: en",
      "model_preset: claude",
      "default_cli: codex",
    ].join("\n");

    const cwdSpy = vi
      .spyOn(process, "cwd")
      .mockReturnValue("/project/apps/api");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).endsWith("/project/.agents/oma-config.yaml")) return true;
      if (n(target).includes("oma-config.yaml")) return false;
      if (n(target).includes("user-preferences.yaml")) return false;
      if (n(target).includes("cli-config.yaml")) return false;
      if (n(target).endsWith("/project/apps/api")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 88888, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "backend",
      "implement feature",
      "session1",
      "/project/apps/api",
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining([
        "-p",
        expect.stringContaining("implement feature"),
      ]),
      expect.objectContaining({
        cwd: expect.stringMatching(/project[\\/]apps[\\/]api/),
      }),
    );

    cwdSpy.mockRestore();
  });

  it("resolves vendor using semantic agent aliases from oma-config.yaml", async () => {
    // mixed preset: architecture → claude-opus (claude), tf-infra → gpt-5.4 (codex)
    const OMA_CONFIG_YAML = ["language: en", "model_preset: mixed"].join("\n");

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/project");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).endsWith("/project/.agents/oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return false;
      if (n(target).endsWith("/project")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 77777, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "architecture-reviewer",
      "review architecture",
      "session1",
      "/project",
    );
    expect(child_process.spawn).toHaveBeenLastCalledWith(
      "claude",
      expect.any(Array),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]project(?:[\\/]|$)/),
      }),
    );

    await spawnAgent(
      "tf-infra-engineer",
      "review terraform",
      "session2",
      "/project",
    );
    expect(child_process.spawn).toHaveBeenLastCalledWith(
      "codex",
      expect.any(Array),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]project(?:[\\/]|$)/),
      }),
    );

    cwdSpy.mockRestore();
  });

  it("prints log output on non-zero exit", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).endsWith("/tmp")) return true;
      if (n(target).includes("subagent-") && n(target).endsWith(".log"))
        return true;
      return false;
    });
    mockFsFunctions.statSync.mockReturnValue({
      isDirectory: () => true,
      isFile: () => false,
    });
    mockFsFunctions.openSync.mockReturnValue(123);
    mockFsFunctions.readFileSync.mockReturnValue("Error: something failed");

    let exitHandler: ((code: number | null) => void) | undefined;
    const mockChild = {
      pid: 55555,
      on: vi.fn((event: string, handler: (code: number | null) => void) => {
        if (event === "exit") exitHandler = handler;
      }),
      unref: vi.fn(),
    };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((): never => {
      throw new Error("exit");
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await spawnAgent("agent1", "do stuff", "session1", "/tmp");

    expect(exitHandler).toBeDefined();
    expect(() => exitHandler?.(1)).toThrow("exit");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Log output"),
    );
    expect(consoleSpy).toHaveBeenCalledWith("Error: something failed");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // Regression for #583: on a clean (code 0) exit the child must leave a
  // durable, session-specific terminal status behind and the log must survive
  // cleanup, so `agent:status` can tell a successful short-lived run from a
  // crash. Only the PID file is removed.
  it("persists a completed status file and preserves the log on clean exit", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = n(pathArg.toString());
      if (target.endsWith("/tmp")) return true;
      // PID file is present at cleanup time; status file is absent at spawn.
      if (target.includes("subagent-") && target.endsWith(".pid")) return true;
      return false;
    });
    mockFsFunctions.statSync.mockReturnValue({
      isDirectory: () => true,
      isFile: () => false,
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    let exitHandler: ((code: number | null) => void) | undefined;
    const mockChild = {
      pid: 44444,
      on: vi.fn((event: string, handler: (code: number | null) => void) => {
        if (event === "exit") exitHandler = handler;
      }),
      unref: vi.fn(),
    };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((): never => {
      throw new Error("exit");
    });

    await spawnAgent("agent1", "do stuff", "session1", "/tmp");

    expect(exitHandler).toBeDefined();
    expect(() => exitHandler?.(0)).toThrow("exit");

    // A terminal "completed" status is persisted to the session-specific file.
    const statusWrite = mockFsFunctions.writeFileSync.mock.calls.find((call) =>
      n(String(call[0])).endsWith(".status"),
    );
    expect(statusWrite).toBeDefined();
    expect(n(String(statusWrite?.[0]))).toContain(
      "subagent-session1-agent1.status",
    );
    expect(String(statusWrite?.[1])).toContain("completed");

    // The PID file is cleaned up, but the log is preserved for inspection.
    const unlinked = mockFsFunctions.unlinkSync.mock.calls.map((call) =>
      n(String(call[0])),
    );
    expect(unlinked.some((p) => p.endsWith(".pid"))).toBe(true);
    expect(unlinked.some((p) => p.endsWith(".log"))).toBe(false);

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("does not inject CODEX_HOME isolation env for codex fallback", async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    delete process.env.CODEX_HOME;
    const CLI_CONFIG_YAML = [
      "active_vendor: codex",
      "vendors:",
      "  codex:",
      "    command: codex",
      "    subcommand: exec",
      "    prompt_flag: none",
      "    auto_approve_flag: --full-auto",
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).includes("user-preferences.yaml")) return false;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 77777, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent("qa-agent", "review code", "session1", "/workspace");

    expect(child_process.spawn).toHaveBeenCalledWith(
      "codex",
      expect.any(Array),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]workspace(?:[\\/]|$)/),
      }),
    );

    const callArgs = vi.mocked(child_process.spawn).mock.calls[0]!;
    expect(callArgs[2]?.env).not.toHaveProperty("CODEX_HOME");
    if (originalCodexHome) {
      process.env.CODEX_HOME = originalCodexHome;
    }
  });

  it("uses Claude native agent dispatch when runtime and target are both claude", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "claude");

    // claude preset: pm → claude
    const OMA_CONFIG_YAML = ["language: en", "model_preset: claude"].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: gemini",
      "vendors:",
      "  claude:",
      "    command: claude",
      "    output_format_flag: --output-format",
      "    output_format: json",
      "    auto_approve_flag: --dangerously-skip-permissions",
      "    model_flag: --model",
      "    default_model: sonnet",
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 66666, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent("pm-planner", "plan the work", "session1", "/workspace");

    expect(child_process.spawn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining([
        "--agent",
        "pm-planner",
        "--output-format",
        "json",
        "--model",
        "claude-sonnet-4-6",
        "--dangerously-skip-permissions",
        "-p",
        "plan the work",
      ]),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]workspace(?:[\\/]|$)/),
      }),
    );
  });

  it("uses Codex native agent dispatch when runtime and target are both codex", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "codex");

    // codex preset: backend → codex
    const OMA_CONFIG_YAML = ["language: en", "model_preset: codex"].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: gemini",
      "vendors:",
      "  codex:",
      "    command: codex",
      "    subcommand: exec",
      "    prompt_flag: none",
      "    output_format_flag: --json",
      "    auto_approve_flag: --full-auto",
      "    model_flag: -m",
      "    default_model: gpt-5.5",
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 66667, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "backend-engineer",
      "implement auth",
      "session1",
      "/workspace",
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "codex",
      expect.arrayContaining([
        "exec",
        "--json",
        "-m",
        "gpt-5.5",
        "--full-auto",
        "@backend-engineer\n\nimplement auth",
      ]),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]workspace(?:[\\/]|$)/),
      }),
    );
  });
});
