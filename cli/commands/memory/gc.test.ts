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
import { checkCap, recordUsage } from "../../io/session-cost.js";
import {
  emitEvent,
  readIndex,
  sessionDir,
  setActiveSession,
} from "../../state/events.js";
import { garbageCollectLocalState, loadMemoryGcConfig } from "./gc.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-06-13T00:00:00Z");

let base: string;

function sessionsDir(): string {
  return join(base, ".agents", "state", "sessions");
}
function serenaDir(): string {
  return join(base, ".serena", "memories");
}

function mkSession(name: string, ageDays: number): void {
  const dir = join(sessionsDir(), name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "events.jsonl"), "{}\n");
  const t = (NOW - ageDays * DAY_MS) / 1000;
  utimesSync(dir, t, t);
}

function mkSerena(name: string, ageDays: number): void {
  const path = join(serenaDir(), name);
  writeFileSync(path, "x");
  const t = (NOW - ageDays * DAY_MS) / 1000;
  utimesSync(path, t, t);
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "oma-gc-"));
  mkdirSync(sessionsDir(), { recursive: true });
  mkdirSync(serenaDir(), { recursive: true });
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe("garbageCollectLocalState — L1 sessions", () => {
  it("keeps the most-recent N sessions and prunes the rest", () => {
    for (let i = 0; i < 6; i++) mkSession(`oma-s${i}`, i); // s0 newest … s5 oldest
    const r = garbageCollectLocalState({
      baseDir: base,
      keep: 3,
      scope: "sessions",
      nowMs: NOW,
    });
    expect(r.prunedSessions.length).toBe(3);
    expect(r.keptSessions).toBe(3);
    expect(existsSync(join(sessionsDir(), "oma-s0"))).toBe(true);
    expect(existsSync(join(sessionsDir(), "oma-s5"))).toBe(false);
  });

  it("never prunes the active session even when it is the oldest", () => {
    mkSession("oma-active", 999); // oldest
    for (let i = 0; i < 3; i++) mkSession(`oma-n${i}`, i);
    writeFileSync(
      join(sessionsDir(), "_index.json"),
      JSON.stringify({ active: { main: "oma-active" } }),
    );
    const r = garbageCollectLocalState({
      baseDir: base,
      keep: 1,
      scope: "sessions",
      nowMs: NOW,
    });
    expect(existsSync(join(sessionsDir(), "oma-active"))).toBe(true);
    expect(r.prunedSessions.some((p) => p.endsWith("oma-active"))).toBe(false);
  });

  it("dry-run reports the plan without deleting", () => {
    for (let i = 0; i < 4; i++) mkSession(`oma-d${i}`, i);
    const r = garbageCollectLocalState({
      baseDir: base,
      keep: 1,
      scope: "sessions",
      dryRun: true,
      nowMs: NOW,
    });
    expect(r.prunedSessions.length).toBe(3);
    expect(existsSync(join(sessionsDir(), "oma-d3"))).toBe(true);
  });
});

describe("garbageCollectLocalState — Serena", () => {
  it("prunes session-cost always and aged run artifacts, keeps curated", () => {
    mkSerena("session-cost-probe.md", 0); // ephemeral, age-independent
    mkSerena("progress-old.md", 40); // aged > 30d → prune
    mkSerena("result-recent.md", 5); // aged < 30d → keep
    mkSerena("orchestrator-session-x.md", 99); // aged > 30d → prune
    mkSerena("code_style.md", 999); // curated → keep
    mkdirSync(join(serenaDir(), "decisions"), { recursive: true });
    writeFileSync(join(serenaDir(), "decisions", "d.md"), "keep");

    const r = garbageCollectLocalState({
      baseDir: base,
      scope: "serena",
      maxAgeDays: 30,
      nowMs: NOW,
    });

    const pruned = r.prunedSerena.map((p) => p.split("/").pop());
    expect(pruned.sort()).toEqual([
      "orchestrator-session-x.md",
      "progress-old.md",
      "session-cost-probe.md",
    ]);
    expect(existsSync(join(serenaDir(), "result-recent.md"))).toBe(true);
    expect(existsSync(join(serenaDir(), "code_style.md"))).toBe(true);
    expect(existsSync(join(serenaDir(), "decisions", "d.md"))).toBe(true);
  });

  it("max-age-days 0 disables aged pruning but still sweeps session-cost", () => {
    mkSerena("session-cost-x.md", 0);
    mkSerena("progress-ancient.md", 999);
    const r = garbageCollectLocalState({
      baseDir: base,
      scope: "serena",
      maxAgeDays: 0,
      nowMs: NOW,
    });
    expect(r.prunedSerena.map((p) => p.split("/").pop())).toEqual([
      "session-cost-x.md",
    ]);
    expect(existsSync(join(serenaDir(), "progress-ancient.md"))).toBe(true);
  });
});

