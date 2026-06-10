// --- Hook self-dedup preamble ---
//
// When both a project install (<cwd>/.agents/) and a global install (~/.agents/)
// exist, the same hook event fires from both registrations — causing double-fire.
// Strategy: write a 2-second lock file at /tmp/oma-hook-${UID}-${OMA_SESSION_ID}.lock.
// The second invocation within that window sees the lock and exits silently.
//
// Two `stat` forms cover macOS (-f %m) and Linux (-c %Y).

/** The shell dedup preamble snippet prepended to every generated hook shell script. */
export const HOOK_DEDUP_PREAMBLE = `# oma-hook self-dedup — suppresses double-fire of the SAME event when both project and global installs register it.
# The lock key includes the event args ("$@") so DIFFERENT events (e.g. PreToolUse right after UserPromptSubmit) never suppress each other.
__oma_evt="$(printf '%s' "$*" | tr -c 'A-Za-z0-9' '_')"
__oma_dedup_lock="/tmp/oma-hook-\${UID:-\${EUID:-0}}-\${OMA_SESSION_ID:-default}-\${__oma_evt}.lock"
if [ -f "$__oma_dedup_lock" ]; then
  __oma_age=$(( $(date +%s) - $(stat -f %m "$__oma_dedup_lock" 2>/dev/null || stat -c %Y "$__oma_dedup_lock" 2>/dev/null || echo 0) ))
  if [ "$__oma_age" -lt 2 ]; then
    exit 0
  fi
fi
echo "$$" > "$__oma_dedup_lock"`;

/**
 * Wrap a shell script body with the self-dedup preamble.
 *
 * The preamble writes a 2-second lock at /tmp/oma-hook-${UID}-${OMA_SESSION_ID}.lock
 * so a second hook registration (from a parallel project/global install) exits
 * silently within that window.
 *
 * @param scriptBody - Shell script content (without shebang) to wrap.
 * @returns Full shell script string with dedup preamble prepended.
 */
export function withDedup(scriptBody: string): string {
  return `${HOOK_DEDUP_PREAMBLE}\n${scriptBody}`;
}

/**
 * Generate a complete self-contained bash wrapper script for a hook command.
 *
 * The generated script:
 *  1. Applies the 2-second self-dedup lock so double-fire is suppressed when
 *     both a project and a global oma install register the same event.
 *  2. Delegates to `hookCommand` (typically `bun <path/to/hook.ts>`).
 *
 * @param hookCommand - The shell command to run (e.g. `bun .claude/hooks/keyword-detector.ts`).
 * @returns A complete bash script string, ready to write to disk.
 */
export function generateHookShellWrapper(hookCommand: string): string {
  return `#!/usr/bin/env bash\n${withDedup(`exec ${hookCommand} "$@"`)}\n`;
}
