import { describe, expect, it } from "vitest";
import {
  generateHookShellWrapper,
  HOOK_DEDUP_PREAMBLE,
  withDedup,
} from "./hooks-composer.js";

describe("hook self-dedup preamble (EC-6 / T2.1)", () => {
  it("generated hook script begins with the dedup preamble", () => {
    const wrapper = generateHookShellWrapper(
      'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"',
    );
    // Strip the shebang line; the preamble must immediately follow
    const withoutShebang = wrapper.replace(/^#!.*\n/, "");
    expect(withoutShebang.startsWith(HOOK_DEDUP_PREAMBLE)).toBe(true);
  });

  // biome-ignore lint/suspicious/noTemplateCurlyInString: Bash variables
  it("dedup preamble references /tmp/oma-hook-${UID}-${OMA_SESSION_ID:-default}.lock", () => {
    expect(HOOK_DEDUP_PREAMBLE).toContain(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Bash variables
      '"/tmp/oma-hook-${UID:-${EUID:-0}}-${OMA_SESSION_ID:-default}.lock"',
    );
  });

  it("dedup preamble has the 2-second window", () => {
    expect(HOOK_DEDUP_PREAMBLE).toContain('"$__oma_age" -lt 2');
  });

  it("withDedup prepends preamble before the provided script body", () => {
    const body = 'exec bun .codex/hooks/persistent-mode.ts "$@"';
    const result = withDedup(body);
    expect(result).toMatch(
      new RegExp(
        `^${HOOK_DEDUP_PREAMBLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
    );
    expect(result).toContain(body);
  });

  it("generateHookShellWrapper produces a valid bash script with shebang and delegating exec", () => {
    const cmd = "bun .gemini/hooks/keyword-detector.ts";
    const script = generateHookShellWrapper(cmd);
    expect(script.startsWith("#!/usr/bin/env bash\n")).toBe(true);
    expect(script).toContain(`exec ${cmd} "$@"`);
    expect(script.endsWith("\n")).toBe(true);
  });

  it("stat fallback covers both macOS (-f %m) and Linux (-c %Y) in the preamble", () => {
    expect(HOOK_DEDUP_PREAMBLE).toContain('stat -f %m "$__oma_dedup_lock"');
    expect(HOOK_DEDUP_PREAMBLE).toContain('stat -c %Y "$__oma_dedup_lock"');
  });
});
