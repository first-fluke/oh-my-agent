import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadVideoConfig } from "./config.js";

describe("loadVideoConfig", () => {
  let tmp: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-video-cfg-"));
    delete process.env.OMA_VIDEO_DEFAULT_MODE;
    delete process.env.OMA_VIDEO_DEFAULT_OUT;
    delete process.env.OMA_VIDEO_YES;
    delete process.env.PEXELS_API_KEY;
    delete process.env.RUNNINGHUB_API_KEY;
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    process.env = { ...originalEnv };
  });

  it("returns defaults when config file absent", async () => {
    const cfg = await loadVideoConfig(tmp);
    expect(cfg.defaultMode).toBe("shorts");
    expect(cfg.defaultOutputDir).toBe(".agents/results/videos");
    expect(cfg.providers.visual.order).toEqual([
      "oma-image",
      "pexels",
      "pixelle",
    ]);
    expect(cfg.cost.guardrailUsd).toBe(0.2);
    expect(cfg.limits.maxDurationSec).toBe(180);
  });

  it("reads YAML snake_case keys into camelCase", async () => {
    const cfgDir = path.join(tmp, ".agents/skills/oma-video/config");
    mkdirSync(cfgDir, { recursive: true });
    writeFileSync(
      path.join(cfgDir, "video-config.yaml"),
      `
default_output_dir: out/videos
default_mode: explainer
default_timeout_sec: 120
cost:
  guardrail_usd: 0.5
limits:
  max_duration_sec: 90
  max_scenes: 12
naming:
  single_folder_pattern: custom-{shortid}-{mode}
`,
      "utf8",
    );
    const cfg = await loadVideoConfig(tmp);
    expect(cfg.defaultOutputDir).toBe("out/videos");
    expect(cfg.defaultMode).toBe("explainer");
    expect(cfg.defaultTimeoutSec).toBe(120);
    expect(cfg.cost.guardrailUsd).toBe(0.5);
    expect(cfg.limits.maxScenes).toBe(12);
    expect(cfg.naming.singleFolderPattern).toBe("custom-{shortid}-{mode}");
  });

  it("applies OMA_VIDEO and provider-key env overrides", async () => {
    process.env.OMA_VIDEO_DEFAULT_MODE = "demo";
    process.env.OMA_VIDEO_DEFAULT_OUT = "tmp/videos";
    process.env.OMA_VIDEO_YES = "1";
    process.env.PEXELS_API_KEY = "pexels-test";
    process.env.RUNNINGHUB_API_KEY = "runninghub-test";
    const cfg = await loadVideoConfig(tmp);
    expect(cfg.defaultMode).toBe("demo");
    expect(cfg.defaultOutputDir).toBe("tmp/videos");
    expect(cfg.yes).toBe(true);
    expect(cfg.providers.pexels.enabled).toBe(true);
    expect(cfg.providers.pixelle.enabled).toBe(true);
  });
});
