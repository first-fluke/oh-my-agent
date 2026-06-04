// VoiceProvider — oma-voice / Voicebox MCP (design 013 §5).
//
// Key-optional, two-branch contract (backend rule 11):
//   real     : probe /health → voicebox_speak → generation_id →
//              REST GET /audio/{id} (save wav into runDir/audio) →
//              voicebox_transcribe → timing.json (source: voicebox-stt)
//   fallback : silent / estimated timing, no audio file (source: estimated)
//
// Voicebox plays generated audio on the speakers as a side effect (design §5);
// in mock mode we never take the real branch so replay is byte-identical and
// silent.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { http } from "@cli/io/http";
import { ESTIMATED_SECONDS_PER_WORD, isMockMode } from "../internal/mock.js";
import { VOICEBOX_BASE_URL } from "../internal/readiness.js";
import type {
  Availability,
  CostEstimate,
  VoiceOpts,
  VoiceProvider,
} from "../providers.js";
import {
  type AudioRef,
  type NarrationLine,
  type Timing,
  VIDEO_SCHEMA_VERSION,
} from "../types.js";

/** Result of a real Voicebox synthesis (one wav + per-segment timing). */
interface SynthesisResult {
  audio: AudioRef;
  timing: Timing;
}

export class VoiceboxVoiceProvider implements VoiceProvider {
  readonly id = "oma-voice";

  constructor(private readonly baseUrl: string = VOICEBOX_BASE_URL) {}

  async available(): Promise<Availability> {
    // The estimated fallback is always reachable; "voice: none" or a down
    // Voicebox must not hard-fail the run, so this provider always reports
    // available and decides real-vs-fallback at synthesis time.
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    // Local on-device TTS — no per-call cost (design §4.5: "oma-voice local").
    return { usd: 0, basis: "oma-voice local TTS" };
  }

  async synthesize(
    lines: NarrationLine[],
    opts: VoiceOpts,
  ): Promise<SynthesisResult> {
    // Fallback whenever Voicebox is absent, the user opted out (voice: none),
    // or we are in the deterministic golden harness.
    if (isMockMode() || opts.dryRun || opts.voice === "none") {
      return this.estimatedTiming(lines);
    }
    const healthy = await this.probeHealth();
    if (!healthy) {
      return this.estimatedTiming(lines);
    }
    try {
      return await this.realSynthesis(lines, opts);
    } catch {
      // Any failure on the live path degrades gracefully to estimated timing
      // rather than aborting the whole run (fallback-chain isolation).
      return this.estimatedTiming(lines);
    }
  }

  private async probeHealth(): Promise<boolean> {
    try {
      const res = await http.get(`${this.baseUrl}/health`, {
        timeout: 1500,
        validateStatus: () => true,
      });
      return res.status >= 200 && res.status < 300;
    } catch {
      return false;
    }
  }

