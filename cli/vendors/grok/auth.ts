import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const AUTH_PATH = join(homedir(), ".grok", "auth.json");

/**
 * Checks whether the user is authenticated for Grok.
 *
 * Grok stores credentials in `~/.grok/auth.json`.
 * It also supports the `XAI_API_KEY` environment variable for headless/CI use.
 */
export function isGrokAuthenticated(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  // API key takes precedence (common for CI / non-interactive use)
  if (env.XAI_API_KEY?.trim()) {
    return true;
  }

  if (!existsSync(AUTH_PATH)) {
    return false;
  }

  try {
    const data = JSON.parse(readFileSync(AUTH_PATH, "utf-8"));

    // auth.json structure is an object where keys are issuer::client_id
    // and values contain at minimum: key (access token) or refresh_token
    if (typeof data !== "object" || data === null) {
      return false;
    }

    // Check if there's at least one entry with a token
    for (const entry of Object.values(data)) {
      if (entry && typeof entry === "object") {
        const rec = entry as Record<string, unknown>;
        if (typeof rec.key === "string" && rec.key.length > 0) {
          return true;
        }
        if (
          typeof rec.refresh_token === "string" &&
          rec.refresh_token.length > 0
        ) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}
