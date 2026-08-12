import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetLegacyWarnings } from "../../platform/agent-config/skill-sections.js";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-image-cfg-"));
    delete process.env.OMA_IMAGE_DEFAULT_VENDOR;
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    delete process.env.OMA_IMAGE_DEFAULT_VENDOR;
  });

  it("returns defaults when config file absent", async () => {
    const cfg = await loadConfig(tmp);
    expect(cfg.defaultVendor).toBe("auto");
    expect(cfg.defaultSize).toBe("1024x1024");
    expect(cfg.vendors.codex?.model).toBe("gpt-image-2");
    // antigravity has no caller-visible model — agy picks one internally.
    expect(cfg.vendors.antigravity?.model).toBe("");
    expect(cfg.vendors.antigravity?.enabled).toBe(true);
  });

  it("reads YAML snake_case keys into camelCase", async () => {
    const cfgDir = path.join(tmp, ".agents/skills/oma-image/config");
    mkdirSync(cfgDir, { recursive: true });
    writeFileSync(
      path.join(cfgDir, "image-config.yaml"),
      `
default_output_dir: out/
default_vendor: codex
default_size: 1024x1536
default_quality: high
default_count: 2
cost_guardrail:
  estimate_threshold_usd: 0.5
  per_image_usd:
    codex:
      gpt-image-2:
        high: 0.1
compare:
  folder_pattern: custom-{shortid}
  manifest: false
naming:
  single_folder_pattern: s-{shortid}
`,
      "utf8",
    );
    const cfg = await loadConfig(tmp);
    expect(cfg.defaultOutputDir).toBe("out/");
    expect(cfg.defaultVendor).toBe("codex");
    expect(cfg.defaultSize).toBe("1024x1536");
    expect(cfg.defaultCount).toBe(2);
    expect(cfg.costGuardrail.estimateThresholdUsd).toBe(0.5);
    expect(cfg.costGuardrail.perImageUsd.codex?.["gpt-image-2"]?.high).toBe(
      0.1,
    );
    expect(cfg.compare.folderPattern).toBe("custom-{shortid}");
    expect(cfg.compare.manifest).toBe(false);
    expect(cfg.naming.singleFolderPattern).toBe("s-{shortid}");
  });

  it("applies env override for default vendor", async () => {
    process.env.OMA_IMAGE_DEFAULT_VENDOR = "antigravity";
    const cfg = await loadConfig(tmp);
    expect(cfg.defaultVendor).toBe("antigravity");
  });

  describe("oma-config image: section", () => {
    function writeOmaConfig(body: string): void {
      mkdirSync(path.join(tmp, ".agents"), { recursive: true });
      writeFileSync(
        path.join(tmp, ".agents/oma-config.yaml"),
        `language: en\nmodel_preset: claude\n${body}`,
        "utf8",
      );
    }

    function writeLegacy(body: string): void {
      const dir = path.join(tmp, ".agents/skills/oma-image/config");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "image-config.yaml"), body, "utf8");
    }

    beforeEach(() => {
      resetLegacyWarnings();
    });

    it("reads overrides from the oma-config section", async () => {
      writeOmaConfig("image:\n  default_vendor: pollinations\n");
      const cfg = await loadConfig(tmp);
      expect(cfg.defaultVendor).toBe("pollinations");
      expect(cfg.defaultSize).toBe("1024x1024");
    });

    it("merges a partial cost matrix onto the shipped one", async () => {
      writeOmaConfig(
        `image:\n  cost_guardrail:\n    per_image_usd:\n      codex:\n        gpt-image-2:\n          high: 0.5\n`,
      );
      const cfg = await loadConfig(tmp);
      expect(cfg.costGuardrail.perImageUsd.codex?.["gpt-image-2"]?.high).toBe(
        0.5,
      );
      // Untouched prices keep tracking the vendor, which is the whole reason
      // the matrix is not copied wholesale into the user's config.
      expect(cfg.costGuardrail.perImageUsd.codex?.["gpt-image-2"]?.low).toBe(
        0.02,
      );
      expect(cfg.costGuardrail.perImageUsd.pollinations?.flux).toBeDefined();
    });

    it("ignores a legacy file that still matches the shipped defaults", async () => {
      writeOmaConfig("image:\n  default_vendor: pollinations\n");
      writeLegacy("default_vendor: auto\ndefault_size: 1024x1024\n");
      expect((await loadConfig(tmp)).defaultVendor).toBe("pollinations");
    });

    it("lets a diverging legacy key win during the deprecation window", async () => {
      writeOmaConfig("image:\n  default_vendor: pollinations\n");
      writeLegacy("default_vendor: codex\n");
      expect((await loadConfig(tmp)).defaultVendor).toBe("codex");
    });

    it("keeps env above both config tiers", async () => {
      process.env.OMA_IMAGE_DEFAULT_VENDOR = "antigravity";
      writeOmaConfig("image:\n  default_vendor: pollinations\n");
      writeLegacy("default_vendor: codex\n");
      expect((await loadConfig(tmp)).defaultVendor).toBe("antigravity");
    });

    it("falls back to defaults when oma-config.yaml is malformed", async () => {
      mkdirSync(path.join(tmp, ".agents"), { recursive: true });
      writeFileSync(
        path.join(tmp, ".agents/oma-config.yaml"),
        "image:\n  default_vendor: [unclosed\n",
        "utf8",
      );
      expect((await loadConfig(tmp)).defaultVendor).toBe("auto");
    });
  });
});
