import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

  it("never seeds .agents under a workspace subdir, and defers run-dir creation past validation", async () => {
    vi.spyOn(process, "exit").mockImplementation(((): never => {
      throw new Error("exit");
    }) as typeof process.exit);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "oma-parallel-root-"));
    fs.mkdirSync(path.join(root, ".agents"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex\n",
    );
    const workspaceSubdir = path.join(root, "cli");
    fs.mkdirSync(workspaceSubdir, { recursive: true });

    const prevCwd = process.cwd();
    process.chdir(workspaceSubdir);
    try {
      await expect(parallelRun([], { inline: true })).rejects.toThrow("exit");
      expect(fs.existsSync(path.join(workspaceSubdir, ".agents"))).toBe(false);
      expect(fs.existsSync(path.join(root, ".agents", "results"))).toBe(false);
    } finally {
      process.chdir(prevCwd);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
