/**
 * T0-vendor-registry: opencode registration guard.
 *
 * Ensures opencode is enrolled as an extension vendor (pi-class), has a
 * CLI_SKILLS_DIR entry with the correct paths, and is NOT in VENDORS /
 * HOOK_VENDORS / VendorType. These tests block the downstream tasks that
 * depend on the exact exports locked in this module.
 */
import { describe, expect, it } from "vitest";
import type { ExtensionVendorType, VendorType } from "../types/vendors.js";
import {
  ALL_CLI_VENDORS,
  CLI_SKILLS_DIR,
  EXTENSION_VENDORS,
  INSTALL_ONLY_VENDORS,
  VENDORS,
  WORKFLOW_ONLY_VENDORS,
} from "./vendors.js";

// ---------------------------------------------------------------------------
// Runtime assertions
// ---------------------------------------------------------------------------

describe("EXTENSION_VENDORS", () => {
  it("includes opencode", () => {
    expect(EXTENSION_VENDORS).toContain("opencode");
  });

  it("still includes pi", () => {
    expect(EXTENSION_VENDORS).toContain("pi");
  });
});

describe("VENDORS (unchanged guard)", () => {
  it("does NOT include opencode", () => {
    expect(VENDORS).not.toContain("opencode");
  });

  it("contains the original canonical set in exact order", () => {
    expect([...VENDORS]).toEqual([
      "antigravity",
      "claude",
      "codex",
      "commandcode",
      "cursor",
      "grok",
      "kimi",
      "kiro",
      "qwen",
    ]);
  });
});

describe("CLI_SKILLS_DIR", () => {
  it("includes opencode with the correct projectPath", () => {
    expect(CLI_SKILLS_DIR.opencode.projectPath).toBe(".opencode/skills");
  });

  it("includes opencode with the correct homePath", () => {
    expect(CLI_SKILLS_DIR.opencode.homePath).toBe(".opencode/skills");
  });

  it("does not set requiresHomeConsent for opencode", () => {
    expect(CLI_SKILLS_DIR.opencode.requiresHomeConsent).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ALL_CLI_VENDORS must enumerate every CliVendor arm
// ---------------------------------------------------------------------------

describe("ALL_CLI_VENDORS", () => {
  // readVendorsFromConfig falls back to this list when oma-config.yaml has no
  // `vendors:` block. Dropping an arm therefore does not fail loudly — those
  // vendors are simply never linked, and any doc they share (AGENTS.md) silently
  // loses their section. EXTENSION_VENDORS went missing exactly this way.
  it("covers every arm of CliVendor", () => {
    const arms = [
      ...VENDORS,
      ...EXTENSION_VENDORS,
      ...INSTALL_ONLY_VENDORS,
      ...WORKFLOW_ONLY_VENDORS,
    ];
    expect([...ALL_CLI_VENDORS].sort()).toEqual([...new Set(arms)].sort());
  });

  it("includes the extension vendors", () => {
    expect(ALL_CLI_VENDORS).toContain("pi");
    expect(ALL_CLI_VENDORS).toContain("opencode");
  });

  it("is sorted and free of duplicates", () => {
    expect([...ALL_CLI_VENDORS]).toEqual([...ALL_CLI_VENDORS].sort());
    expect(new Set(ALL_CLI_VENDORS).size).toBe(ALL_CLI_VENDORS.length);
  });
});

// ---------------------------------------------------------------------------
// Type-level assertions
// ---------------------------------------------------------------------------

describe("type-level: opencode is ExtensionVendorType but NOT VendorType", () => {
  it("opencode is assignable to ExtensionVendorType at the type level", () => {
    // If ExtensionVendorType does not include 'opencode' this line fails to compile.
    const v: ExtensionVendorType = "opencode";
    expect(v).toBe("opencode");
  });

  it("opencode is NOT assignable to VendorType (compile-time guard)", () => {
    // @ts-expect-error — 'opencode' must NOT be in VendorType (VENDORS tuple).
    // If this line stops producing a type error, opencode was accidentally added
    // to VENDORS, which would break the extension-vendor isolation invariant.
    const v: VendorType = "opencode";
    expect(v).toBeDefined(); // unreachable at type-level; runtime fallback only
  });
});
