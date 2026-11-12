/**
 * GitHub Copilot CLI folder trust for oh-my-agent project installs.
 *
 * Copilot CLI (1.0.107) loads repository hooks (`.github/hooks/*.json`, where
 * oma writes `oma.json`) only once the folder is trusted. Interactive runs
 * ask ("Confirm folder trust"); prompt mode (`copilot -p`) skips them with
 * "Skipped repository hooks (.github/hooks) because the folder … is not
 * trusted. To load them without approving all tools, add the folder to
 * "trustedFolders" in <COPILOT_HOME>/config.json." User-level hooks
 * (`~/.copilot/hooks/`, a global install) are not gated.
 *
 * The store is `${COPILOT_HOME || ~/.copilot}/config.json`, a JSON file with a
 * `// …` comment header that Copilot keeps ("This file is managed
 * automatically."). Trust is a list of absolute folders, `trustedFolders`
 * (legacy `trusted_folders` still read); an entry covers its subfolders,
 * symlinks resolve, and matching ignores case on macOS/Windows. Copilot
 * stores the realpath, which is what oma appends. Running `oma install` in a
 * project is the user's intent to run oma's hooks there — the same remedy
 * Copilot's own warning prescribes.
 *
 * Skipped when config.json is absent (Copilot never run) or unparseable.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, sep } from "node:path";
import { parseJsonForMerge } from "../../utils/merge-read.js";
import { safeWriteFile } from "../../utils/safe-write.js";

export interface CopilotTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/** `$COPILOT_HOME`, default `~/.copilot`. */
export function copilotHome(): string {
  return process.env.COPILOT_HOME || join(homedir(), ".copilot");
}

function realpathOr(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function comparable(path: string): string {
  const trimmed =
    path.length > 1 && path.endsWith(sep) ? path.slice(0, -1) : path;
  return process.platform === "darwin" || process.platform === "win32"
    ? trimmed.toLowerCase()
    : trimmed;
}

function covers(entry: string, folder: string): boolean {
  if (!isAbsolute(entry)) return false;
  const base = comparable(realpathOr(entry));
  const target = comparable(folder);
  return (
    target === base ||
    target.startsWith(base.endsWith(sep) ? base : `${base}${sep}`)
  );
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * Add `projectRoot` (as its realpath) to `trustedFolders` in the Copilot
 * `config.json` at `configPath`, keeping the comment header and every other
 * key. No-op when an existing entry already covers it.
 */
export function trustCopilotFolder(
  configPath: string,
  projectRoot: string,
): CopilotTrustResult {
  if (!existsSync(configPath)) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${configPath} not found (Copilot CLI not initialized) — skipped`,
    };
  }
  const text = readFileSync(configPath, "utf-8");
  const read = parseJsonForMerge(text);
  if (read.status !== "ok") {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${configPath} could not be parsed — skipped`,
    };
  }
  const config = read.value;
  const folder = realpathOr(projectRoot);
  const trusted = stringList(config.trustedFolders);
  const legacy = stringList(config.trusted_folders);
  if ([...trusted, ...legacy].some((entry) => covers(entry, folder))) {
    return { changed: false, alreadyTrusted: true };
  }
  config.trustedFolders = [...trusted, folder];

  // Keep Copilot's leading `//` header; the body is rewritten as strict JSON.
  const header: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trimStart().startsWith("//")) break;
    header.push(line);
  }
  const body = `${JSON.stringify(config, null, 2)}\n`;
  safeWriteFile(
    configPath,
    header.length > 0 ? `${header.join("\n")}\n${body}` : body,
  );
  return { changed: true, alreadyTrusted: false };
}

/** Pre-accept Copilot CLI folder trust for a project install. */
export function ensureCopilotFolderTrust(
  projectRoot: string,
): CopilotTrustResult {
  return trustCopilotFolder(join(copilotHome(), "config.json"), projectRoot);
}
