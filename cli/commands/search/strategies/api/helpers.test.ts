import { describe, expect, it } from "vitest";
import type { HttpResponse } from "../../types.js";
import {
  classifyStatus,
  errorResult,
  extractPath,
  firstSegment,
  invalidInputResult,
} from "./helpers.js";

function resp(init: Partial<HttpResponse>): HttpResponse {
  return {
    ok: init.status ? init.status >= 200 && init.status < 400 : true,
    status: init.status ?? 200,
    headers: init.headers ?? new Headers(),
    url: init.url ?? "https://example.com",
    text: init.text ?? "",
    elapsedMs: 0,
    redirected: false,
  };
}

describe("classifyStatus", () => {
  it("returns ok for healthy 200", () => {
    expect(classifyStatus(resp({ status: 200, text: "x" }), [])).toBe("ok");
  });

  it("returns not-found for 404", () => {
    expect(classifyStatus(resp({ status: 404 }), [])).toBe("not-found");
  });

  it("returns blocked for 429", () => {
    expect(classifyStatus(resp({ status: 429 }), [])).toBe("blocked");
  });

  it("returns blocked when WAF signal present", () => {
    expect(
      classifyStatus(resp({ status: 200, text: "x" }), [
        { kind: "waf-body", detail: "x", vendor: "cloudflare" },
      ]),
    ).toBe("blocked");
  });

  it("returns auth-required on paywall signal", () => {
    expect(
      classifyStatus(resp({ status: 200, text: "x" }), [
        { kind: "paywall", detail: "login" },
      ]),
    ).toBe("auth-required");
  });

  it("returns auth-required for 401", () => {
    expect(classifyStatus(resp({ status: 401 }), [])).toBe("auth-required");
  });

  it("returns error for 500", () => {
    expect(classifyStatus(resp({ status: 500 }), [])).toBe("error");
  });
});

describe("errorResult", () => {
  it("flags timeout based on message", () => {
    const result = errorResult({
      url: "https://x",
      error: new Error("Timeout after 5000ms"),
    });
    expect(result.status).toBe("timeout");
  });

  it("defaults to error", () => {
    const result = errorResult({
      url: "https://x",
      error: new Error("boom"),
    });
    expect(result.status).toBe("error");
    expect(result.error).toBe("boom");
  });

  it("retains custom strategy", () => {
    const result = errorResult({
      url: "https://x",
      error: "string error",
      strategy: "browser",
    });
    expect(result.strategy).toBe("browser");
  });
});

describe("invalidInputResult", () => {
  it("emits invalid-input status", () => {
    const result = invalidInputResult({
      url: "https://x",
      platform: "p",
      reason: "bad",
    });
    expect(result.status).toBe("invalid-input");
    expect(result.error).toBe("bad");
  });
});

describe("URL helpers", () => {
  it("extractPath respects prefix", () => {
    expect(extractPath(new URL("https://dev.to/username/slug-here"), "")).toBe(
      "username/slug-here",
    );
    expect(
      extractPath(
        new URL("https://dev.to/api/articles/user/slug"),
        "api/articles",
      ),
    ).toBe("user/slug");
  });

  it("firstSegment returns leading path", () => {
    expect(firstSegment(new URL("https://x.com/alice/foo"))).toBe("alice");
    expect(firstSegment(new URL("https://x.com/"))).toBeNull();
  });
});
