import * as fs from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";

export type LinkKind = "file" | "dir";

const WIN32_MAX_PATH = 260;
const WIN32_LONG_PATH_PREFIX = "\\\\?\\";

/**
 * On Windows, applies the `\\?\` namespace prefix to absolute paths whose
 * length exceeds MAX_PATH (260). The prefix opts the path into the Win32
 * file namespace where the 260-char limit doesn't apply. No-op on other
 * platforms and on already-prefixed paths.
 */
export function applyWin32LongPathPrefix(absolutePath: string): string {
  if (process.platform !== "win32") return absolutePath;
  if (absolutePath.startsWith(WIN32_LONG_PATH_PREFIX)) return absolutePath;
  if (absolutePath.length <= WIN32_MAX_PATH) return absolutePath;
  return WIN32_LONG_PATH_PREFIX + absolutePath;
}

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
 * When `ssotBase` is provided the resolved realpath of `target` must equal
 * `ssotBase` or start with `ssotBase + sep`. This is a defense-in-depth guard
 * against path-traversal attacks via malicious symlinks in `.agents/skills/`.
 * Pass `undefined` (or omit the argument) to skip validation entirely.
 *
 * Returns the mechanism actually used so callers can adjust idempotency
 * checks (hardlinks share an inode, copies do not).
 */
export function createLink(
  target: string,
  linkPath: string,
  kind: LinkKind,
  ssotBase?: string,
): LinkMechanism {
  if (ssotBase !== undefined) {
    const absTarget = isAbsolute(target)
      ? target
      : resolve(dirname(linkPath), target);
    const realTarget = fs.realpathSync(absTarget);
    const realSsotBase = fs.realpathSync(ssotBase);
    if (
      realTarget !== realSsotBase &&
      !realTarget.startsWith(realSsotBase + sep)
    ) {
      throw new Error(
        `createLink: target ${realTarget} escapes SSOT base ${realSsotBase}`,
      );
    }
  }
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

  const longAbsTarget = applyWin32LongPathPrefix(absTarget);
  const longLinkPath = applyWin32LongPathPrefix(linkPath);

  if (kind === "dir") {
    fs.symlinkSync(longAbsTarget, longLinkPath, "junction");
    warnFallback("junction");
    return "junction";
  }

  try {
    fs.linkSync(longAbsTarget, longLinkPath);
    warnFallback("hardlink");
    return "hardlink";
  } catch {
    fs.copyFileSync(longAbsTarget, longLinkPath);
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
