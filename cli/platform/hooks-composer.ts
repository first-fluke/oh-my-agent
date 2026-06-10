import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { clearNonDirectory } from "../utils/fs-utils.js";

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

// --- Variant-driven hook installation ---

export interface HookEvent {
  hook: string;
  matcher?: string;
  timeout: number;
}

export interface HookVariant {
  vendor: string;
  hookDir: string;
  settingsFile: string;
  projectDirEnv: string | null;
  runtime: string;
  /**
   * When true, settings hook entries are written as flat
   * `{command, timeout[, matcher]}` objects under each event key (Cursor's
   * hooks.json format — nested `{matcher, hooks: [...]}` groups do not fire
   * in Cursor CLI). Defaults to the Claude Code nested-group format.
   */
  flatHookEntries?: boolean;
  events: Record<string, HookEvent | HookEvent[]>;
  statusLine?: { hook: string };
  /**
   * Parent settings key to nest the statusLine under. Omit for top-level
   * (Claude / agy use root `statusLine`). Qwen requires `ui.statusLine` — a
   * root-level statusLine is silently ignored by the Qwen Code renderer.
   */
  statusLineKey?: string;
  // biome-ignore lint/suspicious/noExplicitAny: extra settings vary by vendor
  extra?: Record<string, any>;
  featureFlags?: {
    file: string;
    section: string;
    flags: Record<string, boolean>;
  };
}

/** Build hook command string from variant config.
 *
 * Uses the bare runtime name (e.g. `bun`) so the written settings are
 * machine-independent. Resolving to an absolute path at install time caused
 * churn: every machine's `oma update` rewrote vendor settings with its own
 * `which bun` result.
 *
 * Only used for statusLine/hud entries — event hooks now use buildOmaHookCmd.
 *
 * All variant-derived values are wrapped with shellQuote() so shell
 * metacharacters in runtime/hookDir/script (from a malicious project's
 * .agents/hooks/variants/*.json) cannot inject commands into the generated
 * settings string that the vendor agent executes via the shell.
 */
function buildHookCmd(variant: HookVariant, script: string): string {
  // runtime is single-quoted; the path keeps `$ENV` expandable (double-quoted)
  // while neutralising metacharacters in the variant-controlled hookDir/script.
  const path = buildVariantPath(
    variant.projectDirEnv,
    `${variant.hookDir}/${script}`,
  );
  return `${shellQuote(variant.runtime)} ${path}`;
}

/** Filename of the generated per-vendor oma-hook wrapper script. */
const OMA_HOOK_WRAPPER_FILENAME = "oma-hook.sh";

/**
 * Build the command that vendor settings should register for a hook event.
 *
 * Emits: `<hookDir>/oma-hook.sh --vendor <vendor> --event <nativeEvent> [--matcher <m>]`
 *
 * The wrapper script resolves the oma binary at runtime and exec's
 * `oma hook "$@"` so every vendor event routes through the in-process
 * handler chain (see design 019 §Integration).
 *
 * Uses `projectDirEnv` expansion for vendors that set it (e.g. Claude's
 * `$CLAUDE_PROJECT_DIR`) so the path stays machine-independent.
 */
/**
 * POSIX single-quote a value for safe inclusion in the settings `command`
 * string (which the vendor executes via the shell). Without this, a variant
 * JSON containing shell metacharacters in `vendor`/`event`/`matcher` (e.g. a
 * malicious project's `.agents/hooks/variants/*.json`) would inject an
 * executable payload into the generated settings. Single-quote and escape any
 * embedded single quotes; preserves legitimate values like `Edit|Write`.
 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** A valid POSIX environment-variable name (so `$NAME` expansion is safe). */
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Escape the characters that are special **inside double quotes** (`\`, `"`,
 * `` ` ``, `$`) without adding the surrounding quotes. Used to embed an
 * untrusted path segment in a double-quoted string where a sibling `$ENV`
 * prefix still needs to expand — single-quoting the whole path would break that
 * expansion, so we double-quote and neutralise command-substitution / variable
 * expansion / quote-breakout inside the untrusted portion instead.
 */
function escapeDoubleQuoted(value: string): string {
  return value.replace(/([\\"`$])/g, "\\$1");
}

