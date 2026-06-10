import {
  type Dirent,
  existsSync,
  lstatSync,
  readdirSync,
  readlinkSync,
  unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";

/**
 * Scan a directory for dangling symlinks (symlinks whose target does not
 * exist) and remove them. Uses lstat so cyclic or broken links are handled
 * safely without following the symlink. No-ops silently when the directory
 * does not exist.
 *
 * @param dir - Absolute path to the directory to scan.
 */
export function cleanDanglingSymlinks(dir: string): void {
  if (!existsSync(dir)) return;

  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true, encoding: "utf-8" });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;

    const linkPath = join(dir, entry.name);

    let target: string;
    try {
      target = readlinkSync(linkPath);
    } catch {
      continue;
    }

    // Resolve relative targets against the containing directory
    const resolvedTarget = resolve(dir, target);

    let targetExists: boolean;
    try {
      lstatSync(resolvedTarget);
      targetExists = true;
    } catch {
      targetExists = false;
    }

    if (!targetExists) {
      try {
        unlinkSync(linkPath);
        console.log(`cleaned broken symlink: ${linkPath}`);
      } catch {
        // best-effort; skip if we cannot remove
      }
    }
  }
}
