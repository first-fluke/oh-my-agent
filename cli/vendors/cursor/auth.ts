import { execSync } from "node:child_process";

const CURSOR_STATUS_COMMANDS = [
  "cursor agent status",
  "cursor-agent status",
] as const;

function hasCursorApiKey(env: NodeJS.ProcessEnv): boolean {
  return !!env.CURSOR_API_KEY?.trim();
}

function parseCursorStatus(output: string): boolean {
  try {
    const parsed = JSON.parse(output);
    if (typeof parsed?.authenticated === "boolean") {
      return parsed.authenticated;
    }
    if (typeof parsed?.loggedIn === "boolean") {
      return parsed.loggedIn;
    }
  } catch {}

  const normalized = output.toLowerCase();

  if (
    /\b(not authenticated|not logged in|logged out|unauthenticated)\b/.test(
      normalized,
    )
  ) {
    return false;
  }

  return /\b(authenticated|logged in|login successful)\b/.test(normalized);
}

export function isCursorAuthenticated(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (hasCursorApiKey(env)) return true;

  for (const command of CURSOR_STATUS_COMMANDS) {
    try {
      const output = execSync(command, {
        stdio: ["pipe", "pipe", "ignore"],
        encoding: "utf-8",
      });
      if (parseCursorStatus(output)) return true;
    } catch {
      // Try the next supported Cursor CLI command shape.
    }
  }

  return false;
}
