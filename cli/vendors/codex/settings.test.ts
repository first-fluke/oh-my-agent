import { describe, expect, it } from "vitest";
import type { EffortLevel } from "../../platform/model-registry.js";
import {
  applyCodexSettings,
  needsCodexSettingsUpdate,
  parseCodexConfig,
  RECOMMENDED_CODEX_FEATURES,
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

  it("requires update when recommended features are missing or disabled", () => {
    const baseMcp = {
      mcp_servers: {
        serena: {
          command: "uvx",
          args: ["serena"],
        },
      },
    };
    expect(needsCodexSettingsUpdate(baseMcp)).toBe(true);
    expect(
      needsCodexSettingsUpdate({
        ...baseMcp,
        features: { goals: true },
      }),
    ).toBe(true);
    expect(
      needsCodexSettingsUpdate({
        ...baseMcp,
        features: { goals: false, child_agents_md: true },
      }),
    ).toBe(true);
  });

  it("accepts existing serena stdio config with recommended features enabled", () => {
    const settings = {
      mcp_servers: {
        serena: {
          command: "uvx",
          args: ["--from", "git+https://github.com/oraios/serena", "serena"],
        },
      },
      features: { ...RECOMMENDED_CODEX_FEATURES },
      analytics: { enabled: false },
      feedback: { enabled: false },
    };
    expect(needsCodexSettingsUpdate(settings)).toBe(false);
  });

  it("requires update when analytics or feedback opt-outs are missing (default telemetry off)", () => {
    const base = {
      mcp_servers: {
        serena: { command: "uvx", args: ["serena"] },
      },
      features: { ...RECOMMENDED_CODEX_FEATURES },
    };
    expect(needsCodexSettingsUpdate(base)).toBe(true);
    expect(
      needsCodexSettingsUpdate({
        ...base,
        analytics: { enabled: false },
      }),
    ).toBe(true);
  });

  it("accepts settings without analytics/feedback when telemetry is opted in", () => {
    const settings = {
      mcp_servers: {
        serena: { command: "uvx", args: ["serena"] },
      },
      features: { ...RECOMMENDED_CODEX_FEATURES },
    };
    expect(needsCodexSettingsUpdate(settings, { telemetry: true })).toBe(false);
  });

  it("flags stale settings when telemetry is opted in but analytics opt-out still present", () => {
    const settings = {
      mcp_servers: {
        serena: { command: "uvx", args: ["serena"] },
      },
      features: { ...RECOMMENDED_CODEX_FEATURES },
      analytics: { enabled: false },
    };
    expect(needsCodexSettingsUpdate(settings, { telemetry: true })).toBe(true);
  });

  it("applies analytics.enabled=false and feedback.enabled=false by default", () => {
    const result = applyCodexSettings({});
    expect(result.analytics).toEqual({ enabled: false });
    expect(result.feedback).toEqual({ enabled: false });
  });

  it("strips analytics/feedback opt-out tables when telemetry is opted in", () => {
    const result = applyCodexSettings(
      {
        analytics: { enabled: false },
        feedback: { enabled: false },
      },
      { telemetry: true },
    );
    expect(result.analytics).toBeUndefined();
    expect(result.feedback).toBeUndefined();
  });

  it("applies recommended mcp_servers and features without dropping existing tables", () => {
    const settings = {
      features: { custom_flag: true },
      mcp_servers: {
        other: { command: "npx", args: ["other-mcp"] },
      },
    };

    const result = applyCodexSettings(settings);
    expect(result.mcp_servers?.other).toEqual({
      command: "npx",
      args: ["other-mcp"],
    });
    expect(result.mcp_servers?.serena).toEqual(RECOMMENDED_CODEX_MCP.serena);
    expect(result.features).toEqual({
      custom_flag: true,
      ...RECOMMENDED_CODEX_FEATURES,
    });
    expect(needsCodexSettingsUpdate(result)).toBe(false);
  });

  it("strips deprecated codex_hooks key during apply", () => {
    const settings = {
      features: { codex_hooks: true, custom_flag: true },
      mcp_servers: {
        serena: { command: "uvx", args: ["serena"] },
      },
    };

    const result = applyCodexSettings(settings);
    expect(result.features).toEqual({
      custom_flag: true,
      ...RECOMMENDED_CODEX_FEATURES,
    });
    expect(result.features?.codex_hooks).toBeUndefined();
    expect(needsCodexSettingsUpdate(result)).toBe(false);
  });

  it("requires update when deprecated codex_hooks key is present", () => {
    const settings = {
      mcp_servers: {
        serena: {
          command: "uvx",
          args: ["--from", "git+https://github.com/oraios/serena", "serena"],
        },
      },
      features: { ...RECOMMENDED_CODEX_FEATURES, codex_hooks: true },
    };
    expect(needsCodexSettingsUpdate(settings)).toBe(true);
  });

  it("force-enables recommended features even when user disabled them", () => {
    const settings = {
      mcp_servers: {
        serena: { command: "uvx", args: ["serena"] },
      },
      features: { goals: false, child_agents_md: false, custom_flag: true },
    };

    const result = applyCodexSettings(settings);
    expect(result.features).toEqual({
      goals: true,
      child_agents_md: true,
      custom_flag: true,
    });
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

    const result = applyCodexSettings(settings);
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
