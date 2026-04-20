import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function isCodexAuthenticated(): boolean {
  const authPath = join(homedir(), ".codex", "auth.json");
  if (!existsSync(authPath)) return false;
  try {
    const auth = JSON.parse(readFileSync(authPath, "utf-8"));
    return !!auth.tokens?.access_token;
  } catch {
    return false;
  }
}
