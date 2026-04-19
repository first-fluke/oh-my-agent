import { describe, expect, it } from "vitest";
import {
  detectJinaQuota,
  detectSignals,
  hasBlockingSignals,
  hasJsEssential,
  hasPaywall,
  hasRateLimit,
  isSpaEmpty,
  isSuccessfulContent,
} from "./signals.js";
import type { HttpResponse } from "./types.js";

function response(init: Partial<HttpResponse>): HttpResponse {
  return {
    ok: init.status ? init.status >= 200 && init.status < 400 : true,
    status: init.status ?? 200,
    headers: init.headers ?? new Headers(),
    url: init.url ?? "https://example.com",
    text: init.text ?? "",
    elapsedMs: init.elapsedMs ?? 10,
    redirected: init.redirected ?? false,
  };
}

describe("signals.detectSignals", () => {
  it("detects rate limit for 429 with retry-after", () => {
    const resp = response({
      status: 429,
      headers: new Headers({ "retry-after": "2" }),
    });
    const hits = detectSignals(resp);
    expect(hits.some((h) => h.kind === "rate-limit")).toBe(true);
    expect(hits.find((h) => h.kind === "rate-limit")?.detail).toContain(
      "retry-after=2",
    );
  });

  it("detects cloudflare via cf-ray header", () => {
    const resp = response({
      status: 403,
      headers: new Headers({ "cf-ray": "abc-1234" }),
    });
    const hits = detectSignals(resp);
    expect(
      hits.some((h) => h.kind === "waf-header" && h.vendor === "cloudflare"),
    ).toBe(true);
    expect(hits.some((h) => h.kind === "http-status")).toBe(true);
  });

  it("does not flag cloudflare for server header with different value", () => {
    const resp = response({
      headers: new Headers({ server: "nginx/1.25" }),
    });
    const hits = detectSignals(resp);
    expect(hits.some((h) => h.kind === "waf-header")).toBe(false);
  });

  it("detects cloudfront fingerprint", () => {
    const body =
      "<html>some wrapper AwsWafIntegration.forceRefreshToken more</html>";
    const hits = detectSignals(response({ status: 200, text: body }));
    expect(
      hits.some((h) => h.kind === "waf-body" && h.vendor === "cloudfront"),
    ).toBe(true);
  });

  it("detects JS-essential markers", () => {
    const body = "some body behavioral-content ".repeat(20);
    const hits = detectSignals(response({ status: 200, text: body }));
    expect(hasJsEssential(hits)).toBe(true);
  });

  it("detects Korean paywall prompt", () => {
    const body = `${"긴 컨텐츠 ".repeat(100)} 로그인 후 이용 가능합니다.`;
    const hits = detectSignals(response({ status: 200, text: body }));
    expect(hasPaywall(hits)).toBe(true);
  });

  it("detects SPA empty shell", () => {
    const body = '<html><body><div id="root"></div></body></html>';
    const hits = detectSignals(response({ status: 200, text: body }));
    expect(hits.some((h) => h.kind === "spa-empty")).toBe(true);
  });

  it("hasBlockingSignals handles aggregate detection", () => {
    const body = '<span id="challenge-error-text">';
    const hits = detectSignals(response({ status: 403, text: body }));
    expect(hasBlockingSignals(hits)).toBe(true);
  });

  it("hasRateLimit inspects 503", () => {
    const hits = detectSignals(response({ status: 503 }));
    expect(hasRateLimit(hits)).toBe(true);
  });
});

describe("signals.detectJinaQuota", () => {
  it("identifies 402 quota response", () => {
    const signal = detectJinaQuota(response({ status: 402 }));
    expect(signal?.kind).toBe("jina-quota");
  });

  it("returns null for healthy response", () => {
    const signal = detectJinaQuota(response({ status: 200, text: "ok" }));
    expect(signal).toBeNull();
  });

  it("detects quota markers in body", () => {
    const signal = detectJinaQuota(
      response({ status: 200, text: "you have exceeded your quota today" }),
    );
    expect(signal?.kind).toBe("jina-quota");
  });
});

describe("signals.isSpaEmpty", () => {
  it("empty string is empty SPA", () => {
    expect(isSpaEmpty("")).toBe(true);
  });

  it("long body is not SPA", () => {
    expect(isSpaEmpty("x".repeat(300))).toBe(false);
  });

  it("root div only body is SPA", () => {
    expect(isSpaEmpty('<div id="root"></div>')).toBe(true);
  });
});

describe("signals.isSuccessfulContent", () => {
  it("rejects small body", () => {
    const resp = response({ status: 200, text: "short" });
    expect(isSuccessfulContent(resp, [])).toBe(false);
  });

  it("accepts large clean body", () => {
    const resp = response({ status: 200, text: "x".repeat(500) });
    expect(isSuccessfulContent(resp, [])).toBe(true);
  });

  it("rejects body with WAF signal", () => {
    const resp = response({ status: 200, text: "x".repeat(500) });
    expect(
      isSuccessfulContent(resp, [
        { kind: "waf-body", detail: "cf", vendor: "cloudflare" },
      ]),
    ).toBe(false);
  });
});
