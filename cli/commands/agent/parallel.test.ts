import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parallelRun } from "./parallel.js";

describe("agent/parallel.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits when inline mode has no tasks", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((): never => {
      throw new Error("exit");
    }) as typeof process.exit);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(parallelRun([], { inline: true })).rejects.toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when file mode has no tasks file", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((): never => {
      throw new Error("exit");
    }) as typeof process.exit);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(parallelRun([])).rejects.toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
