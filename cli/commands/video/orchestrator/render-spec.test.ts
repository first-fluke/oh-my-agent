import { describe, expect, it } from "vitest";
import { type MusicBed, type Script, VIDEO_SCHEMA_VERSION } from "../types.js";
import { buildRenderSpec, DEFAULT_MUSIC_GAIN_DB } from "./render-spec.js";

const script: Script = {
  schemaVersion: VIDEO_SCHEMA_VERSION,
  mode: "shorts",
  aspect: "9:16",
  locale: "en",
  title: "bed wiring",
  music: "calm",
  brand: {},
  scenes: [
    {
      id: "scene-01",
      durationSec: 3,
      narration: "hello",
      onScreenText: [],
      visual: { kind: "still" },
    },
  ],
};

function build(music?: MusicBed) {
  return buildRenderSpec({
    script,
    timing: {
      schemaVersion: VIDEO_SCHEMA_VERSION,
      audio: "",
      totalSec: 3,
      segments: [],
      source: "estimated",
    },
    audio: { path: "" },
    visualAssets: [],
    compositor: "remotion",
    seed: 1,
    captionStyle: "tiktok",
    music,
  });
}

describe("buildRenderSpec music wiring", () => {
  it("mixes a real bed at the default gain", () => {
    const spec = build({
      mode: "calm",
      path: "music/bgm.wav",
      pattern: 'note("c3")',
      pathTaken: "real",
    });
    expect(spec.audio.music).toBe("music/bgm.wav");
    expect(spec.audio.musicGainDb).toBe(DEFAULT_MUSIC_GAIN_DB);
  });

  it("leaves no music ref when the bed fell back", () => {
    // A fallback bed still carries its pattern; writing that (or the mode
    // string) into audio.music would hand the compositor a dangling
    // staticFile() ref and fail the render.
    const spec = build({
      mode: "calm",
      pattern: 'note("c3")',
      pathTaken: "fallback",
      reason: "@strudel/web not installed",
    });
    expect(spec.audio.music).toBeUndefined();
    expect(spec.audio.musicGainDb).toBeUndefined();
  });

  it("leaves no music ref when music was never requested", () => {
    const spec = build();
    expect(spec.audio.music).toBeUndefined();
    expect(spec.audio.musicGainDb).toBeUndefined();
  });
});
