import { describe, expect, it } from "vitest";
import {
  type AgentSpec,
  type OmaConfig,
  parseOmaConfig,
} from "./agent-config.js";

// ---------------------------------------------------------------------------
// agent-config.test.ts
// Tests for OmaConfig schema (model-preset unified config).
//
// Note: parseOmaConfig validates the full schema. The 'agents' override map
// uses z.record(AgentIdEnum, AgentSpec) which requires all 11 keys when
// present as a full record — partial overrides are passed as OmaConfig
// objects directly to resolveAgentPlanFromConfig in runtime-dispatch.test.ts.
// ---------------------------------------------------------------------------

describe("parseOmaConfig — minimal valid config", () => {
  it("parses language + model_preset", () => {
    const yaml = "language: en\nmodel_preset: claude-only\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.language).toBe("en");
    expect(result?.model_preset).toBe("claude-only");
  });

  it("defaults language to 'en' when absent", () => {
    const yaml = "model_preset: gemini-only\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.language).toBe("en");
  });

  it("parses all optional top-level scalar fields", () => {
    const yaml = [
      "language: ko",
      "model_preset: codex-only",
      "date_format: ISO",
      "timezone: Asia/Seoul",
      "auto_update_cli: true",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.date_format).toBe("ISO");
    expect(result?.timezone).toBe("Asia/Seoul");
    expect(result?.auto_update_cli).toBe(true);
  });

  it("accepts all 5 built-in preset keys", () => {
    const presets = [
      "claude-only",
      "codex-only",
      "gemini-only",
      "qwen-only",
      "antigravity",
    ];
    for (const preset of presets) {
      const result = parseOmaConfig(`language: en\nmodel_preset: ${preset}\n`);
      expect(result, `preset=${preset} should parse`).not.toBeNull();
      expect(result?.model_preset).toBe(preset);
    }
  });
});

describe("parseOmaConfig — missing or invalid required fields", () => {
  it("returns null when model_preset is absent", () => {
    expect(parseOmaConfig("language: en\n")).toBeNull();
  });

  it("returns null for empty YAML string", () => {
    expect(parseOmaConfig("")).toBeNull();
    expect(parseOmaConfig("   ")).toBeNull();
  });

  it("returns null for null YAML value (~)", () => {
    expect(parseOmaConfig("~")).toBeNull();
  });

  it("returns null when model_preset is empty string", () => {
    expect(parseOmaConfig("language: en\nmodel_preset: ''\n")).toBeNull();
  });
});

describe("parseOmaConfig — custom_presets passthrough", () => {
  it("passes through custom_presets block", () => {
    const yaml = [
      "language: en",
      "model_preset: my-team",
      "custom_presets:",
      "  my-team:",
      "    extends: claude-only",
      "    description: Team preset",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.custom_presets?.["my-team"]).toBeDefined();
  });
});

describe("parseOmaConfig — models passthrough", () => {
  it("passes through inline models definition", () => {
    const yaml = [
      "language: en",
      "model_preset: claude-only",
      "models:",
      "  custom-fast:",
      "    cli: gemini",
      "    cli_model: gemini-3-flash",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.models?.["custom-fast"]).toBeDefined();
  });
});

describe("OmaConfig TypeScript interface", () => {
  it("satisfies OmaConfig with required fields only", () => {
    const config: OmaConfig = {
      language: "en",
      model_preset: "claude-only",
    };
    expect(config.model_preset).toBe("claude-only");
    expect(config.agents).toBeUndefined();
    expect(config.models).toBeUndefined();
    expect(config.custom_presets).toBeUndefined();
  });

  it("accepts agents override map as partial record (object shape)", () => {
    const config: OmaConfig = {
      language: "en",
      model_preset: "gemini-only",
      agents: {
        backend: { model: "openai/gpt-5.4", effort: "high" },
      },
    };
    expect(config.agents?.backend?.model).toBe("openai/gpt-5.4");
    expect(config.agents?.backend?.effort).toBe("high");
  });

  it("AgentSpec supports all effort levels", () => {
    const levels: AgentSpec["effort"][] = [
      "none",
      "low",
      "medium",
      "high",
      "xhigh",
    ];
    for (const effort of levels) {
      const spec: AgentSpec = { model: "openai/gpt-5.4", effort };
      expect(spec.effort).toBe(effort);
    }
  });

  it("AgentSpec supports all memory tiers", () => {
    const tiers: AgentSpec["memory"][] = ["user", "project", "local"];
    for (const memory of tiers) {
      const spec: AgentSpec = { model: "anthropic/claude-sonnet-4-6", memory };
      expect(spec.memory).toBe(memory);
    }
  });

  it("AgentSpec supports thinking flag", () => {
    const spec: AgentSpec = {
      model: "google/gemini-3-flash",
      thinking: true,
    };
    expect(spec.thinking).toBe(true);
  });
});
