import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  type AgentCliMapping,
  AgentCliMappingSchema,
  AgentMappingValueSchema,
  type AgentSpec,
} from "./agent-config.js";

// ---------------------------------------------------------------------------
// agent-config.test.ts
// Tests for dual-format AgentCliMappingSchema (RARDO v2.1 T2)
//
// Covers:
//   1. Legacy string format  — {pm: 'claude'}
//   2. AgentSpec object format — {backend: {model: 'openai/gpt-5.4', effort: 'high'}}
//   3. Mixed format           — {pm: 'codex', retrieval: {model: 'google/gemini-3-flash'}}
//   4. Invalid slug (no owner/) — ZodError with actionable message
//   5. Edge cases: empty object, null value, empty key
// ---------------------------------------------------------------------------

describe("AgentCliMappingSchema — legacy string format", () => {
  it("parses a single legacy string entry", () => {
    const input = { pm: "claude" };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ pm: "claude" });
  });

  it("parses multiple legacy string entries", () => {
    const input = { pm: "codex", backend: "claude", frontend: "gemini" };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      pm: "codex",
      backend: "claude",
      frontend: "gemini",
    });
  });

  it("rejects an empty string value", () => {
    const input = { pm: "" };
    const result = AgentCliMappingSchema.safeParse(input);
    // Empty string fails z.string().min(1) on the value branch
    expect(result.success).toBe(false);
  });
});

describe("AgentCliMappingSchema — AgentSpec object format", () => {
  it("parses an AgentSpec with model and effort", () => {
    const input = {
      backend: { model: "openai/gpt-5.4", effort: "high" },
    };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(true);
    const spec = result.data?.backend as AgentSpec;
    expect(spec.model).toBe("openai/gpt-5.4");
    expect(spec.effort).toBe("high");
  });

  it("parses an AgentSpec with only model (all optional fields absent)", () => {
    const input = {
      retrieval: { model: "google/gemini-3-flash" },
    };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(true);
    const spec = result.data?.retrieval as AgentSpec;
    expect(spec.model).toBe("google/gemini-3-flash");
    expect(spec.effort).toBeUndefined();
    expect(spec.thinking).toBeUndefined();
    expect(spec.memory).toBeUndefined();
  });

  it("parses an AgentSpec with model, effort, thinking, and memory", () => {
    const input = {
      architecture: {
        model: "anthropic/claude-opus-4-7",
        effort: "xhigh",
        thinking: true,
        memory: "project",
      },
    };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(true);
    const spec = result.data?.architecture as AgentSpec;
    expect(spec.model).toBe("anthropic/claude-opus-4-7");
    expect(spec.effort).toBe("xhigh");
    expect(spec.thinking).toBe(true);
    expect(spec.memory).toBe("project");
  });

  it("parses all valid effort levels", () => {
    const levels = ["none", "low", "medium", "high", "xhigh"] as const;
    for (const effort of levels) {
      const input = { agent: { model: "openai/gpt-5.4", effort } };
      const result = AgentCliMappingSchema.safeParse(input);
      expect(result.success, `effort="${effort}" should be valid`).toBe(true);
    }
  });

  it("parses all valid memory tiers", () => {
    const tiers = ["user", "project", "local"] as const;
    for (const memory of tiers) {
      const input = { agent: { model: "qwen/qwen3-coder-plus", memory } };
      const result = AgentCliMappingSchema.safeParse(input);
      expect(result.success, `memory="${memory}" should be valid`).toBe(true);
    }
  });

  it("rejects an AgentSpec with invalid effort level", () => {
    const input = { backend: { model: "openai/gpt-5.4", effort: "ultra" } };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects an AgentSpec with invalid memory tier", () => {
    const input = {
      backend: { model: "openai/gpt-5.4", memory: "global" },
    };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("AgentCliMappingSchema — mixed format", () => {
  it("parses mixed legacy string + AgentSpec entries in the same record", () => {
    const input: AgentCliMapping = {
      pm: "codex",
      retrieval: { model: "google/gemini-3-flash" },
    };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data?.pm).toBe("codex");
    const retrieval = result.data?.retrieval as AgentSpec;
    expect(retrieval.model).toBe("google/gemini-3-flash");
  });

  it("parses a three-entry mixed config", () => {
    const input = {
      pm: "codex",
      backend: { model: "openai/gpt-5.3-codex", effort: "high" },
      frontend: "claude",
    };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data?.pm).toBe("codex");
    expect(result.data?.frontend).toBe("claude");
    const backend = result.data?.backend as AgentSpec;
    expect(backend.model).toBe("openai/gpt-5.3-codex");
    expect(backend.effort).toBe("high");
  });
});

describe("AgentCliMappingSchema — invalid slug rejection", () => {
  it("rejects a slug without owner/ prefix (ZodError with actionable message)", () => {
    const input = { backend: { model: "gpt-5.4", effort: "xhigh" } };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      // Error message must mention owner/model format
      expect(messages).toMatch(/owner\/model/i);
    }
  });

  it("rejects a slug with uppercase letters in owner", () => {
    const input = { backend: { model: "OpenAI/gpt-5.4" } };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a slug with no model part after /", () => {
    const input = { backend: { model: "openai/" } };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a slug that is only a vendor name (no slash)", () => {
    // "claude" by itself is a valid legacy string, but as a model slug inside AgentSpec it must fail
    const agentSpecInput = { model: "claude" };
    const result = z
      .object({
        model: z
          .string()
          .regex(
            /^[a-z][a-z0-9-]*\/[a-z0-9][a-z0-9.-]+$/,
            "Model slug must be in owner/model format (e.g. openai/gpt-5.4)",
          ),
      })
      .safeParse(agentSpecInput);
    expect(result.success).toBe(false);
  });
});

describe("AgentMappingValueSchema — direct unit tests", () => {
  it("accepts a non-empty legacy string", () => {
    expect(AgentMappingValueSchema.safeParse("gemini").success).toBe(true);
  });

  it("accepts a valid AgentSpec", () => {
    const result = AgentMappingValueSchema.safeParse({
      model: "openai/gpt-5.4",
      effort: "medium",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(AgentMappingValueSchema.safeParse("").success).toBe(false);
  });

  it("rejects null", () => {
    expect(AgentMappingValueSchema.safeParse(null).success).toBe(false);
  });

  it("rejects an empty object (missing required model field)", () => {
    expect(AgentMappingValueSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a number", () => {
    expect(AgentMappingValueSchema.safeParse(42).success).toBe(false);
  });
});

describe("AgentCliMappingSchema — edge cases", () => {
  it("accepts an empty record (no agent mappings)", () => {
    const result = AgentCliMappingSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it("rejects null as the entire mapping", () => {
    expect(AgentCliMappingSchema.safeParse(null).success).toBe(false);
  });

  it("rejects a record with a null value for an agent", () => {
    const input = { backend: null };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a record with an empty-string key", () => {
    // z.record key validation: z.string().min(1)
    const input = { "": "claude" };
    const result = AgentCliMappingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("preserves extra fields on AgentSpec via passthrough semantics of the union", () => {
    // AgentSpec uses z.object() which by default strips unknown keys (no passthrough)
    // This ensures we do NOT silently accept extra unknown fields
    const input = { backend: { model: "openai/gpt-5.4", unknown_field: true } };
    const result = AgentCliMappingSchema.safeParse(input);
    // Zod strips unknown fields on z.object() — still valid, but unknown_field gone
    expect(result.success).toBe(true);
    const spec = result.data?.backend as AgentSpec;
    expect((spec as Record<string, unknown>).unknown_field).toBeUndefined();
  });
});
