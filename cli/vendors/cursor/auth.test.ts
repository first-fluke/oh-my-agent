import * as childProcess from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isCursorAuthenticated } from "./auth.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

describe("isCursorAuthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CURSOR_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when CURSOR_API_KEY is set", () => {
    vi.stubEnv("CURSOR_API_KEY", "cursor-key");

    expect(isCursorAuthenticated()).toBe(true);
    expect(childProcess.execSync).not.toHaveBeenCalled();
  });

  it("prefers cursor agent status over the legacy cursor-agent shim", () => {
    vi.mocked(childProcess.execSync).mockImplementation((command) => {
      if (command === "cursor agent status") {
        return "✓ Login successful!\nLogged in (unable to fetch user details)";
      }
      throw new Error("legacy shim should not run");
    });

    expect(isCursorAuthenticated()).toBe(true);
    expect(childProcess.execSync).toHaveBeenCalledTimes(1);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      "cursor agent status",
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });

  it("falls back to cursor-agent status when cursor agent status fails", () => {
    vi.mocked(childProcess.execSync).mockImplementation((command) => {
      if (command === "cursor agent status") {
        throw new Error("subcommand unavailable");
      }
      if (command === "cursor-agent status") {
        return "Authenticated";
      }
      throw new Error("unexpected command");
    });

    expect(isCursorAuthenticated()).toBe(true);
    expect(childProcess.execSync).toHaveBeenCalledTimes(2);
  });

  it("parses JSON authenticated payloads", () => {
    vi.mocked(childProcess.execSync).mockReturnValue(
      JSON.stringify({ authenticated: true }),
    );

    expect(isCursorAuthenticated()).toBe(true);
  });

  it("returns false for explicit unauthenticated output", () => {
    vi.mocked(childProcess.execSync).mockImplementation((command) => {
      if (command === "cursor agent status") return "Not authenticated";
      if (command === "cursor-agent status") return "Not authenticated";
      throw new Error("unexpected command");
    });

    expect(isCursorAuthenticated()).toBe(false);
  });

  it("returns false when every status command fails", () => {
    vi.mocked(childProcess.execSync).mockImplementation(() => {
      throw new Error("command failed");
    });

    expect(isCursorAuthenticated()).toBe(false);
  });
});
