// Minimal client for the local VoiceStudio backend (debpalash/VoiceStudio).
//
// VoiceStudio serves an OpenAI-compatible speech API on its single backend
// (default http://127.0.0.1:3900): POST /v1/audio/speech returns the audio
// bytes, POST /v1/audio/transcriptions returns verbose_json segments with word
// timestamps. Its MCP surface returns base64 or backend-side paths, so the
// video provider stays on REST for a direct save-to-disk. Loopback needs no
// credential; OMNIVOICE_API_KEY (upstream's bearer key) is sent only to a
// loopback or HTTPS backend and never logged.
import { http } from "@cli/io/http";
import { VOICESTUDIO_BASE_URL } from "./readiness.js";

/** One transcription segment with its words (seconds from audio start). */
export interface TranscriptSegment {
  start: number;
  end: number;
  words?: Array<{ word: string; start: number; end: number }>;
}

interface VerboseTranscription {
  segments?: TranscriptSegment[];
  words?: Array<{ word: string; start: number; end: number }>;
}

const SPEECH_TIMEOUT_MS = 600_000;
const TRANSCRIBE_TIMEOUT_MS = 300_000;

export class VoiceStudioClient {
  constructor(private readonly baseUrl: string = VOICESTUDIO_BASE_URL) {}

  async healthy(): Promise<boolean> {
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
   * Synthesize `text` with the saved voice `voice` as WAV. Throws on a non-2xx
   * status or a body that is not WAV (an error body must never be saved as
   * narration audio).
   */
  async speech(text: string, voice: string): Promise<Buffer> {
    const res = await http.post(
      `${this.baseUrl}/v1/audio/speech`,
      { model: "tts-1", voice, input: text, response_format: "wav" },
      {
        responseType: "arraybuffer",
        timeout: SPEECH_TIMEOUT_MS,
        headers: this.authHeaders(),
      },
    );
    const bytes = Buffer.from(res.data as ArrayBuffer);
    if (
      bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
      bytes.subarray(8, 12).toString("ascii") !== "WAVE"
    ) {
      throw new Error("voicestudio: speech response is not WAV audio");
    }
    return bytes;
  }

  /** Word-timed segments for `wav`; words are grouped into their segment. */
  async transcribe(wav: Buffer): Promise<TranscriptSegment[]> {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(wav)], { type: "audio/wav" }),
      "narration.wav",
    );
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    form.append("timestamp_granularities[]", "word");
    const res = await http.post(
      `${this.baseUrl}/v1/audio/transcriptions`,
      form,
      { timeout: TRANSCRIBE_TIMEOUT_MS, headers: this.authHeaders() },
    );
    return groupWords(res.data as VerboseTranscription | undefined);
  }

  private authHeaders(): Record<string, string> {
    const key = process.env.OMNIVOICE_API_KEY;
    if (!key || !allowsBearer(this.baseUrl)) return {};
    return { authorization: `Bearer ${key}` };
  }
}

/** A bearer key may travel only over HTTPS or to this host. */
function allowsBearer(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    if (url.protocol === "https:") return true;
    return ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * OpenAI verbose_json lists words beside the segments; some servers nest them.
 * Keep nested words, otherwise assign each top-level word to the segment its
 * start falls in.
 */
function groupWords(
  data: VerboseTranscription | undefined,
): TranscriptSegment[] {
  const words = data?.words ?? [];
  return (data?.segments ?? []).map((segment) => ({
    start: segment.start,
    end: segment.end,
    words:
      segment.words ??
      words.filter(
        (word) => word.start >= segment.start && word.start < segment.end,
      ),
  }));
}
