import { existsSync, readFileSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadVideoConfig } from "./config.js";
import { VideoOrchestrator } from "./orchestrator.js";
import { defaultVideoRegistry } from "./registry.js";
import {
  ManifestSchema,
  parseVideoSchema,
  RenderSpecSchema,
  ScriptSchema,
} from "./types.js";

// The orchestrator suite runs under OMA_VIDEO_MOCK=1 so every provider takes
// its deterministic fallback branch — no subprocess, no network, no clock — and
// the script/render-spec stage is byte-identical and fast.
describe("VideoOrchestrator", () => {
  let tmp: string;
  const originalMock = process.env.OMA_VIDEO_MOCK;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "oma-video-run-"));
    process.env.OMA_VIDEO_MOCK = "1";
    delete process.env.PEXELS_API_KEY;
    delete process.env.RUNNINGHUB_API_KEY;
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalMock === undefined) delete process.env.OMA_VIDEO_MOCK;
    else process.env.OMA_VIDEO_MOCK = originalMock;
  });

  it("writes a dry-run transaction with script, render-spec, and manifest", async () => {
    const config = await loadVideoConfig(tmp);
    const orchestrator = new VideoOrchestrator(
      config,
      defaultVideoRegistry(config, { cwd: tmp }),
    );
    const result = await orchestrator.generate({
      brief: "explain the local test runner",
      opts: { dryRun: true, format: "json", seed: "42" },
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.runDir).toBeDefined();
    expect(existsSync(path.join(result.runDir ?? "", "script.json"))).toBe(
      true,
    );
    expect(existsSync(path.join(result.runDir ?? "", "render-spec.json"))).toBe(
      true,
    );
    expect(existsSync(path.join(result.runDir ?? "", "manifest.json"))).toBe(
      true,
    );

    const script = parseVideoSchema(
      "script.json",
      ScriptSchema,
      JSON.parse(
        readFileSync(path.join(result.runDir ?? "", "script.json"), "utf8"),
      ),
    );
    const renderSpec = parseVideoSchema(
      "render-spec.json",
      RenderSpecSchema,
      JSON.parse(
        readFileSync(
          path.join(result.runDir ?? "", "render-spec.json"),
          "utf8",
        ),
      ),
    );
    const manifest = parseVideoSchema(
      "manifest.json",
      ManifestSchema,
      JSON.parse(
        readFileSync(path.join(result.runDir ?? "", "manifest.json"), "utf8"),
      ),
    );

    expect(script.mode).toBe("shorts");
    expect(renderSpec.seed).toBe(42);
    expect(manifest.exitCode).toBe(0);
    expect(manifest.outputs.video).toBeUndefined();
    expect(manifest.assets.map((asset) => asset.path)).toEqual(
      expect.arrayContaining(["script.json", "render-spec.json"]),
    );
  });

  it("records voice fallback provenance (estimated timing, no audio)", async () => {
    const config = await loadVideoConfig(tmp);
    const orchestrator = new VideoOrchestrator(
      config,
      defaultVideoRegistry(config, { cwd: tmp }),
    );
    const result = await orchestrator.generate({
      brief: "narration provenance check",
      opts: { dryRun: true, seed: "7" },
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.manifest?.providers.voice).toBe("oma-voice");
    expect(result.warnings.join("\n")).toContain("source: estimated");
    const timing = JSON.parse(
      readFileSync(path.join(result.runDir ?? "", "timing.json"), "utf8"),
    ) as { source: string; audio: string };
    expect(timing.source).toBe("estimated");
    expect(timing.audio).toBe("");
  });

  it("writes captions.srt and captions.vtt key-free", async () => {
    const config = await loadVideoConfig(tmp);
    const orchestrator = new VideoOrchestrator(
      config,
      defaultVideoRegistry(config, { cwd: tmp }),
    );
    const result = await orchestrator.generate({
      brief: "caption files check",
      opts: { dryRun: true, captions: "tiktok", seed: "3" },
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(existsSync(path.join(result.runDir ?? "", "captions.srt"))).toBe(
      true,
    );
    expect(existsSync(path.join(result.runDir ?? "", "captions.vtt"))).toBe(
      true,
    );
    expect(result.manifest?.providers.caption).toBe("oma-captions");
  });

  it("falls back from missing stock provider to oma-image", async () => {
    const config = await loadVideoConfig(tmp);
    const orchestrator = new VideoOrchestrator(
      config,
      defaultVideoRegistry(config, { cwd: tmp }),
    );
    const result = await orchestrator.generate({
      brief: "make a stock-backed short",
      opts: { dryRun: true, visual: "stock" },
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.warnings.join("\n")).toContain("PEXELS_API_KEY missing");
    expect(result.manifest?.providers.visual).toContain("oma-image");
  });

  it("surfaces guided capture protocol for demo mode without --capture", async () => {
    const config = await loadVideoConfig(tmp);
    const orchestrator = new VideoOrchestrator(
      config,
      defaultVideoRegistry(config, { cwd: tmp }),
    );
    const result = await orchestrator.generate({
      brief: "walk through the dashboard",
      opts: { dryRun: true, mode: "demo" },
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.manifest?.providers.capture).toBe("cap");
    expect(result.warnings.join("\n")).toContain(
      "Capture is performed by a human",
    );
  });
});
