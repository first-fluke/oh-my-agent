// MusicProvider — Strudel offline BGM renderer.
//
// Key-optional, two-branch contract (backend rule 11):
//   real     : write music/pattern.strudel → spawn the vendored render.mjs
//              (headless Chrome + OfflineAudioContext) → music/bgm.wav
//   fallback : no wav, `pathTaken: "fallback"` + a reason the orchestrator
//              surfaces as a warning. The render then simply has no music.
//
// The CLI never imports Strudel (AGPL-3.0-or-later vs the CLI's MIT) — see
// `internal/strudel-project.ts`. Everything here is filesystem + subprocess.
//
// DETERMINISM: the built-in patterns are oscillator-only (sine / triangle /
// square / sawtooth), which superdough renders byte-identically across runs.
// Noise sounds (white / pink / brown) draw from Math.random() and would break
// byte-identical replay, so the templates never use them.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { findChromeExecutable } from "@cli/io/chrome";
import { runCapture } from "../internal/exec.js";
import { isMockMode } from "../internal/mock.js";
import {
  getStrudelProjectStatus,
  STRUDEL_DRIVER,
} from "../internal/strudel-project.js";
import type {
  Availability,
  CostEstimate,
  MusicOpts,
  MusicProvider,
} from "../providers.js";
import type { MusicBed, MusicPreset } from "../types.js";

/** Run-dir-relative artifacts. */
const RAW_RELATIVE = path.join("music", "bgm-raw.wav");
const WAV_RELATIVE = path.join("music", "bgm.wav");
const MP3_RELATIVE = path.join("music", "bgm.mp3");
const PATTERN_RELATIVE = path.join("music", "pattern.strudel");

/**
 * Loudness the mastered bed is normalised to, and its true-peak ceiling.
 *
 * Two reasons this is normalisation and not a fixed makeup gain:
 *   1. Strudel's raw render lands around -18..-21 LUFS; the compositor then
 *      mixes at `musicGainDb` (-18 dB), which would put the bed near -38 dBFS —
 *      inaudible under narration.
 *   2. Presets differ by ~8 LUFS between the quietest (piano) and loudest
 *      (lofi), so a fixed gain would make `musicGainDb` mean something
 *      different per preset. Normalising makes one mix level correct for all.
 */
const MASTER_TARGET_LUFS = -14;
/** Limiter ceiling as a linear amplitude (≈ -1.5 dBFS). */
const TRUE_PEAK_CEILING = 0.84;

/** Cycles per second per preset — one cycle is one bar. */
const CPS: Record<MusicPreset, number> = {
  calm: 0.35,
  upbeat: 0.55,
  cinematic: 0.42,
  lofi: 0.46,
  piano: 0.38,
};

/**
 * Tonic candidates. Presets are written in SCALE DEGREES (`n("0 2 4")`) rather
 * than absolute note names, so the whole bed transposes by swapping the scale
 * string — that is what lets one preset yield a different key/mode per seed
 * instead of needing a hand-written chord table per key.
 */
const KEYS = ["c", "d", "e", "f", "g", "a"];

/** Modes that suit each preset's character. */
const PRESET_MODES: Record<MusicPreset, string[]> = {
  calm: ["minor", "dorian", "aeolian"],
  upbeat: ["major", "mixolydian", "lydian"],
  cinematic: ["minor", "dorian", "phrygian", "aeolian"],
  lofi: ["dorian", "major", "mixolydian"],
  piano: ["minor", "aeolian", "dorian", "lydian"],
};

/** 3 decimals, trailing zeros trimmed — keeps generated code readable. */
function f(n: number): string {
  return Number(n.toFixed(3)).toString();
}

/**
 * Per-bar gain sequence that eases a layer in across `[from, to)` of the bed
 * and holds at `peak` after. Layers arrive gradually instead of snapping on,
 * which is what makes a bed feel arranged rather than looped.
 */
function rampGain(
  bars: number,
  peak: number,
  from: number,
  to: number,
): string {
  const cells: string[] = [];
  for (let i = 0; i < bars; i++) {
    const at = i / bars;
    let r: number;
    if (at <= from) r = 0;
    else if (at >= to) r = 1;
    else r = (at - from) / (to - from);
    cells.push(f(peak * r));
  }
  // Quoted: `<...>` is mini-notation and must reach strudel inside a string —
  // unquoted it parses as JS comparison operators and the eval yields no Pattern.
  return `"<${cells.join(" ")}>"`;
}

