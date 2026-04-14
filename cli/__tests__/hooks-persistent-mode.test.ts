import * as fs from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModeState } from "../../.agents/hooks/core/types.ts";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(),
}));

const { isStale, deactivate, writeBlockAndExit } = await import(
  "../../.agents/hooks/core/persistent-mode.ts"
);
const { resolveGitRoot } = await import("../../.agents/hooks/core/types.ts");

describe("persistent-mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isStale", () => {
    it("should return false for recent state", () => {
      const state: ModeState = {
        workflow: "orchestrate",
        sessionId: "test-session",
        activatedAt: new Date().toISOString(),
        reinforcementCount: 0,
      };
      expect(isStale(state)).toBe(false);
    });

    it("should return true for state older than 2 hours", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const state: ModeState = {
        workflow: "orchestrate",
        sessionId: "test-session",
        activatedAt: threeHoursAgo.toISOString(),
        reinforcementCount: 5,
      };
      expect(isStale(state)).toBe(true);
    });

    it("should return false for state just under 2 hours", () => {
      const justUnder = new Date(
        Date.now() - 1 * 60 * 60 * 1000 - 59 * 60 * 1000,
      );
      const state: ModeState = {
        workflow: "orchestrate",
        sessionId: "test-session",
        activatedAt: justUnder.toISOString(),
        reinforcementCount: 0,
      };
      expect(isStale(state)).toBe(false);
    });

    it("should return true for state exactly at 2 hours", () => {
      const exactlyTwoHours = new Date(Date.now() - 2 * 60 * 60 * 1000 - 1);
      const state: ModeState = {
        workflow: "orchestrate",
        sessionId: "test-session",
        activatedAt: exactlyTwoHours.toISOString(),
        reinforcementCount: 0,
      };
      expect(isStale(state)).toBe(true);
    });
  });

  describe("resolveGitRoot", () => {
    it("should return startDir when .git is found immediately", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) => p === join("/project", ".git"),
      );
      expect(resolveGitRoot("/project")).toBe("/project");
    });

    it("should walk up to find .git in parent directory", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) => p === join("/project", ".git"),
      );
      expect(resolveGitRoot("/project/packages/i18n")).toBe("/project");
    });

    it("should return startDir when no .git found (filesystem root)", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      expect(resolveGitRoot("/project/packages/i18n")).toBe(
        "/project/packages/i18n",
      );
    });

    it("should respect max depth and not loop infinitely", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      const deepPath = Array.from({ length: 30 }, (_, i) => `d${i}`).join("/");
      const startDir = `/${deepPath}`;
      expect(resolveGitRoot(startDir)).toBe(startDir);
    });
  });

  describe("writeBlockAndExit", () => {
    it("writes reason to stderr so Stop hook exit-2 reports a continuation prompt", () => {
      const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((code?: number | string | null) => {
          throw new Error(`exit:${code}`);
        });

      const reason = "[OMA PERSISTENT MODE: WORK]\nreinforcement 1/5";

      expect(() => writeBlockAndExit("claude", reason)).toThrow("exit:2");
      expect(stderrSpy).toHaveBeenCalledWith(reason);
      expect(stdoutSpy).toHaveBeenCalledWith(
        JSON.stringify({ decision: "block", reason }),
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it("emits gemini deny payload on stdout while still populating stderr", () => {
      const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });

      expect(() => writeBlockAndExit("gemini", "keep going")).toThrow();
      expect(stderrSpy).toHaveBeenCalledWith("keep going");
      expect(stdoutSpy).toHaveBeenCalledWith(
        JSON.stringify({ decision: "deny", reason: "keep going" }),
      );
    });
  });

  describe("deactivate", () => {
    it("should delete the session-scoped state file when it exists", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      deactivate("/tmp/project", "orchestrate", "test-session");

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join(
          "/tmp/project",
          ".agents",
          "state",
          "orchestrate-state-test-session.json",
        ),
      );
    });

    it("should not attempt deletion when file does not exist", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );

      deactivate("/tmp/project", "orchestrate", "test-session");

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should use correct path for different workflows", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      deactivate("/tmp/project", "ralph", "test-session");

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join(
          "/tmp/project",
          ".agents",
          "state",
          "ralph-state-test-session.json",
        ),
      );
    });
  });
});
