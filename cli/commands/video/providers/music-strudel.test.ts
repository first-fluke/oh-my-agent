import { existsSync, rmSync, statSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStrudelProjectStatus } from "../internal/strudel-project.js";
import type { MusicPreset } from "../types.js";
import { buildPattern, StrudelMusicProvider } from "./music-strudel.js";

const PRESETS: MusicPreset[] = ["calm", "upbeat", "cinematic", "lofi", "piano"];

describe("buildPattern", () => {
  it("is deterministic for a given (preset, seed, bars)", () => {
    for (const preset of PRESETS) {
      expect(buildPattern(preset, 7, 16)).toBe(buildPattern(preset, 7, 16));
    }
  });

  it("changes key/mode with the seed and character with the preset", () => {
    expect(buildPattern("calm", 0, 16)).not.toBe(buildPattern("calm", 1, 16));
    expect(buildPattern("calm", 0, 16)).not.toBe(buildPattern("lofi", 0, 16));
  });

  it("writes scale degrees, not absolute notes, so seeds transpose the bed", () => {
    // The whole point of `n(...).scale(...)`: one scale string per octave
    // transposes every layer, instead of needing a chord table per key.
    for (const preset of PRESETS) {
      const code = buildPattern(preset, 3, 16);
      expect(code).toMatch(/\.scale\("[A-G]\d:[a-z]+"\)/);
    }
    const seeds = new Set(
      [0, 1, 2].map(
        (seed) => /\.scale\("([A-G])/.exec(buildPattern("calm", seed, 16))?.[1],
      ),
    );
    expect(seeds.size).toBeGreaterThan(1);
  });

  it("scales the arrangement to the bar count", () => {
    // Layer gains are per-bar sequences, so a longer bed gets a longer ramp
    // rather than the same fixed-length arrangement truncated.
    const short = /gain\("<([^>]*)>"\)/.exec(buildPattern("cinematic", 1, 8));
    const long = /gain\("<([^>]*)>"\)/.exec(buildPattern("cinematic", 1, 32));
    expect(short?.[1]?.split(" ").length).toBe(8);
    expect(long?.[1]?.split(" ").length).toBe(32);
  });

  it("eases layers in rather than switching them on", () => {
    const ramp = /gain\("<([^>]*)>"\)/.exec(buildPattern("cinematic", 1, 16));
    const values = (ramp?.[1] ?? "").split(" ").map(Number);
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBeGreaterThan(0);
    // Monotonic non-decreasing: a fade, never a jump back down.
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] as number);
    }
  });

  it("stays oscillator-only so renders are byte-identical on replay", () => {
    // superdough fills noise buffers from Math.random(), so white/pink/brown
    // would break byte-identical replay. Percussion is a high-passed blip.
    for (const preset of PRESETS) {
      for (let seed = 0; seed < 4; seed++) {
        expect(buildPattern(preset, seed, 16)).not.toMatch(
          /s\("(white|pink|brown|crackle)"\)/,
        );
      }
    }
  });

  it("clamps degenerate bar counts instead of emitting an empty arrangement", () => {
    expect(() => buildPattern("lofi", 1, 0)).not.toThrow();
    expect(buildPattern("lofi", 1, 0)).toBe(buildPattern("lofi", 1, 4));
  });
});

describe("StrudelMusicProvider", () => {
  const provider = new StrudelMusicProvider();
  let tmp: string;
  const originalMock = process.env.OMA_VIDEO_MOCK;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "oma-music-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalMock === undefined) delete process.env.OMA_VIDEO_MOCK;
    else process.env.OMA_VIDEO_MOCK = originalMock;
  });

  const opts = (mode: MusicPreset | "none", runDir: string) => ({
    runDir,
    mode,
    durationSec: 4,
    seed: 1,
    timeoutMs: 120_000,
  });

  it('short-circuits on mode "none" without writing anything', async () => {
    const bed = await provider.compose(opts("none", tmp));
    expect(bed).toEqual({ mode: "none", pathTaken: "fallback" });
    expect(existsSync(path.join(tmp, "music"))).toBe(false);
  });

  it("records the pattern but renders nothing in mock mode", async () => {
    process.env.OMA_VIDEO_MOCK = "1";
    const bed = await provider.compose(opts("calm", tmp));
    expect(bed.pathTaken).toBe("fallback");
    expect(bed.reason).toBe("mock mode");
    expect(bed.pattern).toContain(".scale(");
    expect(bed.path).toBeUndefined();
    expect(existsSync(path.join(tmp, "music"))).toBe(false);
  });

  it("records the pattern but renders nothing on a dry run", async () => {
    const bed = await provider.compose({ ...opts("lofi", tmp), dryRun: true });
    expect(bed.pathTaken).toBe("fallback");
    expect(bed.reason).toBe("dry run");
    expect(bed.path).toBeUndefined();
  });

  // Real offline render. Needs the AGPL deps on disk (`oma video doctor
  // --install-strudel`) plus a Chrome, so it self-skips instead of failing CI.
  const installed = getStrudelProjectStatus().installed;
  it.skipIf(!installed)(
    "renders, masters and encodes a real bed",
    async () => {
      const bed = await provider.compose(opts("piano", tmp));
      expect(bed.reason).toBeUndefined();
      expect(bed.pathTaken).toBe("real");
      // Must stay run-dir-relative + POSIX for Remotion's staticFile().
      expect(bed.path).toBe("music/bgm.wav");
      expect(bed.mp3Path).toBe("music/bgm.mp3");
      const wav = path.join(tmp, "music", "bgm.wav");
      expect(existsSync(wav)).toBe(true);
      // 4s of 44.1kHz stereo s16 is ~705KB; anything tiny means a silent stub.
      expect(statSync(wav).size).toBeGreaterThan(500_000);
      expect(statSync(path.join(tmp, "music", "bgm.mp3")).size).toBeGreaterThan(
        1_000,
      );
      expect(existsSync(path.join(tmp, "music", "pattern.strudel"))).toBe(true);
    },
    180_000,
  );
});
