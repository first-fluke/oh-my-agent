import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageConfig } from "../config.js";
import type { GenerateInput, GenerateResult } from "../types.js";
import { GeminiProvider } from "./gemini.js";

const BASE_CONFIG: ImageConfig = {
  defaultOutputDir: "x",
  defaultVendor: "auto",
  defaultSize: "1024x1024",
  defaultQuality: "auto",
  defaultCount: 1,
  defaultTimeoutSec: 180,
  vendors: {
    codex: { enabled: true, model: "gpt-image-2" },
    gemini: {
      enabled: true,
      model: "gemini-2.5-flash-image",
      strategies: ["mcp", "stream", "api"],
    },
  },
  costGuardrail: { estimateThresholdUsd: 0.2, perImageUsd: {} },
  compare: { folderPattern: "x", manifest: true },
  naming: { singleFolderPattern: "x" },
  language: "en",
};

let mcpPrecheck = vi.fn();
let streamPrecheck = vi.fn();
let apiPrecheck = vi.fn();
let mcpRun = vi.fn();
let streamRun = vi.fn();
let apiRun = vi.fn();

vi.mock("../strategies/gemini-mcp.js", () => ({
  geminiMcpStrategy: {
    name: "mcp",
    precheck: () => mcpPrecheck(),
    run: () => mcpRun(),
  },
}));
vi.mock("../strategies/gemini-stream.js", () => ({
  geminiStreamStrategy: {
    name: "stream",
    precheck: () => streamPrecheck(),
    run: () => streamRun(),
  },
}));
vi.mock("../strategies/gemini-api.js", () => ({
  geminiApiStrategy: {
    name: "api",
    precheck: () => apiPrecheck(),
    run: () => apiRun(),
  },
}));

function makeInput(): GenerateInput {
  return {
    prompt: "p",
    size: "1024x1024",
    quality: "auto",
    n: 1,
    outDir: "/tmp",
    signal: new AbortController().signal,
    timeoutSec: 5,
  };
}

function fakeResult(strategy: string): GenerateResult {
  return {
    vendor: "gemini",
    model: "gemini-2.5-flash-image",
    strategy,
    strategyAttempts: [],
    filePath: "/tmp/out.png",
    mime: "image/png",
    durationMs: 1,
  };
}

describe("GeminiProvider strategy escalation", () => {
  beforeEach(() => {
    mcpPrecheck = vi.fn();
    streamPrecheck = vi.fn();
    apiPrecheck = vi.fn();
    mcpRun = vi.fn();
    streamRun = vi.fn();
    apiRun = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs first strategy that passes precheck", async () => {
    mcpPrecheck.mockResolvedValue({ ok: false, reason: "not-installed" });
    streamPrecheck.mockResolvedValue({ ok: true });
    streamRun.mockResolvedValue([fakeResult("stream")]);
    apiPrecheck.mockResolvedValue({ ok: false });

    const provider = new GeminiProvider(BASE_CONFIG);
    const out = await provider.generate(makeInput());
    expect(out[0]?.strategy).toBe("stream");
    expect(streamRun).toHaveBeenCalled();
    expect(apiRun).not.toHaveBeenCalled();
    const attempts = out[0]?.strategyAttempts;
    expect(attempts?.map((a) => a.status)).toEqual(["skipped", "ok"]);
  });

  it("records attempts when a strategy fails and moves to the next", async () => {
    mcpPrecheck.mockResolvedValue({ ok: true });
    mcpRun.mockRejectedValue({ kind: "network", retryable: true });
    streamPrecheck.mockResolvedValue({ ok: true });
    streamRun.mockResolvedValue([fakeResult("stream")]);
    apiPrecheck.mockResolvedValue({ ok: false });

    const provider = new GeminiProvider(BASE_CONFIG);
    const out = await provider.generate(makeInput());
    const statuses = out[0]?.strategyAttempts.map((a) => a.status);
    expect(statuses).toEqual(["failed", "ok"]);
  });

  it("short-circuits on safety-refused", async () => {
    mcpPrecheck.mockResolvedValue({ ok: true });
    mcpRun.mockRejectedValue({ kind: "safety-refused", message: "no" });
    streamPrecheck.mockResolvedValue({ ok: true });
    streamRun.mockResolvedValue([fakeResult("stream")]);

    const provider = new GeminiProvider(BASE_CONFIG);
    await expect(provider.generate(makeInput())).rejects.toMatchObject({
      kind: "safety-refused",
    });
    expect(streamRun).not.toHaveBeenCalled();
  });

  it("throws last error when every strategy is skipped or failed", async () => {
    mcpPrecheck.mockResolvedValue({ ok: false, reason: "not-installed" });
    streamPrecheck.mockResolvedValue({ ok: false, reason: "not-installed" });
    apiPrecheck.mockResolvedValue({ ok: false, reason: "api-key-required" });

    const provider = new GeminiProvider(BASE_CONFIG);
    await expect(provider.generate(makeInput())).rejects.toMatchObject({
      kind: "other",
    });
  });
});
