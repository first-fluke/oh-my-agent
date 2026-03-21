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
import { checkStatus, spawnAgent } from "../commands/agent.js";

// Hoist mocks to allow usage in vi.mock
const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  openSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
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

describe("agent command", () => {
  let processKillSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.kill globally
    processKillSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
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
        expect.arrayContaining([
          "-p",
          "prompt content\n\nexecution protocol",
        ]),
        expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
      );
      expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".pid"),
        "12345",
      );
    });

    it("should resolve vendor from user-preferences.yaml found in parent directory", async () => {
      const USER_PREFS_YAML = [
        "default_cli: codex",
        "agent_cli_mapping:",
        "  frontend: codex",
        "  backend: codex",
        "  mobile: gemini",
      ].join("\n");

      // Simulate monorepo: cwd is /project/apps/api,
      // user-preferences.yaml is at /project/.agents/config/user-preferences.yaml
      const cwdSpy = vi
        .spyOn(process, "cwd")
        .mockReturnValue("/project/apps/api");

      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        // user-preferences.yaml only exists at project root, not in apps/api
        if (target === "/project/.agents/config/user-preferences.yaml")
          return true;
        if (
          target.includes("apps/api/.agents") &&
          target.includes("user-preferences.yaml")
        )
          return false;
        if (target.includes("cli-config.yaml")) return false;
        if (target === "/project/apps/api") return true;
        return false;
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target.includes("user-preferences.yaml")) return USER_PREFS_YAML;
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
      const USER_PREFS_YAML = [
        "default_cli: codex",
        "agent_cli_mapping:",
        "  frontend: codex",
      ].join("\n");

      const cwdSpy = vi
        .spyOn(process, "cwd")
        .mockReturnValue("/project/apps/api");

      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === "/project/.agents/config/user-preferences.yaml")
          return true;
        if (target.includes("user-preferences.yaml")) return false;
        if (target.includes("cli-config.yaml")) return false;
        if (target === "/project/apps/api") return true;
        return false;
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target.includes("user-preferences.yaml")) return USER_PREFS_YAML;
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
