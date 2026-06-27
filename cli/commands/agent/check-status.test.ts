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
import { checkStatus } from "./spawn-status.js";

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

describe("agent/check-status.ts", () => {
  let processKillSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    processKillSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports correct status from result file", async () => {
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

  it("falls back to PID check if result file missing", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
      pathArg.toString().includes(".pid"),
    );
    mockFsFunctions.readFileSync.mockReturnValue("9999");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await checkStatus("session1", ["agent1"]);

    expect(processKillSpy).toHaveBeenCalledWith(9999, 0);
    expect(consoleSpy).toHaveBeenCalledWith("agent1:running");
  });

  it("reports crashed if PID not running", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
      pathArg.toString().includes(".pid"),
    );
    mockFsFunctions.readFileSync.mockReturnValue("8888");

    processKillSpy.mockImplementation(() => {
      throw new Error("Not running");
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await checkStatus("session1", ["agent1"]);

    expect(processKillSpy).toHaveBeenCalledWith(8888, 0);
    expect(consoleSpy).toHaveBeenCalledWith("agent1:crashed");
  });

  // Regression for #583: a short-lived agent that exits 0 without writing a
  // result memory must report completed, not crashed. spawnAgent persists a
  // session-specific `.status` artifact on exit; checkStatus reads it after the
  // PID file (and its log) have been cleaned up.
  it("reports completed from session-specific status file when result is absent", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
      pathArg.toString().includes(".status"),
    );
    mockFsFunctions.readFileSync.mockReturnValue("completed\n");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await checkStatus("session1", ["agent1"]);

    expect(consoleSpy).toHaveBeenCalledWith("agent1:completed");
  });

  it("reports crashed from session-specific status file on non-zero exit", async () => {
    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
      pathArg.toString().includes(".status"),
    );
    mockFsFunctions.readFileSync.mockReturnValue("crashed\n");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await checkStatus("session1", ["agent1"]);

    expect(consoleSpy).toHaveBeenCalledWith("agent1:crashed");
  });

  // The status file is session-specific, so it must rank below the agent's own
  // result memory: a semantic status such as "blocked" must not be flattened to
  // the exit-code-derived "completed".
  it("result memory takes precedence over the session status file", async () => {
    mockFsFunctions.existsSync.mockImplementation(
      (pathArg: fs.PathLike) =>
        pathArg.toString().includes("result-") ||
        pathArg.toString().includes(".status"),
    );
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) =>
      pathArg.toString().includes("result-")
        ? "## Status: blocked\nWaiting on upstream"
        : "completed\n",
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await checkStatus("session1", ["agent1"]);

    expect(consoleSpy).toHaveBeenCalledWith("agent1:blocked");
  });

  // The status file ranks above a stale/cleaned-up PID file: once a terminal
  // status exists, the process has exited and the PID check must not run.
  it("status file takes precedence over a lingering PID file", async () => {
    mockFsFunctions.existsSync.mockImplementation(
      (pathArg: fs.PathLike) =>
        pathArg.toString().includes(".status") ||
        pathArg.toString().includes(".pid"),
    );
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) =>
      pathArg.toString().includes(".status") ? "completed\n" : "9999",
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await checkStatus("session1", ["agent1"]);

    expect(processKillSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("agent1:completed");
  });
});
