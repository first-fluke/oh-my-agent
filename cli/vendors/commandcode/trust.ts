/**
 * Command Code folder trust for oh-my-agent project installs.
 *
 * Command Code (1.88.5) asks "Do you trust the files in this folder?" before
 * an interactive session in a folder it has not initialized, and exits on
 * "No". Project mods also load only from an initialized folder. The trust
 * record is just the per-project data directory (`isProjectInitialized` =
 * the directory exists; "Yes" runs `initializeProject` = mkdir):
 *
 *   ${HOME}/.commandcode/projects/<slugify(cwd)>
 *
 * with `@sindresorhus/slugify` v2 defaults. Running `oma install` in the
 * project is the user's intent to run oma's hooks there, so oma creates that
 * directory. Command Code's `trusted-hooks.json` is bookkeeping only (every
 * new hook is recorded and run), so it needs nothing.
 *
 * {@link commandCodeSlug} reproduces slugify for ASCII paths; a path with
 * other characters would depend on its transliteration table, so it is
 * skipped rather than guessed. Skipped when `~/.commandcode` does not exist.
 */

import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CommandCodeTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/**
 * `@sindresorhus/slugify` 2.x with default options, for ASCII input
 * (`undefined` otherwise): `&` → ` and `, decamelize, lowercase, drop `'`
 * in contractions, collapse every non-`[a-z0-9]` run into `-`, trim dashes.
 */
export function commandCodeSlug(path: string): string | undefined {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII range check
  if (!/^[\x00-\x7F]*$/.test(path)) return undefined;
  const slug = path
    .replaceAll("&", " and ")
    .replace(/([A-Z]{2,})(\d+)/g, "$1 $2")
    .replace(/([a-z\d]+)([A-Z]{2,})/g, "$1 $2")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-rt-z\d]+)/g, "$1 $2")
    .toLowerCase()
    .replace(/([a-zA-Z\d]+)'([ts])(\s|$)/g, "$1$2$3")
    .replace(/[^a-z\d]+/g, "-")
    .replace(/\\/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "root";
}

/** Initialize Command Code's project directory for `projectRoot` under `home`. */
export function trustCommandCodeFolder(
  home: string,
  projectRoot: string,
): CommandCodeTrustResult {
  const base = join(home, ".commandcode");
  if (!existsSync(base)) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${base} not found (Command Code not initialized) — skipped`,
    };
  }
  let resolved = projectRoot;
  try {
    resolved = realpathSync(projectRoot);
  } catch {
    // Keep the given path.
  }
  let changed = false;
  for (const folder of new Set([projectRoot, resolved])) {
    const slug = commandCodeSlug(folder);
    if (!slug) {
      return {
        changed,
        alreadyTrusted: false,
        reason: `${folder} has non-ASCII characters — Command Code trust skipped`,
      };
    }
    const dir = join(base, "projects", slug);
    if (existsSync(dir)) continue;
    mkdirSync(dir, { recursive: true });
    changed = true;
  }
  return { changed, alreadyTrusted: !changed };
}

/** Pre-accept Command Code folder trust for a project install. */
export function ensureCommandCodeFolderTrust(
  projectRoot: string,
): CommandCodeTrustResult {
  // Command Code reads $HOME, then %USERPROFILE% — what homedir() returns.
  return trustCommandCodeFolder(homedir(), projectRoot);
}
