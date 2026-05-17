import { describe, expect, it } from "vitest";
import {
  type AgentSpec,
  type OmaConfig,
  type OmaDocsConfig,
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
    const yaml = "language: en\nmodel_preset: claude\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.language).toBe("en");
    expect(result?.model_preset).toBe("claude");
  });

  it("defaults language to 'en' when absent", () => {
    const yaml = "model_preset: gemini\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.language).toBe("en");
  });

  it("parses all optional top-level scalar fields", () => {
    const yaml = [
      "language: ko",
      "model_preset: codex",
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

  it("accepts all 6 built-in preset keys", () => {
    const presets = ["claude", "codex", "gemini", "qwen", "cursor", "mixed"];
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
      "    extends: claude",
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
      "model_preset: claude",
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
      model_preset: "claude",
    };
    expect(config.model_preset).toBe("claude");
    expect(config.agents).toBeUndefined();
    expect(config.models).toBeUndefined();
    expect(config.custom_presets).toBeUndefined();
  });

  it("accepts agents override map as partial record (object shape)", () => {
    const config: OmaConfig = {
      language: "en",
      model_preset: "gemini",
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

describe("parseOmaConfig — docs.auto_verify field", () => {
  it("parses docs.auto_verify: true", () => {
    const yaml = [
      "language: en",
      "model_preset: claude",
      "docs:",
      "  auto_verify: true",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs?.auto_verify).toBe(true);
  });

  it("parses docs.auto_verify: false", () => {
    const yaml = [
      "language: en",
      "model_preset: claude",
      "docs:",
      "  auto_verify: false",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs?.auto_verify).toBe(false);
  });

  it("docs field is optional — defaults to undefined when absent", () => {
    const yaml = "language: en\nmodel_preset: claude\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs).toBeUndefined();
  });

  it("auto_verify is effectively false when docs field is absent", () => {
    const yaml = "language: en\nmodel_preset: claude\n";
    const result = parseOmaConfig(yaml);
    expect(result?.docs?.auto_verify ?? false).toBe(false);
  });

  it("docs field is optional — docs present without auto_verify", () => {
    const yaml = ["language: en", "model_preset: claude", "docs: {}"].join(
      "\n",
    );
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs?.auto_verify).toBeUndefined();
  });

  it("OmaDocsConfig TypeScript interface accepts auto_verify boolean", () => {
    const docsConfig: OmaDocsConfig = { auto_verify: true };
    expect(docsConfig.auto_verify).toBe(true);
  });
});
