/**
 * Antigravity CLI (agy) workspace trust for oh-my-agent project installs.
 *
 * An interactive agy (1.5.5) session in an untrusted folder first asks "Do
 * you trust the contents of this project?" and exits on "No"; workspace hooks
 * (`<root>/.agents/hooks.json`, where oma writes them) load only after trust.
 * `agy -p` is not gated.
 *
 * Trust is `trustedWorkspaces: string[]` in
 * `~/.gemini/antigravity-cli/settings.json` — a key on agy's persist
 * allowlist (see hud.ts), no hash. Entries match the launch directory exactly
 * as spelled in `$PWD` (no realpath, no trailing slash, no parent coverage),
 * so oma records the project root it installed into. Running `oma install`
 * there is the user's intent to run oma's hooks there. Skipped when agy's
 * settings file does not exist yet (agy never run).
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";
import { parseJsonForMerge } from "../../utils/merge-read.js";
import { safeWriteJson } from "../../utils/safe-write.js";

export interface AgyTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/** `~/.gemini/antigravity-cli/settings.json`. */
export function agySettingsPath(home: string = homedir()): string {
  return join(home, ".gemini", "antigravity-cli", "settings.json");
}

function withoutTrailingSep(path: string): string {
  return path.length > 1 && path.endsWith(sep) ? path.slice(0, -1) : path;
}

/** Add `projectRoot` to agy's `trustedWorkspaces` in `settingsPath`. */
export function trustAgyWorkspace(
  settingsPath: string,
  projectRoot: string,
): AgyTrustResult {
  if (!existsSync(settingsPath)) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${settingsPath} not found (agy not initialized) — skipped`,
    };
  }
  const read = parseJsonForMerge(readFileSync(settingsPath, "utf-8"));
  if (read.status !== "ok") {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${settingsPath} could not be parsed — skipped`,
    };
  }
  const settings = read.value;
  const workspace = withoutTrailingSep(projectRoot);
  const current = Array.isArray(settings.trustedWorkspaces)
    ? settings.trustedWorkspaces.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];
  if (current.some((entry) => withoutTrailingSep(entry) === workspace)) {
    return { changed: false, alreadyTrusted: true };
  }
  settings.trustedWorkspaces = [...current, workspace];
  safeWriteJson(settingsPath, settings);
  return { changed: true, alreadyTrusted: false };
}

/** Pre-accept agy workspace trust for a project install. */
export function ensureAgyWorkspaceTrust(projectRoot: string): AgyTrustResult {
  return trustAgyWorkspace(agySettingsPath(), projectRoot);
}
