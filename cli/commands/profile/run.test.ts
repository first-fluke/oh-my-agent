import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalProfile } from "../../state/profiles.js";
import { runProfileCommand } from "./run.js";

describe("runProfileCommand", () => {
  let stateHome: string;

  beforeEach(() => {
    stateHome = mkdtempSync(join(tmpdir(), "oma-profile-run-"));
    vi.stubEnv("OMA_STATE_HOME", stateHome);
    vi.stubEnv("OMA_PROFILE", "0");
    createLocalProfile("1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(stateHome, { recursive: true, force: true });
  });

  it("runs a child with the requested profile environment", () => {
    expect(
      runProfileCommand("1", process.execPath, [
        "-e",
        "process.exit(process.env.OMA_PROFILE === '1' ? 0 : 1)",
      ]),
    ).toBe(0);
  });

  // POSIX-only: Windows has no termination signals; a self-SIGTERM is a plain exit.
  it.skipIf(process.platform === "win32")(
    "maps child termination signals to conventional exit codes",
    () => {
      expect(
        runProfileCommand("1", process.execPath, [
          "-e",
          "process.kill(process.pid, 'SIGTERM')",
        ]),
      ).toBe(143);
    },
  );

  it("requires an existing profile", () => {
    expect(() => runProfileCommand("3", process.execPath, [])).toThrow(
      "Profile 3 does not exist",
    );
  });
});
