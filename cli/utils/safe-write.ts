import * as fs from "node:fs";
import * as path from "node:path";
import { resolveSafeWriteBackup } from "../io/backup.js";

const BACKUP_RETENTION = 3;

/**
 * Filenames safeWriteJson refuses to overwrite — owned by vendor CLIs, not by oma.
 * Matched by basename, case-sensitively. Add new entries here if a future vendor
 * introduces a user-state file we must not touch.
 *
 * Current entries:
 *   ".claude.json" — Claude Code's user-level session/config store (~/.claude.json).
 *                    Overwriting it would destroy the user's Claude Code authentication
 *                    state, custom settings, and session data.
 *
 * How to add a new entry: append the exact basename string (including any leading dot)
 * to the array below and add a one-line comment explaining which vendor CLI owns it.
 */
export const FORBIDDEN_VENDOR_FILES: ReadonlySet<string> = new Set<string>([
  ".claude.json", // Claude Code user-level session/config store
]);

/**
 * Atomically write a JSON value to `targetPath`.
 *
 * Strategy:
 * 1. Stamp existing target (if any) into the canonical backup location resolved
 *    by `resolveSafeWriteBackup` — `<project>/.agents/backup/safe-write/` when
 *    the target lives in a project, else a sibling dotfile for home/global
 *    vendor configs (3-tier rotation: keep last 3, delete older).
 * 2. Write payload to a sibling temp file `<dir>/.<name>.tmp-<Date.now()>-<pid>`.
 * 3. `fs.renameSync(tmp, target)` for atomic swap.
 *    - On `EXDEV` (cross-device link error), fall back to `fs.copyFileSync(tmp, target)` + `fs.unlinkSync(tmp)`.
 * 4. Best-effort: leave backups around. They are only pruned when retention threshold exceeded.
 *
 * Pretty-printed JSON (2-space indent) with trailing newline.
 *
 * Throws immediately (before any filesystem operation) if the basename of `targetPath`
 * is listed in `FORBIDDEN_VENDOR_FILES`. These are files owned by vendor CLIs (e.g.
 * `~/.claude.json`) that oma must never overwrite.
 *
 * @param targetPath absolute path
 * @param value any JSON-serializable value
 * @throws {Error} if `path.basename(targetPath)` is in `FORBIDDEN_VENDOR_FILES`
 */
export function safeWriteJson(targetPath: string, value: unknown): void {
  safeWriteFile(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}

export interface AtomicWriteOptions {
  /** Mode for the created file, e.g. `0o755` for executable wrappers. */
  mode?: number;
}

/**
 * Atomically write raw text to `targetPath` via a sibling temp file + rename,
 * **without** backup rotation.
 *
 * Use this for oma-generated files (composed agent/rule/hook/prompt artifacts,
 * `_version.json`, downloaded manifest files) — they are reproducible from the
 * `.agents/` SSOT, so what they need is crash-atomicity, not rollback history.
 * `safeWriteFile` would stamp a backup on every `oma link`, flooding vendor
 * directories with copies of files that can simply be regenerated.
 *
 * For user- or vendor-owned config that oma merges into (settings.json,
 * config.toml), use `safeWriteFile` / `safeWriteJson` instead — those need the
 * backup trail.
 *
 * Strategy: resolve symlinks → mkdir parent → write `<dir>/.<name>.tmp-<stamp>`
 * → `renameSync` onto the target, falling back to copy+unlink on `EXDEV`
 * (cross-device). Readers therefore see either the old file or the new one,
 * never a partial write. The temp file is removed if the swap fails.
 *
 * @param targetPath absolute path
 * @param content full file content, written verbatim as UTF-8
 */
export function atomicWriteFileSync(
  targetPath: string,
  content: string,
  options: AtomicWriteOptions = {},
): void {
  const finalPath = resolveWriteTarget(targetPath);
  const dir = path.dirname(finalPath);
  const basename = path.basename(finalPath);
  const stamp = `${Date.now()}-${process.pid}-${atomicWriteCounter++}`;
  const tmpPath = path.join(dir, `.${basename}.tmp-${stamp}`);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmpPath, content, { encoding: "utf-8", mode: options.mode });

  try {
    // writeFileSync's `mode` is only honored when it creates the file; a
    // restrictive umask would otherwise silently drop the executable bit off
    // hook wrappers.
    if (options.mode !== undefined) fs.chmodSync(tmpPath, options.mode);
    fs.renameSync(tmpPath, finalPath);
  } catch (err) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "EXDEV"
    ) {
      fs.copyFileSync(tmpPath, finalPath);
      if (options.mode !== undefined) fs.chmodSync(finalPath, options.mode);
      fs.unlinkSync(tmpPath);
      return;
    }
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // Best-effort cleanup; surface the original failure.
    }
    throw err;
  }
}

