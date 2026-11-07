import { execSync, spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { delimiter, join } from "node:path";
import type { VerifyCheck } from "../../types/index.js";

export function createCheck(
  name: string,
  status: "pass" | "fail" | "warn" | "skip",
  message?: string,
): VerifyCheck {
  return { name, status, message };
}

// Output-only probes (grep, git). Never use this to judge a test or compiler:
// a non-zero exit is indistinguishable from empty output here (null). Verdict-
// bearing checks must use runCheckCommand + checkCommandResult, which fail
// closed on spawn errors, signals, and non-zero exits.
export function runCommand(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
  error?: Error;
}

export function runCheckCommand(
  command: string,
  args: string[],
  cwd: string,
): CommandResult {
  try {
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      shell: false,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      exitCode: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      signal: result.signal,
      error: result.error,
    };
  } catch (error) {
    return {
      exitCode: null,
      stdout: "",
      stderr: "",
      signal: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function checkCommandResult(
  name: string,
  result: CommandResult,
  successMessage: string,
  failureMessage: string,
): VerifyCheck {
  if (result.error) {
    return createCheck(
      name,
      "fail",
      `Could not run check: ${result.error.message}`,
    );
  }
  if (result.signal) {
    return createCheck(name, "fail", `Check interrupted by ${result.signal}`);
  }
  if (result.exitCode !== 0) {
    return createCheck(
      name,
      "fail",
      `${failureMessage} (exit code: ${result.exitCode ?? "unavailable"})`,
    );
  }
  return createCheck(name, "pass", successMessage);
}

/**
 * Cross-platform PATH lookup replacing `which X` (which does not exist on
 * Windows). Scans PATH entries in order; on win32 also tries the PATHEXT
 * extensions (.exe, .cmd, .bat, ...). Returns the resolved path or null.
 * The name is validated against a strict allowlist so it can never carry
 * shell metacharacters or path traversal into downstream consumers.
 */
export function findBinary(name: string): string | null {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  const extensions =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")
      : [""];
  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = join(dir, name + ext);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // Not present in this PATH entry — keep scanning.
      }
    }
  }
  return null;
}
