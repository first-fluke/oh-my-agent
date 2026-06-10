import { execSync } from "node:child_process";
import type { VerifyCheck } from "../../../types/index.js";

export function createCheck(
  name: string,
  status: "pass" | "fail" | "warn" | "skip",
  message?: string,
): VerifyCheck {
  return { name, status, message };
}

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
