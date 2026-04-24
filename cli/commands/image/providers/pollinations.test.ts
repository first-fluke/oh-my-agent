import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageConfig } from "../config.js";
import type { GenerateInput } from "../types.js";
import { PollinationsProvider } from "./pollinations.js";

const stubConfig: ImageConfig = {
  defaultOutputDir: "x",
  defaultVendor: "auto",
  defaultSize: "1024x1024",
  defaultQuality: "auto",
  defaultCount: 1,
  defaultTimeoutSec: 180,
  vendors: {
    pollinations: { enabled: true, model: "flux" },
    codex: { enabled: true, model: "gpt-image-2" },
    gemini: { enabled: true, model: "gemini-2.5-flash-image" },
  },
  costGuardrail: { estimateThresholdUsd: 0.2, perImageUsd: {} },
  compare: { folderPattern: "x", manifest: true },
  naming: { singleFolderPattern: "x" },
  language: "en",
};

function makeInput(
  overrides: Partial<GenerateInput> & { outDir: string },
): GenerateInput {
  return {
    prompt: "a red apple",
    size: "1024x1024",
    quality: "auto",
    n: 1,
    signal: new AbortController().signal,
    timeoutSec: 30,
    ...overrides,
  };
}

describe("PollinationsProvider.health", () => {
  const originalKey = process.env.POLLINATIONS_API_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.POLLINATIONS_API_KEY;
    else process.env.POLLINATIONS_API_KEY = originalKey;
  });

  it("reports unhealthy when API key is missing", async () => {
    delete process.env.POLLINATIONS_API_KEY;
    const p = new PollinationsProvider(stubConfig);
    const h = await p.health();
    expect(h.ok).toBe(false);
    if (!h.ok) {
      expect(h.reason).toBe("not-authenticated");
      expect(h.hint).toMatch(/POLLINATIONS_API_KEY/);
    }
  });

  it("reports healthy when key is set and exposes both free and credit-gated models", async () => {
    process.env.POLLINATIONS_API_KEY = "sk_test";
    const p = new PollinationsProvider(stubConfig);
    const h = await p.health();
    expect(h.ok).toBe(true);
    if (h.ok) {
      expect(h.supportedModels).toContain("flux");
      expect(h.supportedModels).toContain("zimage");
      expect(h.supportedModels).toContain("qwen-image");
    }
  });
});

describe("PollinationsProvider.generate", () => {
  let tmp: string;
  const originalKey = process.env.POLLINATIONS_API_KEY;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-poll-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.POLLINATIONS_API_KEY;
    else process.env.POLLINATIONS_API_KEY = originalKey;
  });

  it("throws auth-required when API key missing", async () => {
    delete process.env.POLLINATIONS_API_KEY;
    const p = new PollinationsProvider(stubConfig);
    await expect(p.generate(makeInput({ outDir: tmp }))).rejects.toMatchObject({
      kind: "auth-required",
    });
  });

  it("writes the image file and returns a GenerateResult on success", async () => {
    process.env.POLLINATIONS_API_KEY = "sk_test";
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const b64 = jpegMagic.toString("base64");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [{ b64_json: b64 }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const p = new PollinationsProvider(stubConfig);
    const results = await p.generate(makeInput({ outDir: tmp }));
    expect(results).toHaveLength(1);
    expect(results[0]?.vendor).toBe("pollinations");
    expect(results[0]?.model).toBe("flux");
    expect(results[0]?.strategy).toBe("pollinations-api");
    expect(results[0]?.costUsd).toBe(0);
    const firstPath = results[0]?.filePath;
    expect(firstPath).toBeTruthy();
    if (!firstPath) return;
    const written = readFileSync(firstPath);
    expect(written.slice(0, 6).equals(jpegMagic)).toBe(true);
  });

  it("classifies pollen/credit errors as invalid-input with model hint", async () => {
    process.env.POLLINATIONS_API_KEY = "sk_test";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                message:
                  "Insufficient balance. This model costs ~0.04 pollen per request.",
              },
            }),
            { status: 402, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    const p = new PollinationsProvider(stubConfig);
    await expect(
      p.generate(makeInput({ outDir: tmp, model: "qwen-image" })),
    ).rejects.toMatchObject({
      kind: "invalid-input",
      field: "model",
    });
  });

  it("maps HTTP 401 to auth-required", async () => {
    process.env.POLLINATIONS_API_KEY = "sk_test";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "unauthorized" } }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const p = new PollinationsProvider(stubConfig);
    await expect(p.generate(makeInput({ outDir: tmp }))).rejects.toMatchObject({
      kind: "auth-required",
    });
  });

  it("maps HTTP 429 to rate-limit and forwards Retry-After", async () => {
    process.env.POLLINATIONS_API_KEY = "sk_test";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "slow down" } }), {
            status: 429,
            headers: { "content-type": "application/json", "retry-after": "7" },
          }),
      ),
    );
    const p = new PollinationsProvider(stubConfig);
    await expect(p.generate(makeInput({ outDir: tmp }))).rejects.toMatchObject({
      kind: "rate-limit",
      retry_after_sec: 7,
    });
  });

  it("uses --model override over config default", async () => {
    process.env.POLLINATIONS_API_KEY = "sk_test";
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const b64 = jpegMagic.toString("base64");
    const fetchMock = vi.fn(
      async (_url: string, _init?: { body?: string }) =>
        new Response(JSON.stringify({ data: [{ b64_json: b64 }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = new PollinationsProvider(stubConfig);
    const results = await p.generate(
      makeInput({ outDir: tmp, model: "zimage" }),
    );
    expect(results[0]?.model).toBe("zimage");
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeTruthy();
    const body = JSON.parse(String(firstCall?.[1]?.body ?? "{}"));
    expect(body.model).toBe("zimage");
  });
});
