/**
 * Best-practice Claude Code settings managed by oh-my-agent.
 * Single source of truth — install, update, and doctor all reference this.
 *
 * Every recommendation is "add when absent": a key the user already set —
 * including an explicit `false`, `""`, or a lower number — is never flipped
 * back on the next link/update. Only the telemetry opt-out is enforced both
 * ways, because `telemetry` in oma-config.yaml owns it.
 */

import { loadOmaConfig } from "../../utils/config.js";
import { isRecord } from "../../utils/type-guards.js";

// Flag-style env vars. env values are strings at runtime, so they are written
// as strings (Claude Code would coerce numbers, but strings avoid any parse
// ambiguity).
export const RECOMMENDED_ENV = {
  DISABLE_ERROR_REPORTING: "1",
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
  CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1",
  ENABLE_PROMPT_CACHING_1H: "1",
} as const;

// Numeric env tunables, stored as strings. A user's own numeric value (higher
// or lower) is kept; only a missing or non-numeric value is filled in.
export const RECOMMENDED_ENV_MIN: Record<string, number> = {
  CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: 100000,
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 80,
};

// Keys oma itself wrote in earlier releases and now removes.
const DEPRECATED_ENV_KEYS = ["DISABLE_PROMPT_CACHING"] as const;

// `DISABLE_TELEMETRY=1` breaks Claude Code Remote Control eligibility, so it is
// gated on the `telemetry` flag from oma-config.yaml (default off → flag set).
const TELEMETRY_ENV_KEY = "DISABLE_TELEMETRY" as const;

export type ClaudeSettingsOptions = {
  /** When true, omit `DISABLE_TELEMETRY` so Remote Control works. */
  telemetry?: boolean;
  /**
   * When false (`scm.co_author.enabled: false`), oma does not add its commit /
   * PR attribution and removes values that exactly match the ones it wrote.
   * Defaults to true.
   */
  attribution?: boolean;
};

export const RECOMMENDED_TOP_LEVEL = {
  // `cleanupPeriodDays` is a TOP-LEVEL Claude Code setting, not an env var. It
  // previously lived (incorrectly) under `env`, where Claude Code ignored it.
  cleanupPeriodDays: 180,
  skipDangerousModePermissionPrompt: true,
  effortLevel: "high",
  skillListingBudgetFraction: 0.02,
} as const;

export const RECOMMENDED_ATTRIBUTION = {
  commit:
    "Generated with oh-my-agent\n\nCo-Authored-By: First Fluke <our.first.fluke@gmail.com>",
  pr: "Generated with [oh-my-agent](https://github.com/first-fluke/oh-my-agent)",
} as const;

/**
 * Whether oma may add its Claude attribution, read from `scm.co_author.enabled`
 * in oma-config. Only an explicit `false` opts out, matching the behavior of
 * configs written before the key existed.
 */
export function claudeAttributionEnabled(cwd: string): boolean {
  try {
    const config = loadOmaConfig(cwd) as unknown;
    const scm = isRecord(config) && isRecord(config.scm) ? config.scm : {};
    const coAuthor = isRecord(scm.co_author) ? scm.co_author : {};
    return coAuthor.enabled !== false;
  } catch {
    return true;
  }
}

function isFiniteNumberLike(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string" || !value.trim()) return false;
  return Number.isFinite(Number(value));
}

/** True when the value is one the user (or an earlier pass) set explicitly. */
function topLevelIsSet(
  key: keyof typeof RECOMMENDED_TOP_LEVEL,
  value: unknown,
): boolean {
  switch (key) {
    case "cleanupPeriodDays":
    case "skillListingBudgetFraction":
      return isFiniteNumberLike(value);
    case "skipDangerousModePermissionPrompt":
      return typeof value === "boolean";
    case "effortLevel":
      // Any non-empty level is the user's choice; Claude Code's set of levels
      // grows (e.g. `max`), so oma does not judge it.
      return typeof value === "string" && value.trim() !== "";
  }
}

function attributionRecord(settings: Record<string, unknown>) {
  return isRecord(settings.attribution) ? settings.attribution : undefined;
}

