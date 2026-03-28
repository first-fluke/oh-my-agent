import * as fs from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModeState } from "../../.claude/hooks/types.ts";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(),
}));

const { isStale, deactivate } = await import(
  "../../.claude/hooks/persistent-mode.ts"
);

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
      const exactlyTwoHours = new Date(
        Date.now() - 2 * 60 * 60 * 1000 - 1,
      );
      const state: ModeState = {
        workflow: "orchestrate",
        sessionId: "test-session",
        activatedAt: exactlyTwoHours.toISOString(),
        reinforcementCount: 0,
      };
      expect(isStale(state)).toBe(true);
    });
  });

  describe("deactivate", () => {
    it("should delete the state file when it exists", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      deactivate("/tmp/project", "orchestrate");

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join("/tmp/project", ".agents", "state", "orchestrate-state.json"),
      );
    });

    it("should not attempt deletion when file does not exist", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );

      deactivate("/tmp/project", "orchestrate");

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should use correct path for different workflows", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      deactivate("/tmp/project", "ralph");

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join("/tmp/project", ".agents", "state", "ralph-state.json"),
      );
    });
  });
});
