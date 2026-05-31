import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerMigrate } from "./command.js";

const runMigrationsMock = vi.hoisted(() => vi.fn((): string[] => []));

vi.mock("./index.js", () => ({
  runMigrations: runMigrationsMock,
}));

function makeProgram(): Command {
  const program = new Command();
  registerMigrate(program);
  return program;
}

describe("migrate command", () => {
  beforeEach(() => {
    runMigrationsMock.mockReset();
    runMigrationsMock.mockReturnValue([]);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("runs gemini-cli migrations and reports a no-op", async () => {
    await makeProgram().parseAsync([
      "node",
      "oma",
      "migrate",
      "--from",
      "gemini-cli",
    ]);

    expect(runMigrationsMock).toHaveBeenCalledWith(process.cwd());
    expect(console.log).toHaveBeenCalledWith(
      "Running migrations from gemini-cli...",
    );
    expect(console.log).toHaveBeenCalledWith(
      "No legacy configurations to migrate.",
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("prints every completed migration action", async () => {
    runMigrationsMock.mockReturnValue(["first action", "second action"]);

    await makeProgram().parseAsync([
      "node",
      "oma",
      "migrate",
      "--from",
      "gemini-cli",
    ]);

    expect(console.log).toHaveBeenCalledWith(
      "Migration completed successfully:",
    );
    expect(console.log).toHaveBeenCalledWith("- first action");
    expect(console.log).toHaveBeenCalledWith("- second action");
  });

  it("rejects unsupported migration sources", async () => {
    await makeProgram().parseAsync([
      "node",
      "oma",
      "migrate",
      "--from",
      "unknown",
    ]);

    expect(runMigrationsMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "Error: Only migration '--from gemini-cli' is supported.",
    );
    expect(process.exitCode).toBe(1);
  });
});
