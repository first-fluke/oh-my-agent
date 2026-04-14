import * as child_process from "node:child_process";
import type * as fs from "node:fs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import {
  checkStatus,
  resolveSessionId,
  reviewAgent,
  spawnAgent,
} from "../commands/agent.js";

// Hoist mocks to allow usage in vi.mock
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

const mockMemoryFunctions = vi.hoisted(() => ({
  getSessionMeta: vi.fn(),
  formatSessionId: vi.fn(),
}));

vi.mock("node:fs", async () => {
  return {
    default: mockFsFunctions,
    ...mockFsFunctions,
  };
});

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock("../lib/memory.js", () => mockMemoryFunctions);

describe("agent command", () => {
  let processKillSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.kill globally
    processKillSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
    // Default memory mock
    mockMemoryFunctions.getSessionMeta.mockReturnValue({});
    mockMemoryFunctions.formatSessionId.mockReturnValue(
      "session-20260327-120000",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("spawnAgent", () => {
    it("should exit if spawn returns no pid", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === "/tmp") return true;
        return false;
      });
      mockFsFunctions.statSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === "/tmp")
          return { isDirectory: () => true, isFile: () => false };
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

    it("should spawn process and write PID", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target.includes("user-preferences.yaml")) return false;
        if (target.includes("cli-config.yaml")) return false;
        if (
          target.includes(
            ".agents/skills/_shared/runtime/execution-protocols/gemini.md",
          )
        ) {
          return true;
        }
        if (target.includes("prompt.md")) return true;
        if (target === "/tmp") return true;
        return false;
      });
      mockFsFunctions.statSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target.includes("prompt.md"))
          return { isDirectory: () => false, isFile: () => true };
        if (target === "/tmp")
          return { isDirectory: () => true, isFile: () => false };
        return { isDirectory: () => false, isFile: () => false };
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target.includes("prompt.md")) return "prompt content";
          if (
            target.includes(
              ".agents/skills/_shared/runtime/execution-protocols/gemini.md",
            )
          ) {
            return "execution protocol";
          }
          return "";
        },
      );
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = {
        pid: 12345,
        on: vi.fn(),
        unref: vi.fn(),
      };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      await spawnAgent("agent1", "prompt.md", "session1", "/tmp");

      expect(child_process.spawn).toHaveBeenCalledWith(
        "gemini",
        expect.arrayContaining(["-p", "prompt content\n\nexecution protocol"]),
        expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
      );
      expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".pid"),
        "12345",
      );
    });

    it("should resolve vendor from oma-config.yaml found in parent directory", async () => {
      const OMA_CONFIG_YAML = [
        "default_cli: codex",
        "agent_cli_mapping:",
        "  frontend: codex",
        "  backend: codex",
        "  mobile: gemini",
      ].join("\n");

      // Simulate monorepo: cwd is /project/apps/api,
      // oma-config.yaml is at /project/.agents/oma-config.yaml
      const cwdSpy = vi
        .spyOn(process, "cwd")
        .mockReturnValue("/project/apps/api");

      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === "/project/.agents/oma-config.yaml")
          return true;
        if (target.includes("apps/api/.agents") && target.includes("oma-config"))
          return false;
        if (target.includes("user-preferences.yaml")) return false;
        if (target.includes("cli-config.yaml")) return false;
        if (target === "/project/apps/api") return true;
        return false;
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target.includes("oma-config.yaml")) return OMA_CONFIG_YAML;
          return "";
        },
      );
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = {
        pid: 99999,
        on: vi.fn(),
        unref: vi.fn(),
      };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      await spawnAgent(
        "backend",
        "implement feature",
        "session1",
        "/project/apps/api",
      );

      // Should spawn codex (from agent_cli_mapping), NOT gemini
      expect(child_process.spawn).toHaveBeenCalledWith(
        "codex",
        expect.arrayContaining(["implement feature"]),
        expect.objectContaining({
          cwd: expect.stringContaining("/project/apps/api"),
        }),
      );

      cwdSpy.mockRestore();
    });

    it("should use default_cli when agent has no specific mapping", async () => {
      const OMA_CONFIG_YAML = [
        "default_cli: codex",
        "agent_cli_mapping:",
        "  frontend: codex",
      ].join("\n");

      const cwdSpy = vi
        .spyOn(process, "cwd")
        .mockReturnValue("/project/apps/api");

      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === "/project/.agents/oma-config.yaml") return true;
        if (target.includes("oma-config.yaml")) return false;
        if (target.includes("user-preferences.yaml")) return false;
        if (target.includes("cli-config.yaml")) return false;
        if (target === "/project/apps/api") return true;
        return false;
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target.includes("oma-config.yaml")) return OMA_CONFIG_YAML;
          return "";
        },
      );
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = {
        pid: 88888,
        on: vi.fn(),
        unref: vi.fn(),
      };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      await spawnAgent(
        "backend",
        "implement feature",
        "session1",
        "/project/apps/api",
      );

      // backend has no mapping, should fall back to default_cli: codex
      expect(child_process.spawn).toHaveBeenCalledWith(
        "codex",
        expect.arrayContaining(["implement feature"]),
        expect.objectContaining({
          cwd: expect.stringContaining("/project/apps/api"),
        }),
      );

      cwdSpy.mockRestore();
    });

    it("should resolve vendor using semantic agent aliases from oma-config.yaml", async () => {
      const OMA_CONFIG_YAML = [
        "default_cli: gemini",
        "agent_cli_mapping:",
        "  architecture: claude",
        "  tf-infra: codex",
      ].join("\n");

      const cwdSpy = vi
        .spyOn(process, "cwd")
        .mockReturnValue("/project");

      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === "/project/.agents/oma-config.yaml") return true;
        if (target.includes("cli-config.yaml")) return false;
        if (target === "/project") return true;
        return false;
      });
      mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target.includes("oma-config.yaml")) return OMA_CONFIG_YAML;
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
        expect.objectContaining({ cwd: expect.stringContaining("/project") }),
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
        expect.objectContaining({ cwd: expect.stringContaining("/project") }),
      );

      cwdSpy.mockRestore();
    });

    it("should print log output on non-zero exit", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === "/tmp") return true;
        // Log file exists when exit handler checks
        if (target.includes("subagent-") && target.endsWith(".log"))
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

      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((): never => {
          throw new Error("exit");
        });
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await spawnAgent("agent1", "do stuff", "session1", "/tmp");

      // Simulate non-zero exit
      expect(exitHandler).toBeDefined();
      expect(() => exitHandler?.(1)).toThrow("exit");

      // Should have printed the log content
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Log output"),
      );
      expect(consoleSpy).toHaveBeenCalledWith("Error: something failed");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should create isolation_env directory if it does not exist", async () => {
      const CLI_CONFIG_YAML = [
        "active_vendor: codex",
        "vendors:",
        "  codex:",
        "    command: codex",
        "    subcommand: exec",
        "    prompt_flag: none",
        "    auto_approve_flag: --full-auto",
        '    isolation_env: "CODEX_HOME=/tmp/codex-subagent-$$"',
      ].join("\n");

      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target.includes("cli-config.yaml")) return true;
        if (target.includes("user-preferences.yaml")) return false;
        if (target.startsWith("/tmp/codex-subagent-")) return false;
        if (target === "/workspace") return true;
        return false;
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target.includes("cli-config.yaml")) return CLI_CONFIG_YAML;
          return "";
        },
      );
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = { pid: 77777, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      await spawnAgent("qa-agent", "review code", "session1", "/workspace");

      expect(mockFsFunctions.mkdirSync).toHaveBeenCalledWith(
        expect.stringMatching(/^\/tmp\/codex-subagent-\d+$/),
        { recursive: true },
      );
    });
  });

  describe("resolveSessionId", () => {
    it("should return active session id when available", () => {
      mockMemoryFunctions.getSessionMeta.mockReturnValue({
        id: "session-20260327-090000",
        status: "running",
      });

      const result = resolveSessionId();
      expect(result).toBe("session-20260327-090000");
    });

    it("should generate new session id when no active session", () => {
      mockMemoryFunctions.getSessionMeta.mockReturnValue({});
      mockMemoryFunctions.formatSessionId.mockReturnValue(
        "session-20260327-120000",
      );

      const result = resolveSessionId();
      expect(result).toBe("session-20260327-120000");
      expect(mockMemoryFunctions.formatSessionId).toHaveBeenCalled();
    });

    it("should generate new session id when session is completed", () => {
      mockMemoryFunctions.getSessionMeta.mockReturnValue({
        id: "session-20260327-080000",
        status: "completed",
      });
      mockMemoryFunctions.formatSessionId.mockReturnValue(
        "session-20260327-120000",
      );

      const result = resolveSessionId();
      expect(result).toBe("session-20260327-120000");
    });

    it("should generate new session id when session is failed", () => {
      mockMemoryFunctions.getSessionMeta.mockReturnValue({
        id: "session-20260327-080000",
        status: "failed",
      });
      mockMemoryFunctions.formatSessionId.mockReturnValue(
        "session-20260327-120000",
      );

      const result = resolveSessionId();
      expect(result).toBe("session-20260327-120000");
    });

    it("should reuse idle session", () => {
      mockMemoryFunctions.getSessionMeta.mockReturnValue({
        id: "session-20260327-100000",
        status: "idle",
      });

      const result = resolveSessionId();
      expect(result).toBe("session-20260327-100000");
    });
  });

  describe("reviewAgent", () => {
    it("should spawn codex review with --uncommitted by default", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = { pid: 44444, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );
      vi.spyOn(console, "log").mockImplementation(() => {});

      await reviewAgent({ model: "codex", workspace: "/tmp" });

      expect(child_process.spawn).toHaveBeenCalledWith(
        "codex",
        ["review", "--uncommitted"],
        expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
      );
    });

    it("should spawn codex review without --uncommitted when disabled", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = { pid: 44445, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );
      vi.spyOn(console, "log").mockImplementation(() => {});

      await reviewAgent({
        model: "codex",
        workspace: "/tmp",
        uncommitted: false,
      });

      expect(child_process.spawn).toHaveBeenCalledWith(
        "codex",
        ["review"],
        expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
      );
    });

    it("should spawn claude review with prompt flag and output format", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = { pid: 44446, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );
      vi.spyOn(console, "log").mockImplementation(() => {});

      await reviewAgent({ model: "claude", workspace: "/tmp" });

      expect(child_process.spawn).toHaveBeenCalledWith(
        "claude",
        expect.arrayContaining([
          "-p",
          expect.stringContaining("Review the uncommitted changes"),
          "--output-format",
          "text",
        ]),
        expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
      );
    });

    it("should spawn qwen review with prompt flag", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = { pid: 44447, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );
      vi.spyOn(console, "log").mockImplementation(() => {});

      await reviewAgent({ model: "qwen", workspace: "/tmp" });

      expect(child_process.spawn).toHaveBeenCalledWith(
        "qwen",
        expect.arrayContaining([
          "-p",
          expect.stringContaining("Review the uncommitted changes"),
        ]),
        expect.anything(),
      );
      // Should NOT include --output-format (qwen doesn't use it)
      const args = vi.mocked(child_process.spawn).mock.calls[0]?.[1] as
        | string[]
        | undefined;
      expect(args).not.toContain("--output-format");
    });

    it("should use custom prompt for gemini review", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = { pid: 44448, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );
      vi.spyOn(console, "log").mockImplementation(() => {});

      await reviewAgent({
        model: "gemini",
        workspace: "/tmp",
        prompt: "Check auth logic only",
      });

      expect(child_process.spawn).toHaveBeenCalledWith(
        "gemini",
        expect.arrayContaining([
          "-p",
          expect.stringContaining("Check auth logic only"),
        ]),
        expect.anything(),
      );
      // Should NOT include --output-format (gemini doesn't use it)
      const args = vi.mocked(child_process.spawn).mock.calls[0]?.[1] as
        | string[]
        | undefined;
      expect(args).not.toContain("--output-format");
    });

    it("should inline git diff for committed-only claude review", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockFsFunctions.openSync.mockReturnValue(123);

      vi.mocked(child_process.execSync).mockReturnValue(
        "diff --git a/file.ts\n+added line\n" as unknown as Buffer,
      );

      const mockChild = { pid: 44449, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );
      vi.spyOn(console, "log").mockImplementation(() => {});

      await reviewAgent({
        model: "claude",
        workspace: "/tmp",
        uncommitted: false,
      });

      expect(child_process.execSync).toHaveBeenCalledWith(
        "git diff HEAD~1",
        expect.objectContaining({ encoding: "utf-8" }),
      );

      const args = vi.mocked(child_process.spawn).mock.calls[0]?.[1] as
        | string[]
        | undefined;
      const prompt = args?.find((a) => a.includes("committed diff"));
      expect(prompt).toContain("```diff");
      expect(prompt).toContain("+added line");
    });

    it("should print review output on exit", async () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.openSync.mockReturnValue(123);
      mockFsFunctions.readFileSync.mockReturnValue(
        "Found 2 issues:\n- P1: SQL injection\n- P2: Missing auth",
      );

      let exitHandler: ((code: number | null) => void) | undefined;
      const mockChild = {
        pid: 44450,
        on: vi.fn((event: string, handler: (code: number | null) => void) => {
          if (event === "exit") exitHandler = handler;
        }),
        unref: vi.fn(),
      };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((): never => {
          throw new Error("exit");
        });
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await reviewAgent({ model: "codex", workspace: "/tmp" });

      expect(exitHandler).toBeDefined();
      expect(() => exitHandler?.(0)).toThrow("exit");

      // Should print the review output even on success
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("SQL injection"),
      );
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("checkStatus", () => {
    it("should report correct status from result file", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
        pathArg.toString().includes("result-"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(
        "## Status: completed\nSome detail",
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await checkStatus("session1", ["agent1"]);

      expect(consoleSpy).toHaveBeenCalledWith("agent1:completed");
    });

    it("should fallback to PID check if result file missing", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
        pathArg.toString().includes(".pid"),
      );
      mockFsFunctions.readFileSync.mockReturnValue("9999");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await checkStatus("session1", ["agent1"]);

      // Verify process.kill was called
      expect(processKillSpy).toHaveBeenCalledWith(9999, 0);
      expect(consoleSpy).toHaveBeenCalledWith("agent1:running");
    });

    it("should report crashed if PID not running", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
        pathArg.toString().includes(".pid"),
      );
      mockFsFunctions.readFileSync.mockReturnValue("8888");

      // Mock process.kill to throw (process not running)
      processKillSpy.mockImplementation(() => {
        throw new Error("Not running");
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await checkStatus("session1", ["agent1"]);

      expect(processKillSpy).toHaveBeenCalledWith(8888, 0);
      expect(consoleSpy).toHaveBeenCalledWith("agent1:crashed");
    });
  });
});
