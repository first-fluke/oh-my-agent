import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPreviousSnapshot, saveSnapshot } from "./persistence.js";

describe("retro/persistence.ts", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("saves snapshot into Serena retrospective directory", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-retro-"));
    tempRoots.push(root);

    const filepath = saveSnapshot(root, {
      date: "2026-04-14T10:00:00.000Z",
      window: "7d",
      metrics: {
        commits: 1,
        contributors: 1,
        insertions: 1,
        deletions: 0,
        netLoc: 1,
        testLoc: 0,
        testRatio: 0,
        activeDays: 1,
        sessions: 1,
        deepSessions: 0,
        avgSessionMinutes: 5,
        locPerSessionHour: 10,
        peakHour: 9,
        focusScore: 100,
        focusArea: "cli",
        streakDays: 1,
        aiAssistedCommits: 0,
      },
      authors: {},
      commitTypes: {},
      hotspots: [],
    });

    expect(readFileSync(filepath, "utf-8")).toContain('"window": "7d"');
  });

  it("loads latest saved snapshot", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-retro-"));
    tempRoots.push(root);

    saveSnapshot(root, {
      date: "2026-04-14T10:00:00.000Z",
      window: "7d",
      metrics: {
        commits: 1,
        contributors: 1,
        insertions: 1,
        deletions: 0,
        netLoc: 1,
        testLoc: 0,
        testRatio: 0,
        activeDays: 1,
        sessions: 1,
        deepSessions: 0,
        avgSessionMinutes: 5,
        locPerSessionHour: 10,
        peakHour: 9,
        focusScore: 100,
        focusArea: "cli",
        streakDays: 1,
        aiAssistedCommits: 0,
      },
      authors: {},
      commitTypes: {},
      hotspots: [],
    });

    const loaded = loadPreviousSnapshot(root);
    expect(loaded?.metrics.commits).toBe(1);
    expect(loaded?.window).toBe("7d");
  });
});
