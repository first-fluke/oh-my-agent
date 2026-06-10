import { resolve } from "node:path";
import { escapeDoubleQuoted } from "./hook-command.js";
import { HOOK_DEDUP_PREAMBLE } from "./shell-wrapper.js";

/**
 * Generate the oma-hook wrapper shell script for a given vendor.
 *
 * oma path resolution strategy (T1-d from design 019):
 *   1. `command -v oma` — prefer the user's PATH (portable, no hardcode).
 *   2. Recorded absolute path from install time (`process.argv[1]` resolved
 *      to the oma binary, captured at the moment `oma link/install` ran).
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
  const safePath = escapeDoubleQuoted(recordedOmaPath);
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
 * The resolved path is stored verbatim in the wrapper as a compile-time
 * fallback; PATH lookup at runtime takes precedence (see generateOmaHookWrapper).
 */
export function resolveOmaRecordedPath(): string {
  const argv1 = process.argv[1];
  if (argv1) {
    return resolve(argv1);
  }
  return process.execPath;
}
