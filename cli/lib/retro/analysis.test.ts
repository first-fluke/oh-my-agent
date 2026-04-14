import { describe, expect, it, vi } from "vitest";
import { analyze, getDisplayData } from "./analysis.js";

vi.mock("./git.js", () => ({
  countAIAssistedCommits: vi.fn(() => 1),
  getCommitsWithStats: vi.fn(() => [
    {
      hash: "a",
      author: "Grace",
      email: "g@example.com",
      timestamp: 1710000000,
      subject: "feat: add auth",
      insertions: 10,
      deletions: 2,
    },
  ]),
  getDefaultBranch: vi.fn(() => "main"),
  getFileChanges: vi.fn(() => [
    {
      file: "src/auth.ts",
      insertions: 10,
      deletions: 2,
      author: "Grace",
    },
  ]),
  getFileHotspots: vi.fn(() => [{ file: "src/auth.ts", count: 1 }]),
  getShippingStreak: vi.fn(() => 4),
}));

describe("retro/analysis.ts", () => {
  it("builds snapshot metrics from git data", () => {
    const snapshot = analyze("/repo", {
      since: "7 days ago",
      label: "7d",
      days: 7,
    });

    expect(snapshot.window).toBe("7d");
    expect(snapshot.metrics.commits).toBe(1);
    expect(snapshot.metrics.netLoc).toBe(8);
    expect(snapshot.metrics.streakDays).toBe(4);
    expect(snapshot.authors.Grace?.topArea).toBe("src");
  });

  it("returns display-only sessions and hourly distribution", () => {
    const data = getDisplayData("/repo", {
      since: "7 days ago",
      label: "7d",
      days: 7,
    });

    expect(data.sessions).toHaveLength(1);
    expect(data.hourly.reduce((sum, count) => sum + count, 0)).toBe(1);
  });
});
