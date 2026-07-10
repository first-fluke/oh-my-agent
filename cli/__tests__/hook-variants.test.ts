import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type HookVariant,
  installHooksFromVariant,
} from "../platform/hooks-composer.js";
import { isHookVendor } from "../platform/skills-installer.js";
import type { VendorType } from "../types/index.js";

const REPO_ROOT = join(__dirname, "../..");

const VARIANTS_DIR = join(__dirname, "../../.agents/hooks/variants");
const SCHEMA_PATH = join(VARIANTS_DIR, "hook-variant.schema.json");

/** All known vendors from CLI VendorType. */
const KNOWN_VENDORS: VendorType[] = [
  "antigravity",
  "claude",
  "codex",
  "commandcode",
  "cursor",
  "grok",
  "kimi",
  "kiro",
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
      if (v.homeOnly) {
        // homeOnly vendors (agy) have no project hook dir of their own —
        // hookDir points at the SSOT core dir their workspace hooks.json runs.
        expect(v.hookDir).toBe(".agents/hooks/core");
      } else {
        expect(v.hookDir).toMatch(/^\.\w+(?:\/[\w-]+)?\/hooks$/);
      }
      expect(v.settingsFile).toBeTruthy();
      expect(v.runtime).toBeTruthy();
      expect(Object.keys(v.events).length).toBeGreaterThan(0);
    }
  });

  it("every vendor with a hook variant is registered in HOOK_VENDORS", () => {
    for (const v of KNOWN_VENDORS) {
      expect(
        isHookVendor(v),
        `${v} has a hook variant JSON but is missing from HOOK_VENDORS in skills-installer.ts`,
      ).toBe(true);
    }
  });

  // Regression: July 2026 CLI audit against installed Grok / Qwen binaries.
  // The PreToolUse matcher is a real tool-name gate — a wrong value makes the
  // test-filter hook dead on the native hooks path.
  it("grok PreToolUse matcher is the Bash alias (real tool: run_terminal_command)", () => {
    // Grok CLI 0.2.93's shell tool is `run_terminal_command`, not
    // `run_terminal_cmd`; the `Bash` alias is doc-guaranteed to match both.
    const v = loadVariant("grok");
    expect(v.events.PreToolUse.matcher).toBe("Bash");
  });

  it("qwen PreToolUse matcher is run_shell_command (real Qwen shell tool)", () => {
    // Qwen Code 0.12.6's shell tool is `run_shell_command`; `Bash` is a
    // subagent-type enum there and never matches a PreToolUse tool name.
    const v = loadVariant("qwen");
    expect(v.events.PreToolUse.matcher).toBe("run_shell_command");
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

// Regression: Qwen Code only runs registered hooks when
// `settings.hooksConfig.enabled === true`. The qwen variant carries that flag
// in `extra` so the installer writes it into .qwen/settings.json.
describe("qwen hook variant install output", () => {
  it("writes hooksConfig.enabled=true into .qwen/settings.json", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "oma-qwen-hooks-"));
    try {
      const variant = loadVariant("qwen") as HookVariant;
      installHooksFromVariant(REPO_ROOT, targetDir, variant);

      const settings = JSON.parse(
        readFileSync(join(targetDir, ".qwen", "settings.json"), "utf-8"),
      );
      expect(settings.hooksConfig).toEqual({ enabled: true });
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("preserves a user's existing hooksConfig keys while enabling hooks", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "oma-qwen-hooks-"));
    try {
      const qwenDir = join(targetDir, ".qwen");
      // Seed a pre-existing settings.json with an unrelated hooksConfig key.
      mkdirSync(qwenDir, { recursive: true });
      writeFileSync(
        join(qwenDir, "settings.json"),
        JSON.stringify({ hooksConfig: { timeout: 30 } }),
      );

      const variant = loadVariant("qwen") as HookVariant;
      installHooksFromVariant(REPO_ROOT, targetDir, variant);

      const settings = JSON.parse(
        readFileSync(join(qwenDir, "settings.json"), "utf-8"),
      );
      // enabled is added; the user's `timeout` key survives the shallow merge.
      expect(settings.hooksConfig).toEqual({ timeout: 30, enabled: true });
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
