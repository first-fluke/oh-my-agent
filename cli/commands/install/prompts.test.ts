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
  // Fresh installs follow their invoking runtime without model pins.
  it("defaults OpenCode-only fresh installs to auto", () => {
    expect(resolveDefaultPreset(null, ["opencode"])).toBe("auto");
  });

  it("defaults other native-dispatch-only selections to auto", () => {
    expect(resolveDefaultPreset(null, ["grok", "kiro", "copilot"])).toBe(
      "auto",
    );
  });

  it("follows the runtime even when preset-backed vendors are selected", () => {
    expect(resolveDefaultPreset(null, ["claude"])).toBe("auto");
    expect(resolveDefaultPreset(null, ["opencode", "codex"])).toBe("auto");
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

  it("uses auto for full-vendor installs", () => {
    expect(
      resolveDefaultPreset(null, ["claude", "codex", "cursor", "qwen"]),
    ).toBe("auto");
  });
});

describe("PRESET_BACKED_VENDORS", () => {
  it("excludes the cross-vendor 'mixed' meta-preset", () => {
    expect(PRESET_BACKED_VENDORS as readonly string[]).not.toContain("mixed");
  });
});

describe("promptDevToolsBrowsers", () => {
  it("defaults to no browser MCP in non-interactive mode", async () => {
    const { promptDevToolsBrowsers } = await import("./prompts.js");
    const cleanup = () => {};
    const result = await promptDevToolsBrowsers(true, cleanup);
    expect(result).toEqual([]);
  });
});
