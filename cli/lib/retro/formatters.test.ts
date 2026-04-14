import { describe, expect, it } from "vitest";
import { fmtHotspots, fmtMetricsTable, fmtTweetable } from "./formatters.js";

describe("retro/formatters.ts", () => {
  it("formats metrics table with key values", () => {
    const output = fmtMetricsTable({
      commits: 10,
      contributors: 2,
      insertions: 120,
      deletions: 30,
      netLoc: 90,
      testLoc: 40,
      testRatio: 33,
      activeDays: 5,
      sessions: 4,
      deepSessions: 2,
      avgSessionMinutes: 45,
      locPerSessionHour: 100,
      peakHour: 14,
      focusScore: 60,
      focusArea: "cli",
      streakDays: 3,
      aiAssistedCommits: 2,
    });

    expect(output).toContain("Commits");
    expect(output).toContain("10");
    expect(output).toContain("Focus score");
    expect(output).toContain("60% (cli)");
  });

  it("marks test files and churn in hotspots", () => {
    const output = fmtHotspots([
      { file: "src/auth.ts", count: 2 },
      { file: "src/auth.test.ts", count: 5 },
    ]);

    expect(output).toContain("[test]");
    expect(output).toContain("[churn]");
  });

  it("formats tweetable summary", () => {
    const output = fmtTweetable({
      date: "2026-04-14T10:00:00.000Z",
      window: "7d",
      metrics: {
        commits: 8,
        contributors: 2,
        insertions: 100,
        deletions: 20,
        netLoc: 80,
        testLoc: 25,
        testRatio: 25,
        activeDays: 4,
        sessions: 3,
        deepSessions: 1,
        avgSessionMinutes: 30,
        locPerSessionHour: 120,
        peakHour: 16,
        focusScore: 55,
        focusArea: "cli",
        streakDays: 6,
        aiAssistedCommits: 1,
      },
      authors: {},
      commitTypes: {},
      hotspots: [],
    });

    expect(output).toContain("2026-04-14");
    expect(output).toContain("7d");
    expect(output).toContain("8 commits");
    expect(output).toContain("Streak: 6d");
  });
});
