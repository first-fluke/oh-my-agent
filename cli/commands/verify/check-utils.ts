import { execSync, spawnSync } from "node:child_process";
import type { VerifyCheck } from "../../types/index.js";

export function createCheck(
  name: string,
  status: "pass" | "fail" | "warn" | "skip",
  message?: string,
): VerifyCheck {
  return { name, status, message };
}

// Output-only probes (grep, which, git). Never use this to judge a test or compiler.
export function runCommand(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
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
