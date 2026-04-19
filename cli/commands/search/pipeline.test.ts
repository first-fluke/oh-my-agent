import { beforeEach, describe, expect, it, vi } from "vitest";
import { runPipeline } from "./pipeline.js";
import type { FetchContext, FetchResult } from "./types.js";

const apiMock = vi.hoisted(() => vi.fn());
const probeMock = vi.hoisted(() => vi.fn());
const impersonateMock = vi.hoisted(() => vi.fn());
const browserMock = vi.hoisted(() => vi.fn());
const archiveMock = vi.hoisted(() => vi.fn());

vi.mock("./strategies/api/index.js", () => ({
  apiStrategy: apiMock,
  apiKeywordSearch: vi.fn(),
  findHandler: vi.fn(),
  apiHandlers: [],
  PLATFORM_HANDLERS: [],
}));

vi.mock("./strategies/probe.js", () => ({
  probeStrategy: probeMock,
}));

vi.mock("./strategies/impersonate.js", () => ({
  impersonateStrategy: impersonateMock,
  IMPERSONATE_TARGETS: ["safari", "chrome", "firefox"] as const,
}));

vi.mock("./strategies/browser.js", () => ({
  browserStrategy: browserMock,
  findChromeExecutable: vi.fn(),
}));

vi.mock("./strategies/archive.js", () => ({
  archiveStrategy: archiveMock,
}));

function makeCtx(): FetchContext {
  return { timeoutMs: 1000, locale: "en-US,en;q=0.9" };
}

function okResult(strategy: FetchResult["strategy"]): FetchResult {
  return {
    url: "https://example.com",
    status: "ok",
    strategy,
    content: "x".repeat(500),
    elapsedMs: 1,
    signals: [],
  };
}

function blockedResult(strategy: FetchResult["strategy"]): FetchResult {
  return {
    url: "https://example.com",
    status: "blocked",
    strategy,
    content: "",
    elapsedMs: 1,
    signals: [{ kind: "waf-body", detail: "cf", vendor: "cloudflare" }],
  };
}

beforeEach(() => {
  apiMock.mockReset();
  probeMock.mockReset();
  impersonateMock.mockReset();
  browserMock.mockReset();
  archiveMock.mockReset();
});

describe("runPipeline — happy path", () => {
  it("returns early when api strategy succeeds", async () => {
    apiMock.mockResolvedValue(okResult("api"));
    const result = await runPipeline(
      new URL("https://news.ycombinator.com/?id=1"),
      makeCtx(),
    );
    expect(result.status).toBe("ok");
    expect(result.strategy).toBe("api");
    expect(probeMock).not.toHaveBeenCalled();
  });

  it("escalates to probe when api returns null (no handler)", async () => {
    apiMock.mockResolvedValue(null);
    probeMock.mockResolvedValue(okResult("probe"));
    const result = await runPipeline(
      new URL("https://unknown.example.com"),
      makeCtx(),
    );
    expect(result.strategy).toBe("probe");
  });

  it("escalates through probe → impersonate → browser", async () => {
    apiMock.mockResolvedValue(null);
    probeMock.mockResolvedValue(blockedResult("probe"));
    impersonateMock.mockResolvedValue(blockedResult("impersonate"));
    browserMock.mockResolvedValue(okResult("browser"));

    const result = await runPipeline(
      new URL("https://hard.example.com"),
      makeCtx(),
    );
    expect(result.strategy).toBe("browser");
    // api returns null so it doesn't record an attempt; probe+impersonate+browser = 3
    expect(result.attempts).toHaveLength(3);
  });
});

describe("runPipeline — early termination", () => {
  it("returns on auth-required without trying remaining strategies", async () => {
    apiMock.mockResolvedValue(null);
    probeMock.mockResolvedValue({
      ...blockedResult("probe"),
      status: "auth-required",
      signals: [{ kind: "paywall", detail: "login" }],
    });

    const result = await runPipeline(
      new URL("https://paywalled.example.com"),
      makeCtx(),
    );
    expect(result.status).toBe("auth-required");
    expect(impersonateMock).not.toHaveBeenCalled();
    expect(browserMock).not.toHaveBeenCalled();
  });

  it("skips impersonate when JS-essential markers were seen", async () => {
    apiMock.mockResolvedValue(null);
    probeMock.mockResolvedValue({
      ...blockedResult("probe"),
      signals: [{ kind: "js-essential", detail: "behavioral-content" }],
    });
    browserMock.mockResolvedValue(okResult("browser"));

    const result = await runPipeline(
      new URL("https://js-heavy.example.com"),
      makeCtx(),
    );
    expect(result.strategy).toBe("browser");
    expect(impersonateMock).not.toHaveBeenCalled();
  });
});

describe("runPipeline — options", () => {
  it("respects --only filter", async () => {
    browserMock.mockResolvedValue(okResult("browser"));
    const result = await runPipeline(
      new URL("https://example.com"),
      makeCtx(),
      { only: ["browser"] },
    );
    expect(result.strategy).toBe("browser");
    expect(apiMock).not.toHaveBeenCalled();
    expect(probeMock).not.toHaveBeenCalled();
  });

  it("respects --skip filter", async () => {
    apiMock.mockResolvedValue(null);
    impersonateMock.mockResolvedValue(okResult("impersonate"));
    await runPipeline(new URL("https://example.com"), makeCtx(), {
      skip: ["probe"],
    });
    expect(probeMock).not.toHaveBeenCalled();
    expect(impersonateMock).toHaveBeenCalledOnce();
  });

  it("retries once on rate-limit before escalating", async () => {
    apiMock.mockResolvedValue(null);
    probeMock
      .mockResolvedValueOnce({
        ...blockedResult("probe"),
        signals: [{ kind: "rate-limit", detail: "status=429" }],
      })
      .mockResolvedValueOnce(okResult("probe"));

    const result = await runPipeline(new URL("https://example.com"), makeCtx());
    expect(result.status).toBe("ok");
    expect(probeMock).toHaveBeenCalledTimes(2);
  });
});
