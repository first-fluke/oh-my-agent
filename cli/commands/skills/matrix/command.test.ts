import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerSkillsMatrixCommand } from "./command.js";
import { runMatrixInvocation } from "./runtime.js";

vi.mock("./runtime.js", () => ({
  runMatrixInvocation: vi.fn(async () => {
    throw new Error("Live CLI calls are disabled in command tests");
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  process.exitCode = 0;
});

function program(): Command {
  const cli = new Command().name("oma").exitOverride();
  registerSkillsMatrixCommand(cli.command("skills"));
  return cli;
}

describe("skills matrix command", () => {
  it("emits one JSON plan with no compatibility verdicts", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await program().parseAsync(["skills", "matrix", "--json"], {
      from: "user",
    });
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toMatchObject({
      mode: "plan",
      status: "planned",
      plannedCalls: 6,
      cells: [],
    });
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("requires unattended confirmation for machine-readable live execution", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await program().parseAsync(["skills", "matrix", "--json", "--live"], {
      from: "user",
    });
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toEqual({
      error: expect.stringContaining("--yes"),
    });
    expect(process.exitCode).toBe(1);
  });

  it("reports unsupported vendors as JSON errors before execution", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await program().parseAsync(
      ["skills", "matrix", "--vendors", "qwen", "--json"],
      { from: "user" },
    );
    expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toEqual({
      error: expect.stringContaining("Unsupported matrix vendor"),
    });
    expect(process.exitCode).toBe(1);
  });

  it("rejects an existing report before issuing live calls", async () => {
    const root = mkdtempSync(join(tmpdir(), "oma-matrix-command-test-"));
    try {
      const target = join(root, "existing.json");
      writeFileSync(target, "keep this file");
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await program().parseAsync(
        ["skills", "matrix", "--live", "--yes", "--json", "--report", target],
        { from: "user" },
      );
      expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toEqual({
        error: expect.stringContaining("already exists"),
      });
      expect(runMatrixInvocation).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
