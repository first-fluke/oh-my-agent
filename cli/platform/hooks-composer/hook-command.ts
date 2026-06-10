import type { HookVariant } from "./variant-types.js";

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
export function buildHookCmd(variant: HookVariant, script: string): string {
  // runtime is single-quoted; the path keeps `$ENV` expandable (double-quoted)
  // while neutralising metacharacters in the variant-controlled hookDir/script.
  const path = buildVariantPath(
    variant.projectDirEnv,
    `${variant.hookDir}/${script}`,
  );
  return `${shellQuote(variant.runtime)} ${path}`;
}

/** Filename of the generated per-vendor oma-hook wrapper script. */
export const OMA_HOOK_WRAPPER_FILENAME = "oma-hook.sh";

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
export function shellQuote(value: string): string {
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
export function escapeDoubleQuoted(value: string): string {
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

export function deriveHookName(script: string): string {
  return script.replace(/\.[^.]+$/, "");
}
