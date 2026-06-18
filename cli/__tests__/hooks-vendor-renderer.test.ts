import { describe, expect, it } from "vitest";
import { makePromptOutput } from "../../.agents/hooks/core/hook-output.ts";
import { renderStateSnapshot } from "../../.agents/hooks/core/vendor-renderer.ts";

describe("hook vendor renderer", () => {
  it("renders a Claude state snapshot with empty memory facts", () => {
    const rendered = renderStateSnapshot({
      vendor: "claude",
      sid: "oma-test",
      reason: "vendor/session boundary",
      recentEvents: [
        {
          eventId: "evt-1",
          ts: "2026-05-27T00:00:00.000Z",
          sid: "oma-test",
          kind: "boundary",
          writerPid: 1,
        },
      ],
      facts: [],
    });

    expect(rendered).toContain("[OMA STATE SNAPSHOT]");
    expect(rendered).toContain("sid: oma-test");
    expect(rendered).toContain(
      "recent events:\n- 2026-05-27T00:00:00.000Z boundary",
    );
    expect(rendered).toContain("memory facts:\n- none");
  });

  it.each([
    ["codex", "UserPromptSubmit"],
    ["qwen", "UserPromptSubmit"],
  ] as const)("wraps a %s state snapshot in the vendor prompt output contract", (vendor, hookEventName) => {
    const sid = `oma-${vendor}-test`;
    const rendered = renderStateSnapshot({
      vendor,
      sid,
      reason: "vendor/session boundary",
      recentEvents: [
        {
          eventId: "evt-1",
          ts: "2026-05-27T00:00:00.000Z",
          sid,
          kind: "boundary",
          writerPid: 1,
        },
      ],
      facts: [],
    });
    const parsed = JSON.parse(makePromptOutput(vendor, rendered)) as {
      hookSpecificOutput?: {
        hookEventName?: string;
        additionalContext?: string;
      };
    };

    expect(parsed.hookSpecificOutput?.hookEventName).toBe(hookEventName);
    expect(parsed.hookSpecificOutput?.additionalContext).toContain(
      "[OMA STATE SNAPSHOT]",
    );
    expect(parsed.hookSpecificOutput?.additionalContext).toContain(
      `sid: ${sid}`,
    );
  });

  it("renders Codex prompt output only through hookSpecificOutput", () => {
    const rendered = renderStateSnapshot({
      vendor: "codex",
      sid: "oma-codex-test",
      reason: "vendor/session boundary",
      recentEvents: [],
      facts: [],
    });
    const parsed = JSON.parse(makePromptOutput("codex", rendered)) as {
      additionalContext?: string;
      additional_context?: string;
      hookSpecificOutput?: {
        hookEventName?: string;
        additionalContext?: string;
      };
    };

    expect(parsed.additionalContext).toBeUndefined();
    expect(parsed.additional_context).toBeUndefined();
    expect(parsed.hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
    expect(parsed.hookSpecificOutput?.additionalContext).toContain(
      "[OMA STATE SNAPSHOT]",
    );
  });

  it("wraps a Cursor state snapshot in both Cursor prompt context fields", () => {
    const rendered = renderStateSnapshot({
      vendor: "cursor",
      sid: "oma-cursor-test",
      reason: "vendor/session boundary",
      recentEvents: [
        {
          eventId: "evt-1",
          ts: "2026-05-27T00:00:00.000Z",
          sid: "oma-cursor-test",
          kind: "boundary",
          writerPid: 1,
        },
      ],
      facts: [],
    });
    const parsed = JSON.parse(makePromptOutput("cursor", rendered)) as {
      additionalContext?: string;
      additional_context?: string;
      hookSpecificOutput?: {
        hookEventName?: string;
        additionalContext?: string;
      };
    };

    expect(parsed.additionalContext).toContain("[OMA STATE SNAPSHOT]");
    expect(parsed.additional_context).toBe(parsed.additionalContext);
    expect(parsed.hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
    expect(parsed.hookSpecificOutput?.additionalContext).toBe(
      parsed.additionalContext,
    );
  });
});