  /**
   * Real Voicebox path. The MCP tool calls (voicebox_speak /
   * voicebox_transcribe) are agent-runtime concerns that cannot be exercised
   * from a unit test, so they are marked deferred; the REST /audio retrieval
   * and /health gating below are real and live.
   */
  private async realSynthesis(
    lines: NarrationLine[],
    opts: VoiceOpts,
  ): Promise<SynthesisResult> {
    await mkdir(path.join(opts.runDir, "audio"), { recursive: true });
    const rel = path.join("audio", "narration-01.wav");
    const text = lines.map((line) => line.text).join("\n");

    // TODO(oma-deferred): voicebox_speak — call the MCP tool
    //   voicebox_speak{ text, profile: opts.voice, language: opts.locale }
    // to obtain a generation_id. Until the MCP transport is wired in this
    // process, we derive the id from the REST submit endpoint below.
    const generationId = await this.submitSpeak(text, opts);

    // ★ design §5: MCP has no save-to-disk — retrieve the wav over REST.
    const wav = await http.get(`${this.baseUrl}/audio/${generationId}`, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    await writeFile(path.join(opts.runDir, rel), Buffer.from(wav.data));

    // TODO(oma-deferred): voicebox_transcribe — call the MCP tool
    //   voicebox_transcribe{ audio_path } on the saved wav for word-level
    //   timing. Until wired, request timing from the REST transcribe endpoint.
    const timing = await this.transcribe(rel, lines, opts.runDir);
    return { audio: { path: rel }, timing };
  }

  /** REST submit for speech generation; returns the generation_id. */
  private async submitSpeak(text: string, opts: VoiceOpts): Promise<string> {
    const res = await http.post(
      `${this.baseUrl}/speak`,
      { text, profile: opts.voice, language: opts.locale },
      { timeout: 30000 },
    );
    const id = (res.data as { generation_id?: string } | undefined)
      ?.generation_id;
    if (!id) throw new Error("voicebox: missing generation_id");
    return id;
  }

  /** REST transcribe of the saved wav into voicebox-stt timing. */
  private async transcribe(
    audioRel: string,
    lines: NarrationLine[],
    runDir: string,
  ): Promise<Timing> {
    const res = await http.post(
      `${this.baseUrl}/transcribe`,
      { audio_path: path.join(runDir, audioRel) },
      { timeout: 60000 },
    );
    const data = res.data as
      | {
          segments?: Array<{
            start: number;
            end: number;
            words?: Array<{ word: string; start: number; end: number }>;
          }>;
        }
      | undefined;
    const segments = data?.segments ?? [];
    if (segments.length === 0) {
      // Degrade to estimated timing while still keeping the real audio file.
      const est = estimateSegments(lines);
      return {
        schemaVersion: VIDEO_SCHEMA_VERSION,
        audio: audioRel,
        totalSec: est.totalSec,
        segments: est.segments.map((seg, idx) => ({
          ...seg,
          sceneId: lines[idx]?.sceneId ?? seg.sceneId,
        })),
        source: "voicebox-stt",
      };
    }
    let totalSec = 0;
    const mapped = segments.map((seg, idx) => {
      totalSec = Math.max(totalSec, seg.end);
      return {
        sceneId:
          lines[idx]?.sceneId ?? `scene-${String(idx + 1).padStart(2, "0")}`,
        startSec: seg.start,
        endSec: seg.end,
        words: (seg.words ?? []).map((w) => ({
          t: w.word,
          startSec: w.start,
          endSec: w.end,
        })),
      };
    });
    return {
      schemaVersion: VIDEO_SCHEMA_VERSION,
      audio: audioRel,
      totalSec,
      segments: mapped,
      source: "voicebox-stt",
    };
  }

  /**
   * Deterministic estimated timing, no audio file. Pure function of the lines:
   * each word gets a fixed duration, so timing.json is byte-identical on
   * replay (source: estimated).
   */
  private estimatedTiming(lines: NarrationLine[]): SynthesisResult {
    const est = estimateSegments(lines);
    return {
      audio: { path: "" },
      timing: {
        schemaVersion: VIDEO_SCHEMA_VERSION,
        audio: "",
        totalSec: est.totalSec,
        segments: est.segments,
        source: "estimated",
      },
    };
  }
}

/** Shared deterministic segment estimator (also reused on partial real paths). */
function estimateSegments(lines: NarrationLine[]): {
  totalSec: number;
  segments: Timing["segments"];
} {
  let cursor = 0;
  const segments = lines.map((line) => {
    const words = line.text.split(/\s+/).filter(Boolean);
    const duration = Math.max(1, words.length * ESTIMATED_SECONDS_PER_WORD);
    const startSec = cursor;
    const endSec = cursor + duration;
    cursor = endSec;
    return {
      sceneId: line.sceneId,
      startSec,
      endSec,
      words: words.map((t, idx) => ({
        t,
        startSec: startSec + idx * ESTIMATED_SECONDS_PER_WORD,
        endSec: startSec + (idx + 1) * ESTIMATED_SECONDS_PER_WORD,
      })),
    };
  });
  return { totalSec: cursor, segments };
}