/**
 * Check whether existing settings are missing a recommended value. Agrees with
 * {@link applyClaudeSettings}: applying and re-checking always yields false.
 */
export function needsClaudeSettingsUpdate(
  claudeSettings: unknown,
  options: ClaudeSettingsOptions = {},
): boolean {
  if (!isRecord(claudeSettings)) return true;
  const env = isRecord(claudeSettings.env) ? claudeSettings.env : undefined;
  if (!env) return true;

  for (const key of DEPRECATED_ENV_KEYS) {
    if (key in env) return true;
  }
  if ("cleanupPeriodDays" in env) return true;

  if (options.telemetry === true) {
    if (TELEMETRY_ENV_KEY in env) return true;
  } else if (env[TELEMETRY_ENV_KEY] !== "1") {
    return true;
  }

  for (const key of Object.keys(RECOMMENDED_ENV)) {
    if (!(key in env)) return true;
  }
  for (const key of Object.keys(RECOMMENDED_ENV_MIN)) {
    if (!isFiniteNumberLike(env[key])) return true;
  }

  for (const key of Object.keys(RECOMMENDED_TOP_LEVEL) as Array<
    keyof typeof RECOMMENDED_TOP_LEVEL
  >) {
    if (!topLevelIsSet(key, claudeSettings[key])) return true;
  }

  const attribution = attributionRecord(claudeSettings);
  if (options.attribution === false) {
    return (
      attribution?.commit === RECOMMENDED_ATTRIBUTION.commit ||
      attribution?.pr === RECOMMENDED_ATTRIBUTION.pr
    );
  }
  return (
    typeof attribution?.commit !== "string" ||
    typeof attribution?.pr !== "string"
  );
}

/**
 * Merge recommended settings into existing settings object (mutates). Fills in
 * missing values only; explicit user values are kept as-is.
 */
export function applyClaudeSettings(
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
  claudeSettings: any,
  options: ClaudeSettingsOptions = {},
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
): any {
  const env: Record<string, unknown> = isRecord(claudeSettings.env)
    ? { ...claudeSettings.env }
    : {};
  for (const [key, value] of Object.entries(RECOMMENDED_ENV)) {
    if (!(key in env)) env[key] = value;
  }
  for (const key of DEPRECATED_ENV_KEYS) {
    delete env[key];
  }
  // Migrate `cleanupPeriodDays` out of env: it is a top-level setting and was
  // a no-op under env. Older installs may still carry it there.
  const legacyCleanup = env.cleanupPeriodDays;
  delete env.cleanupPeriodDays;
  for (const [key, recommended] of Object.entries(RECOMMENDED_ENV_MIN)) {
    if (!isFiniteNumberLike(env[key])) env[key] = String(recommended);
  }
  if (options.telemetry === true) {
    delete env[TELEMETRY_ENV_KEY];
  } else {
    env[TELEMETRY_ENV_KEY] = "1";
  }
  claudeSettings.env = env;

  if (
    !topLevelIsSet("cleanupPeriodDays", claudeSettings.cleanupPeriodDays) &&
    isFiniteNumberLike(legacyCleanup)
  ) {
    claudeSettings.cleanupPeriodDays = Number(legacyCleanup);
  }
  for (const [key, value] of Object.entries(RECOMMENDED_TOP_LEVEL) as Array<
    [keyof typeof RECOMMENDED_TOP_LEVEL, unknown]
  >) {
    if (!topLevelIsSet(key, claudeSettings[key])) claudeSettings[key] = value;
  }

  const attribution = { ...(attributionRecord(claudeSettings) ?? {}) };
  for (const key of ["commit", "pr"] as const) {
    if (options.attribution === false) {
      if (attribution[key] === RECOMMENDED_ATTRIBUTION[key]) {
        delete attribution[key];
      }
    } else if (typeof attribution[key] !== "string") {
      attribution[key] = RECOMMENDED_ATTRIBUTION[key];
    }
  }
  if (Object.keys(attribution).length > 0) {
    claudeSettings.attribution = attribution;
  } else {
    delete claudeSettings.attribution;
  }
  return claudeSettings;
}