/**
 * Build a settings `command` path for a wrapper/script that lives under a
 * vendor's project-dir env var (e.g. `$CLAUDE_PROJECT_DIR`).
 *
 * When `projectDirEnv` is a valid env-var name, the result is
 * `"$ENV/<escaped relPath>"` — double-quoted so `$ENV` expands at runtime while
 * the variant-controlled `relPath` cannot inject command substitution or break
 * out of the quotes. Otherwise (no/invalid env var) the relative path is
 * single-quoted with no expansion.
 */
function buildVariantPath(
  projectDirEnv: string | null | undefined,
  relPath: string,
): string {
  if (projectDirEnv && ENV_NAME_RE.test(projectDirEnv)) {
    return `"$${projectDirEnv}/${escapeDoubleQuoted(relPath)}"`;
  }
  return shellQuote(relPath);
}

export function buildOmaHookCmd(
  variant: HookVariant,
  nativeEvent: string,
  matcher?: string,
): string {
  const wrapperName = OMA_HOOK_WRAPPER_FILENAME;
  // hookDir comes from variant JSON (potentially attacker-controlled). Keep
  // `$ENV` expansion working (double-quoted) while neutralising command
  // substitution / quote-breakout in the variant-controlled path segment; the
  // no-env case falls back to a single-quoted relative path.
  const basePath = buildVariantPath(
    variant.projectDirEnv,
    `${variant.hookDir}/${wrapperName}`,
  );
  // Quote interpolated values — they originate from variant JSON and must not
  // be able to inject shell metacharacters into the registered command.
  let cmd = `${basePath} --vendor ${shellQuote(variant.vendor)} --event ${shellQuote(nativeEvent)}`;
  if (matcher) cmd += ` --matcher ${shellQuote(matcher)}`;
  return cmd;
}

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
function resolveOmaRecordedPath(): string {
  const argv1 = process.argv[1];
  if (argv1) {
    return resolve(argv1);
  }
  return process.execPath;
}

function deriveHookName(script: string): string {
  return script.replace(/\.[^.]+$/, "");
}

/** True for non-null, non-array plain objects (used for shallow settings merges). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Known OMA-managed core hook script basenames (without extension).
 *
 * Used by `isOmaManagedHookGroup` to identify legacy `bun …/<script>.ts`
 * entries written by pre-019 installs so they can be replaced on re-install.
 */
const OMA_CORE_SCRIPT_NAMES = new Set([
  "keyword-detector",
  "skill-injector",
  "serena-primer",
  "state-boundary",
  "test-filter",
  "persistent-mode",
  "hud",
]);

/**
 * Return true if a hook group object (one element of an event's array in
 * `settings.hooks`) was written by oma and should be replaced on re-install.
 *
 * Two generations are matched:
 *
 * **New (design 019)** — the group contains a hook whose `name` starts with
 * `"oma-hook-"` or whose `command` contains `"oma-hook.sh"`.
 *
 * **Legacy (pre-019)** — the group contains a hook whose `command` matches
 * the old `bun "<hookDir>/<script>.{ts,js}"` or `bun <hookDir>/<script>.{ts,js}`
 * pattern for any of the known OMA core scripts.
 *
 * User-added hook groups are never matched by either pattern, so they are
 * preserved verbatim.
 */
export function isOmaManagedHookGroup(
  // biome-ignore lint/suspicious/noExplicitAny: hook group shape varies by vendor
  group: any,
): boolean {
  if (!isPlainObject(group)) return false;

  // Flat-entry form (flatHookEntries vendors, e.g. Cursor): the event array
  // element IS the hook object — `{command, timeout[, matcher]}` with no
  // nested `hooks` array.
  const hooks = group.hooks;
  if (!Array.isArray(hooks)) {
    return isOmaManagedHookCommand(group);
  }

  return hooks.some(
    (h: unknown) => isPlainObject(h) && isOmaManagedHookCommand(h),
  );
}

