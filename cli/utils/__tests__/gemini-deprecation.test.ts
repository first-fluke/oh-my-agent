import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetGeminiDeprecationWarningsForTests,
  formatGeminiDeprecationWarning,
  GEMINI_DEPRECATION_DATE,
  GEMINI_MIGRATION_URL,
  usesGeminiCli,
  warnGeminiDeprecationOnce,
} from "../gemini-deprecation.js";

describe("usesGeminiCli", () => {
  it("returns true for model_preset: gemini", () => {
    expect(usesGeminiCli({ language: "en", model_preset: "gemini" })).toBe(
      true,
    );
  });

  it("returns true for legacy alias gemini-only", () => {
    expect(usesGeminiCli({ language: "en", model_preset: "gemini-only" })).toBe(
      true,
    );
  });

  it("returns true for mixed preset (retrieval routes through gemini)", () => {
    expect(usesGeminiCli({ language: "en", model_preset: "mixed" })).toBe(true);
  });

  it("returns false for antigravity preset (uses agy CLI, not gemini)", () => {
    expect(usesGeminiCli({ language: "en", model_preset: "antigravity" })).toBe(
      false,
    );
  });

  it("returns false for claude-only preset", () => {
    expect(usesGeminiCli({ language: "en", model_preset: "claude" })).toBe(
      false,
    );
  });

  it("returns true when an agents override targets google/*", () => {
    expect(
      usesGeminiCli({
        language: "en",
        model_preset: "claude",
        agents: { retrieval: { model: "google/gemini-3-flash" } },
      }),
    ).toBe(true);
  });

  it("returns true when a custom preset's agent_defaults targets google/*", () => {
    expect(
      usesGeminiCli({
        language: "en",
        model_preset: "my-mix",
        custom_presets: {
          "my-mix": {
            description: "test",
            agent_defaults: {
              orchestrator: { model: "anthropic/claude-sonnet-4-6" },
              retrieval: { model: "google/gemini-3-flash" },
            },
          },
        },
      }),
    ).toBe(true);
  });

  it("returns false when no preset and no agents map", () => {
    expect(usesGeminiCli({ language: "en" } as never)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(usesGeminiCli(null)).toBe(false);
    expect(usesGeminiCli(undefined)).toBe(false);
  });
});

describe("warnGeminiDeprecationOnce", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetGeminiDeprecationWarningsForTests();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("emits the deprecation date and migration URL", () => {
    warnGeminiDeprecationOnce("test-a");
    const messages = warnSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join("\n");
    expect(messages).toContain(GEMINI_DEPRECATION_DATE);
    expect(messages).toContain(GEMINI_MIGRATION_URL);
    expect(messages).toContain("[gemini-deprecation]");
  });

  it("does not repeat the warning within the same context", () => {
    warnGeminiDeprecationOnce("test-b");
    const firstCallCount = warnSpy.mock.calls.length;
    warnGeminiDeprecationOnce("test-b");
    expect(warnSpy.mock.calls.length).toBe(firstCallCount);
  });

  it("warns once per distinct context key", () => {
    warnGeminiDeprecationOnce("ctx-1");
    const firstCallCount = warnSpy.mock.calls.length;
    warnGeminiDeprecationOnce("ctx-2");
    expect(warnSpy.mock.calls.length).toBeGreaterThan(firstCallCount);
  });
});

describe("formatGeminiDeprecationWarning", () => {
  it("includes the date, migration url, and a config hint", () => {
    const msg = formatGeminiDeprecationWarning();
    expect(msg).toContain(GEMINI_DEPRECATION_DATE);
    expect(msg).toContain(GEMINI_MIGRATION_URL);
    expect(msg).toContain(".agents/oma-config.yaml");
    expect(msg).toContain("antigravity");
  });
});