describe("garbageCollectLocalState — session quota records", () => {
  it.each([undefined, 0])(
    "preserves quota enforcement for an indexed active session with keep=%s",
    (keep) => {
      const sid = "oma-live-quota";
      emitEvent(base, sid, { kind: "session.created" });
      setActiveSession(base, "codex", sid);
      recordUsage(
        sid,
        { vendor: "codex", agentId: "frontend", tokens: 100 },
        base,
      );
      const cap = { tokens: 100 };
      expect(checkCap(sid, cap, [], base)).toMatchObject({
        exceeded: true,
        current: 100,
      });

      const result = garbageCollectLocalState({ baseDir: base, keep });

      expect(readIndex(base).active.codex).toBe(sid);
      expect(existsSync(sessionDir(base, sid))).toBe(true);
      expect(result.prunedSerena).toEqual([]);
      expect(checkCap(sid, cap, [], base)).toMatchObject({
        exceeded: true,
        current: 100,
        limit: 100,
      });
    },
  );

  it("preserves costs for kept sessions and deletes costs for discarded sessions", () => {
    mkSession("oma-kept", 0);
    mkSession("oma-discarded", 99);
    for (const sid of ["oma-kept", "oma-discarded"]) {
      recordUsage(
        sid,
        { vendor: "codex", agentId: "frontend", tokens: 100 },
        base,
      );
      mkSerena(`session-cost-${sid}.md`, 99);
    }

    const result = garbageCollectLocalState({
      baseDir: base,
      keep: 1,
      nowMs: NOW,
    });

    expect(result.prunedSessions).toEqual([
      join(sessionsDir(), "oma-discarded"),
    ]);
    expect(result.prunedSerena).toEqual([
      join(
        base,
        ".agents",
        "state",
        "memories",
        "session-cost-oma-discarded.md",
      ),
      join(serenaDir(), "session-cost-oma-discarded.md"),
    ]);
    expect(existsSync(join(serenaDir(), "session-cost-oma-kept.md"))).toBe(
      true,
    );
    expect(checkCap("oma-kept", { tokens: 100 }, [], base)).toMatchObject({
      exceeded: true,
      current: 100,
    });
  });

  it("uses the same retained sessions for dry-run and actual cleanup", () => {
    mkSession("oma-kept", 0);
    mkSession("oma-discarded", 99);
    for (const sid of ["oma-kept", "oma-discarded"]) {
      recordUsage(
        sid,
        { vendor: "codex", agentId: "frontend", tokens: 100 },
        base,
      );
    }

    const preview = garbageCollectLocalState({
      baseDir: base,
      keep: 1,
      dryRun: true,
    });
    expect(preview.prunedSerena).toEqual([
      join(
        base,
        ".agents",
        "state",
        "memories",
        "session-cost-oma-discarded.md",
      ),
    ]);
    expect(checkCap("oma-discarded", { tokens: 100 }, [], base).current).toBe(
      100,
    );

    const actual = garbageCollectLocalState({ baseDir: base, keep: 1 });
    expect(actual.prunedSerena).toEqual(preview.prunedSerena);
  });

  it("preserves existing sessions and their costs in coordination-only cleanup", () => {
    mkSession("oma-old-kept", 99);
    recordUsage(
      "oma-old-kept",
      { vendor: "codex", agentId: "frontend", tokens: 100 },
      base,
    );

    const result = garbageCollectLocalState({
      baseDir: base,
      keep: 0,
      scope: "serena",
    });

    expect(result.prunedSessions).toEqual([]);
    expect(result.prunedSerena).toEqual([]);
    expect(checkCap("oma-old-kept", { tokens: 100 }, [], base)).toMatchObject({
      exceeded: true,
      current: 100,
    });
  });
});

function writeConfig(yaml: string): void {
  const dir = join(base, ".agents");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "oma-config.yaml"), yaml);
}

describe("loadMemoryGcConfig", () => {
  it("returns {} when no config file is present", () => {
    expect(loadMemoryGcConfig(base)).toEqual({});
  });

  it("parses keep_sessions / max_age_days from oma-config.yaml", () => {
    writeConfig(
      "memory:\n  gc:\n    keep_sessions: 25\n    max_age_days: 14\n",
    );
    expect(loadMemoryGcConfig(base)).toEqual({ keep: 25, maxAgeDays: 14 });
  });

  it("returns {} when memory.gc is missing or wrong-shaped", () => {
    writeConfig("memory: not-an-object\n");
    expect(loadMemoryGcConfig(base)).toEqual({});
  });
});

describe("memory.gc config precedence affects pruning", () => {
  it("config keep_sessions controls how many sessions survive", () => {
    writeConfig("memory:\n  gc:\n    keep_sessions: 2\n");
    for (let i = 0; i < 5; i++) mkSession(`oma-c${i}`, i);
    const r = garbageCollectLocalState({
      baseDir: base,
      scope: "sessions",
      nowMs: NOW,
    });
    expect(r.keptSessions).toBe(2);
    expect(r.prunedSessions.length).toBe(3);
  });

  it("an explicit keep overrides the config value", () => {
    writeConfig("memory:\n  gc:\n    keep_sessions: 2\n");
    for (let i = 0; i < 5; i++) mkSession(`oma-c${i}`, i);
    const r = garbageCollectLocalState({
      baseDir: base,
      keep: 4,
      scope: "sessions",
      nowMs: NOW,
    });
    expect(r.keptSessions).toBe(4); // flag wins over config
    expect(r.prunedSessions.length).toBe(1);
  });
});

describe("garbageCollectLocalState — scope", () => {
  it("scope=sessions leaves Serena untouched and vice versa", () => {
    mkSession("oma-a", 0);
    mkSession("oma-b", 1);
    mkSerena("session-cost-x.md", 0);

    const sessionsOnly = garbageCollectLocalState({
      baseDir: base,
      keep: 1,
      scope: "sessions",
      nowMs: NOW,
    });
    expect(sessionsOnly.prunedSerena).toEqual([]);
    expect(existsSync(join(serenaDir(), "session-cost-x.md"))).toBe(true);

    const serenaOnly = garbageCollectLocalState({
      baseDir: base,
      scope: "serena",
      nowMs: NOW,
    });
    expect(serenaOnly.prunedSessions).toEqual([]);
  });
});
