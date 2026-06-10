import { describe, expect, it, vi } from "vitest";
import { isSafePublicDomain, trustScore } from "./trust.js";

vi.mock("./http.js", () => ({
  httpFetch: vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    headers: new Headers(),
    url: "https://tranco-list.eu",
    text: "",
    elapsedMs: 0,
    redirected: false,
  }),
}));

describe("trustScore", () => {
  it("resolves verified registry hit", async () => {
    const result = await trustScore("github.com");
    expect(result.level).toBe("verified");
    expect(result.source).toBe("registry");
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("strips www prefix", async () => {
    const result = await trustScore("www.github.com");
    expect(result.level).toBe("verified");
  });

  it("returns heuristic verified for .gov", async () => {
    const result = await trustScore("data.ny.gov");
    expect(result.source).toBe("heuristic");
    expect(result.level).toBe("verified");
  });

  it("returns heuristic verified for .ac.kr", async () => {
    const result = await trustScore("yonsei.ac.kr");
    expect(result.source).toBe("heuristic");
    expect(result.level).toBe("verified");
  });

  it("falls back to unknown for unrecognized domain", async () => {
    const result = await trustScore("totally-unknown-domain-123456.example");
    expect(result.level).toBe("unknown");
    expect(result.score).toBeNull();
  });
});

describe("isSafePublicDomain (SSRF guard)", () => {
  it("accepts well-formed public FQDNs", () => {
    expect(isSafePublicDomain("github.com")).toBe(true);
    expect(isSafePublicDomain("sub.domain.example.org")).toBe(true);
    expect(isSafePublicDomain("xn--bcher-kva.example")).toBe(true);
  });

  it("rejects loopback and private-range hosts", () => {
    expect(isSafePublicDomain("localhost")).toBe(false);
    expect(isSafePublicDomain("127.0.0.1")).toBe(false);
    expect(isSafePublicDomain("10.0.0.1")).toBe(false);
    expect(isSafePublicDomain("192.168.1.1")).toBe(false);
    expect(isSafePublicDomain("172.16.0.1")).toBe(false);
    expect(isSafePublicDomain("169.254.169.254")).toBe(false);
  });

  it("rejects malformed or injectable hostnames", () => {
    expect(isSafePublicDomain("internal-service")).toBe(false);
    expect(isSafePublicDomain("evil.com/../../admin")).toBe(false);
    expect(isSafePublicDomain("evil.com?x=1")).toBe(false);
    expect(isSafePublicDomain("evil.com#frag")).toBe(false);
    expect(isSafePublicDomain("a b.com")).toBe(false);
    expect(isSafePublicDomain(`${"a".repeat(260)}.com`)).toBe(false);
  });
});