/** Disambiguates temp names for repeated writes within the same millisecond. */
let atomicWriteCounter = 0;

/**
 * Follow a symlinked target to the file it points at.
 *
 * `writeFileSync` writes *through* a symlink; `renameSync` would instead
 * replace the link with a regular file. Users routinely symlink the vendor
 * doc set together (`AGENTS.md` → `CLAUDE.md`), so swapping the link out would
 * silently desynchronize files that used to update as one.
 */
function resolveWriteTarget(targetPath: string): string {
  try {
    if (!fs.lstatSync(targetPath).isSymbolicLink()) return targetPath;
  } catch {
    return targetPath; // Nothing there yet — write the path as given.
  }
  try {
    return fs.realpathSync(targetPath);
  } catch {
    // Dangling link: realpath fails, so resolve the recorded destination.
    return path.resolve(path.dirname(targetPath), fs.readlinkSync(targetPath));
  }
}

/**
 * Atomically write raw text to `targetPath` with the same backup / temp-file /
 * rename strategy as `safeWriteJson` (see above). Use this for non-JSON
 * config formats (TOML, YAML) that need the same crash-safety and rollback
 * guarantees as JSON settings files.
 *
 * @param targetPath absolute path
 * @param content full file content, written verbatim
 * @throws {Error} if `path.basename(targetPath)` is in `FORBIDDEN_VENDOR_FILES`
 */
export function safeWriteFile(targetPath: string, content: string): void {
  const basename = path.basename(targetPath);
  if (FORBIDDEN_VENDOR_FILES.has(basename)) {
    throw new Error(
      `safeWriteFile: refusing to write ${basename} — vendor-owned file (FORBIDDEN_VENDOR_FILES). targetPath=${targetPath}`,
    );
  }

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  // Step 1: backup existing target if it exists, into the canonical location.
  if (fs.existsSync(targetPath)) {
    const backup = resolveSafeWriteBackup(targetPath);
    fs.mkdirSync(backup.dir, { recursive: true });
    fs.copyFileSync(
      targetPath,
      path.join(backup.dir, `${backup.prefix}${Date.now()}-${process.pid}`),
    );
  }

  // Step 2-3: temp-file write + atomic rename (EXDEV fallback).
  atomicWriteFileSync(targetPath, content);

  // Step 4: prune old backups, keep last BACKUP_RETENTION
  pruneBackups(targetPath);
}

/** List existing backups for diagnostic / restore use. Sorted newest-first. */
export function listBackups(targetPath: string): string[] {
  return getBackupsSortedNewestFirst(targetPath);
}

function getBackupsSortedNewestFirst(targetPath: string): string[] {
  const { dir, prefix } = resolveSafeWriteBackup(targetPath);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const backupPaths = entries
    .filter((e) => e.isFile() && e.name.startsWith(prefix))
    .map((e) => path.join(dir, e.name));

  if (backupPaths.length === 0) return [];

  // Sort newest-first by mtime
  return backupPaths.sort((a, b) => {
    try {
      const mtimeA = fs.statSync(a).mtimeMs;
      const mtimeB = fs.statSync(b).mtimeMs;
      return mtimeB - mtimeA;
    } catch {
      return 0;
    }
  });
}

function pruneBackups(targetPath: string): void {
  const sorted = getBackupsSortedNewestFirst(targetPath);
  const toDelete = sorted.slice(BACKUP_RETENTION);
  for (const filePath of toDelete) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Best-effort: ignore pruning errors
    }
  }
}