/**
 * True when a single hook object (nested-group member or flat entry) was
 * written by oma: either the new oma-hook.sh wrapper command / `oma-hook-*`
 * name, or a legacy `bun …/<core-script>.{ts,js}` command.
 */
function isOmaManagedHookCommand(h: Record<string, unknown>): boolean {
  const name = typeof h.name === "string" ? h.name : "";
  const cmd = typeof h.command === "string" ? h.command : "";

  // New-style: oma-hook.sh wrapper (design 019+)
  if (name.startsWith("oma-hook-") || cmd.includes("oma-hook.sh")) {
    return true;
  }

  // Legacy-style: `bun "<path>/<script>.ts"` or `bun <path>/<script>.ts`
  // e.g. bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"
  //      bun .codex/hooks/persistent-mode.ts
  const legacyMatch = cmd.match(/\bbun\b.*?[/\\]([\w-]+)\.(ts|js)["']?\s*$/);
  if (legacyMatch) {
    const scriptName = legacyMatch[1];
    if (scriptName && OMA_CORE_SCRIPT_NAMES.has(scriptName)) return true;
  }

  return false;
}

/**
 * Strip OMA-managed hook groups from an existing event array and append the
 * new OMA groups, preserving user-added hook groups in their original order.
 *
 * @param existing - Current array from `settings.hooks[eventName]` (may be
 *   undefined, null, or not an array — treated as empty in those cases).
 * @param newOmaGroups - Array of hook group objects to write for this event.
 * @returns Merged array: [user-preserved groups …, …newOmaGroups].
 */
export function mergeHookGroups(
  // biome-ignore lint/suspicious/noExplicitAny: hook group shape is dynamic
  existing: any,
  // biome-ignore lint/suspicious/noExplicitAny: hook group shape is dynamic
  newOmaGroups: any[],
  // biome-ignore lint/suspicious/noExplicitAny: merged result
): any[] {
  const existingArray = Array.isArray(existing) ? existing : [];
  const userGroups = existingArray.filter(
    (g: unknown) => !isOmaManagedHookGroup(g),
  );
  return [...userGroups, ...newOmaGroups];
}

/**
 * Compute the set of core scripts that must be materialized in a vendor's
 * hookDir for a given variant. Everything else runs in-process via `oma hook`
 * (design 019) and must NOT be copied — stale copies are dead files that make
 * vendor directories look hand-rolled.
 *
 * A script is required only when something executes or reads it from the
 * hookDir at runtime:
 *  - Hud-only events keep their `bun <hookDir>/<script>` command (T1-c), so
 *    those scripts are materialized (gemini registers hud via events).
 *  - The statusLine entry runs `bun <hookDir>/<hook>` directly.
 *  - The in-process test-filter handler rewrites Bash commands to pipe through
 *    `<hookDir>/filter-test-output.sh` (see test-filter.ts vendorHooksDir),
 *    so that shell script must exist wherever test-filter.ts is registered.
 *
 * triggers.json is statically inlined into the oma binary and handler chains
 * run inside `oma hook`, so neither it nor the handler .ts files are needed.
 */
export function requiredVariantScripts(variant: HookVariant): Set<string> {
  const required = new Set<string>();
  for (const rawConfig of Object.values(variant.events)) {
    const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
    if (configs.length === 0) continue;
    // Hud-only events keep the direct bun command; mixed events route through
    // oma-hook.sh and drop hud (mirrors installHooksFromVariant step 3).
    if (configs.every((c) => c.hook === "hud.ts")) {
      for (const c of configs) required.add(c.hook);
    }
    if (configs.some((c) => c.hook === "test-filter.ts")) {
      required.add("filter-test-output.sh");
    }
  }
  if (variant.statusLine) required.add(variant.statusLine.hook);
  return required;
}

/**
 * Copy core hook scripts from .agents/hooks/core/ to a vendor's hooks directory.
 * Clears stale symlinks/files first, then copies with dereference to ensure
 * real file copies (never symlinks that break when the temp dir is deleted).
 *
 * @param only - When provided, copy ONLY these basenames (the variant's
 *   runtime-required scripts — see requiredVariantScripts). Omit to copy the
 *   full core set (pi bridge, which spawns the scripts as subprocesses).
 *   The destination is cleared either way, so a re-install with a whitelist
 *   also removes stale full-copy files from older installs.
 */
export function copyHookScripts(
  sourceDir: string,
  hooksDest: string,
  only?: ReadonlySet<string>,
): void {
  const hooksSrc = join(sourceDir, ".agents", "hooks", "core");
  if (!existsSync(hooksSrc)) return;

  mkdirSync(hooksDest, { recursive: true });

  // Remove ALL existing non-directory entries (files, symlinks, broken symlinks)
  // before cpSync — Bun's cpSync fails with ENOENT on broken symlinks even with force.
  for (const entry of readdirSync(hooksDest, { withFileTypes: true })) {
    clearNonDirectory(join(hooksDest, entry.name));
  }

  if (only) {
    for (const name of only) {
      const src = join(hooksSrc, name);
      if (!existsSync(src)) continue;
      cpSync(src, join(hooksDest, name), { force: true, dereference: true });
    }
    return;
  }

  cpSync(hooksSrc, hooksDest, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

/**
 * Merge hook entries (and optional extra fields) into a JSON settings file.
 * Preserves existing settings outside the hooks/extra keys.
 */
export function mergeIntoSettings(
  settingsPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  hookEntries: Record<string, any>,
  // biome-ignore lint/suspicious/noExplicitAny: extra fields like statusLine
  extra?: Record<string, any>,
): void {
  mkdirSync(dirname(settingsPath), { recursive: true });

  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
  let settings: any = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // Corrupted — start fresh
    }
  }

  // Merge hook entries with replace semantics for OMA-managed groups.
  // For each event key OMA is writing: strip existing OMA-managed groups
  // (old bun-script or new oma-hook.sh) then append the new OMA groups.
  // User-added groups on the same event are preserved in their original order.
  // Event keys not touched by OMA are left verbatim.
  const existingHooks = settings.hooks || {};
  const mergedHooks: Record<string, unknown> = { ...existingHooks };
  for (const [eventName, newGroups] of Object.entries(hookEntries)) {
    mergedHooks[eventName] = mergeHookGroups(
      existingHooks[eventName],
      Array.isArray(newGroups) ? newGroups : [newGroups],
    );
  }
  settings.hooks = mergedHooks;
  if (extra) {
    // Shallow-merge one level deep so nested keys like `ui` (Qwen statusLine)
    // or `permissions` augment — rather than clobber — existing vendor settings.
    for (const [key, value] of Object.entries(extra)) {
      const existing = settings[key];
      if (isPlainObject(value) && isPlainObject(existing)) {
        settings[key] = { ...existing, ...value };
      } else {
        settings[key] = value;
      }
    }
  }
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

/**
 * Escape all regex metacharacters in a string so it can be safely embedded
 * in a `new RegExp(...)` constructor without treating any character as a
 * special pattern token. Prevents regex-injection when variant-supplied
 * `key` or `section` values contain parentheses, dots, brackets, etc.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ensure feature flags are enabled in a TOML config file.
 * Creates file if missing, appends section if not present.
 *
 * `key` and `section` originate from variant JSON (potentially attacker-
 * controlled via .agents/hooks/variants/<vendor>.json). Both values are
 * escaped with escapeRegExp() before being embedded in RegExp constructors so
 * malformed values cannot cause DoS (catastrophic backtracking, invalid regex)
 * or corrupt the file via `$`-bearing replacement strings.
 */
export function ensureFeatureFlags(
  configPath: string,
  section: string,
  flags: Record<string, boolean>,
): void {
  mkdirSync(dirname(configPath), { recursive: true });

  let content = "";
  if (existsSync(configPath)) {
    content = readFileSync(configPath, "utf-8");
  }

  const safeSection = escapeRegExp(section);

  for (const [key, value] of Object.entries(flags)) {
    const safeKey = escapeRegExp(key);
    const enabledRe = new RegExp(`${safeKey}\\s*=\\s*${value}`, "i");
    if (enabledRe.test(content)) continue;

    const disabledRe = new RegExp(`${safeKey}\\s*=\\s*${!value}`, "i");
    // Use a function replacer so attacker-controlled `key` cannot be
    // interpreted as a replacement pattern (e.g. `$&`, `$1`).
    const replacement = `${key} = ${value}`;
    if (disabledRe.test(content)) {
      content = content.replace(disabledRe, () => replacement);
      writeFileSync(configPath, content);
      continue;
    }

    const sectionRe = new RegExp(`\\[${safeSection}\\]`, "i");
    if (sectionRe.test(content)) {
      content = content.replace(
        new RegExp(`(\\[${safeSection}\\][^[]*)`, "i"),
        (match) => `${match}${replacement}\n`,
      );
      writeFileSync(configPath, content);
    } else {
      content = `${content.trimEnd()}\n\n[${section}]\n${replacement}\n`;
      writeFileSync(configPath, content);
    }
  }
}

/**
 * Install hooks for any vendor using its variant config from .agents/hooks/variants/.
 * Reads the variant JSON, copies core hooks, generates settings entries.
 *
 * ### Event hook strategy (design 019 §T6)
 *
 * For each event in `variant.events`:
 *   - If ALL configs in that event reference `hud.ts` only:
 *       Keep the current `bun <hookDir>/hud.ts` command (hot-path display,
 *       excluded from oma hook per T1-c).
 *   - Otherwise (at least one non-hud handler):
 *       Emit ONE settings entry whose command is `<oma-hook.sh> --vendor <v>
 *       --event <e> [--matcher <m>]`.  oma runs the WHOLE handler chain
 *       in-process — no longer one entry per handler script.
 *       Hud-only configs within mixed events are intentionally dropped from
 *       the settings entry (display is a statusLine concern, not a handler).
 *
 * ### copyHookScripts copies ONLY the variant's runtime-required scripts
 * `copyHookScripts` materializes just what the hookDir executes or reads at
 * runtime (hud.ts for statusLine/hud-only events, filter-test-output.sh for
 * test-filter — see requiredVariantScripts). Handler .ts files run in-process
 * inside `oma hook` and are NOT copied; the pi bridge, which spawns them as
 * subprocesses, gets the full set via its own composer (pi-extension-composer).
 * We no longer call `patchVendorHookTypes` or `patchVendorDetection` because
 * vendor identity is now a `--vendor` CLI argument, not a runtime detection.
 *
 * ### ONE wrapper per vendor
 * A single `oma-hook.sh` is written to `hookDir`. It resolves the oma binary
 * (PATH → recorded absolute path → exit 0 fail-open) and `exec`s `oma hook "$@"`.
 */
export function installHooksFromVariant(
  sourceDir: string,
  targetDir: string,
  variant: HookVariant,
): void {
  // 1. Materialize ONLY the scripts this variant executes/reads from hookDir
  //    (hud.ts, filter-test-output.sh — see requiredVariantScripts). The
  //    destination is cleared first, so re-install also sweeps stale handler
  //    copies left by older full-copy installs.
  const hooksDest = join(targetDir, variant.hookDir);
  copyHookScripts(sourceDir, hooksDest, requiredVariantScripts(variant));

  // 2. Write the single oma-hook wrapper (one per vendor hookDir).
  const wrapperPath = join(hooksDest, OMA_HOOK_WRAPPER_FILENAME);
  const recordedOmaPath = resolveOmaRecordedPath();
  writeFileSync(wrapperPath, generateOmaHookWrapper(recordedOmaPath), {
    mode: 0o755,
  });

  // 3. Build hook entries from events.
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  const hookEntries: Record<string, any> = {};
  for (const [eventName, rawConfig] of Object.entries(variant.events)) {
    const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
    if (configs.length === 0) continue;

    // Determine whether ALL hooks in this event are hud-only (display, not handlers).
    const nonHudConfigs = configs.filter((c) => c.hook !== "hud.ts");
    const allHud = nonHudConfigs.length === 0;

    // biome-ignore lint/suspicious/noExplicitAny: hook entry shape varies
    let entry: any;
    const matcher = configs.find((c) => c.matcher)?.matcher;

    if (allHud) {
      // Hud-only event — keep the current bun path (T1-c: statusLine/hud stays
      // on its current mechanism; gemini uses hud via events rather than statusLine).
      const hooks = configs.map((c) => ({
        name: deriveHookName(c.hook),
        type: "command",
        command: buildHookCmd(variant, c.hook),
        timeout: c.timeout,
      }));
      entry = { hooks };
      if (matcher) entry.matcher = matcher;
    } else {
      // Handler event — route through oma hook (one entry for the whole chain).
      // Timeout = sum of all handler timeouts + 5 s margin for oma startup/IPC.
      const handlerTimeout =
        nonHudConfigs.reduce((sum, c) => sum + c.timeout, 0) + 5;
      const omaHookCmd = buildOmaHookCmd(variant, eventName, matcher);
      if (variant.flatHookEntries) {
        // Flat-entry vendors (Cursor): the event array holds the hook object
        // directly — nested {matcher, hooks: [...]} groups do not fire there.
        entry = { command: omaHookCmd, timeout: handlerTimeout };
        if (matcher) entry.matcher = matcher;
      } else {
        entry = {
          hooks: [
            {
              name: `oma-hook-${eventName}`,
              type: "command",
              command: omaHookCmd,
              timeout: handlerTimeout,
            },
          ],
        };
        if (matcher) entry.matcher = matcher;
      }
    }

    hookEntries[eventName] = [entry];
  }

  // 4. Build extra settings (statusLine, permissions, etc.).
  //    statusLine keeps the current bun/hud path (T1-c: not routed via oma hook).
  // biome-ignore lint/suspicious/noExplicitAny: extra settings are dynamic
  const extra: Record<string, any> = {};
  if (variant.statusLine) {
    const statusLineEntry = {
      type: "command",
      command: buildHookCmd(variant, variant.statusLine.hook),
    };
    if (variant.statusLineKey) {
      // Qwen Code reads `ui.statusLine`; a root-level entry is ignored.
      extra[variant.statusLineKey] = { statusLine: statusLineEntry };
    } else {
      extra.statusLine = statusLineEntry;
    }
  }
  if (variant.extra) Object.assign(extra, variant.extra);

  // 5. Merge into settings file (or write Grok-native hook file).
  if (variant.vendor === "grok") {
    // Grok discovers hooks from .grok/hooks/*.json files (directory-based).
    // Write a single well-named file with the double-nested shape Grok expects.
    const grokHookFile = join(targetDir, variant.settingsFile);
    mkdirSync(dirname(grokHookFile), { recursive: true });
    const grokPayload = { hooks: hookEntries };
    writeFileSync(grokHookFile, `${JSON.stringify(grokPayload, null, 2)}\n`);
  } else {
    mergeIntoSettings(
      join(targetDir, variant.settingsFile),
      hookEntries,
      Object.keys(extra).length > 0 ? extra : undefined,
    );
  }

  // 6. Vendor-specific feature flags (e.g., Codex config.toml).
  if (variant.featureFlags) {
    ensureFeatureFlags(
      join(targetDir, variant.featureFlags.file),
      variant.featureFlags.section,
      variant.featureFlags.flags,
    );
  }
}
