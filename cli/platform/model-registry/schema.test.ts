// cli/platform/model-registry/schema.test.ts
// Tests for ModelSpecSchema — T2: opencode cli acceptance + regression for
// all existing RAW_REGISTRY entries.

import { describe, expect, it } from "vitest";
import { RAW_REGISTRY } from "./raw-registry.js";
import { ModelSpecSchema } from "./schema.js";

const BASE_SUPPORTS = {
  effort: null,
  apply_patch: false,
  task_budget: false,
  prompt_cache: false,
  computer_use: false,
  native_dispatch_from: [],
  api_only: false,
} as const;

describe("ModelSpecSchema — cli field", () => {
  it('accepts cli:"opencode" (T2 acceptance)', () => {
    const result = ModelSpecSchema.safeParse({
      cli: "opencode",
      cli_model: "deepseek-v4-flash",
      supports: BASE_SUPPORTS,
      auth_hint: "opencode subscription",
    });
    expect(result.success).toBe(true);
  });

  it('rejects cli:"unknown-vendor"', () => {
    const result = ModelSpecSchema.safeParse({
      cli: "unknown-vendor",
      cli_model: "some-model",
      supports: BASE_SUPPORTS,
      auth_hint: "some hint",
    });
    expect(result.success).toBe(false);
  });

  it('rejects cli:"" (empty string)', () => {
    const result = ModelSpecSchema.safeParse({
      cli: "",
      cli_model: "some-model",
      supports: BASE_SUPPORTS,
      auth_hint: "some hint",
    });
    expect(result.success).toBe(false);
  });

  it('rejects cli:"pi" (pi is a plan-target only, not a registry cli)', () => {
    const result = ModelSpecSchema.safeParse({
      cli: "pi",
      cli_model: "some-model",
      supports: BASE_SUPPORTS,
      auth_hint: "some hint",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all canonical vendor values", () => {
    const vendors = [
      "claude",
      "codex",
      "gemini",
      "cursor",
      "antigravity",
      "qwen",
      "kiro",
      "opencode",
    ] as const;
    for (const vendor of vendors) {
      const result = ModelSpecSchema.safeParse({
        cli: vendor,
        cli_model: "test-model",
        supports: BASE_SUPPORTS,
        auth_hint: "test hint",
      });
      expect(result.success, `cli:"${vendor}" should be accepted`).toBe(true);
    }
  });
});

describe("ModelSpecSchema — RAW_REGISTRY regression", () => {
  it("all RAW_REGISTRY entries parse without error", () => {
    for (const [slug, spec] of RAW_REGISTRY) {
      const result = ModelSpecSchema.safeParse(spec);
      expect(
        result.success,
        `RAW_REGISTRY["${slug}"] should parse: ${
          result.success
            ? ""
            : JSON.stringify((result as { error: unknown }).error)
        }`,
      ).toBe(true);
    }
  });

  it("no RAW_REGISTRY entry uses cli:'opencode' (guardrail: no hardcoded opencode specs)", () => {
    for (const [slug, spec] of RAW_REGISTRY) {
      expect(
        spec.cli,
        `RAW_REGISTRY["${slug}"] must not hardcode cli:"opencode"`,
      ).not.toBe("opencode");
    }
  });
});
