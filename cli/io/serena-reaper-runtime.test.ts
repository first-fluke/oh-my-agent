/**
 * serena-reaper-runtime.test.ts
 *
 * Deterministic tests for the PURE helpers in serena-reaper-runtime.ts.
 * Side-effecting fns (runPs, scanSerenaLogs, loadOmaConfigContent,
 * appendReaperLog, buildRealKillAdapter) touch process/fs and are covered by
 * the smoke path; here we lock down the display/log/resolver logic.
 */

import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReapTarget, SerenaRoot } from "./serena-reaper.js";
import {
  buildActivityResolver,
  buildReaperLogEntries,
  formatReapSummary,
  loadOmaConfigContent,
  resolveOmaConfigPath,
} from "./serena-reaper-runtime.js";

const NOW_MS = Date.parse("2026-06-15T12:00:00.000Z");

describe("reaper config layers", () => {
  let root: string;
  const originalCwd = process.cwd();
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "oma-reaper-config-")));
    mkdirSync(join(root, "global", ".agents"), { recursive: true });
    mkdirSync(join(root, "project", ".agents"), { recursive: true });
    vi.stubEnv("OMA_HOME", join(root, "global"));
    process.chdir(join(root, "project"));
  });
  afterEach(() => {
    process.chdir(originalCwd);
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("uses custom OMA_HOME defaults without project config", () => {
    const file = join(root, "global", ".agents", "oma-config.yaml");
    writeFileSync(file, "serena_reaper:\n  enabled: true\n  keep_warm: 3\n");
    expect(resolveOmaConfigPath()).toBe(file);
    expect(JSON.parse(loadOmaConfigContent()).serena_reaper).toEqual({
      enabled: true,
      keep_warm: 3,
    });
  });

  it("merges global, nearest project, and local reaper settings", () => {
    writeFileSync(
      join(root, "global", ".agents", "oma-config.yaml"),
      "serena_reaper:\n  enabled: true\n  keep_warm: 3\n",
    );
    writeFileSync(
      join(root, "project", ".agents", "oma-config.yaml"),
      "serena_reaper:\n  idle_minutes: 12\n",
    );
    const local = join(root, "project", ".agents", "oma-config.local.yaml");
    writeFileSync(local, "serena_reaper:\n  enabled: false\n");
    mkdirSync(join(root, "project", "src"));
    process.chdir(join(root, "project", "src"));
    expect(resolveOmaConfigPath()).toBe(local);
    expect(JSON.parse(loadOmaConfigContent()).serena_reaper).toEqual({
      enabled: false,
      keep_warm: 3,
      idle_minutes: 12,
    });
  });

  it("does not enable global reaping when the local intent is malformed", () => {
    writeFileSync(
      join(root, "global", ".agents", "oma-config.yaml"),
      "serena_reaper:\n  enabled: true\n",
    );
    writeFileSync(
      join(root, "project", ".agents", "oma-config.local.yaml"),
      "serena_reaper: {",
    );
    expect(loadOmaConfigContent()).toBe("");
    expect(resolveOmaConfigPath()).toBeUndefined();
  });
});

function makeRoot(overrides: Partial<SerenaRoot> = {}): SerenaRoot {
  return {
    pid: 200,
    ppid: 100,
    project: "/home/user/proj",
    lastActivityMs: NOW_MS - 5 * 60_000,
    signalSource: "log",
    lspChildren: [
      { pid: 201, name: "tsserver", rssMb: 92 },
      { pid: 202, name: "pyright", rssMb: 40 },
    ],
    rssMb: 14,
    ...overrides,
  };
}

describe("buildActivityResolver", () => {
  it("resolves from log content (tier 1) when a CallToolRequest line is present", () => {
    const logEntries = new Map([
      [
        200,
        {
          content: "2026-06-15T11:50:00.000Z CallToolRequest find_symbol foo\n",
          mtimeMs: NOW_MS - 60_000,
        },
      ],
    ]);
    const resolve = buildActivityResolver(logEntries);
    const signal = resolve(200);
    expect(signal.signalSource).toBe("log");
    expect(signal.lastActivityMs).toBe(Date.parse("2026-06-15T11:50:00.000Z"));
  });

  it("falls back to mtime (tier 2) when log has no CallToolRequest lines", () => {
    const mtime = NOW_MS - 120_000;
    const logEntries = new Map([
      [
        200,
        { content: "2026-06-15T11:00:00.000Z ServerStarted\n", mtimeMs: mtime },
      ],
    ]);
    const resolve = buildActivityResolver(logEntries);
    const signal = resolve(200);
    expect(signal.signalSource).toBe("mtime");
    expect(signal.lastActivityMs).toBe(mtime);
  });

  it("returns a now-based signal for an unknown root (no log entry)", () => {
    const resolve = buildActivityResolver(new Map());
    const signal = resolve(999);
    // No log/mtime → cpu/now fallback; must not throw and must be recent.
    expect(typeof signal.lastActivityMs).toBe("number");
  });
});

describe("buildReaperLogEntries", () => {
  it("computes idle minutes and freed MB per target", () => {
    const target: ReapTarget = {
      root: makeRoot({ lastActivityMs: NOW_MS - 12 * 60_000 }),
      reason: "lru: ranked outside top-2 by activity",
      projectedFreedRssMb: 132,
    };
    const [entry] = buildReaperLogEntries([target], NOW_MS);
    expect(entry).toEqual({
      project: "/home/user/proj",
      idleMinutes: 12,
      freedMb: 132,
    });
  });

  it("returns an empty array for no targets", () => {
    expect(buildReaperLogEntries([], NOW_MS)).toEqual([]);
  });
});

describe("formatReapSummary", () => {
  it("reports no roots cleanly", () => {
    expect(formatReapSummary([], [], NOW_MS)).toEqual([
      "No active Serena roots found.",
    ]);
  });

  it("marks KEEP vs REAP and totals projected freed memory", () => {
    const keep = makeRoot({ pid: 200, project: "keep-proj" });
    const reap = makeRoot({
      pid: 300,
      project: "reap-proj",
      lastActivityMs: NOW_MS - 700 * 60_000,
    });
    const targets: ReapTarget[] = [
      { root: reap, reason: "lru", projectedFreedRssMb: 132 },
    ];
    const out = formatReapSummary([keep, reap], targets, NOW_MS).join("\n");
    expect(out).toContain("[KEEP] keep-proj (PID 200)");
    expect(out).toContain("[REAP] reap-proj (PID 300)");
    expect(out).toContain("Signal source: log");
    expect(out).toContain("Projected freed: 132.0 MB");
  });

  it("says nothing-to-reap when no targets", () => {
    const out = formatReapSummary([makeRoot()], [], NOW_MS).join("\n");
    expect(out).toContain("Nothing to reap.");
  });
});
