import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateGlobalHome } from "../../io/global-home-migration.js";
import { registerHome } from "./command.js";

vi.mock("../../io/global-home-migration.js", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../io/global-home-migration.js")
  >()),
  migrateGlobalHome: vi.fn(),
}));

let homeDir: string;
let previousExitCode: typeof process.exitCode;
beforeEach(() => {
  homeDir = mkdtempSync(join(tmpdir(), "oma-home-command-"));
  vi.stubEnv("HOME", homeDir);
  vi.stubEnv("OMA_HOME", join(homeDir, ".oma"));
  previousExitCode = process.exitCode;
  process.exitCode = 0;
  vi.mocked(migrateGlobalHome).mockReset();
});

afterEach(() => {
  process.exitCode = previousExitCode;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(homeDir, { recursive: true, force: true });
});

describe("home command", () => {
  it("reports one custom global root and the explicit profile exception", async () => {
    vi.stubEnv("OMA_HOME", "/custom/global");
    vi.stubEnv("OMA_STATE_HOME", "/custom/profiles");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = new Command();
    registerHome(program);
    await program.parseAsync(["home", "--json"], { from: "user" });
    const result = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(result.home).toBe("/custom/global");
    expect(result.schedule).toBe("/custom/global/schedule");
    expect(result.serena).toBe("/custom/global/state/serena");
    expect(result.profiles).toBe("/custom/profiles");
  });

  it.each([
    {
      name: "legacy Serena remains active",
      conflicts: [],
      deferred: ["Legacy Serena daemon or bridge is active: /legacy/oma"],
      exitCode: 0,
    },
    {
      name: "destination conflicts",
      conflicts: ["Differing destination: /new/schedules.json"],
      deferred: ["Legacy Serena daemon or bridge is active: /legacy/oma"],
      exitCode: 1,
    },
    {
      name: "another migration is running",
      conflicts: [],
      deferred: ["Another global home migration is running"],
      exitCode: 1,
    },
    {
      name: "legacy definitions are locked",
      conflicts: [],
      deferred: [
        "/legacy/.agents: legacy install lock exists; finish the old installer first",
      ],
      exitCode: 1,
    },
  ])(
    "sets the migration status when $name",
    async ({ conflicts, deferred, exitCode }) => {
      const result = { copied: [], conflicts, deferred };
      vi.mocked(migrateGlobalHome).mockResolvedValue(result);
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const program = new Command();
      registerHome(program);

      await program.parseAsync(["home", "migrate", "--json"], { from: "user" });

      expect(process.exitCode).toBe(exitCode);
      expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual(result);
    },
  );

  it("prints an active legacy Serena deferral while returning success", async () => {
    const pending = "Legacy Serena daemon or bridge is active: /legacy/oma";
    vi.mocked(migrateGlobalHome).mockResolvedValue({
      copied: [],
      conflicts: [],
      deferred: [pending],
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = new Command();
    registerHome(program);

    await program.parseAsync(["home", "migrate", "--output", "text"], {
      from: "user",
    });

    expect(process.exitCode).toBe(0);
    expect(log).toHaveBeenCalledWith(`deferred: ${pending}`);
  });
});
