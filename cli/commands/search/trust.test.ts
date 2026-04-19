import { describe, expect, it, vi } from "vitest";
import { trustScore } from "./trust.js";

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
