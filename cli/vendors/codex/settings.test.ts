import { describe, expect, it } from "vitest";
import type { EffortLevel } from "../../platform/model-registry.js";
import {
  applyRecommendedCodexSettings,
  needsCodexSettingsUpdate,
  parseCodexConfig,
  RECOMMENDED_CODEX_MCP,
  serializeCodexConfig,
  setCodexReasoningEffort,
} from "./settings.js";

describe("codex settings", () => {
  it("requires update when mcp_servers is missing", () => {
    expect(needsCodexSettingsUpdate({})).toBe(true);
    expect(needsCodexSettingsUpdate({ features: { codex_hooks: true } })).toBe(
      true,
    );
  });

  it("requires update when serena entry lacks command", () => {
    expect(
      needsCodexSettingsUpdate({ mcp_servers: { serena: { args: [] } } }),
    ).toBe(true);
  });

  it("accepts existing serena stdio config", () => {
    const settings = {
      mcp_servers: {
        serena: {
          command: "uvx",
          args: ["--from", "git+https://github.com/oraios/serena", "serena"],
        },
      },
    };
    expect(needsCodexSettingsUpdate(settings)).toBe(false);
  });

  it("applies recommended mcp_servers without dropping existing tables", () => {
    const settings = {
      features: { codex_hooks: true },
      mcp_servers: {
        other: { command: "npx", args: ["other-mcp"] },
      },
    };

    const result = applyRecommendedCodexSettings(settings);
    expect(result.mcp_servers?.other).toEqual({
      command: "npx",
      args: ["other-mcp"],
    });
    expect(result.mcp_servers?.serena).toEqual(RECOMMENDED_CODEX_MCP.serena);
    expect(result.features).toEqual({ codex_hooks: true });
    expect(needsCodexSettingsUpdate(result)).toBe(false);
  });

  it("preserves existing serena config when transport is present", () => {
    const settings = {
      mcp_servers: {
        serena: {
          command: "uvx",
          args: ["serena"],
        },
      },
    };

    const result = applyRecommendedCodexSettings(settings);
    expect(result.mcp_servers?.serena).toEqual({
      command: "uvx",
      args: ["serena"],
    });
  });

  it("round-trips TOML via parse and serialize", () => {
    const source = `
[features]
codex_hooks = true

[mcp_servers.serena]
command = "uvx"
args = ["--from", "serena", "start"]
`;
    const parsed = parseCodexConfig(source);
    expect(parsed.features).toEqual({ codex_hooks: true });
    expect(parsed.mcp_servers?.serena?.command).toBe("uvx");

    const reSerialized = serializeCodexConfig(parsed);
    const reParsed = parseCodexConfig(reSerialized);
    expect(reParsed).toEqual(parsed);
  });

  it("parseCodexConfig returns empty on malformed TOML", () => {
    expect(parseCodexConfig("this is not toml =")).toEqual({});
    expect(parseCodexConfig("")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// L-2: setCodexReasoningEffort — EffortLevel type safety
// ---------------------------------------------------------------------------

describe("setCodexReasoningEffort", () => {
  it("sets model_reasoning_effort for each valid EffortLevel", () => {
    const levels: EffortLevel[] = ["none", "low", "medium", "high", "xhigh"];
    for (const level of levels) {
      const result = setCodexReasoningEffort({}, level);
      expect(result.model_reasoning_effort).toBe(level);
    }
  });

  it("removes model_reasoning_effort when effort is undefined", () => {
    const settings = { model_reasoning_effort: "high" };
    const result = setCodexReasoningEffort(settings, undefined);
    expect(result.model_reasoning_effort).toBeUndefined();
    expect("model_reasoning_effort" in result).toBe(false);
  });

  it("is idempotent — calling with the same effort returns the same value", () => {
    const effort: EffortLevel = "medium";
    const first = setCodexReasoningEffort({}, effort);
    const second = setCodexReasoningEffort(first, effort);
    expect(second.model_reasoning_effort).toBe("medium");
    expect(first).not.toBe(second); // new object each call
  });

  it("does not mutate the input settings object", () => {
    const original = { model_reasoning_effort: "low", other: "value" };
    const result = setCodexReasoningEffort(original, "high");
    expect(original.model_reasoning_effort).toBe("low");
    expect(result.model_reasoning_effort).toBe("high");
  });
});