/**
 * Build the strudel source for a bed. Pure + deterministic: the same
 * (preset, seed, bars) always yields the same code, so it is unit-testable
 * without a browser.
 *
 * Every preset is oscillator-only (sine / triangle / square / sawtooth).
 * Percussion is a short high-passed square blip rather than filtered noise:
 * superdough fills noise buffers from Math.random(), which would break
 * byte-identical replay.
 */
export function buildPattern(
  preset: MusicPreset,
  seed: number,
  bars: number,
): string {
  const s = Math.abs(Math.trunc(seed));
  const n = Math.max(4, Math.round(bars));
  const key = KEYS[s % KEYS.length] as string;
  const modes = PRESET_MODES[preset];
  const mode = modes[s % modes.length] as string;
  /** Scale string for an octave, e.g. `D3:dorian`. */
  const sc = (octave: number) => `${key.toUpperCase()}${octave}:${mode}`;
  const slow = Math.max(4, Math.round(n / 2));

  switch (preset) {
    case "calm":
      return `stack(
  n("<0 ~ <5 3> ~>").scale("${sc(2)}").s("triangle")
    .attack(0.006).decay(0.9).sustain(0.3).release(1.4)
    .lpf(900).gain(0.26).room(0.6).slow(2),
  n("0,2,4").scale("${sc(3)}").s("sawtooth")
    .lpf(sine.range(400,1400).slow(${slow}))
    .attack(1.4).release(3).gain(0.16).room(0.8).slow(4),
  n("0 2 4 7 4 2").scale("${sc(4)}").s("triangle").fast(2)
    .attack(0.004).decay(0.5).sustain(0).release(0.5).lpf(2600)
    .gain(${rampGain(n, 0.13, 0.15, 0.5)})
    .room(0.8).delay(0.18).delaytime(0.33).delayfeedback(0.25)
)`;

    case "upbeat":
      return `stack(
  n("0 ~ <4 5> ~").scale("${sc(2)}").s("sawtooth")
    .lpf(700).decay(0.18).sustain(0).gain(0.38),
  n("<[0,2,4] [1,3,5]>").scale("${sc(3)}").s("square").struct("~ x ~ x")
    .attack(0.01).release(0.15).lpf(2200).gain(0.12),
  n("0 2 4 7").scale("${sc(4)}").s("triangle").fast(2)
    .release(0.1).gain(${rampGain(n, 0.1, 0.1, 0.45)}),
  n("14").scale("${sc(4)}").s("square").struct("x [x@2 x] x [x@2 x]")
    .decay(0.012).sustain(0).hpf(6500)
    .gain(${rampGain(n, 0.05, 0.25, 0.6)})
)`;

    case "cinematic":
      return `stack(
  n("0,2,4").scale("${sc(3)}").s("sawtooth")
    .lpf(sine.range(280,2400).slow(${slow}))
    .attack(1.4).release(3).gain(0.24).room(0.85).slow(4),
  n("0 ~ <0 4> ~").scale("${sc(1)}").s("sawtooth")
    .lpf(420).attack(0.01).release(0.4)
    .gain(${rampGain(n, 0.3, 0.1, 0.45)}),
  note("c1").s("sine").struct("x ~ ~ ~ x ~ ~ ~")
    .attack(0.001).decay(0.16).sustain(0)
    .gain(${rampGain(n, 0.55, 0.2, 0.55)}),
  n("0 2 4 7 4 2").scale("${sc(3)}").s("triangle").fast(2)
    .lpf(3800).gain(${rampGain(n, 0.16, 0.6, 0.85)})
    .delay(0.35).delaytime(0.18).room(0.4)
)`;

    case "lofi":
      return `stack(
  n("<[0,2,4] [1,3,5]>").scale("${sc(3)}").s("triangle")
    .lpf(1600).attack(0.05).release(0.8).gain(0.2).room(0.5).slow(2),
  n("0 ~ 4 ~").scale("${sc(2)}").s("sine").gain(0.28).release(0.3),
  note("c1").s("sine").struct("x ~ ~ x ~ ~ x ~")
    .decay(0.18).sustain(0).gain(${rampGain(n, 0.5, 0.1, 0.4)}),
  n("14").scale("${sc(4)}").s("square").struct("x [x@2 x] x [x@2 x]")
    .decay(0.012).sustain(0).hpf(6000)
    .gain(${rampGain(n, 0.05, 0.2, 0.55)}),
  n("<7 ~ 6 ~>").scale("${sc(4)}").s("triangle").struct("x ~ ~ x ~ x ~ ~")
    .decay(0.2).sustain(0).lpf(2600)
    .gain(${rampGain(n, 0.09, 0.45, 0.75)})
    .delay(0.3).delaytime(0.375).delayfeedback(0.35).room(0.4)
)`;

    case "piano":
      return `stack(
  n("<0 ~ <5 3> ~>").scale("${sc(2)}").s("triangle")
    .attack(0.006).decay(0.9).sustain(0.3).release(1.4)
    .lpf(1000).gain(0.26).room(0.7).slow(2),
  n("0 2 4 7 4 2").scale("${sc(4)}").s("triangle").fast(3)
    .attack(0.004).decay(0.5).sustain(0).release(0.5).lpf(3200)
    .gain(0.15).room(0.8).delay(0.18).delaytime(0.33).delayfeedback(0.25),
  n("0 2 4 7 4 2").scale("${sc(4)}").s("sine").add(note(12)).fast(3)
    .attack(0.004).decay(0.4).sustain(0).hpf(1200)
    .gain(${rampGain(n, 0.07, 0.3, 0.7)}).room(0.85),
  n("0,2,4").scale("${sc(3)}").s("sawtooth")
    .lpf(sine.range(500,1600).slow(${slow}))
    .attack(1.6).release(3).gain(${rampGain(n, 0.12, 0.2, 0.6)})
    .room(0.9).slow(4)
)`;
  }
}

