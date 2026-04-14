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
});
