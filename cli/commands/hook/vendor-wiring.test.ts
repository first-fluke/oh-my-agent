/**
 * Vendor wiring contract — recurrence prevention for "variant JSON added but
 * dispatch never wired" (this is exactly how commandcode shipped with hooks
 * registered by the installer but an empty `oma hook` chain).
 *
 * For EVERY `.agents/hooks/variants/<vendor>.json` this suite asserts the
 * full dispatch path is wired:
 *
 *   1. The vendor is in the core `VENDORS` SSOT (drives the `Vendor` type;
 *      exhaustive switches in hook-output.ts / vendor-renderer.ts then fail
 *      typecheck until every dialect case exists).
 *   2. `VARIANT_ROUTES` (the table `oma hook` dispatches from) has an
 *      embedded route for the vendor — and vice versa, every route has a
 *      variant JSON (no phantom vendors).
 *   3. test-filter's `getHookDir(vendor)` agrees with the variant's
 *      `hookDir` (it cannot import variant JSONs — pi runs it as a
 *      standalone subprocess — so the duplicate is locked here instead).
 *   4. `PROBE_VENDORS` covers the vendor so `oma hook:probe` exercises it.
 *   5. Every handler (non-hud) event maps to a HookInput kind
 *      (complements adapters.test.ts, which also walks the variant JSONs).
 *
 * Adding a new vendor variant JSON makes this file fail until every layer
 * above is wired — that is the point.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VENDORS } from "../../../.agents/hooks/core/constants.js";
import { getHookDir } from "../../../.agents/hooks/core/test-filter.js";
import type { Vendor } from "../../../.agents/hooks/core/types.js";
import { nativeEventToKind } from "./adapters.js";
import { VARIANT_ROUTES } from "./dispatch.js";
import { PROBE_VENDORS } from "./probe.js";

const variantsDir = join(
  __dirname,
  "..",
  "..",
  "..",
  ".agents",
  "hooks",
  "variants",
);

interface VariantFile {
  vendor: string;
  hookDir: string;
  events: Record<string, { hook: string } | Array<{ hook: string }>>;
}

/** All vendor variant JSONs (excludes the schema file and the pi subdir). */
function loadVariantFiles(): VariantFile[] {
  return readdirSync(variantsDir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".json") &&
        e.name !== "hook-variant.schema.json",
    )
    .map(
      (e) =>
        JSON.parse(
          readFileSync(join(variantsDir, e.name), "utf-8"),
        ) as VariantFile,
    );
}

describe("vendor wiring contract (variant JSON ↔ dispatch)", () => {
  const variants = loadVariantFiles();

  it("found vendor variant JSONs to validate", () => {
    expect(variants.length).toBeGreaterThan(0);
  });

  it("every variant vendor is in the core VENDORS SSOT", () => {
    for (const v of variants) {
      expect(
        VENDORS,
        `${v.vendor}: add it to .agents/hooks/core/constants.ts VENDORS — ` +
          `the Vendor type and the exhaustive dialect switches derive from it`,
      ).toContain(v.vendor);
    }
  });

  it("every variant vendor has an embedded route in VARIANT_ROUTES", () => {
    for (const v of variants) {
      expect(
        VARIANT_ROUTES[v.vendor],
        `${v.vendor}: import the variant JSON in dispatch.ts and add it to ` +
          `VARIANT_ROUTES — without it the installer registers hooks but ` +
          `\`oma hook\` dispatches an empty chain`,
      ).toBeDefined();
    }
  });

  it("every VARIANT_ROUTES entry has a backing variant JSON (no phantom vendors)", () => {
    const fileVendors = new Set(variants.map((v) => v.vendor));
    for (const vendor of Object.keys(VARIANT_ROUTES)) {
      expect(
        fileVendors.has(vendor),
        `VARIANT_ROUTES has "${vendor}" but no .agents/hooks/variants/${vendor}.json exists`,
      ).toBe(true);
    }
  });

  it("test-filter getHookDir(vendor) matches each variant's hookDir", () => {
    for (const v of variants) {
      expect(
        getHookDir(v.vendor as Vendor),
        `${v.vendor}: getHookDir in .agents/hooks/core/test-filter.ts must ` +
          `return "${v.hookDir}" (mirrors the variant JSON; it cannot import ` +
          `the JSON because pi runs it as a standalone subprocess)`,
      ).toBe(v.hookDir);
    }
  });

  it("PROBE_VENDORS covers every variant vendor that registers a prompt event", () => {
    // The probe exercises the prompt-injection flow, so vendors whose hook
    // surface has no prompt event (commandcode: only PreToolUse/PostToolUse/
    // Stop per commandcode.ai/docs/hooks/reference) are exempt.
    for (const v of variants) {
      const hasPromptEvent = Object.keys(v.events).some(
        (eventName) =>
          nativeEventToKind(v.vendor as Vendor, eventName) === "prompt",
      );
      if (!hasPromptEvent) continue;
      expect(
        PROBE_VENDORS as readonly string[],
        `${v.vendor}: add a VendorCase + PROBE_VENDORS entry in probe.ts so ` +
          `\`oma hook:probe\` exercises the vendor`,
      ).toContain(v.vendor);
    }
  });

  it("every handler (non-hud) event maps to a HookInput kind", () => {
    for (const v of variants) {
      for (const [eventName, rawConfig] of Object.entries(v.events)) {
        const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
        const isHudOnly = configs.every((c) => c.hook === "hud.ts");
        if (isHudOnly) continue;
        expect(
          nativeEventToKind(v.vendor as Vendor, eventName),
          `${v.vendor}:${eventName} has handlers but no kind mapping in adapters.ts`,
        ).not.toBeNull();
      }
    }
  });
});
