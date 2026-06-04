// CaptionProvider — key-free captions built from script text + timing.json
// (design 013 §1.6, §4.5: captions are a first-class, key-free track).
//
// Key-optional, two-branch contract (backend rule 11):
//   real     : when the requested locale differs from the source locale and an
//              oma-translator path is available, translate the caption text
//              first (still key-free — agent-as-key). The live translator call
//              is deferred (agent-runtime concern); the gating + fallback are
//              real.
//   fallback : keep the source-locale text. Either way we always emit
//              captions.srt + captions.vtt deterministically from the timing.
//
// Styles (tiktok / lower-third) only affect render-spec styling downstream;
// the .srt/.vtt content itself is style-independent.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { isMockMode } from "../internal/mock.js";
import type {
  Availability,
  CaptionOpts,
  CaptionProvider,
  CostEstimate,
} from "../providers.js";
import type { AudioRef, Captions, Timing } from "../types.js";

export class TimedCaptionProvider implements CaptionProvider {
  readonly id = "oma-captions";

  async available(): Promise<Availability> {
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    return { usd: 0, basis: "key-free captions from timing" };
  }

  async align(
    text: string[],
    timing: Timing,
    _audio: AudioRef,
    opts: CaptionOpts,
  ): Promise<Captions> {
    void _audio;
    const wantsTranslation =
      !isMockMode() && !opts.dryRun && opts.locale !== opts.sourceLocale;
    let lines = text;
    let locale = opts.sourceLocale;
    let pathTaken: "real" | "fallback" = "fallback";
    if (wantsTranslation) {
      const translated = await this.translate(text, opts);
      if (translated) {
        lines = translated;
        locale = opts.locale;
        pathTaken = "real";
      }
      // else: translator absent → keep source locale (warned by orchestrator).
    }

    const srt = buildSrt(timing, lines);
    const vtt = buildVtt(timing, lines);
    const srtRel = "captions.srt";
    const vttRel = "captions.vtt";
    await writeFile(path.join(opts.runDir, srtRel), srt, "utf8");
    await writeFile(path.join(opts.runDir, vttRel), vtt, "utf8");
    return {
      path: srtRel,
      vttPath: vttRel,
      style: opts.style,
      locale,
      pathTaken,
    };
  }

  /**
   * Translate caption lines for a non-source locale. The actual oma-translator
   * invocation is an agent-runtime concern that cannot be exercised here, so it
   * is deferred; returning null triggers the source-locale fallback.
   */
  private async translate(
    _text: string[],
    _opts: CaptionOpts,
  ): Promise<string[] | null> {
    void _text;
    void _opts;
    // TODO(oma-deferred): oma-translator — translate each caption line to
    // opts.locale before writing srt/vtt (still key-free / agent-as-key). Until
    // the translator surface is wired, fall back to the source locale.
    return null;
  }
}

/** Per-segment caption text: prefer the (possibly translated) script line. */
function captionFor(timing: Timing, lines: string[], index: number): string {
  const fromScript = lines[index];
  if (fromScript && fromScript.trim().length > 0) return fromScript.trim();
  const segment = timing.segments[index];
  return segment ? segment.words.map((w) => w.t).join(" ") : "";
}

export function buildSrt(timing: Timing, lines: string[]): string {
  return timing.segments
    .map((segment, idx) =>
      [
        String(idx + 1),
        `${srtTime(segment.startSec)} --> ${srtTime(segment.endSec)}`,
        captionFor(timing, lines, idx),
        "",
      ].join("\n"),
    )
    .join("\n");
}

export function buildVtt(timing: Timing, lines: string[]): string {
  const cues = timing.segments
    .map((segment, idx) =>
      [
        `${vttTime(segment.startSec)} --> ${vttTime(segment.endSec)}`,
        captionFor(timing, lines, idx),
        "",
      ].join("\n"),
    )
    .join("\n");
  return `WEBVTT\n\n${cues}`;
}

function srtTime(sec: number): string {
  const { h, m, s, ms } = splitTime(sec);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function vttTime(sec: number): string {
  const { h, m, s, ms } = splitTime(sec);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

function splitTime(sec: number): {
  h: number;
  m: number;
  s: number;
  ms: number;
} {
  const whole = Math.floor(sec);
  return {
    h: Math.floor(whole / 3600),
    m: Math.floor((whole % 3600) / 60),
    s: whole % 60,
    ms: Math.round((sec - whole) * 1000),
  };
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}
