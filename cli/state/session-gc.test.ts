import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { profileDir, sessionsDir } from "./events.js";
import { gcOrphanSessions, ORPHAN_SESSION_MIN_AGE_MS } from "./session-gc.js";

const NOW = Date.now();

describe("gcOrphanSessions", () => {
  let live: string;

  beforeEach(() => {
    // OMA_STATE_HOME is isolated per test by test/setup-session-storage.ts.
    live = mkdtempSync(join(tmpdir(), "oma-gc-live-"));
  });

  afterEach(() => {
    rmSync(live, { recursive: true, force: true });
  });

  function session(
    sid: string,
    projectDir: string,
    projectId: string,
    ageMs: number,
  ): string {
    const dir = join(sessionsDir(), sid);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "context.json"),
      JSON.stringify({ schemaVersion: 1, projectId, projectDir, profile: "0" }),
    );
    writeFileSync(join(dir, "events.jsonl"), "{}\n");
    const t = (NOW - ageMs) / 1000;
    for (const path of [join(dir, "events.jsonl"), join(dir, "context.json")])
      utimesSync(path, t, t);
    utimesSync(dir, t, t);
    return dir;
  }

  it("prunes only idle sessions of removed projects that are not active", () => {
    const gone = join(live, "deleted-worktree"); // never created
    const old = ORPHAN_SESSION_MIN_AGE_MS + 60_000;
    const orphan = session("2026-01-01_orphan", gone, "gone-id", old);
    const recentOrphan = session("2026-01-02_recent", gone, "gone-id", 60_000);
    const activeOrphan = session("2026-01-03_active", gone, "gone-id", old);
    const alive = session("2026-01-04_alive", live, "live-id", old);
    const indexDir = join(profileDir(), "projects", "gone-id");
    mkdirSync(indexDir, { recursive: true });
    writeFileSync(
      join(indexDir, "_index.json"),
      JSON.stringify({ active: { main: "2026-01-03_active" } }),
    );

    const preview = gcOrphanSessions({ dryRun: true, nowMs: NOW });
    expect(preview.pruned).toEqual([orphan]);
    expect(existsSync(orphan)).toBe(true);

    const result = gcOrphanSessions({ nowMs: NOW });
    expect(result.pruned).toEqual([orphan]);
    expect(existsSync(orphan)).toBe(false);
    for (const kept of [recentOrphan, activeOrphan, alive]) {
      expect(existsSync(kept)).toBe(true);
    }
  });

  it("keeps sessions whose project parent is missing (unmounted volume)", () => {
    const unmounted = join(live, "Volumes", "External", "repo"); // no parent
    const old = ORPHAN_SESSION_MIN_AGE_MS + 60_000;
    const kept = session("2026-01-06_volume", unmounted, "vol-id", old);

    expect(gcOrphanSessions({ nowMs: NOW }).pruned).toEqual([]);
    expect(existsSync(kept)).toBe(true);
  });

  it("ignores sessions without readable ownership", () => {
    const dir = join(sessionsDir(), "2026-01-05_noctx");
    mkdirSync(dir, { recursive: true });
    const t = (NOW - ORPHAN_SESSION_MIN_AGE_MS * 2) / 1000;
    utimesSync(dir, t, t);

    expect(gcOrphanSessions({ nowMs: NOW }).pruned).toEqual([]);
    expect(existsSync(dir)).toBe(true);
  });
});