export class StrudelMusicProvider implements MusicProvider {
  readonly id = "strudel";

  async available(): Promise<Availability> {
    const status = getStrudelProjectStatus();
    if (!status.dir) {
      return {
        ok: false,
        reason: "strudel renderer not found",
        remediation:
          "Install the oma-video skill, or set OMA_VIDEO_STRUDEL_DIR.",
      };
    }
    if (!status.installed) {
      return {
        ok: false,
        reason: "@strudel/web not installed",
        remediation:
          "Run `oma video doctor --install-strudel` (installs AGPL-3.0-or-later packages locally).",
      };
    }
    if (!findChromeExecutable()) {
      return {
        ok: false,
        reason: "chromium not found",
        remediation:
          "Install Google Chrome / Chromium, or set OMA_CHROME_PATH.",
      };
    }
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    // Local offline render — no network, no key, no per-call cost.
    return { usd: 0, basis: "strudel local offline render" };
  }

  async compose(opts: MusicOpts): Promise<MusicBed> {
    if (opts.mode === "none") {
      return { mode: "none", pathTaken: "fallback" };
    }
    // One cycle is one bar, so the bar count the arrangement spans follows
    // straight from the bed length and the preset's tempo.
    const seconds = roundSeconds(opts.durationSec);
    const pattern = buildPattern(
      opts.mode,
      opts.seed,
      seconds * CPS[opts.mode],
    );

    // Mock / dry-run never spawn a browser: the pattern is still recorded so
    // script/render-spec replay stays byte-identical without any audio work.
    if (isMockMode() || opts.dryRun) {
      return {
        mode: opts.mode,
        pattern,
        pathTaken: "fallback",
        reason: isMockMode() ? "mock mode" : "dry run",
      };
    }

    const availability = await this.available();
    if (!availability.ok) {
      return {
        mode: opts.mode,
        pattern,
        pathTaken: "fallback",
        reason:
          `${availability.reason} — ${availability.remediation ?? ""}`.trim(),
      };
    }

    const status = getStrudelProjectStatus();
    const chrome = findChromeExecutable();
    // available() already proved both; narrow for the type checker.
    if (!status.dir || !chrome) {
      return { mode: opts.mode, pattern, pathTaken: "fallback" };
    }

    await mkdir(path.join(opts.runDir, "music"), { recursive: true });
    const patternPath = path.join(opts.runDir, PATTERN_RELATIVE);
    await writeFile(patternPath, `${pattern}\n`, "utf8");

    const rawPath = path.join(opts.runDir, RAW_RELATIVE);
    const res = await runCapture(
      process.execPath,
      [
        path.join(status.dir, STRUDEL_DRIVER),
        "--pattern-file",
        patternPath,
        "--out",
        rawPath,
        "--chrome",
        chrome,
        "--seconds",
        String(seconds),
        "--cps",
        String(CPS[opts.mode]),
        "--timeout",
        String(opts.timeoutMs),
      ],
      { timeoutMs: opts.timeoutMs + 5_000 },
    );

    const result = parseDriverResult(res.stdout);
    if (!result?.ok) {
      return {
        mode: opts.mode,
        pattern,
        pathTaken: "fallback",
        reason:
          result?.error ??
          (res.timedOut
            ? "strudel render timed out"
            : `strudel render exit ${res.code}`),
      };
    }

    // Master the raw render (makeup + limiter) and emit an mp3 next to it.
    // Both hops are best-effort: without ffmpeg the raw wav is still a usable
    // bed, just quiet, so a failure degrades instead of losing the music.
    const mastered = await master(
      rawPath,
      path.join(opts.runDir, WAV_RELATIVE),
    );
    const wavRel = mastered ? WAV_RELATIVE : RAW_RELATIVE;
    let mp3Rel: string | undefined;
    if (mastered) {
      const encoded = await encodeMp3(
        path.join(opts.runDir, WAV_RELATIVE),
        path.join(opts.runDir, MP3_RELATIVE),
      );
      if (encoded) mp3Rel = MP3_RELATIVE;
    }

    return {
      mode: opts.mode,
      // Remotion resolves this with staticFile() — must stay run-dir-relative
      // and POSIX-separated regardless of host platform.
      path: toPosix(wavRel),
      mp3Path: mp3Rel ? toPosix(mp3Rel) : undefined,
      pattern,
      pathTaken: "real",
      reason: mastered ? undefined : "ffmpeg unavailable — bed left unmastered",
    };
  }
}

