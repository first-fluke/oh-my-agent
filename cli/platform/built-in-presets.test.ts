// ---------------------------------------------------------------------------
// built-in-presets.test.ts
//
// T11 — integrity tests for BUILT_IN_PRESETS and BUILT_IN_PRESET_ALIASES.
// Asserts:
//   • All 5 built-in presets exist and have all 11 agent_defaults.
//   • Every model slug resolves via getModelSpec (boot-time integrity check).
//   • BUILT_IN_PRESET_ALIASES shape is Record<string, BuiltInPresetKey> and
//     any defined alias resolves to a real preset key.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";

const EXPECTED_PRESET_KEYS = [
  "claude-only",
  "codex-only",
  "gemini-only",
  "qwen-only",
  "antigravity",
] as const;

const EXPECTED_AGENT_IDS = [
  "orchestrator",
  "architecture",
  "qa",
  "pm",
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "tf-infra",
  "retrieval",
] as const;

describe("BUILT_IN_PRESETS", () => {
  it("exports exactly 5 built-in presets", async () => {
    const { BUILT_IN_PRESETS } = await import("./built-in-presets.js");
    expect(Object.keys(BUILT_IN_PRESETS)).toHaveLength(5);
  });

  it.each(EXPECTED_PRESET_KEYS)("preset '%s' exists", async (key) => {
    const { BUILT_IN_PRESETS } = await import("./built-in-presets.js");
    expect(BUILT_IN_PRESETS[key]).toBeDefined();
  });

  it.each(
    EXPECTED_PRESET_KEYS,
  )("preset '%s' has a non-empty description", async (key) => {
    const { BUILT_IN_PRESETS } = await import("./built-in-presets.js");
    expect(typeof BUILT_IN_PRESETS[key].description).toBe("string");
    expect(BUILT_IN_PRESETS[key].description.length).toBeGreaterThan(0);
  });

  it.each(
    EXPECTED_PRESET_KEYS,
  )("preset '%s' has all 11 agent_defaults", async (key) => {
    const { BUILT_IN_PRESETS } = await import("./built-in-presets.js");
    const preset = BUILT_IN_PRESETS[key];
    expect(Object.keys(preset.agent_defaults)).toHaveLength(11);
    for (const agentId of EXPECTED_AGENT_IDS) {
      expect(
        preset.agent_defaults[agentId],
        `Preset '${key}' is missing agent_defaults for '${agentId}'`,
      ).toBeDefined();
    }
  });

  it.each(
    EXPECTED_PRESET_KEYS,
  )("every agent_defaults entry in '%s' has a non-empty model slug", async (key) => {
    const { BUILT_IN_PRESETS } = await import("./built-in-presets.js");
    const preset = BUILT_IN_PRESETS[key];
    for (const agentId of EXPECTED_AGENT_IDS) {
      const spec = preset.agent_defaults[agentId];
      expect(
        typeof spec.model,
        `Preset '${key}' agent '${agentId}' must have a string model slug`,
      ).toBe("string");
      expect(
        spec.model.length,
        `Preset '${key}' agent '${agentId}' model slug must be non-empty`,
      ).toBeGreaterThan(0);
    }
  });

  it.each(
    EXPECTED_PRESET_KEYS,
  )("every model slug in '%s' resolves via getModelSpec", async (key) => {
    const { BUILT_IN_PRESETS } = await import("./built-in-presets.js");
    const { getModelSpec } = await import("./model-registry.js");
    const preset = BUILT_IN_PRESETS[key];
    for (const agentId of EXPECTED_AGENT_IDS) {
      const slug = preset.agent_defaults[agentId].model;
      const spec = getModelSpec(slug);
      expect(
        spec,
        `Preset '${key}' agent '${agentId}' slug '${slug}' not in registry`,
      ).toBeDefined();
    }
  });

  it("assertPresetIntegrity() does not throw", async () => {
    const { assertPresetIntegrity } = await import("./built-in-presets.js");
    expect(() => assertPresetIntegrity()).not.toThrow();
  });
});

describe("BUILT_IN_PRESET_ALIASES", () => {
  it("exports BUILT_IN_PRESET_ALIASES as an object", async () => {
    const { BUILT_IN_PRESET_ALIASES } = await import("./built-in-presets.js");
    expect(typeof BUILT_IN_PRESET_ALIASES).toBe("object");
    expect(BUILT_IN_PRESET_ALIASES).not.toBeNull();
    expect(Array.isArray(BUILT_IN_PRESET_ALIASES)).toBe(false);
  });

  it("every key in BUILT_IN_PRESET_ALIASES is a string", async () => {
    const { BUILT_IN_PRESET_ALIASES } = await import("./built-in-presets.js");
    for (const key of Object.keys(BUILT_IN_PRESET_ALIASES)) {
      expect(typeof key).toBe("string");
    }
  });

  it("every alias value resolves to a real BuiltInPresetKey", async () => {
    const { BUILT_IN_PRESETS, BUILT_IN_PRESET_ALIASES } = await import(
      "./built-in-presets.js"
    );
    const validKeys = Object.keys(BUILT_IN_PRESETS);
    for (const [alias, canonicalKey] of Object.entries(
      BUILT_IN_PRESET_ALIASES,
    )) {
      expect(
        validKeys,
        `Alias '${alias}' maps to '${canonicalKey}' which is not a valid BuiltInPresetKey`,
      ).toContain(canonicalKey);
    }
  });

  it("no alias key collides with an existing preset key", async () => {
    const { BUILT_IN_PRESETS, BUILT_IN_PRESET_ALIASES } = await import(
      "./built-in-presets.js"
    );
    const presetKeys = Object.keys(BUILT_IN_PRESETS);
    for (const alias of Object.keys(BUILT_IN_PRESET_ALIASES)) {
      expect(
        presetKeys,
        `Alias '${alias}' must not shadow an existing preset key`,
      ).not.toContain(alias);
    }
  });
});
