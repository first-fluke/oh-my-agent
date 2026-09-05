import { describe, expect, it } from "vitest";
import { checkCommandResult, runCheckCommand } from "./check-utils.js";
import { runManifestCmd } from "./stack-checks.js";

describe("verification process evidence", () => {
  it("preserves both output streams and the failed exit code", () => {
    const result = runCheckCommand(
      process.execPath,
      [
        "-e",
        'console.log("passed"); console.error("failed"); process.exit(2);',
      ],
      process.cwd(),
    );
    expect(result).toMatchObject({ exitCode: 2, signal: null });
    expect(result.stdout).toContain("passed");
    expect(result.stderr).toContain("failed");
    expect(checkCommandResult("Tests", result, "Pass", "Fail").status).toBe(
      "fail",
    );
  });

  it("records a spawn error separately from a command failure", () => {
    const result = runCheckCommand(
      "oma-nonexistent-verify-binary",
      [],
      process.cwd(),
    );
    expect(result.exitCode).toBeNull();
    expect(result.error).toBeDefined();
    expect(checkCommandResult("Tests", result, "Pass", "Fail")).toMatchObject({
      status: "fail",
      message: expect.stringContaining("Could not run check"),
    });
  });

  it("rejects an empty manifest command", () => {
    const result = runManifestCmd("  ", process.cwd());
    expect(result.error).toBeDefined();
    expect(checkCommandResult("Syntax", result, "Pass", "Fail").status).toBe(
      "fail",
    );
  });

  it.skipIf(process.platform === "win32")(
    "does not accept success text from a terminated command",
    () => {
      const result = runCheckCommand(
        process.execPath,
        ["-e", 'console.log("passed"); process.kill(process.pid, "SIGTERM");'],
        process.cwd(),
      );
      expect(result.signal).toBe("SIGTERM");
      expect(result.exitCode).toBeNull();
      expect(checkCommandResult("Tests", result, "Pass", "Fail").status).toBe(
        "fail",
      );
    },
  );
});
