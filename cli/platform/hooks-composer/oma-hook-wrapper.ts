/**
 * Well-known install locations, searched (in order) only when `oma` is not on
 * the hook environment's PATH.
 *
 * GUI-launched agents inherit a minimal PATH — no shell rc runs — so a
 * perfectly working `oma` is routinely invisible to `command -v` inside a hook.
 * That is the one problem an install-time path solved, and this list solves it
 * without writing anything machine-specific into the wrapper.
 *
 * Emitted verbatim into the script, so every entry must be a literal we control
 * (`$HOME` expands in the wrapper's shell, not here).
 */
const OMA_BIN_CANDIDATES = [
  '"$HOME/.bun/bin/oma"',
  '"$HOME/.local/bin/oma"',
  '"$HOME/.local/share/mise/shims/oma"',
  // mise-managed node without shims on PATH: the version dir is not stable, so
  // glob it. An unmatched glob stays literal and simply fails the -x test.
  '"$HOME"/.local/share/mise/installs/node/*/bin/oma',
  '"$HOME/.volta/bin/oma"',
  '"$HOME/.npm-global/bin/oma"',
  '"/opt/homebrew/bin/oma"',
  '"/usr/local/bin/oma"',
];

/**
 * Generate the oma-hook wrapper shell script for a given vendor.
 *
 * oma resolution, entirely at runtime — the script is byte-identical on every
 * machine, so projects can commit their vendor hook dir without carrying one
 * developer's install path (and without the file churning as teammates with
 * different install methods each re-link):
 *
 *   1. `$OMA_BIN` — explicit override for an install in an exotic location.
 *   2. `command -v oma` — the hook environment's PATH.
 *   3. The well-known install locations above (GUI agents get a minimal PATH).
 *   4. If nothing resolves — `exit 0` (fail-open, never block the agent).
 *
 * The wrapper does no deduplication itself: it exports its own path as
 * `OMA_HOOK_WRAPPER`, and `oma hook run` drops only an identical payload that
 * a different wrapper (the other registration of a project + global double
 * install) already claimed. Distinct events — parallel tool calls, concurrent
 * sessions — always run.
 *
 * Passes `"$@"` verbatim so `--vendor`, `--event`, `--matcher` args that
 * the settings entry emits reach `oma hook run` unchanged (no shell injection).
 */
export function generateOmaHookWrapper(omaHome?: string): string {
  // A multi-statement script that must ALWAYS exit 0 — a non-zero hook exit
  // (e.g. a stale oma without the `hook` command) can disrupt the vendor agent.
  return `#!/usr/bin/env bash
${omaHome ? `export OMA_HOME='${omaHome.replaceAll("'", "'\"'\"'")}'\n` : ""}\
# Duplicate deliveries from a project + global double install are dropped
# inside \`oma hook run\` (payload hash + this wrapper's path); distinct events
# always run.
__oma_bin=""
if [ -n "\${OMA_BIN:-}" ] && [ -x "\${OMA_BIN}" ]; then
  __oma_bin="\${OMA_BIN}"
elif command -v oma >/dev/null 2>&1; then
  __oma_bin="$(command -v oma)"
else
  # PATH is minimal under GUI-launched agents; check the usual install dirs.
  for __oma_candidate in ${OMA_BIN_CANDIDATES.join(" ")}; do
    if [ -x "$__oma_candidate" ]; then
      __oma_bin="$__oma_candidate"
      break
    fi
  done
fi
if [ -n "$__oma_bin" ]; then
  # Run oma hook; swallow a non-zero exit so the wrapper is always fail-open.
  OMA_HOOK_WRAPPER="$0" "$__oma_bin" hook run "$@" || true
fi
exit 0
`;
}
