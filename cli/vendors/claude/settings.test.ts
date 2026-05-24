import { describe, expect, it } from "vitest";
import { applyClaudeSettings, needsClaudeSettingsUpdate } from "./settings.js";

describe("Claude settings", () => {
  it("treats DISABLE_PROMPT_CACHING as deprecated and requiring cleanup", () => {
    expect(
      needsClaudeSettingsUpdate({
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
        effortLevel: "xhigh",
        skillListingBudgetFraction: 0.02,
        attribution: {
          commit: "commit",
          pr: "pr",
        },
      }),
    ).toBe(true);
  });

  it("preserves effortLevel xhigh as recommended", () => {
    const settings = applyClaudeSettings({
      env: {},
      attribution: {},
      effortLevel: "xhigh",
    });
    expect(settings.effortLevel).toBe("xhigh");
  });

  it("does not flag xhigh effortLevel as needing update", () => {
    expect(
      needsClaudeSettingsUpdate({
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
        },
        skipDangerousModePermissionPrompt: true,
        effortLevel: "xhigh",
        skillListingBudgetFraction: 0.02,
        attribution: { commit: "c", pr: "p" },
      }),
    ).toBe(false);
  });

  it("downgrades invalid effortLevel values to the recommended level", () => {
    const settings = applyClaudeSettings({
      env: {},
      attribution: {},
      effortLevel: "max",
    });
    expect(settings.effortLevel).toBe("xhigh");
  });

  it("upgrades below-recommended effortLevel to the recommended level", () => {
    const settings = applyClaudeSettings({
      env: {},
      attribution: {},
      effortLevel: "medium",
    });
    expect(settings.effortLevel).toBe("xhigh");
  });

  it("removes DISABLE_PROMPT_CACHING while preserving recommended settings", () => {
    const settings = applyClaudeSettings({
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

  it("sets DISABLE_TELEMETRY by default to preserve current behavior", () => {
    const settings = applyClaudeSettings({ env: {}, attribution: {} });
    expect(settings.env.DISABLE_TELEMETRY).toBe("1");
  });

  it("omits DISABLE_TELEMETRY when telemetry is opted in", () => {
    const settings = applyClaudeSettings(
      { env: {}, attribution: {} },
      { telemetry: true },
    );
    expect(settings.env.DISABLE_TELEMETRY).toBeUndefined();
  });

  it("strips an existing DISABLE_TELEMETRY when telemetry is opted in", () => {
    const settings = applyClaudeSettings(
      { env: { DISABLE_TELEMETRY: "1" }, attribution: {} },
      { telemetry: true },
    );
    expect(settings.env.DISABLE_TELEMETRY).toBeUndefined();
  });

  it("flags settings as stale when telemetry is opted in but DISABLE_TELEMETRY is still set", () => {
    expect(
      needsClaudeSettingsUpdate(
        {
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
          },
          skipDangerousModePermissionPrompt: true,
          effortLevel: "xhigh",
          skillListingBudgetFraction: 0.02,
          attribution: { commit: "c", pr: "p" },
        },
        { telemetry: true },
      ),
    ).toBe(true);
  });

  it("accepts settings without DISABLE_TELEMETRY when telemetry is opted in", () => {
    expect(
      needsClaudeSettingsUpdate(
        {
          env: {
            cleanupPeriodDays: 180,
            CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: 100000,
            CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 80,
            DISABLE_ERROR_REPORTING: "1",
            CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
            CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
            CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
            CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1",
            ENABLE_PROMPT_CACHING_1H: "1",
          },
          skipDangerousModePermissionPrompt: true,
          effortLevel: "xhigh",
          skillListingBudgetFraction: 0.02,
          attribution: { commit: "c", pr: "p" },
        },
        { telemetry: true },
      ),
    ).toBe(false);
  });
});

describe("T2.9 rename regression — applyClaudeSettings", () => {
  it("produces byte-identical output for a minimal up-to-date fixture (applyClaudeSettings)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const input = {
      env: {
        SOME_USER_KEY: "keep",
      },
      attribution: {},
    } as const;

    const result = applyClaudeSettings(
      // applyClaudeSettings mutates its argument; spread to isolate
      { ...input, env: { ...input.env } },
    );

    const expected = {
      env: {
        SOME_USER_KEY: "keep",
        cleanupPeriodDays: 180,
        CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: 100000,
        CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 80,
        DISABLE_ERROR_REPORTING: "1",
        CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
        CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
        CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
        CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1",
        ENABLE_PROMPT_CACHING_1H: "1",
        DISABLE_TELEMETRY: "1",
      },
      attribution: {
        commit:
          "Generated with oh-my-agent\n\nCo-Authored-By: First Fluke <our.first.fluke@gmail.com>",
        pr: "Generated with [oh-my-agent](https://github.com/first-fluke/oh-my-agent)",
      },
      skipDangerousModePermissionPrompt: true,
      effortLevel: "xhigh",
      skillListingBudgetFraction: 0.02,
    } as const;

    expect(result).toEqual(expected);
  });

  it("needsClaudeSettingsUpdate returns false for the recommended-state fixture (needsClaudeSettingsUpdate)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const upToDate = {
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
      },
      skipDangerousModePermissionPrompt: true,
      effortLevel: "xhigh",
      skillListingBudgetFraction: 0.02,
      attribution: {
        commit:
          "Generated with oh-my-agent\n\nCo-Authored-By: First Fluke <our.first.fluke@gmail.com>",
        pr: "Generated with [oh-my-agent](https://github.com/first-fluke/oh-my-agent)",
      },
    } as const;

    expect(needsClaudeSettingsUpdate(upToDate)).toBe(false);
  });
});
