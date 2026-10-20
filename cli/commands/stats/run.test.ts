import { describe, expect, it, vi } from "vitest";
import { listAllSessionUsage } from "../../io/session-cost.js";
import { aggregateCost } from "./run.js";

vi.mock("../../io/session-cost.js", async (original) => ({
  ...(await original<typeof import("../../io/session-cost.js")>()),
  listAllSessionUsage: vi.fn(),
}));

describe("usage summary", () => {
  it("separates measured tokens from prompt estimates and prices only input", () => {
    vi.mocked(listAllSessionUsage).mockReturnValue([
      {
        sessionId: "s",
        agentId: "a",
        vendor: "codex",
        tokens: 1000,
        recordedAt: "now",
        usageSource: "native-transcript",
        tokenBreakdown: {
          input: 100,
          cacheRead: 500,
          cacheWrite: 0,
          output: 400,
        },
      },
      {
        sessionId: "s",
        agentId: "b",
        vendor: "codex",
        tokens: 10,
        recordedAt: "now",
        state: "reserved",
        usageSource: "prompt-estimate",
      },
      {
        sessionId: "old",
        agentId: "c",
        vendor: "codex",
        tokens: 20,
        recordedAt: "then",
      },
    ]);
    const cost = aggregateCost("/fixture");
    expect(cost).toMatchObject({
      totalTokens: 1030,
      actualTokens: 1000,
      estimatedTokens: 30,
      reservedSpawns: 1,
      totalSpawns: 3,
    });
    expect(cost.estimatedUsd).toBeCloseTo(0.00065);
  });
});
