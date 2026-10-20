import { describe, expect, it } from "vitest";
import { withDiagnosticFeedbackHookEvents } from "./diagnostic-feedback.js";
import type { HookVariant } from "./variant-types.js";

function variant(vendor: string): HookVariant {
  return {
    vendor,
    hookDir: ".test/hooks",
    settingsFile: ".test/settings.json",
    projectDirEnv: null,
    runtime: "bun",
    events: {
      PreToolUse: [{ hook: "scm-guard.ts", matcher: "Bash", timeout: 3 }],
      PostToolUse: [{ hook: "refactor-guard.ts", matcher: "Edit", timeout: 5 }],
    },
  };
}

describe("diagnostic hook routing", () => {
  it("adds pre and post edit matchers without changing the source variant", () => {
    const original = variant("codex");
    const result = withDiagnosticFeedbackHookEvents(original);
    expect(original.events.PreToolUse).toHaveLength(1);
    expect(result.events.PreToolUse).toContainEqual({
      hook: "diagnostic-feedback.ts",
      matcher: "apply_patch|Edit|Write",
      timeout: 11,
    });
    expect(result.events.PostToolUse).toContainEqual({
      hook: "diagnostic-feedback.ts",
      matcher: "apply_patch|Edit|Write",
      timeout: 11,
    });
    expect(withDiagnosticFeedbackHookEvents(result)).toEqual(result);
  });

  it("uses Kiro's native event names and skips editor hosts", () => {
    const result = withDiagnosticFeedbackHookEvents(variant("kiro"));
    expect(result.events.preToolUse).toEqual([
      { hook: "diagnostic-feedback.ts", matcher: "fs_write", timeout: 11 },
    ]);
    for (const vendor of ["cursor", "antigravity", "pi"]) {
      const original = variant(vendor);
      expect(withDiagnosticFeedbackHookEvents(original)).toBe(original);
    }
  });
});
