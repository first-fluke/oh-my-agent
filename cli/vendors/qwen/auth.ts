import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function isQwenAuthenticated(): boolean {
  const settingsPath = join(homedir(), ".qwen", "settings.json");
  if (!existsSync(settingsPath)) return false;
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    return !!settings.security?.auth?.selectedType;
  } catch {
    return false;
  }
}
