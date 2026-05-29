import * as child_process from "node:child_process";
import type * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnAgent } from "./spawn-status.js";

// Normalize Windows backslashes for cross-platform path string checks.
const n = (s: string) => s.replace(/\\/g, "/");

const { mockFsFunctions, mockPtySpawn } = vi.hoisted(() => ({
  mockPtySpawn: vi.fn(),
  mockFsFunctions: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    openSync: vi.fn(),
    closeSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
  },
}));

vi.mock("node-pty", () => ({
  spawn: mockPtySpawn,
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

function createInteractivePtyProcess(pid = 12345) {
  let dataHandler: ((data: string) => void) | undefined;
  let exitHandler: ((event: { exitCode: number | null }) => void) | undefined;
  const child = {
    pid,
    onData: vi.fn((handler: (data: string) => void) => {
      dataHandler = handler;
      return { dispose: vi.fn() };
    }),
    onExit: vi.fn((handler: (event: { exitCode: number | null }) => void) => {
      exitHandler = handler;
      return { dispose: vi.fn() };
    }),
    kill: vi.fn(),
  };
  return {
    child,
    emitData: (data: string) => dataHandler?.(data),
    emitExit: (exitCode: number | null) => exitHandler?.({ exitCode }),
  };
}

function setupFileBackedFs(workspace = "/workspace") {
  const files = new Map<string, string>();
  mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
    const target = pathArg.toString();
    if (files.has(target)) return true;
    if (n(target).endsWith(workspace)) return true;
    return false;
  });
  mockFsFunctions.statSync.mockReturnValue({
    isDirectory: () => true,
    isFile: () => false,
  });
  mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
    return files.get(pathArg.toString()) ?? "";
  });
  mockFsFunctions.writeFileSync.mockImplementation(
    (
      pathArg: fs.PathOrFileDescriptor,
      data: string | NodeJS.ArrayBufferView,
    ) => {
      if (typeof pathArg === "string") {
        files.set(pathArg, data.toString());
      }
    },
  );
  mockFsFunctions.unlinkSync.mockImplementation((pathArg: fs.PathLike) => {
    files.delete(pathArg.toString());
  });
  return files;
}

