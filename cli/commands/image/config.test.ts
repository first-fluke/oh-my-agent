import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-image-cfg-"));
    delete process.env.OMA_IMAGE_DEFAULT_VENDOR;
    delete process.env.OMA_IMAGE_GEMINI_STRATEGIES;
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    delete process.env.OMA_IMAGE_DEFAULT_VENDOR;
    delete process.env.OMA_IMAGE_GEMINI_STRATEGIES;
  });

  it("returns defaults when config file absent", async () => {
    const cfg = await loadConfig(tmp);
    expect(cfg.defaultVendor).toBe("auto");
    expect(cfg.defaultSize).toBe("1024x1024");
    expect(cfg.vendors.codex?.model).toBe("gpt-image-2");
    expect(cfg.vendors.gemini?.strategies).toEqual(["mcp", "stream", "api"]);
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

  it("applies env overrides for vendor and gemini strategies", async () => {
    process.env.OMA_IMAGE_DEFAULT_VENDOR = "gemini";
    process.env.OMA_IMAGE_GEMINI_STRATEGIES = "stream,api";
    const cfg = await loadConfig(tmp);
    expect(cfg.defaultVendor).toBe("gemini");
    expect(cfg.vendors.gemini?.strategies).toEqual(["stream", "api"]);
  });
});
