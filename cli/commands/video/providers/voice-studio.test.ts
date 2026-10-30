// Regression tests for the VoiceStudio backend of the oma-voice provider
// (voice.backend: auto | voicebox | voicestudio) and its estimated fallback.
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@cli/io/http", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

import { http } from "@cli/io/http";
import { VoiceStudioClient } from "../internal/voicestudio-api.js";
import { VoiceboxVoiceProvider } from "./voice.js";

const VOICEBOX = "http://127.0.0.1:17493";
const STUDIO = "http://127.0.0.1:3900";
const SPEECH_URL = `${STUDIO}/v1/audio/speech`;
const TRANSCRIBE_URL = `${STUDIO}/v1/audio/transcriptions`;

const httpGet = vi.mocked(http.get);
const httpPost = vi.mocked(http.post);

const LINES = [{ sceneId: "scene-01", text: "one two" }];
const OPTS = { voice: "studio-profile", locale: "en" };

const WAV = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([36, 0, 0, 0]),
  Buffer.from("WAVEfmt "),
]);

/** A standalone ArrayBuffer (small Buffers share Node's allocation pool). */
function bytes(buffer: Buffer): ArrayBuffer {
  return new Uint8Array(buffer).buffer;
}

const VERBOSE = {
  text: "one two",
  segments: [{ id: 0, start: 0, end: 2, text: "one two" }],
  words: [
    { word: "one", start: 0, end: 1 },
    { word: "two", start: 1, end: 2 },
  ],
};

/** Route the two /health probes; `voicebox` / `studio` say which is up. */
function mockHealth({
  voicebox,
  studio,
}: {
  voicebox: boolean;
  studio: boolean;
}) {
  httpGet.mockImplementation(async (url: string) => {
    if (url === `${VOICEBOX}/health`) {
      if (voicebox) return { status: 200, data: "ok" };
      throw new Error("connect ECONNREFUSED 127.0.0.1:17493");
    }
    if (url === `${STUDIO}/health`) {
      if (studio) return { status: 200, data: { status: "ok" } };
      throw new Error("connect ECONNREFUSED 127.0.0.1:3900");
    }
    throw new Error(`unexpected GET ${url}`);
  });
}

function provider(backend: "auto" | "voicebox" | "voicestudio") {
  return new VoiceboxVoiceProvider(
    VOICEBOX,
    backend,
    new VoiceStudioClient(STUDIO),
  );
}

