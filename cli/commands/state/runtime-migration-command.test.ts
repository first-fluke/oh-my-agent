import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as runtimeMigration from "../../state/runtime-migration.js";
import * as sessionMigration from "../../state/session-migration.js";
import * as fsUtils from "../../utils/fs-utils.js";
import { registerState } from "./command.js";

function program(): Command {
  const command = new Command().exitOverride();
  registerState(command);
  return command;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("runtime migration command", () => {
  it("previews runtime migration without invoking destructive session migration", async () => {
    vi.spyOn(fsUtils, "resolveProjectRoot").mockReturnValue("/test/project");
    const migrate = vi
      .spyOn(runtimeMigration, "migrateRuntimeState")
      .mockResolvedValue({
        ok: true,
        dryRun: true,
        profile: "0",
        projectDir: "/test/project",
        entries: [],
      });
    const sessions = vi.spyOn(sessionMigration, "migrateLegacySessions");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await program().parseAsync([
      "node",
      "oma",
      "state:migrate",
      "--runtime",
      "--dry-run",
      "--json",
    ]);
    expect(migrate).toHaveBeenCalledWith({
      projectDir: "/test/project",
      dryRun: true,
    });
    expect(sessions).not.toHaveBeenCalled();
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      dryRun: true,
    });
  });

  it("reports deferred runtime records with a failing exit code", async () => {
    vi.spyOn(runtimeMigration, "migrateRuntimeState").mockResolvedValue({
      ok: false,
      dryRun: false,
      profile: "0",
      projectDir: "/test/project",
      entries: [
        {
          area: "agent-runs",
          source: "/old/run.json",
          status: "deferred",
          reason: "active run",
        },
      ],
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await program().parseAsync(["node", "oma", "state:migrate", "--runtime"]);
    expect(process.exitCode).toBe(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("active run"));
  });

  it("rejects include-active for runtime migration before copying files", async () => {
    const migrate = vi.spyOn(runtimeMigration, "migrateRuntimeState");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await program().parseAsync([
      "node",
      "oma",
      "state:migrate",
      "--runtime",
      "--include-active",
    ]);
    expect(process.exitCode).toBe(1);
    expect(migrate).not.toHaveBeenCalled();
  });
});
