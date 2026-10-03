import { describe, expect, it } from "vitest";
import { applyClaudeSettings, needsClaudeSettingsUpdate } from "./settings.js";

describe("Claude settings", () => {
  it("treats DISABLE_PROMPT_CACHING as deprecated and requiring cleanup", () => {
    expect(
      needsClaudeSettingsUpdate({
        cleanupPeriodDays: 180,
        env: {
          CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100000",
          CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
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

  it("flags cleanupPeriodDays nested under env (no top-level) as needing update", () => {
    // Regression: cleanupPeriodDays is a top-level setting; under env it is a
    // no-op and must be migrated.
    expect(
      needsClaudeSettingsUpdate({
        env: {
          cleanupPeriodDays: 180,
          CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100000",
          CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
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
        cleanupPeriodDays: 180,
        env: {
          CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100000",
          CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
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

  it("preserves a user's higher cleanupPeriodDays and env tunables", () => {
    expect(
      needsClaudeSettingsUpdate({
        cleanupPeriodDays: 365,
        env: {
          CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "200000",
          CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "90",
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

    const settings = applyClaudeSettings({
      cleanupPeriodDays: 365,
      env: { CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "200000" },
      attribution: {},
    });
    expect(settings.cleanupPeriodDays).toBe(365);
    expect(settings.env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS).toBe("200000");
    expect(settings.env.cleanupPeriodDays).toBeUndefined();
  });

  it("keeps an explicit effortLevel, including levels oma does not rank (max)", () => {
    for (const level of ["max", "medium", "low"]) {
      const settings = applyClaudeSettings({
        env: {},
        attribution: {},
        effortLevel: level,
      });
      expect(settings.effortLevel).toBe(level);
    }
  });

  it("fills effortLevel only when it is missing", () => {
    expect(applyClaudeSettings({ env: {} }).effortLevel).toBe("high");
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

  it("migrates a nested env.cleanupPeriodDays to the top level", () => {
    const settings = applyClaudeSettings({
      env: { cleanupPeriodDays: 180 },
      attribution: {},
    });
    expect(settings.env.cleanupPeriodDays).toBeUndefined();
    expect(settings.cleanupPeriodDays).toBe(180);
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
          cleanupPeriodDays: 180,
          env: {
            CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100000",
            CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
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
          cleanupPeriodDays: 180,
          env: {
            CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100000",
            CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
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
        CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100000",
        CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
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
      cleanupPeriodDays: 180,
      skipDangerousModePermissionPrompt: true,
      effortLevel: "high",
      skillListingBudgetFraction: 0.02,
    } as const;

    expect(result).toEqual(expected);
  });

  it("needsClaudeSettingsUpdate returns false for the recommended-state fixture (needsClaudeSettingsUpdate)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const upToDate = {
      cleanupPeriodDays: 180,
      env: {
        CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100000",
        CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
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

describe("Claude settings never flip explicit user values", () => {
  const fullyRecommended = () =>
    applyClaudeSettings({ env: {} }, {}) as Record<string, unknown>;

  it("keeps skipDangerousModePermissionPrompt: false and reports no update", () => {
    const user = {
      ...fullyRecommended(),
      skipDangerousModePermissionPrompt: false,
    };
    expect(needsClaudeSettingsUpdate(user)).toBe(false);
    const out = applyClaudeSettings(structuredClone(user));
    expect(out.skipDangerousModePermissionPrompt).toBe(false);
  });

  it("keeps an explicitly blanked attribution", () => {
    const user = { ...fullyRecommended(), attribution: { commit: "", pr: "" } };
    expect(needsClaudeSettingsUpdate(user)).toBe(false);
    const out = applyClaudeSettings(structuredClone(user));
    expect(out.attribution).toEqual({ commit: "", pr: "" });
  });

  it("keeps a custom attribution", () => {
    const user = {
      ...fullyRecommended(),
      attribution: { commit: "Co-Authored-By: Me <me@example.com>", pr: "" },
    };
    expect(needsClaudeSettingsUpdate(user)).toBe(false);
    expect(applyClaudeSettings(structuredClone(user)).attribution).toEqual(
      user.attribution,
    );
  });

  it("does not add attribution when scm.co_author is disabled", () => {
    const out = applyClaudeSettings({ env: {} }, { attribution: false });
    expect(out.attribution).toBeUndefined();
    expect(needsClaudeSettingsUpdate(out, { attribution: false })).toBe(false);
  });

  it("removes only oma's own attribution when scm.co_author is disabled", () => {
    const own = applyClaudeSettings({ env: {} });
    expect(needsClaudeSettingsUpdate(own, { attribution: false })).toBe(true);
    expect(
      applyClaudeSettings(structuredClone(own), { attribution: false })
        .attribution,
    ).toBeUndefined();

    const mixed = {
      ...own,
      attribution: { ...own.attribution, pr: "my own PR footer" },
    };
    expect(
      applyClaudeSettings(structuredClone(mixed), { attribution: false })
        .attribution,
    ).toEqual({ pr: "my own PR footer" });
  });

  it("keeps explicit env flags and lower numeric tunables", () => {
    const user = {
      ...fullyRecommended(),
      env: {
        ...(fullyRecommended().env as Record<string, string>),
        CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "0",
        CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "50",
      },
      cleanupPeriodDays: 30,
    };
    expect(needsClaudeSettingsUpdate(user)).toBe(false);
    const out = applyClaudeSettings(structuredClone(user));
    expect(out.env.CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING).toBe("0");
    expect(out.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE).toBe("50");
    expect(out.cleanupPeriodDays).toBe(30);
  });

  it("repairs non-numeric tunables", () => {
    const out = applyClaudeSettings({
      env: { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "lots" },
    });
    expect(out.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE).toBe("80");
  });

  it("apply then check never asks for another write", () => {
    const inputs: Array<[Record<string, unknown>, object]> = [
      [{}, {}],
      [{ env: { DISABLE_PROMPT_CACHING: "1" } }, {}],
      [{ env: { cleanupPeriodDays: 400 } }, {}],
      [{ env: {}, effortLevel: "max", attribution: { commit: "" } }, {}],
      [{ env: { DISABLE_TELEMETRY: "1" } }, { telemetry: true }],
      [{ env: {} }, { attribution: false }],
    ];
    for (const [input, options] of inputs) {
      const out = applyClaudeSettings(structuredClone(input), options);
      expect(needsClaudeSettingsUpdate(out, options)).toBe(false);
    }
  });

  it("migrates a legacy env.cleanupPeriodDays without lowering it", () => {
    const out = applyClaudeSettings({ env: { cleanupPeriodDays: 400 } });
    expect(out.cleanupPeriodDays).toBe(400);
    expect(out.env.cleanupPeriodDays).toBeUndefined();
  });
});
