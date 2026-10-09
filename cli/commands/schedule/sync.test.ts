/**
 * Tests for schedule/sync.ts — malformed manifest entries.
 *
 * A manifest row missing its required fields (seen in the wild as a bare
 * `{ "id": "new-job" }` left behind by a test worker) used to crash the whole
 * sync at `cron.trim`, which also killed the warn-only re-sync `oma update`
 * runs. Such rows are dropped from the manifest and reported.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleJob } from "../../io/schedule/manifest.js";
import type { ScheduledJobSpec } from "../../io/schedule/port.js";

const manifestState = vi.hoisted(() => ({ jobs: [] as unknown[] }));
const writeManifest = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() =>
  vi.fn(async (_spec: ScheduledJobSpec): Promise<void> => {}),
);
const remove = vi.hoisted(() =>
  vi.fn(async (_label: string): Promise<void> => {}),
);
const listLabels = vi.hoisted(() => vi.fn(async (): Promise<string[]> => []));

vi.mock("../../io/schedule/manifest.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../io/schedule/manifest.js")>();
  return {
    ...actual,
    readManifest: () => ({ version: 1, jobs: manifestState.jobs }),
    writeManifest,
  };
});

vi.mock("../../io/schedule/port.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../io/schedule/port.js")>();
  return {
    ...actual,
    selectAdapter: async () => ({
      upsert,
      remove,
      listLabels,
      isAvailable: async () => true,
    }),
  };
});

import { syncSchedules } from "../../io/schedule/sync.js";

const healthy: ScheduleJob = {
  id: "sch_healthy00001",
  cron: "0 12 * * 4",
  agentId: "claude",
  prompt: "hello",
  promptPath: null,
  vendor: null,
  workspace: "/tmp/project",
  projectLabel: "project",
  recurring: true,
  maxAgeDays: 0,
  capturedEnvRef: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  lastFiredAt: null,
  osBackend: "launchd",
  osJobLabel: "dev.oma.sch_healthy00001",
};

beforeEach(() => {
  manifestState.jobs = [];
  writeManifest.mockClear();
  upsert.mockClear();
  remove.mockClear();
  listLabels.mockClear();
  listLabels.mockResolvedValue([]);
});

describe("syncSchedules with malformed manifest entries", () => {
  it("drops the bad row and still registers the healthy job", async () => {
    manifestState.jobs = [{ id: "new-job" }, healthy];
    const lines: string[] = [];

    const result = await syncSchedules({ log: (line) => lines.push(line) });

    expect(result).toEqual({
      synced: 1,
      resynced: 0,
      pruned: 0,
      malformed: 1,
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({
      id: healthy.id,
      cron: healthy.cron,
      label: healthy.osJobLabel,
    });
    expect(lines).toContain("  dropped (malformed manifest entry): new-job");
    expect(writeManifest).toHaveBeenCalledTimes(1);
    expect(writeManifest.mock.calls[0]?.[0]).toEqual({
      version: 1,
      jobs: [healthy],
    });
  });

  it("names an entry without an id and never touches the scheduler when nothing is healthy", async () => {
    manifestState.jobs = [{ cron: "* * * * *" }];
    const lines: string[] = [];

    const result = await syncSchedules({ log: (line) => lines.push(line) });

    expect(result.malformed).toBe(1);
    expect(lines).toContain("  dropped (malformed manifest entry): <no id>");
    expect(writeManifest.mock.calls[0]?.[0]).toEqual({ version: 1, jobs: [] });
    expect(listLabels).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("leaves a manifest of healthy jobs untouched", async () => {
    manifestState.jobs = [healthy];
    listLabels.mockResolvedValue([healthy.osJobLabel]);

    const result = await syncSchedules();

    expect(result.malformed).toBe(0);
    expect(writeManifest).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not count malformed rows as orphans or prune targets", async () => {
    manifestState.jobs = [{ id: "new-job" }, { id: "new-job" }, healthy];
    listLabels.mockResolvedValue([healthy.osJobLabel]);

    const result = await syncSchedules({ prune: true });

    expect(result.malformed).toBe(2);
    expect(result.pruned).toBe(0);
    expect(remove).not.toHaveBeenCalled();
  });
});
