import { describe, expect, it } from "vitest";
import { ConfigError } from "./config-error.js";
import { toPiModel, toPiThinking } from "./pi-model-map.js";
import type { AgentPlan } from "./types.js";

describe("toPiModel", () => {
  it("passes real-provider slugs through unchanged (pi fuzzy-matches)", () => {
    expect(toPiModel("anthropic/claude-sonnet-4-6")).toBe(
      "anthropic/claude-sonnet-4-6",
    );
    expect(toPiModel("openai/gpt-5.5")).toBe("openai/gpt-5.5");
    expect(toPiModel("google/gemini-3.1-pro-preview")).toBe(
      "google/gemini-3.1-pro-preview",
    );
  });

  it("passes a bare id (no owner) through for fuzzy matching", () => {
    expect(toPiModel("claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
  });

  it("throws for CLI-proprietary owners pi cannot run", () => {
    expect(() => toPiModel("cursor/composer-2.5")).toThrow(ConfigError);
    expect(() => toPiModel("kiro/claude-sonnet-4-5")).toThrow(ConfigError);
    expect(() => toPiModel("qwen/qwen3.6-plus")).toThrow(ConfigError);
    expect(() => toPiModel("antigravity/gemini-3.1-pro")).toThrow(ConfigError);
  });
});

describe("toPiThinking", () => {
  function plan(partial: Partial<AgentPlan>): AgentPlan {
    return {
      cli: "pi",
      cliModel: "anthropic/claude-sonnet-4-6",
      // biome-ignore lint/suspicious/noExplicitAny: spec is irrelevant to thinking resolution
      spec: {} as any,
      ...partial,
    };
  }

  it("maps effort levels (none → off, rest identity)", () => {
    expect(toPiThinking(plan({ effort: "none" }))).toBe("off");
    expect(toPiThinking(plan({ effort: "low" }))).toBe("low");
    expect(toPiThinking(plan({ effort: "medium" }))).toBe("medium");
    expect(toPiThinking(plan({ effort: "high" }))).toBe("high");
    expect(toPiThinking(plan({ effort: "xhigh" }))).toBe("xhigh");
  });

  it("returns null when no thinking signal is present", () => {
    expect(toPiThinking(plan({}))).toBeNull();
  });

  it("honors explicit thinking boolean over effort", () => {
    expect(toPiThinking(plan({ thinking: false, effort: "high" }))).toBe("off");
    expect(toPiThinking(plan({ thinking: true }))).toBe("high");
  });
});
