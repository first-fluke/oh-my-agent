/**
 * Canonical backup convention for oh-my-agent.
 *
 * RULE: every backup oma writes to disk lands under a single, gitignored root
 * `<project>/.agents/backup/`, namespaced by source:
 *
 *   .agents/backup/
 *     002-shared-layout/...   ← migration file snapshots
 *     008-model-preset/...
 *     010-rename-preset/...
 *     011-unify-skills/...
 *     013-workflow-symlinks/...
 *     stack/...               ← `oma update` stack/ preservation
 *     safe-write/...          ← safeWriteJson atomic-write siblings (in-project)
 *
 * One gitignore line (`.agents/backup/`) covers all of it. This replaces the
 * previous scatter of `.migration-backup/`, `.agents/.migration-backup/`,
 * `.agents/*.bak`, `.agents/.backup-pre-008-*`, and tmpdir stack copies.
 *
 * Retention: `safe-write/` is bounded per target by safe-write itself (newest
 * few copies plus the first-seen original) and is never cleared wholesale — a
 * successful update says nothing about whether the configs it rewrote are what
 * the user wanted, and these copies are the only way back. Other entries
 * (migration snapshots, leftover stack copies) age out via
 * {@link pruneBackupRoot}.
 *
 * Files written OUTSIDE a project tree (home/global vendor configs like
 * `~/.gemini/settings.json` when no `.agents/` ancestor exists) keep
 * sibling-dotfile backups — they don't pollute any repo.
 */

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

export { AGENTS_BACKUP_DIR } from "../constants/paths.js";

/** Absolute backup root under `cwd`. */
export function backupRoot(cwd: string): string {
  return join(cwd, ".agents", "backup");
}

/**
 * Absolute path under the backup root.
 * Example: `backupPathFromRoot(cwd, "010-rename-preset", "oma-config.yaml")`.
 */
export function backupPathFromRoot(cwd: string, ...segments: string[]): string {
  return join(backupRoot(cwd), ...segments);
}

/**
 * Walk up from a target file to the nearest directory that contains an
 * `.agents/` child (the project — or global — root). Returns null when none is
 * found within a sane depth, signalling "no project context".
 */
export function findProjectRoot(targetPath: string): string | null {
  let dir = dirname(targetPath);
  for (let i = 0; i < 64; i++) {
    if (existsSync(join(dir, ".agents"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Subdirectory of the backup root that holds safe-write copies. */
export const SAFE_WRITE_BACKUP_DIR = "safe-write";

export interface SafeWriteBackupTarget {
  /** Directory the backup file is written into. */
  dir: string;
  /** Filename prefix; the timestamp suffix is appended by the caller. */
  prefix: string;
  /**
   * Path of the first-seen copy of the target, written once and never rotated
   * out, so the pre-oma version of a user config always stays recoverable.
   */
  original: string;
}

/**
 * Resolve where a `safeWriteJson` backup for `targetPath` should live.
 *
 * - In a project: `<root>/.agents/backup/safe-write/<rel-path>.backup-` where
 *   `<rel-path>` is the target's project-relative path with separators
 *   flattened to `__` — keeps per-target retention correct and avoids
 *   basename collisions (e.g. claude vs gemini `settings.json`).
 * - Outside any project: the legacy sibling dotfile `<dir>/.<basename>.backup-`.
 */
export function resolveSafeWriteBackup(
  targetPath: string,
): SafeWriteBackupTarget {
  const root = findProjectRoot(targetPath);
  if (root) {
    const rel = relative(root, targetPath).split(sep).join("__");
    const dir = join(root, ".agents", "backup", SAFE_WRITE_BACKUP_DIR);
    return {
      dir,
      prefix: `${rel}.backup-`,
      original: join(dir, `${rel}.original`),
    };
  }
  const basename = targetPath.split(sep).pop() ?? targetPath;
  const dir = dirname(targetPath);
  return {
    dir,
    prefix: `.${basename}.backup-`,
    original: join(dir, `.${basename}.original`),
  };
}

/** Default age after which non-safe-write backup snapshots are pruned. */
export const BACKUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Age out snapshots under `<cwd>/.agents/backup/` without touching the
 * safe-write trail (bounded per target by safe-write's own retention).
 * Entries older than `maxAgeMs` are removed; returns the removed paths.
 * Best-effort: an entry that cannot be stat'ed or removed is skipped.
 */
export function pruneBackupRoot(
  cwd: string,
  opts: { maxAgeMs?: number; nowMs?: number } = {},
): string[] {
  const root = backupRoot(cwd);
  if (!existsSync(root)) return [];
  const maxAgeMs = opts.maxAgeMs ?? BACKUP_MAX_AGE_MS;
  const nowMs = opts.nowMs ?? Date.now();
  const removed: string[] = [];
  for (const name of readdirSync(root)) {
    if (name === SAFE_WRITE_BACKUP_DIR) continue;
    const path = join(root, name);
    try {
      if (nowMs - statSync(path).mtimeMs < maxAgeMs) continue;
      rmSync(path, { recursive: true, force: true });
      removed.push(path);
    } catch {
      // best-effort: leave anything we cannot inspect or delete
    }
  }
  return removed;
}
