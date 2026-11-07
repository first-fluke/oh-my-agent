import {
  lstatSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { expect } from "vitest";
import { isSameFile } from "../platform/skills-installer/workflow-link-ledger.js";

/**
 * Assert `linkPath` is an oma file link to `source`, whatever mechanism
 * `createLink` used: a symlink (POSIX, or Windows with symlink privilege) or
 * the Windows hardlink fallback (same file identity).
 */
export function expectLinkedTo(linkPath: string, source: string): void {
  if (lstatSync(linkPath).isSymbolicLink()) {
    expect(resolve(dirname(linkPath), readlinkSync(linkPath))).toBe(
      resolve(source),
    );
  } else {
    expect(isSameFile(linkPath, source)).toBe(true);
  }
}

let fileSymlinks: boolean | undefined;

/**
 * Whether this process can create file symlinks (always on POSIX; on Windows
 * only with admin or Developer Mode). Gate symlink-seeding fixtures on this
 * instead of `process.platform` so privileged Windows hosts keep coverage.
 */
export function canCreateFileSymlink(): boolean {
  if (fileSymlinks !== undefined) return fileSymlinks;
  const dir = mkdtempSync(join(tmpdir(), "oma-symlink-probe-"));
  try {
    writeFileSync(join(dir, "target"), "");
    symlinkSync("target", join(dir, "link"), "file");
    fileSymlinks = true;
  } catch {
    fileSymlinks = false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return fileSymlinks;
}
