import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const homeState = vi.hoisted(() => ({ home: "" }));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: () => homeState.home };
});

const { collectSerenaDaemonCheck } = await import("./serena-daemons.js");
const { DAEMON_IDLE_GRACE_MS, daemonKey } = await import(
  "../../io/serena-daemon.js"
);

let home: string;

function writeRegistry(records: Record<string, unknown>): void {
  const dir = join(home, ".config", "oma");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "serena-daemons.json"), JSON.stringify(records));
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "oma-doctor-daemons-"));
  homeState.home = home;
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("collectSerenaDaemonCheck", () => {
  it("reports an empty fleet without issues", () => {
    const check = collectSerenaDaemonCheck();
    expect(check.daemons).toEqual([]);
    expect(check.issues).toEqual([]);
  });

  it("summarizes a live daemon with an attached client", () => {
    writeRegistry({
      [daemonKey("/proj", "ide")]: {
        root: "/proj",
        context: "ide",
        port: 12350,
        pid: process.pid, // alive
        startedAt: "2026-01-01T00:00:00.000Z",
        clients: [process.pid],
      },
    });

    const check = collectSerenaDaemonCheck();
    expect(check.daemons).toHaveLength(1);
    expect(check.daemons[0]).toMatchObject({
      root: "/proj",
      port: 12350,
      liveClients: 1,
      pendingReclaim: false,
    });
    expect(check.issues).toEqual([]);
  });

  it("prunes a registration whose daemon process is dead", () => {
    writeRegistry({
      [daemonKey("/gone", "ide")]: {
        root: "/gone",
        context: "ide",
        port: 12351,
        pid: 2 ** 30, // not running
        startedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const check = collectSerenaDaemonCheck();
    expect(check.daemons).toEqual([]);
    expect(check.prunedCount).toBe(1);
  });

  it("flags a daemon idle past the grace as pending reclaim", () => {
    const now = Date.now();
    writeRegistry({
      [daemonKey("/idle", "ide")]: {
        root: "/idle",
        context: "ide",
        port: 12352,
        pid: process.pid,
        startedAt: "2026-01-01T00:00:00.000Z",
        clients: [],
        idleSince: new Date(now - DAEMON_IDLE_GRACE_MS - 60_000).toISOString(),
      },
    });

    const check = collectSerenaDaemonCheck(now);
    expect(check.daemons[0]?.pendingReclaim).toBe(true);
    expect(check.issues).toHaveLength(1);
  });

  it("does not flag a daemon still inside the grace", () => {
    const now = Date.now();
    writeRegistry({
      [daemonKey("/fresh", "ide")]: {
        root: "/fresh",
        context: "ide",
        port: 12353,
        pid: process.pid,
        startedAt: "2026-01-01T00:00:00.000Z",
        clients: [],
        idleSince: new Date(now - 60_000).toISOString(),
      },
    });

    const check = collectSerenaDaemonCheck(now);
    expect(check.daemons[0]?.pendingReclaim).toBe(false);
    expect(check.issues).toEqual([]);
  });
});
