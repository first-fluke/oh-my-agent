import { describe, expect, it } from "vitest";
import { type MusicBed, type Script, VIDEO_SCHEMA_VERSION } from "../types.js";
import {
  buildRenderSpec,
  DEFAULT_MUSIC_GAIN_DB,
  sceneVisualProviderOrder,
  visualProviderOrder,
} from "./render-spec.js";

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
    compositor: "hyperframes",
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

// Regression: explainer mode puts oma-slide first. It returned a placeholder for
// every scene without a deck, which ended the chain before oma-image ran, so an
// explainer with default visuals produced placeholders only.
describe("sceneVisualProviderOrder", () => {
  const explainer = visualProviderOrder("auto", "explainer", ["oma-image"]);

  it("skips the slide provider for a scene without a deck", () => {
    expect(sceneVisualProviderOrder(explainer, { visual: {} })[0]).toBe(
      "oma-image",
    );
  });

  it("keeps the slide provider first for a scene that names a deck", () => {
    expect(
      sceneVisualProviderOrder(explainer, { visual: { ref: "/decks/intro" } }),
    ).toEqual(explainer);
  });

  it("leaves a chain without the slide provider unchanged", () => {
    const shorts = visualProviderOrder("auto", "shorts", ["oma-image"]);
    expect(sceneVisualProviderOrder(shorts, { visual: {} })).toEqual(shorts);
  });
});
