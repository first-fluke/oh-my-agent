/**
 * Best-practice Claude Code settings managed by oh-my-agent.
 * Single source of truth — install, update, and doctor all reference this.
 */

export const RECOMMENDED_ENV = {
  cleanupPeriodDays: 180,
  CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: 100000,
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 80,
  DISABLE_TELEMETRY: "1",
  DISABLE_ERROR_REPORTING: "1",
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  DISABLE_PROMPT_CACHING: "1",
} as const;

export const RECOMMENDED_ATTRIBUTION = {
  commit:
    "Generated with oh-my-agent\n\nCo-Authored-By: First Fluke <our.first.fluke@gmail.com>",
  pr: "Generated with [oh-my-agent](https://github.com/first-fluke/oh-my-agent)",
} as const;

/**
 * Check whether existing settings already match the recommended values.
 */
// biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
export function needsSettingsUpdate(claudeSettings: any): boolean {
  const env = claudeSettings?.env;
  if (!env) return true;

  for (const [key, expected] of Object.entries(RECOMMENDED_ENV)) {
    const actual = env[key];
    if (typeof expected === "number") {
      if ((actual ?? 0) < expected) return true;
    } else {
      if (actual !== expected) return true;
    }
  }

  if (!claudeSettings.attribution?.commit || !claudeSettings.attribution?.pr) {
    return true;
  }

  return false;
}

/**
 * Merge recommended settings into existing settings object (mutates).
 */
// biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
export function applyRecommendedSettings(claudeSettings: any): any {
  claudeSettings.env = {
    ...(claudeSettings.env || {}),
    ...RECOMMENDED_ENV,
  };
  claudeSettings.attribution = { ...RECOMMENDED_ATTRIBUTION };
  return claudeSettings;
}
