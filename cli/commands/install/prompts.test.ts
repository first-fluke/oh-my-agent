import { describe, expect, it } from "vitest";
import {
  PRESET_BACKED_VENDORS,
  resolveDefaultPreset,
  selectedPresetVendors,
} from "./prompts.js";

describe("selectedPresetVendors", () => {
  it("returns only vendors that have a matching single-vendor preset", () => {
    expect(selectedPresetVendors(["claude", "codex"])).toEqual([
      "claude",
      "codex",
    ]);
  });

  it("is empty for native-dispatch-only selections (OpenCode, grok, kiro)", () => {
    expect(selectedPresetVendors(["opencode"])).toEqual([]);
    expect(selectedPresetVendors(["opencode", "grok", "kiro"])).toEqual([]);
  });

  it("returns the preset-backed subset of a mixed selection", () => {
    expect(selectedPresetVendors(["opencode", "codex"])).toEqual(["codex"]);
  });
});

describe("resolveDefaultPreset", () => {
  // Regression for #580: an OpenCode-only install must NOT default to a
  // misleading single-vendor preset; it lands on the neutral "mixed".
  it("defaults OpenCode-only fresh installs to 'mixed', not a single vendor", () => {
    expect(resolveDefaultPreset(null, ["opencode"])).toBe("mixed");
  });

  it("defaults other native-dispatch-only selections to 'mixed'", () => {
    expect(resolveDefaultPreset(null, ["grok", "kiro", "copilot"])).toBe(
      "mixed",
    );
  });

  it("uses the first preset-backed vendor when one is selected", () => {
    expect(resolveDefaultPreset(null, ["claude"])).toBe("claude");
    expect(resolveDefaultPreset(null, ["opencode", "codex"])).toBe("codex");
  });

  it("preserves an existing built-in preset verbatim on re-install", () => {
    expect(resolveDefaultPreset("antigravity", ["opencode"])).toBe(
      "antigravity",
    );
  });

  it("preserves an existing custom preset, never clobbering it with 'mixed'", () => {
    expect(resolveDefaultPreset("opencode-local", ["opencode"])).toBe(
      "opencode-local",
    );
  });

  it("keeps the default full-vendor install on 'claude' (non-interactive parity)", () => {
    // The non-interactive fresh install seeds the full vendor list, which
    // includes claude first — preserving the historical model_preset: claude.
    expect(
      resolveDefaultPreset(null, ["claude", "codex", "cursor", "qwen"]),
    ).toBe("claude");
  });
});

describe("PRESET_BACKED_VENDORS", () => {
  it("excludes the cross-vendor 'mixed' meta-preset", () => {
    expect(PRESET_BACKED_VENDORS as readonly string[]).not.toContain("mixed");
  });
});
