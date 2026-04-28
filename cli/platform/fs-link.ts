import * as fs from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

export type LinkKind = "file" | "dir";

export type LinkMechanism = "symlink" | "junction" | "hardlink" | "copy";

let warnedMechanisms = new Set<LinkMechanism>();

/**
 * Reset the once-per-process fallback warning state. Tests use this to
 * exercise the warning path repeatedly.
 */
export function resetLinkWarnings(): void {
  warnedMechanisms = new Set();
}

/**
 * Cross-platform link creator.
 *
 * POSIX: native symlink.
 * Windows: try symlink first (works under Developer Mode / admin); on EPERM
 * fall back to a junction for directories or a hardlink (then copy) for files.
 * Junctions and hardlinks do not require elevation, so this lets `bunx
 * oh-my-agent` succeed for ordinary Windows users without `sudo`-equivalent.
 *
 * `target` may be relative to `linkPath`'s directory, matching `fs.symlinkSync`
 * semantics. For Windows fallbacks the path is resolved to an absolute one
 * because junctions and hardlinks require it.
 *
 * Returns the mechanism actually used so callers can adjust idempotency
 * checks (hardlinks share an inode, copies do not).
 */
export function createLink(
  target: string,
  linkPath: string,
  kind: LinkKind,
): LinkMechanism {
  if (process.platform !== "win32") {
    fs.symlinkSync(target, linkPath, kind);
    return "symlink";
  }

  try {
    fs.symlinkSync(target, linkPath, kind);
    return "symlink";
  } catch (err) {
    if (!isPermissionError(err)) throw err;
  }

  const absTarget = isAbsolute(target)
    ? target
    : resolve(dirname(linkPath), target);

  if (kind === "dir") {
    fs.symlinkSync(absTarget, linkPath, "junction");
    warnFallback("junction");
    return "junction";
  }

  try {
    fs.linkSync(absTarget, linkPath);
    warnFallback("hardlink");
    return "hardlink";
  } catch {
    fs.copyFileSync(absTarget, linkPath);
    warnFallback("copy");
    return "copy";
  }
}

function isPermissionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as NodeJS.ErrnoException).code;
  return code === "EPERM" || code === "EACCES";
}

const FALLBACK_NOTES: Record<LinkMechanism, string> = {
  symlink: "",
  junction:
    "note: using directory junctions because symlinks need admin or Developer Mode",
  hardlink:
    "note: using hardlinks because symlinks need admin or Developer Mode (content stays in sync via shared inode)",
  copy: "note: copying files because symlinks and hardlinks both failed (likely cross-volume) — re-run install after editing .agents/* to refresh",
};

function warnFallback(mechanism: LinkMechanism): void {
  if (warnedMechanisms.has(mechanism)) return;
  warnedMechanisms.add(mechanism);
  const note = FALLBACK_NOTES[mechanism];
  if (note) console.warn(note);
}
