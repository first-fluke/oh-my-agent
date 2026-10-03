import { describe, expect, it } from "vitest";
import {
  injectWindowToken,
  isJsonContentType,
  isLoopbackHost,
  isLoopbackOrigin,
  tokensMatch,
} from "./loopback-http.js";

describe("isLoopbackHost", () => {
  it("accepts this server's loopback host names", () => {
    expect(isLoopbackHost("127.0.0.1:3737", 3737)).toBe(true);
    expect(isLoopbackHost("localhost:3737", 3737)).toBe(true);
    expect(isLoopbackHost("LOCALHOST:3737", 3737)).toBe(true);
    expect(isLoopbackHost("[::1]:3737", 3737)).toBe(true);
  });

  it("rejects DNS-rebound, other-port, and missing hosts", () => {
    expect(isLoopbackHost("rebind.evil.example:3737", 3737)).toBe(false);
    expect(isLoopbackHost("127.0.0.1.nip.io:3737", 3737)).toBe(false);
    expect(isLoopbackHost("127.0.0.1:3738", 3737)).toBe(false);
    expect(isLoopbackHost("127.0.0.1", 3737)).toBe(false);
    expect(isLoopbackHost(undefined, 3737)).toBe(false);
  });

  it("accepts a bare host only on port 80, where browsers omit it", () => {
    expect(isLoopbackHost("localhost", 80)).toBe(true);
  });
});

describe("isLoopbackOrigin", () => {
  it("allows requests without an Origin header", () => {
    expect(isLoopbackOrigin(undefined, 3737)).toBe(true);
  });

  it("allows this server's own origin", () => {
    expect(isLoopbackOrigin("http://127.0.0.1:3737", 3737)).toBe(true);
    expect(isLoopbackOrigin("http://localhost:3737", 3737)).toBe(true);
    expect(isLoopbackOrigin("http://[::1]:3737", 3737)).toBe(true);
  });

  it("rejects foreign, opaque, https, and other-port origins", () => {
    expect(isLoopbackOrigin("https://evil.example", 3737)).toBe(false);
    expect(isLoopbackOrigin("null", 3737)).toBe(false);
    expect(isLoopbackOrigin("https://127.0.0.1:3737", 3737)).toBe(false);
    expect(isLoopbackOrigin("http://127.0.0.1:9999", 3737)).toBe(false);
    expect(isLoopbackOrigin("http://127.0.0.1", 3737)).toBe(false);
  });
});

describe("tokensMatch", () => {
  it("matches only the exact token", () => {
    expect(tokensMatch("secret-token", "secret-token")).toBe(true);
    expect(tokensMatch("secret-token", "secret-tokem")).toBe(false);
    expect(tokensMatch("secret-token", "secret")).toBe(false);
    expect(tokensMatch("secret-token", "")).toBe(false);
    expect(tokensMatch("secret-token", null)).toBe(false);
    expect(tokensMatch("secret-token", undefined)).toBe(false);
  });
});

describe("isJsonContentType", () => {
  it("accepts application/json with or without parameters", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("Application/JSON; charset=utf-8")).toBe(true);
  });

  it("rejects CORS-simple and missing content types", () => {
    expect(isJsonContentType("text/plain;charset=UTF-8")).toBe(false);
    expect(isJsonContentType("application/x-www-form-urlencoded")).toBe(false);
    expect(isJsonContentType("multipart/form-data; boundary=x")).toBe(false);
    expect(isJsonContentType(undefined)).toBe(false);
  });
});

describe("injectWindowToken", () => {
  it("inserts the token as a JSON string before </head>", () => {
    expect(injectWindowToken("<head></head>", "__TOKEN__", 'a"b')).toBe(
      '<head><script>window.__TOKEN__="a\\"b";</script>\n</head>',
    );
  });
});
