import { execSync } from "node:child_process";

export function isClaudeAuthenticated(): boolean {
  try {
    const output = execSync("claude auth status", {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf-8",
    });
    const parsed = JSON.parse(output);
    return parsed.loggedIn === true;
  } catch {
    return false;
  }
}