describe("agent/spawn-status.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPtySpawn.mockReset();
    process.exitCode = undefined;
    vi.stubEnv("OMA_RUNTIME_VENDOR", "");
    vi.stubEnv("CODEX_CI", "");
    vi.stubEnv("CODEX_THREAD_ID", "");
    vi.stubEnv("CLAUDECODE", "");
    vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.exitCode = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("marks failure if spawn returns no pid", async () => {
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

    await spawnAgent("agent1", "prompt.md", "session1", "/tmp");
    expect(process.exitCode).toBe(1);
  });

  it("spawns process and writes PID", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("user-preferences.yaml")) return false;
      if (n(target).includes("cli-config.yaml")) return false;
      if (
        n(target).includes(
          ".agents/skills/_shared/runtime/execution-protocols/gemini.md",
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
          ".agents/skills/_shared/runtime/execution-protocols/gemini.md",
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
      "gemini",
      expect.arrayContaining(["-p", "prompt content\n\nexecution protocol"]),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]tmp(?:[\\/]|$)/),
      }),
    );
    expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".pid"),
      "12345",
    );
  });

  it("uses node-pty only for Antigravity spawns", async () => {
    const pty = createInteractivePtyProcess(22345);
    mockPtySpawn.mockReturnValue(pty.child);
    setupFileBackedFs();

    await spawnAgent(
      "agent1",
      "Reply exactly: AGY_OK",
      "session1",
      "/workspace",
      "antigravity",
    );

    expect(mockPtySpawn).toHaveBeenCalledWith(
      "agy",
      expect.arrayContaining([
        "--dangerously-skip-permissions",
        "-p",
        "Reply exactly: AGY_OK",
      ]),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]workspace(?:[\\/]|$)/),
      }),
    );
    expect(child_process.spawn).not.toHaveBeenCalled();
    expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".pid"),
      "22345",
    );
  });

  it("writes Antigravity result from captured PTY stdout", async () => {
    const files = setupFileBackedFs();
    const pty = createInteractivePtyProcess(22346);
    mockPtySpawn.mockReturnValue(pty.child);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((): never => {
      return undefined as never;
    });

    await spawnAgent(
      "agent1",
      "Reply exactly: SHOULD_NOT_BE_USED",
      "session1",
      "/workspace",
      "antigravity",
    );
    pty.emitData("\u001b[31mAGY_OK\u001b[0m\r\n");
    pty.emitExit(0);

    const result = [...files.entries()].find(([file]) =>
      n(file).endsWith(".serena/memories/result-agent1-session1.md"),
    )?.[1];
    expect(result).toContain("## Status: completed");
    expect(result).toContain("AGY_OK");
    expect(result).not.toContain("SHOULD_NOT_BE_USED");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("marks Antigravity result failed when PTY output is empty", async () => {
    const files = setupFileBackedFs();
    const pty = createInteractivePtyProcess(22347);
    mockPtySpawn.mockReturnValue(pty.child);
    vi.spyOn(process, "exit").mockImplementation((): never => {
      return undefined as never;
    });

    await spawnAgent(
      "agent1",
      "Reply exactly: AGY_OK",
      "session1",
      "/workspace",
      "antigravity",
    );
    pty.emitExit(0);

    const result = [...files.entries()].find(([file]) =>
      n(file).endsWith(".serena/memories/result-agent1-session1.md"),
    )?.[1];
    expect(result).toContain("## Status: failed");
    expect(result).toContain("(no output captured)");
    expect(result).not.toContain("## Status: completed");
  });

  it("writes a failed result when Antigravity PTY spawn throws", async () => {
    const files = setupFileBackedFs();
    mockPtySpawn.mockImplementation(() => {
      throw new Error("File not found");
    });

    await spawnAgent(
      "agent1",
      "Reply exactly: AGY_OK",
      "session1",
      "/workspace",
      "antigravity",
    );

    const result = [...files.entries()].find(([file]) =>
      n(file).endsWith(".serena/memories/result-agent1-session1.md"),
    )?.[1];
    expect(result).toContain("## Status: failed");
    expect(result).toContain("Antigravity PTY spawn failed");
    expect(result).not.toContain("## Status: completed");
    expect(process.exitCode).toBe(1);
  });

  it("forces a failed Antigravity result when timeout kill never emits exit", async () => {
    vi.useFakeTimers();
    const files = setupFileBackedFs();
    const pty = createInteractivePtyProcess(22348);
    mockPtySpawn.mockReturnValue(pty.child);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((): never => {
      return undefined as never;
    });

    await spawnAgent(
      "agent1",
      "Reply exactly: AGY_OK",
      "session1",
      "/workspace",
      "antigravity",
    );
    await vi.advanceTimersByTimeAsync((5 * 60 + 12) * 1000);

    const result = [...files.entries()].find(([file]) =>
      n(file).endsWith(".serena/memories/result-agent1-session1.md"),
    )?.[1];
    expect(pty.child.kill).toHaveBeenCalled();
    expect(result).toContain("## Status: failed");
    expect(result).toContain("Antigravity PTY timed out");
    expect(exitSpy).toHaveBeenCalledWith(124);
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

  it("model_preset agent_defaults take precedence over default_cli", async () => {
    // model_preset=gemini; default_cli=codex; backend has no agents override.
    // resolveVendor must resolve through the preset (gemini), not fall back to
    // default_cli (codex). default_cli is now a non-agent-context global hint only.
    const OMA_CONFIG_YAML = [
      "language: en",
      "model_preset: gemini",
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
      "gemini",
      expect.arrayContaining(["implement feature"]),
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

  it("does not inject CODEX_HOME isolation env for codex fallback", async () => {
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
        env: expect.not.objectContaining({
          CODEX_HOME: expect.any(String),
        }),
      }),
    );
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

  it("uses Gemini native agent dispatch when runtime and target are both gemini", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "gemini");

    const OMA_CONFIG_YAML = [
      "default_cli: gemini",
      "agent_cli_mapping:",
      "  frontend: gemini",
    ].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: gemini",
      "vendors:",
      "  gemini:",
      "    command: gemini",
      "    prompt_flag: -p",
      "    output_format_flag: --output-format",
      "    output_format: json",
      "    auto_approve_flag: --approval-mode=yolo",
      "    model_flag: -m",
      "    default_model: auto",
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

    const mockChild = { pid: 66668, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "frontend-engineer",
      "build dashboard",
      "session1",
      "/workspace",
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "gemini",
      expect.arrayContaining([
        "--output-format",
        "json",
        "-m",
        "auto",
        "--approval-mode=yolo",
        "-p",
        "@frontend-engineer\n\nbuild dashboard",
      ]),
      expect.objectContaining({
        cwd: expect.stringMatching(/[\\/]workspace(?:[\\/]|$)/),
      }),
    );
  });
});
