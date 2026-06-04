import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SchemaValidationError } from "./errors.js";
import {
  buildSrt,
  buildVtt,
  TimedCaptionProvider,
} from "./providers/caption.js";
import { GuidedCaptureProvider } from "./providers/capture.js";
import {
  AgentScriptProvider,
  buildSkeletonScript,
} from "./providers/script.js";
import { PixelleVisualProvider } from "./providers/visual-aigc.js";
import {
  extractFirstFile,
  OmaImageVisualProvider,
} from "./providers/visual-image.js";
import { PexelsVisualProvider } from "./providers/visual-stock.js";
import { VoiceboxVoiceProvider } from "./providers/voice.js";
import {
  type Brief,
  snapAspectToImageSize,
  type Timing,
  VIDEO_SCHEMA_VERSION,
} from "./types.js";

const BRIEF: Brief = {
  text: "explain the pipeline",
  mode: "shorts",
  aspect: "9:16",
  locale: "en",
  seed: 5,
};

describe("AgentScriptProvider", () => {
  it("produces a deterministic skeleton when no injector is set", async () => {
    const provider = new AgentScriptProvider();
    const a = await provider.generate(BRIEF, { maxScenes: 40 });
    const b = await provider.generate(BRIEF, { maxScenes: 40 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.scenes.length).toBeGreaterThan(0);
    expect(a.scenes[0]?.visual.source).toBe("agent-skeleton");
  });

  it("uses the agent-injected script when provided (agent-as-key)", async () => {
    const injected = buildSkeletonScript(BRIEF, { maxScenes: 40 });
    injected.title = "Agent Authored";
    const provider = new AgentScriptProvider(() => injected);
    const out = await provider.generate(BRIEF, { maxScenes: 40 });
    expect(out.title).toBe("Agent Authored");
    expect(out.schemaVersion).toBe(VIDEO_SCHEMA_VERSION);
  });

  it("reports zero cost / available without an LLM key", async () => {
    const provider = new AgentScriptProvider();
    expect((await provider.available()).ok).toBe(true);
    expect(provider.estimateCost().usd).toBe(0);
  });
});

describe("VoiceboxVoiceProvider", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-voice-"));
    process.env.OMA_VIDEO_MOCK = "1";
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    delete process.env.OMA_VIDEO_MOCK;
  });

  it("falls back to estimated timing with no audio in mock mode", async () => {
    const provider = new VoiceboxVoiceProvider();
    const { audio, timing } = await provider.synthesize(
      [
        { sceneId: "scene-01", text: "one two three" },
        { sceneId: "scene-02", text: "four five" },
      ],
      { runDir: tmp, voice: "none", locale: "en" },
    );
    expect(audio.path).toBe("");
    expect(timing.source).toBe("estimated");
    expect(timing.audio).toBe("");
    expect(timing.segments).toHaveLength(2);
    expect(timing.totalSec).toBeGreaterThan(0);
  });

  it("is deterministic across calls (no clock dependency)", async () => {
    const provider = new VoiceboxVoiceProvider();
    const lines = [{ sceneId: "scene-01", text: "a b c d" }];
    const a = await provider.synthesize(lines, {
      runDir: tmp,
      voice: "none",
      locale: "en",
    });
    const b = await provider.synthesize(lines, {
      runDir: tmp,
      voice: "none",
      locale: "en",
    });
    expect(JSON.stringify(a.timing)).toBe(JSON.stringify(b.timing));
  });
});

const TIMING: Timing = {
  schemaVersion: VIDEO_SCHEMA_VERSION,
  audio: "",
  totalSec: 2,
  segments: [
    {
      sceneId: "scene-01",
      startSec: 0,
      endSec: 1.5,
      words: [
        { t: "Hello", startSec: 0, endSec: 0.75 },
        { t: "world", startSec: 0.75, endSec: 1.5 },
      ],
    },
  ],
  source: "estimated",
};

describe("TimedCaptionProvider", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-cap-"));
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it("writes srt + vtt key-free and keeps source locale by default", async () => {
    const provider = new TimedCaptionProvider();
    const captions = await provider.align(
      ["Hello world"],
      TIMING,
      { path: "" },
      { runDir: tmp, style: "tiktok", locale: "en", sourceLocale: "en" },
    );
    expect(captions.locale).toBe("en");
    expect(captions.pathTaken).toBe("fallback");
    expect(existsSync(path.join(tmp, "captions.srt"))).toBe(true);
    expect(existsSync(path.join(tmp, "captions.vtt"))).toBe(true);
  });

  it("falls back to source locale when translation is deferred", async () => {
    const provider = new TimedCaptionProvider();
    const captions = await provider.align(
      ["Hello world"],
      TIMING,
      { path: "" },
      { runDir: tmp, style: "lower-third", locale: "ko", sourceLocale: "en" },
    );
    // oma-translator is deferred, so the caption stays in the source locale.
    expect(captions.locale).toBe("en");
    expect(captions.pathTaken).toBe("fallback");
  });

  it("buildSrt and buildVtt encode timestamps correctly", () => {
    const srt = buildSrt(TIMING, ["Hello world"]);
    const vtt = buildVtt(TIMING, ["Hello world"]);
    expect(srt).toContain("00:00:00,000 --> 00:00:01,500");
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:01.500");
  });
});