describe("VoiceboxVoiceProvider VoiceStudio backend", () => {
  let tmp: string;
  const originalKey = process.env.OMNIVOICE_API_KEY;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-voice-studio-"));
    delete process.env.OMA_VIDEO_MOCK;
    delete process.env.OMNIVOICE_API_KEY;
    vi.clearAllMocks();
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalKey === undefined) delete process.env.OMNIVOICE_API_KEY;
    else process.env.OMNIVOICE_API_KEY = originalKey;
  });

  it("auto falls through to VoiceStudio when Voicebox is down", async () => {
    mockHealth({ voicebox: false, studio: true });
    httpPost.mockImplementation(async (url: string, body: unknown) => {
      if (url === SPEECH_URL) {
        expect(body).toEqual({
          model: "tts-1",
          voice: "studio-profile",
          input: "one two",
          response_format: "wav",
        });
        return { status: 200, data: bytes(WAV), headers: {} };
      }
      if (url === TRANSCRIBE_URL) {
        const form = body as FormData;
        expect(form.get("response_format")).toBe("verbose_json");
        expect(form.getAll("timestamp_granularities[]")).toEqual([
          "segment",
          "word",
        ]);
        return { status: 200, data: VERBOSE, headers: {} };
      }
      throw new Error(`unexpected POST ${url}`);
    });

    const { audio, timing } = await provider("auto").synthesize(LINES, {
      runDir: tmp,
      ...OPTS,
    });

    expect(audio.path).toBe(path.join("audio", "narration-01.wav"));
    expect(readFileSync(path.join(tmp, audio.path))).toEqual(WAV);
    expect(timing.source).toBe("voicestudio-stt");
    expect(timing.totalSec).toBe(2);
    expect(timing.segments[0]?.sceneId).toBe("scene-01");
    expect(timing.segments[0]?.words).toEqual([
      { t: "one", startSec: 0, endSec: 1 },
      { t: "two", startSec: 1, endSec: 2 },
    ]);
    const postedUrls = httpPost.mock.calls.map((call) => call[0]);
    expect(postedUrls).not.toContain(`${VOICEBOX}/mcp`);
  });

  it("auto keeps Voicebox when both backends are healthy", async () => {
    mockHealth({ voicebox: true, studio: true });
    httpPost.mockRejectedValue(new Error("voicebox speak failed"));

    await provider("auto").synthesize(LINES, { runDir: tmp, ...OPTS });

    const postedUrls = httpPost.mock.calls.map((call) => call[0]);
    expect(postedUrls).not.toContain(SPEECH_URL);
    expect(httpGet.mock.calls.map((call) => call[0])).not.toContain(
      `${STUDIO}/health`,
    );
  });

  it("voicestudio never probes Voicebox", async () => {
    mockHealth({ voicebox: true, studio: true });
    httpPost.mockImplementation(async (url: string) => {
      if (url === SPEECH_URL) {
        return { status: 200, data: bytes(WAV), headers: {} };
      }
      if (url === TRANSCRIBE_URL) {
        return { status: 200, data: VERBOSE, headers: {} };
      }
      throw new Error(`unexpected POST ${url}`);
    });

    const { timing } = await provider("voicestudio").synthesize(LINES, {
      runDir: tmp,
      ...OPTS,
    });

    expect(timing.source).toBe("voicestudio-stt");
    expect(httpGet.mock.calls.map((call) => call[0])).toEqual([
      `${STUDIO}/health`,
    ]);
  });

  it("voicebox never falls through to VoiceStudio", async () => {
    mockHealth({ voicebox: false, studio: true });

    const { audio, timing } = await provider("voicebox").synthesize(LINES, {
      runDir: tmp,
      ...OPTS,
    });

    expect(timing.source).toBe("estimated");
    expect(audio.path).toBe("");
    expect(httpGet.mock.calls.map((call) => call[0])).toEqual([
      `${VOICEBOX}/health`,
    ]);
    expect(httpPost).not.toHaveBeenCalled();
  });

  it("does not save a non-WAV speech body and degrades to estimated timing", async () => {
    mockHealth({ voicebox: false, studio: true });
    httpPost.mockImplementation(async (url: string) => {
      if (url === SPEECH_URL) {
        const error = Buffer.from(JSON.stringify({ detail: "unknown voice" }));
        return { status: 200, data: bytes(error), headers: {} };
      }
      throw new Error(`unexpected POST ${url}`);
    });

    const { audio, timing } = await provider("auto").synthesize(LINES, {
      runDir: tmp,
      ...OPTS,
    });

    expect(timing.source).toBe("estimated");
    expect(audio.path).toBe("");
    expect(existsSync(path.join(tmp, "audio", "narration-01.wav"))).toBe(false);
  });

  it("keeps the real wav with estimated segments when transcription fails", async () => {
    mockHealth({ voicebox: false, studio: true });
    httpPost.mockImplementation(async (url: string) => {
      if (url === SPEECH_URL) {
        return { status: 200, data: bytes(WAV), headers: {} };
      }
      throw new Error("asr model not installed");
    });

    const { audio, timing } = await provider("auto").synthesize(LINES, {
      runDir: tmp,
      ...OPTS,
    });

    expect(audio.path).toBe(path.join("audio", "narration-01.wav"));
    expect(timing.audio).toBe(audio.path);
    expect(timing.source).toBe("voicestudio-stt");
    expect(timing.segments[0]?.sceneId).toBe("scene-01");
    expect(timing.segments[0]?.words.map((word) => word.t)).toEqual([
      "one",
      "two",
    ]);
  });

  it("estimates without probing either backend for voice none", async () => {
    const { timing } = await provider("auto").synthesize(LINES, {
      runDir: tmp,
      voice: "none",
      locale: "en",
    });

    expect(timing.source).toBe("estimated");
    expect(httpGet).not.toHaveBeenCalled();
  });
});

describe("VoiceStudioClient bearer key", () => {
  const originalKey = process.env.OMNIVOICE_API_KEY;
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OMNIVOICE_API_KEY = "studio-secret";
    httpPost.mockResolvedValue({
      status: 200,
      data: bytes(WAV),
      headers: {},
    });
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OMNIVOICE_API_KEY;
    else process.env.OMNIVOICE_API_KEY = originalKey;
  });

  function sentAuthorization(): string | undefined {
    const config = httpPost.mock.calls[0]?.[2] as AxiosRequestConfig;
    return (config.headers as Record<string, string>).authorization;
  }

  it("sends the key to a loopback backend", async () => {
    await new VoiceStudioClient(STUDIO).speech("hi", "v");
    expect(sentAuthorization()).toBe("Bearer studio-secret");
  });

  it("withholds the key from a plain-HTTP remote backend", async () => {
    await new VoiceStudioClient("http://192.168.1.50:3901").speech("hi", "v");
    expect(sentAuthorization()).toBeUndefined();
  });

  it("sends the key to an HTTPS backend", async () => {
    await new VoiceStudioClient("https://studio.example.ts.net").speech(
      "hi",
      "v",
    );
    expect(sentAuthorization()).toBe("Bearer studio-secret");
  });
});
