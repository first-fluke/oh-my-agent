import { describe, expect, it } from "vitest";
import { applyRecommendedSettings, needsSettingsUpdate } from "./settings.js";

describe("Claude settings", () => {
  it("treats DISABLE_PROMPT_CACHING as deprecated and requiring cleanup", () => {
    expect(
      needsSettingsUpdate({
        env: {
          cleanupPeriodDays: 180,
          CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: 100000,
          CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 80,
          DISABLE_TELEMETRY: "1",
          DISABLE_ERROR_REPORTING: "1",
          CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
          CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
          CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
          CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1",
          ENABLE_PROMPT_CACHING_1H: "1",
          DISABLE_PROMPT_CACHING: "1",
        },
        skipDangerousModePermissionPrompt: true,
        effortLevel: "high",
        attribution: {
          commit: "commit",
          pr: "pr",
        },
      }),
    ).toBe(true);
  });

  it("removes DISABLE_PROMPT_CACHING while preserving recommended settings", () => {
    const settings = applyRecommendedSettings({
      env: {
        DISABLE_PROMPT_CACHING: "1",
        SOME_USER_FLAG: "keep-me",
      },
      attribution: {},
    });

    expect(settings.env.DISABLE_PROMPT_CACHING).toBeUndefined();
    expect(settings.env.SOME_USER_FLAG).toBe("keep-me");
    expect(settings.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY).toBe("1");
    expect(settings.skipDangerousModePermissionPrompt).toBe(true);
    expect(settings.attribution.commit).toContain("Generated with oh-my-agent");
  });
});
