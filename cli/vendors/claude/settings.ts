/**
 * Best-practice Claude Code settings managed by oh-my-agent.
 * Single source of truth — install, update, and doctor all reference this.
 */

export const RECOMMENDED_ENV = {
  cleanupPeriodDays: 180,
  CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: 100000,
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 80,
  DISABLE_ERROR_REPORTING: "1",
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
  CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1",
  ENABLE_PROMPT_CACHING_1H: "1",
} as const;

const DEPRECATED_ENV_KEYS = ["DISABLE_PROMPT_CACHING"] as const;

// `DISABLE_TELEMETRY=1` breaks Claude Code Remote Control eligibility, so it is
// gated on the `telemetry` flag from oma-config.yaml (default off → flag set).
const TELEMETRY_ENV_KEY = "DISABLE_TELEMETRY" as const;

export type ClaudeSettingsOptions = {
  /** When true, omit `DISABLE_TELEMETRY` so Remote Control works. */
  telemetry?: boolean;
};

export const RECOMMENDED_TOP_LEVEL = {
  skipDangerousModePermissionPrompt: true,
  effortLevel: "xhigh",
  skillListingBudgetFraction: 0.02,
} as const;

const EFFORT_LEVEL_RANK: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  xhigh: 3,
};

const RECOMMENDED_EFFORT_LEVEL_RANK =
  EFFORT_LEVEL_RANK[RECOMMENDED_TOP_LEVEL.effortLevel] ?? 0;

function effortLevelMeetsRecommended(actual: unknown): boolean {
  if (typeof actual !== "string") return false;
  const actualRank = EFFORT_LEVEL_RANK[actual];
  if (actualRank === undefined) return false;
  return actualRank >= RECOMMENDED_EFFORT_LEVEL_RANK;
}

export const RECOMMENDED_ATTRIBUTION = {
  commit:
    "Generated with oh-my-agent\n\nCo-Authored-By: First Fluke <our.first.fluke@gmail.com>",
  pr: "Generated with [oh-my-agent](https://github.com/first-fluke/oh-my-agent)",
} as const;

/**
 * Check whether existing settings already match the recommended values.
 */
export function needsClaudeSettingsUpdate(
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
  claudeSettings: any,
  options: ClaudeSettingsOptions = {},
): boolean {
  const env = claudeSettings?.env;
  if (!env) return true;

  for (const key of DEPRECATED_ENV_KEYS) {
    if (key in env) return true;
  }

  if (options.telemetry === true) {
    if (TELEMETRY_ENV_KEY in env) return true;
  } else {
    if (env[TELEMETRY_ENV_KEY] !== "1") return true;
  }

  for (const [key, expected] of Object.entries(RECOMMENDED_ENV)) {
    const actual = env[key];
    if (typeof expected === "number") {
      if ((actual ?? 0) < expected) return true;
    } else {
      if (actual !== expected) return true;
    }
  }

  for (const [key, expected] of Object.entries(RECOMMENDED_TOP_LEVEL)) {
    if (key === "effortLevel") {
      if (!effortLevelMeetsRecommended(claudeSettings[key])) return true;
      continue;
    }
    if (claudeSettings[key] !== expected) return true;
  }

  if (!claudeSettings.attribution?.commit || !claudeSettings.attribution?.pr) {
    return true;
  }

  return false;
}

/**
 * Merge recommended settings into existing settings object (mutates).
 */
export function applyClaudeSettings(
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
  claudeSettings: any,
  options: ClaudeSettingsOptions = {},
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
): any {
  const env = {
    ...(claudeSettings.env || {}),
    ...RECOMMENDED_ENV,
  };
  for (const key of DEPRECATED_ENV_KEYS) {
    delete env[key];
  }
  if (options.telemetry === true) {
    delete env[TELEMETRY_ENV_KEY];
  } else {
    env[TELEMETRY_ENV_KEY] = "1";
  }

  claudeSettings.env = env;
  const preservedEffortLevel = effortLevelMeetsRecommended(
    claudeSettings.effortLevel,
  )
    ? claudeSettings.effortLevel
    : undefined;
  Object.assign(claudeSettings, RECOMMENDED_TOP_LEVEL);
  if (preservedEffortLevel) {
    claudeSettings.effortLevel = preservedEffortLevel;
  }
  claudeSettings.attribution = { ...RECOMMENDED_ATTRIBUTION };
  return claudeSettings;
}
