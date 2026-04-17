import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { VendorType } from "../types/index.js";

const VARIANTS_DIR = join(__dirname, "../../.agents/hooks/variants");
const SCHEMA_PATH = join(VARIANTS_DIR, "hook-variant.schema.json");

/** All known vendors from CLI VendorType. */
const KNOWN_VENDORS: VendorType[] = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "qwen",
];

function loadVariant(vendor: string) {
  return JSON.parse(
    readFileSync(join(VARIANTS_DIR, `${vendor}.json`), "utf-8"),
  );
}

function loadSchema() {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
}

describe("hook variant files", () => {
  it("every VendorType has a matching variant JSON", () => {
    const files = readdirSync(VARIANTS_DIR).filter(
      (f) => f.endsWith(".json") && !f.endsWith(".schema.json"),
    );
    const vendors = files.map((f) => f.replace(".json", ""));

    for (const v of KNOWN_VENDORS) {
      expect(vendors, `missing variant for vendor: ${v}`).toContain(v);
    }
  });

  it("schema vendor enum matches VendorType", () => {
    const schema = loadSchema();
    const schemaVendors: string[] = schema.properties.vendor.enum;

    expect(schemaVendors.sort()).toEqual([...KNOWN_VENDORS].sort());
  });

  it("each variant has required fields", () => {
    for (const vendor of KNOWN_VENDORS) {
      const v = loadVariant(vendor);
      expect(v.vendor).toBe(vendor);
      expect(v.hookDir).toMatch(/^\.\w+\/hooks$/);
      expect(v.settingsFile).toBeTruthy();
      expect(v.runtime).toBeTruthy();
      expect(Object.keys(v.events).length).toBeGreaterThan(0);
    }
  });

  it("each event references a file that exists in core/", () => {
    const coreDir = join(__dirname, "../../.agents/hooks/core");
    const coreFiles = readdirSync(coreDir);

    for (const vendor of KNOWN_VENDORS) {
      const v = loadVariant(vendor);
      for (const [event, rawConfig] of Object.entries(v.events) as [
        string,
        { hook: string } | { hook: string }[],
      ][]) {
        const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
        for (const config of configs) {
          expect(
            coreFiles,
            `${vendor}.${event} references missing core file: ${config.hook}`,
          ).toContain(config.hook);
        }
      }
      if (v.statusLine) {
        expect(
          coreFiles,
          `${vendor}.statusLine references missing core file: ${v.statusLine.hook}`,
        ).toContain(v.statusLine.hook);
      }
    }
  });
});
