import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { escapeDoubleQuoted } from "./hook-command.js";
import { HOOK_DEDUP_PREAMBLE } from "./shell-wrapper.js";

/**
 * Render the recorded oma path for the wrapper's double-quoted `[ -x "..." ]`
 * test.
 *
 * When the path lives under the installing user's home directory, the home
 * prefix is emitted as a literal `${HOME}` instead of the expanded path. Many
 * projects commit their vendor hook directory (`.claude/`, `.qwen/`, …), and an
 * expanded path would carry the installer's username into version control —
 * dead weight for every other machine, which falls through to the PATH lookup.
 *
 * `$HOME` unset (or a different home) is harmless: the `-x` test simply fails
 * and the wrapper falls back to `command -v oma`.
 *
 * POSIX hosts only. On win32 `homedir()` is `C:\Users\<name>` while the Bash
 * that runs this wrapper (Git Bash / MSYS) reports `$HOME` as `/c/Users/<name>`,
 * so the prefix cannot be swapped one-for-one and the `\` separators in the
 * tail would need their own quoting. There we keep the recorded path verbatim.
 *
 * The remaining segments still land inside double quotes, so they are escaped
 * for that context (see escapeDoubleQuoted).
 */
function renderRecordedPath(recordedOmaPath: string): string {
  const home = homedir();
  const prefix = `${home}${sep}`;
  if (
    sep === "/" &&
    home &&
    home !== sep &&
    recordedOmaPath.startsWith(prefix)
  ) {
    const rest = recordedOmaPath.slice(prefix.length);
    // `\${HOME}` is emitted literally — the wrapper's shell expands it, not JS.
    return `\${HOME}/${escapeDoubleQuoted(rest)}`;
  }
  return escapeDoubleQuoted(recordedOmaPath);
}

/**
 * Generate the oma-hook wrapper shell script for a given vendor.
 *
 * oma path resolution strategy (T1-d from design 019):
 *   1. Recorded path from install time (`process.argv[1]` resolved to the oma
 *      binary, captured at the moment `oma link/install` ran) — written
 *      `${HOME}`-relative when it sits under the user's home directory.
 *   2. `command -v oma` — the user's PATH.
 *   3. If neither resolves — `exit 0` (fail-open, never block the agent).
 *
 * The dedup preamble suppresses double-fire when both a project and global
 * install register the same event (existing dedup strategy, kept intact).
 *
 * Passes `"$@"` verbatim so `--vendor`, `--event`, `--matcher` args that
 * the settings entry emits reach `oma hook` unchanged (no shell injection).
 */
export function generateOmaHookWrapper(recordedOmaPath: string): string {
  // Authored directly (NOT via generateHookShellWrapper, whose `exec ${cmd} "$@"`
  // template is for single-command wrappers). This is a multi-statement script,
  // and it must ALWAYS exit 0 — a non-zero hook exit (e.g. a stale oma without
  // the `hook` command) can disrupt the vendor agent.
  //
  // Resolution order: the recorded install-time path FIRST (the exact oma that
  // generated this wrapper — guaranteed to support `hook`), then PATH `oma`. A
  // stale `oma` on PATH must not shadow the installer's feature set.
  //
  // The recorded path lands inside double quotes; escape `\` `"` `` ` `` `$`
  // so a path with shell metacharacters can't break or inject into the script.
  // A home-directory prefix is kept as an unexpanded `${HOME}` (renderRecordedPath).
  const safePath = renderRecordedPath(recordedOmaPath);
  return `#!/usr/bin/env bash
${HOOK_DEDUP_PREAMBLE}
__oma_bin=""
if [ -x "${safePath}" ]; then
  __oma_bin="${safePath}"
elif command -v oma >/dev/null 2>&1; then
  __oma_bin="$(command -v oma)"
fi
if [ -n "$__oma_bin" ]; then
  # Run oma hook; swallow a non-zero exit so the wrapper is always fail-open.
  "$__oma_bin" hook "$@" || true
fi
exit 0
`;
}

/**
 * Resolve the oma binary path to record in the oma-hook wrapper.
 *
 * Priority:
 *   1. `process.argv[1]` — the JS entry point (works for `node cli.js` invocations).
 *   2. `process.execPath` — the Node/Bun executable itself (fallback when argv[1]
 *      is not the oma wrapper, e.g. during tests).
 *
 * The resolved path is what the wrapper tries FIRST at runtime, with the PATH
 * `oma` as the fallback; a home prefix is written unexpanded so the wrapper
 * stays machine-independent (see generateOmaHookWrapper).
 */
export function resolveOmaRecordedPath(): string {
  const argv1 = process.argv[1];
  if (argv1) {
    return resolve(argv1);
  }
  return process.execPath;
}
