/**
 * Grok CLI folder trust for oh-my-agent project installs.
 *
 * Grok (1.0.77) silently skips a project's hooks — `.grok/hooks/
 * oma-hooks.json`, where oma writes them — until the folder is trusted, and
 * an untrusted folder also holds back the user's own HOME hooks in
 * interactive runs (user guide, "Hook Locations"). `grok -p` counts the
 * folder as trusted for user hooks only; project hooks still need trust.
 *
 * The decision lives in the unified folder-trust store
 * `${GROK_HOME || ~/.grok}/trusted_folders.toml`:
 *
 *   [folders."/abs/git/root"]
 *   trusted = true
 *   decided_at = 1783055514
 *
 * keyed by the git root with symlinks resolved (the launch directory outside
 * a repo); no hash, so hook edits never re-ask. Grok refuses to record the
 * home directory or a filesystem root. Running `oma install` in the project
 * is the user's intent to run oma's hooks there; an explicit `trusted =
 * false` is left alone. Skipped when Grok's home does not exist.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, parse } from "node:path";
import { safeWriteFile } from "../../utils/safe-write.js";
import { editTomlTables } from "../../utils/toml-table-edit.js";

export interface GrokTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/** `$GROK_HOME`, default `~/.grok`. */
export function grokHome(): string {
  return process.env.GROK_HOME || join(homedir(), ".grok");
}

function realpathOr(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/** The folder Grok keys trust by: the enclosing git root, else the folder. */
export function grokTrustKey(projectRoot: string): string {
  const start = realpathOr(projectRoot);
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/** Record `projectRoot` as trusted in the Grok store at `storePath`. */
export function trustGrokFolder(
  storePath: string,
  projectRoot: string,
  options: { home?: string; now?: Date } = {},
): GrokTrustResult {
  if (!existsSync(dirname(storePath))) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${dirname(storePath)} not found (Grok not initialized) — skipped`,
    };
  }
  const key = grokTrustKey(projectRoot);
  if (
    key === realpathOr(options.home ?? homedir()) ||
    parse(key).root === key
  ) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${key} is the home directory or a filesystem root — Grok never trusts it`,
    };
  }
  const original = existsSync(storePath)
    ? readFileSync(storePath, "utf-8")
    : "";
  const decidedAt = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const result = editTomlTables(original, [
    {
      prefix: "folders",
      key,
      fields: [
        { name: "trusted", value: true },
        { name: "decided_at", value: decidedAt, onlyIfMissing: true },
      ],
      skip: (current) => current.trusted === false,
    },
  ]);
  if (!result.ok) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${storePath}: ${result.reason} — skipped`,
    };
  }
  const [outcome] = result.outcomes;
  if (outcome === "skipped") {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${key} is marked untrusted in ${storePath} — left as is`,
    };
  }
  if (outcome !== "changed") return { changed: false, alreadyTrusted: true };
  safeWriteFile(storePath, result.text);
  return { changed: true, alreadyTrusted: false };
}

/** Pre-accept Grok folder trust for a project install. */
export function ensureGrokFolderTrust(projectRoot: string): GrokTrustResult {
  return trustGrokFolder(join(grokHome(), "trusted_folders.toml"), projectRoot);
}
