/**
 * Standalone vendor detection shared by the core hook handlers. Each payload
 * kind keeps the precedence its handler used before the per-handler copies
 * were consolidated into vendor-detect.ts.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectVendorFromInput,
  type HookPayloadKind,
} from "../../.agents/hooks/core/vendor-detect.ts";

const CORE = "/p/.agents/hooks/core/handler.ts";
const AGY = { workspacePaths: ["/w"], conversationId: "c" };

afterEach(() => {
  vi.unstubAllEnvs();
});

function detect(
  kind: HookPayloadKind,
  input: Record<string, unknown>,
  env: Record<string, string> = {},
  scriptPath = CORE,
) {
  for (const key of [
    "GROK_WORKSPACE_ROOT",
    "KIRO_PROJECT_DIR",
    "QWEN_PROJECT_DIR",
    "ANTIGRAVITY_PROJECT_DIR",
  ]) {
    vi.stubEnv(key, env[key] ?? "");
  }
  return detectVendorFromInput(input, kind, scriptPath);
}

describe("detectVendorFromInput — prompt payloads", () => {
  it("trusts the installed hook dir before any payload signal", () => {
    expect(
      detect(
        "prompt",
        AGY,
        { GROK_WORKSPACE_ROOT: "/g" },
        "/p/.codex/hooks/x.ts",
      ),
    ).toBe("codex");
  });

  it("detects agy by stdin shape, then grok and kiro env", () => {
    expect(detect("prompt", AGY, { GROK_WORKSPACE_ROOT: "/g" })).toBe(
      "antigravity",
    );
    expect(detect("prompt", {}, { GROK_WORKSPACE_ROOT: "/g" })).toBe("grok");
    expect(detect("prompt", {}, { KIRO_PROJECT_DIR: "/k" })).toBe("kiro");
    expect(detect("prompt", { hookEventName: "userPromptSubmit" })).toBe(
      "kiro",
    );
  });

  it("maps event names, codex session shape, then qwen and claude", () => {
    expect(detect("prompt", { hook_event_name: "PreInvocation" })).toBe(
      "antigravity",
    );
    expect(detect("prompt", { hook_event_name: "beforeSubmitPrompt" })).toBe(
      "cursor",
    );
    expect(
      detect("prompt", {
        hook_event_name: "UserPromptSubmit",
        session_id: "s",
      }),
    ).toBe("codex");
    expect(
      detect("prompt", { hook_event_name: "UserPromptSubmit", sessionId: "s" }),
    ).toBe("claude");
    expect(detect("prompt", {}, { QWEN_PROJECT_DIR: "/q" })).toBe("qwen");
  });
});

describe("detectVendorFromInput — stop payloads", () => {
  it("checks grok and kiro before the agy shape", () => {
    expect(detect("stop", AGY, { GROK_WORKSPACE_ROOT: "/g" })).toBe("grok");
    expect(detect("stop", { ...AGY, hook_event_name: "stop" })).toBe("kiro");
    expect(detect("stop", AGY)).toBe("antigravity");
  });

  it("ignores the install dir and maps Stop events", () => {
    expect(detect("stop", {}, {}, "/p/.codex/hooks/x.ts")).toBe("claude");
    expect(
      detect(
        "stop",
        { hook_event_name: "Stop" },
        { ANTIGRAVITY_PROJECT_DIR: "/a" },
      ),
    ).toBe("antigravity");
    expect(detect("stop", { hook_event_name: "Stop", session_id: "s" })).toBe(
      "codex",
    );
  });
});

describe("detectVendorFromInput — tool payloads", () => {
  it("recognizes the pi bridge dir but no other install dir", () => {
    expect(detect("tool", {}, {}, "/p/.pi/extensions/oma/x.ts")).toBe("pi");
    expect(detect("tool", {}, {}, "/p/.codex/hooks/x.ts")).toBe("claude");
  });

  it("maps env and PreToolUse event names", () => {
    expect(detect("tool", AGY)).toBe("claude");
    expect(detect("tool", {}, { KIRO_PROJECT_DIR: "/k" })).toBe("kiro");
    expect(detect("tool", { hook_event_name: "preToolUse" })).toBe("kiro");
    expect(
      detect(
        "tool",
        { hook_event_name: "PreToolUse" },
        { ANTIGRAVITY_PROJECT_DIR: "/a" },
      ),
    ).toBe("antigravity");
    expect(
      detect("tool", { hook_event_name: "PreToolUse", session_id: "s" }),
    ).toBe("codex");
  });
});