describe("GuidedCaptureProvider", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-capture-"));
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it("absolutizes + validates an in-$PWD capture file", async () => {
    const file = path.join(tmp, "demo.mp4");
    writeFileSync(file, "fake", "utf8");
    const provider = new GuidedCaptureProvider(tmp);
    const footage = await provider.ingest("demo.mp4");
    expect(footage.path).toContain("demo.mp4");
  });

  it("rejects a non-existent capture path", async () => {
    const provider = new GuidedCaptureProvider(tmp);
    await expect(provider.ingest("missing.mp4")).rejects.toBeInstanceOf(
      SchemaValidationError,
    );
  });

  it("rejects a non-video extension", async () => {
    const file = path.join(tmp, "notes.txt");
    writeFileSync(file, "fake", "utf8");
    const provider = new GuidedCaptureProvider(tmp);
    await expect(provider.ingest("notes.txt")).rejects.toBeInstanceOf(
      SchemaValidationError,
    );
  });

  it("rejects a path that escapes $PWD", async () => {
    const provider = new GuidedCaptureProvider(tmp);
    await expect(provider.ingest("../escape.mp4")).rejects.toBeInstanceOf(
      SchemaValidationError,
    );
  });
});

describe("visual providers (mock fallback)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-visual-"));
    process.env.OMA_VIDEO_MOCK = "1";
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    delete process.env.OMA_VIDEO_MOCK;
  });

  const scene = {
    id: "scene-01",
    durationSec: 5,
    narration: "hi",
    onScreenText: ["Title"],
    visual: { kind: "still" as const, prompt: "a cat" },
  };
  const opts = {
    runDir: "",
    seed: 5,
    aspect: "9:16" as const,
    timeoutMs: 1000,
  };

  it("oma-image emits a deterministic placeholder in mock mode", async () => {
    const provider = new OmaImageVisualProvider();
    const asset = await provider.produce(scene, { ...opts, runDir: tmp });
    expect(asset.pathTaken).toBe("fallback");
    expect(asset.type).toBe("placeholder");
    expect(existsSync(path.join(tmp, asset.path))).toBe(true);
  });

  it("oma-image short-circuits to the placeholder under dryRun (no vendor probe)", async () => {
    // Regression: --dry-run must NOT spawn `oma image doctor` per scene.
    // dryRun alone (mock off) takes the fallback branch before any probe.
    delete process.env.OMA_VIDEO_MOCK;
    const provider = new OmaImageVisualProvider();
    const asset = await provider.produce(scene, {
      ...opts,
      runDir: tmp,
      dryRun: true,
    });
    expect(asset.pathTaken).toBe("fallback");
    expect(asset.type).toBe("placeholder");
  });

  it("pexels reports unavailable without PEXELS_API_KEY", async () => {
    delete process.env.OMA_VIDEO_MOCK; // exercise the real gate, not mock
    delete process.env.PEXELS_API_KEY;
    const avail = await new PexelsVisualProvider().available();
    expect(avail.ok).toBe(false);
    expect(avail.reason).toContain("PEXELS_API_KEY");
  });

  it("pixelle is off by default and emits a placeholder", async () => {
    delete process.env.RUNNINGHUB_API_KEY;
    const provider = new PixelleVisualProvider();
    expect((await provider.available()).ok).toBe(false);
    expect(provider.estimateCost().usd).toBeGreaterThan(0);
    const asset = await provider.produce(scene, { ...opts, runDir: tmp });
    expect(asset.pathTaken).toBe("fallback");
  });
});

describe("snapAspectToImageSize", () => {
  it("snaps to 16-multiple sizes per design 013 §5", () => {
    expect(snapAspectToImageSize("9:16")).toEqual({
      width: 1088,
      height: 1920,
    });
    expect(snapAspectToImageSize("16:9")).toEqual({
      width: 1920,
      height: 1088,
    });
    expect(snapAspectToImageSize("1:1")).toEqual({ width: 1088, height: 1088 });
    for (const aspect of ["9:16", "16:9", "1:1"] as const) {
      const { width, height } = snapAspectToImageSize(aspect);
      expect(width % 16).toBe(0);
      expect(height % 16).toBe(0);
    }
  });
});

describe("extractFirstFile (oma-image JSON parsing)", () => {
  it("reads the first file from inline runs", async () => {
    const stdout = JSON.stringify({
      exitCode: 0,
      runs: [{ status: "ok", files: ["/abs/out/scene-01.png"] }],
    });
    expect(await extractFirstFile(stdout)).toBe("/abs/out/scene-01.png");
  });

  it("returns null on unparseable output", async () => {
    expect(await extractFirstFile("not json")).toBeNull();
  });

  it("returns null when no run produced a file", async () => {
    const stdout = JSON.stringify({ exitCode: 1, runs: [] });
    expect(await extractFirstFile(stdout)).toBeNull();
  });
});
