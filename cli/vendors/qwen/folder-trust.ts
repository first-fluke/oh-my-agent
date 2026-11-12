/**
 * Qwen Code folder trust for oh-my-agent project installs.
 *
 * The hook approval oma records (hook-approvals.ts) is enough while Qwen's
 * folder-trust feature is off. With `security.folderTrust.enabled` on in the
 * user settings, an untrusted folder's `.qwen/settings.json` is not loaded at
 * all, so the approved hooks never run and `qwen -p` prints "Project hooks in
 * .qwen/settings.json were not loaded: the folder is not explicitly trusted"
 * (observed with Qwen Code 0.27.1).
 *
 * Trust lives in `${QWEN_CODE_TRUSTED_FOLDERS_PATH || <qwen home>/
 * trustedFolders.json}` as `{ "<path>": "TRUST_FOLDER" | "TRUST_PARENT" |
 * "DO_NOT_TRUST" }`. A rule matches the folder and everything under it
 * (`TRUST_PARENT` applies to the entry's parent); the deepest match wins and
 * an `untrusted` rule wins a tie. Paths compare by `resolve` and realpath.
 *
 * Running `oma install` in the project is the user's intent to run oma's
 * hooks there, so oma adds `TRUST_FOLDER` for it — unless the folder is
 * already trusted or a rule explicitly distrusts it. The entry is harmless
 * while the feature is off. Skipped when Qwen's home does not exist.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { parseJsonForMerge } from "../../utils/merge-read.js";
import { safeWriteFile } from "../../utils/safe-write.js";
import { type QwenApprovalContext, qwenGlobalDir } from "./hook-approvals.js";

export interface QwenFolderTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/** Where Qwen reads and writes trusted folders. */
export function qwenTrustedFoldersPath(
  context: QwenApprovalContext = {},
): string {
  const env = context.env ?? process.env;
  return (
    env.QWEN_CODE_TRUSTED_FOLDERS_PATH ||
    join(qwenGlobalDir(context), "trustedFolders.json")
  );
}

function variants(path: string): Set<string> {
  const out = new Set([normalize(resolve(path))]);
  try {
    out.add(normalize(realpathSync(path)));
  } catch {
    // Missing path: the resolved form only.
  }
  return out;
}

function depthOfMatch(rulePaths: Set<string>, location: Set<string>): number {
  let best = -1;
  for (const rule of rulePaths) {
    const prefix = rule.endsWith(sep) ? rule : `${rule}${sep}`;
    for (const candidate of location) {
      if (candidate === rule || candidate.startsWith(prefix)) {
        best = Math.max(best, rule.split(sep).filter(Boolean).length);
      }
    }
  }
  return best;
}

/**
 * Qwen's decision for `folder` under `rules`: true (trusted), false
 * (untrusted) or undefined (no rule applies).
 */
export function qwenTrustDecision(
  rules: Record<string, unknown>,
  folder: string,
): boolean | undefined {
  const location = variants(folder);
  let winner: "trusted" | "untrusted" | undefined;
  let winnerDepth = -1;
  for (const [path, level] of Object.entries(rules)) {
    let rulePath = path;
    let verdict: "trusted" | "untrusted";
    if (level === "TRUST_FOLDER") verdict = "trusted";
    else if (level === "TRUST_PARENT") {
      verdict = "trusted";
      rulePath = dirname(path);
    } else if (level === "DO_NOT_TRUST") verdict = "untrusted";
    else continue;
    const depth = depthOfMatch(variants(rulePath), location);
    if (depth < 0) continue;
    if (
      depth > winnerDepth ||
      (depth === winnerDepth &&
        verdict === "untrusted" &&
        winner !== "untrusted")
    ) {
      winner = verdict;
      winnerDepth = depth;
    }
  }
  return winner === "trusted"
    ? true
    : winner === "untrusted"
      ? false
      : undefined;
}

/** Add `projectRoot` as `TRUST_FOLDER` to Qwen's trusted folders at `path`. */
export function trustQwenFolder(
  path: string,
  projectRoot: string,
): QwenFolderTrustResult {
  const skip = (reason: string): QwenFolderTrustResult => ({
    changed: false,
    alreadyTrusted: false,
    reason,
  });
  if (!existsSync(dirname(path))) {
    return skip(`${dirname(path)} not found (Qwen not initialized) — skipped`);
  }
  let rules: Record<string, unknown> = {};
  if (existsSync(path)) {
    const read = parseJsonForMerge(readFileSync(path, "utf-8"));
    if (read.status !== "ok") return skip(`${path} could not be parsed`);
    rules = read.value;
  }
  const decision = qwenTrustDecision(rules, projectRoot);
  if (decision === true) return { changed: false, alreadyTrusted: true };
  if (decision === false) {
    return skip(`${projectRoot} is marked untrusted in ${path} — left as is`);
  }
  rules[normalize(resolve(projectRoot))] = "TRUST_FOLDER";
  safeWriteFile(path, `${JSON.stringify(rules, null, 2)}\n`);
  return { changed: true, alreadyTrusted: false };
}

/** Pre-accept Qwen folder trust for a project install. */
export function ensureQwenFolderTrust(
  projectRoot: string,
): QwenFolderTrustResult {
  return trustQwenFolder(qwenTrustedFoldersPath(), projectRoot);
}
