import { existsSync, readFileSync, statSync } from "node:fs";
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

/**
 * Alibaba deprecated Qwen OAuth authentication on 2026-04-15.
 * Legacy OAuth token files contain OAuth-specific fields (refresh_token, oauth_*)
 * and were last modified before the deprecation cutoff date.
 */
const OAUTH_DEPRECATION_DATE = new Date("2026-04-15T00:00:00Z");

/** Candidate paths where legacy OAuth credential files may exist. */
const LEGACY_TOKEN_PATHS: string[] = [
  join(homedir(), ".qwen", "oauth.json"),
  join(homedir(), ".qwen", "credentials.json"),
  join(homedir(), ".config", "qwen", "auth.json"),
  join(homedir(), ".config", "qwen", "credentials.json"),
];

/** Fields whose presence indicates an OAuth-style credential file. */
const OAUTH_FIELD_INDICATORS = new Set([
  "refresh_token",
  "oauth_token",
  "oauth_secret",
  "access_token",
  "oauth_callback_confirmed",
]);

/** Fields that indicate a modern API-key-style credential file (not OAuth). */
const API_KEY_FIELDS = new Set(["api_key", "bearer"]);

function hasOAuthFields(content: Record<string, unknown>): boolean {
  const keys = Object.keys(content);
  const hasOAuth = keys.some((k) => OAUTH_FIELD_INDICATORS.has(k));
  const hasApiKey = keys.some((k) => API_KEY_FIELDS.has(k));
  // If it only has api_key / bearer and no OAuth-specific fields, treat as modern.
  return hasOAuth && !hasApiKey;
}

export interface DeprecatedOAuthSessionResult {
  hasLegacySession: boolean;
  tokenPath?: string;
  migrationNeeded: boolean;
}

/**
 * Detects whether a deprecated Qwen OAuth session exists on the local filesystem.
 *
 * Detection heuristic (both conditions must be true):
 *  1. File mtime is earlier than 2026-04-15T00:00:00Z (the OAuth deprecation date).
 *  2. File contains OAuth-specific fields (refresh_token, oauth_*) and does NOT
 *     contain modern API-key-style fields (api_key, bearer).
 *
 * Returns `hasLegacySession: false` when no candidate file is found.
 * Never throws — all I/O errors are handled gracefully.
 */
export function detectDeprecatedOAuthSession(): DeprecatedOAuthSessionResult {
  for (const candidate of LEGACY_TOKEN_PATHS) {
    if (!existsSync(candidate)) continue;

    try {
      const stat = statSync(candidate);
      const isOldFile = stat.mtime < OAUTH_DEPRECATION_DATE;

      const raw = readFileSync(candidate, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        continue;
      }
      const content = parsed as Record<string, unknown>;

      if (isOldFile && hasOAuthFields(content)) {
        return {
          hasLegacySession: true,
          tokenPath: candidate,
          migrationNeeded: true,
        };
      }
    } catch {}
  }

  return { hasLegacySession: false, migrationNeeded: false };
}

/**
 * Prints a migration guide to stderr when a legacy OAuth session is detected.
 *
 * Designed to be called by `oma doctor --profile` (wired in T4).
 */
export function printMigrationGuide(
  result: DeprecatedOAuthSessionResult,
): void {
  if (!result.hasLegacySession || !result.migrationNeeded) return;

  const path = result.tokenPath ?? "(unknown path)";
  process.stderr.write(
    [
      "",
      "⚠ Qwen OAuth sessions were deprecated on 2026-04-15.",
      `Your credentials at ${path} appear to be legacy OAuth.`,
      "To continue using Qwen Code, run:",
      "    qwen /auth",
      "and re-authenticate with an API key.",
      "",
    ].join("\n"),
  );
}
