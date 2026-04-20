import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function isGeminiAuthenticated(): boolean {
  const credsPath = join(homedir(), ".gemini", "oauth_creds.json");
  if (!existsSync(credsPath)) return false;
  try {
    const creds = JSON.parse(readFileSync(credsPath, "utf-8"));
    return !!(creds.access_token && creds.refresh_token);
  } catch {
    return false;
  }
}