/** Run-dir-relative paths must be POSIX for the compositor's staticFile(). */
function toPosix(relative: string): string {
  return relative.split(path.sep).join("/");
}

/** Integrated loudness of a file in LUFS, or null when ffmpeg can't report it. */
async function measureLufs(input: string): Promise<number | null> {
  const res = await runCapture(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      input,
      "-af",
      "ebur128=framelog=quiet",
      "-f",
      "null",
      "-",
    ],
    { timeoutMs: 120_000 },
  );
  const matched = /I:\s+(-?\d+(?:\.\d+)?)\s+LUFS/.exec(res.stderr);
  if (!matched?.[1]) return null;
  const value = Number(matched[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Normalise the bed to a consistent loudness, then catch peaks with a limiter.
 *
 * Measure-then-apply-static-gain, NOT ffmpeg's one-pass `loudnorm`: loudnorm
 * normalises dynamically, which flattens the arrangement arc the per-bar gain
 * ramps exist to create (measured: a +1.6 dB build collapsed to +0.2 dB). A
 * single constant gain levels presets against each other while leaving the
 * arc — and every other dynamic — untouched.
 */
async function master(input: string, output: string): Promise<boolean> {
  const measured = await measureLufs(input);
  // Fall back to a fixed lift when the measurement is unavailable; a slightly
  // mis-levelled bed still beats an inaudible one.
  const raw = measured === null ? 7 : MASTER_TARGET_LUFS - measured;
  const gainDb = Math.max(-12, Math.min(24, raw));
  const res = await runCapture(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      input,
      "-af",
      `volume=${gainDb.toFixed(2)}dB,alimiter=level_in=1:level_out=${TRUE_PEAK_CEILING}:limit=${TRUE_PEAK_CEILING}:attack=5:release=80`,
      output,
    ],
    { timeoutMs: 120_000 },
  );
  return res.code === 0 && existsSync(output);
}

/** Convenience mp3 next to the wav, for previewing the bed outside the render. */
async function encodeMp3(input: string, output: string): Promise<boolean> {
  const res = await runCapture(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      input,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      output,
    ],
    { timeoutMs: 120_000 },
  );
  return res.code === 0 && existsSync(output);
}

/** Bed length: whole seconds, at least 1 — the driver rejects <= 0. */
function roundSeconds(durationSec: number): number {
  return Math.max(1, Math.ceil(durationSec));
}

interface DriverResult {
  ok: boolean;
  error?: string;
}

/** The driver's LAST stdout line is the authoritative JSON result. */
function parseDriverResult(stdout: string): DriverResult | null {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const last = lines[lines.length - 1];
  if (!last) return null;
  try {
    return JSON.parse(last) as DriverResult;
  } catch {
    return null;
  }
}
