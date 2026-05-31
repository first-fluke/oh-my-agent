import { execSync } from "node:child_process";

/**
 * Checks whether the user is authenticated for Kiro CLI.
 * Uses `kiro-cli whoami` which exits 0 when logged in.
 */
export function isKiroAuthenticated(): boolean {
  try {
    execSync("kiro-cli whoami", {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf-8",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}
