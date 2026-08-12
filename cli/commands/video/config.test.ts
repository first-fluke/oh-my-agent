import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadVideoConfig } from "./config.js";

describe("loadVideoConfig", () => {
  let tmp: string;
  const originalEnv = { ...process.env };

  function writeOmaConfig(body: string): void {
    mkdirSync(path.join(tmp, ".agents"), { recursive: true });
    writeFileSync(
      path.join(tmp, ".agents/oma-config.yaml"),
      `language: en\nmodel_preset: claude\n${body}`,
      "utf8",
    );
  }

  function writeLegacy(body: string): void {
    const dir = path.join(tmp, ".agents/skills/oma-video/config");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "video-config.yaml"), body, "utf8");
  }

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

  describe("oma-config video: section", () => {
    it("reads snake_case section keys into camelCase", async () => {
      writeOmaConfig(
        [
          "video:",
          "  default_output_dir: out/videos",
          "  default_mode: explainer",
          "  default_timeout_sec: 120",
          "  cost:",
          "    guardrail_usd: 0.5",
          "  limits:",
          "    max_duration_sec: 90",
          "    max_scenes: 12",
          "  naming:",
          "    single_folder_pattern: custom-{shortid}-{mode}",
          "",
        ].join("\n"),
      );
      const cfg = await loadVideoConfig(tmp);
      expect(cfg.defaultOutputDir).toBe("out/videos");
      expect(cfg.defaultMode).toBe("explainer");
      expect(cfg.defaultTimeoutSec).toBe(120);
      expect(cfg.cost.guardrailUsd).toBe(0.5);
      expect(cfg.limits.maxScenes).toBe(12);
      expect(cfg.naming.singleFolderPattern).toBe("custom-{shortid}-{mode}");
    });

    it("reads overrides from the oma-config section", async () => {
      writeOmaConfig(
        `video:\n  default_mode: explainer\n  limits:\n    max_scenes: 7\n`,
      );
      const cfg = await loadVideoConfig(tmp);
      expect(cfg.defaultMode).toBe("explainer");
      expect(cfg.limits.maxScenes).toBe(7);
      // Sibling keys the section omits keep tracking the shipped default.
      expect(cfg.limits.maxDurationSec).toBe(180);
      expect(cfg.providers.visual.order).toEqual([
        "oma-image",
        "pexels",
        "pixelle",
      ]);
    });

    it("takes the root language, not a per-skill one", async () => {
      writeOmaConfig("video:\n  default_mode: explainer\n");
      expect((await loadVideoConfig(tmp)).language).toBe("en");

      writeOmaConfig("video: {}\n");
      writeFileSync(
        path.join(tmp, ".agents/oma-config.yaml"),
        "language: ko\nmodel_preset: claude\n",
        "utf8",
      );
      expect((await loadVideoConfig(tmp)).language).toBe("ko");
    });

    it("ignores the legacy skill config entirely", async () => {
      writeOmaConfig("video:\n  default_mode: explainer\n");
      writeLegacy("default_mode: demo\ndefault_timeout_sec: 42\n");
      const cfg = await loadVideoConfig(tmp);
      expect(cfg.defaultMode).toBe("explainer");
      expect(cfg.defaultTimeoutSec).toBe(600);
    });

    it("falls back to shipped defaults when only the legacy file exists", async () => {
      writeLegacy("default_mode: demo\n");
      expect((await loadVideoConfig(tmp)).defaultMode).toBe("shorts");
    });

    it("keeps env above the oma-config section", async () => {
      process.env.OMA_VIDEO_DEFAULT_MODE = "shorts";
      writeOmaConfig("video:\n  default_mode: explainer\n");
      expect((await loadVideoConfig(tmp)).defaultMode).toBe("shorts");
    });

    it("falls back to defaults when oma-config.yaml is malformed", async () => {
      mkdirSync(path.join(tmp, ".agents"), { recursive: true });
      writeFileSync(
        path.join(tmp, ".agents/oma-config.yaml"),
        "video:\n  default_mode: [unclosed\n",
        "utf8",
      );
      expect((await loadVideoConfig(tmp)).defaultMode).toBe("shorts");
    });
  });
});
