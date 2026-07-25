import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// No module mocks here on purpose: the state dir has a direct test seam, and
// mocking node:os routed this file's whole import graph through the mock
// pipeline — its forks worker intermittently wedged during collection.
import {
  _setOmaStateDirForTests,
  attachClient,
  DAEMON_IDLE_GRACE_MS,
  daemonKey,
  detachClient,
  ensureSerenaDaemon,
  omaStateDir,
  preferredPort,
  pruneRegistry,
  readRegistry,
  reclaimIdleDaemons,
  resolveProjectRoot,
} from "./serena-daemon.js";

let home: string;
let work: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "oma-daemon-home-"));
  work = mkdtempSync(join(tmpdir(), "oma-daemon-work-"));
  _setOmaStateDirForTests(join(home, ".config", "oma"));
});

afterEach(() => {
  _setOmaStateDirForTests(null);
  rmSync(home, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("omaStateDir", () => {
  it("honors the test override and falls back to ~/.config/oma", () => {
    expect(omaStateDir()).toBe(join(home, ".config", "oma"));
    _setOmaStateDirForTests(null);
    expect(omaStateDir().endsWith(join(".config", "oma"))).toBe(true);
  });
});

describe("resolveProjectRoot", () => {
  it("prefers the nearest .serena/project.yml", () => {
    mkdirSync(join(work, "repo", ".serena"), { recursive: true });
    writeFileSync(join(work, "repo", ".serena", "project.yml"), "languages:\n");
    mkdirSync(join(work, "repo", "packages", "api"), { recursive: true });

    expect(resolveProjectRoot(join(work, "repo", "packages", "api"))).toBe(
      join(work, "repo"),
    );
  });

  it("falls back to the nearest .git", () => {
    mkdirSync(join(work, "repo", ".git"), { recursive: true });
    mkdirSync(join(work, "repo", "src"), { recursive: true });

    expect(resolveProjectRoot(join(work, "repo", "src"))).toBe(
      join(work, "repo"),
    );
  });

  it("falls back to cwd when there is no marker at all", () => {
    expect(resolveProjectRoot(work)).toBe(work);
  });

  it("maps every subdirectory of a repo to one root, so they share a daemon", () => {
    mkdirSync(join(work, "repo", ".git"), { recursive: true });
    mkdirSync(join(work, "repo", "a", "b"), { recursive: true });

    expect(resolveProjectRoot(join(work, "repo", "a"))).toBe(
      resolveProjectRoot(join(work, "repo", "a", "b")),
    );
  });
});

describe("preferredPort", () => {
  it("is stable for a key", () => {
    expect(preferredPort("x::ide")).toBe(preferredPort("x::ide"));
  });

  it("separates projects and contexts", () => {
    // Same project under two contexts must not collide by construction; the
    // context decides serena's tool set, so they cannot share a daemon.
    expect(preferredPort(daemonKey("/a", "ide"))).not.toBe(
      preferredPort(daemonKey("/a", "claude-code")),
    );
  });

  it("stays inside the reserved window", () => {
    for (const key of ["/a::ide", "/b::codex", "/c/d/e::claude-code"]) {
      expect(preferredPort(key)).toBeGreaterThanOrEqual(12341);
      expect(preferredPort(key)).toBeLessThan(12441);
    }
  });
});

/**
 * A fake fleet: `spawnDaemon` marks a port as listening, `probe` reports it.
 * Mirrors the real sequence (spawn, then poll until the port answers) without
 * binding sockets or launching python.
 */
function fakeFleet() {
  const listening = new Set<number>();
  return {
    listening,
    spawnDaemon: vi.fn((port: number) => {
      listening.add(port);
      return process.pid; // a pid that is alive
    }),
    probe: async (port: number) => listening.has(port),
  };
}

describe("ensureSerenaDaemon", () => {
  it("registers the daemon it starts", async () => {
    const fleet = fakeFleet();
    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });

    expect(handle?.started).toBe(true);
    expect(handle?.url).toBe(`http://127.0.0.1:${handle?.port}/mcp`);
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(1);

    const record = readRegistry()[daemonKey("/proj", "ide")];
    expect(record?.port).toBe(handle?.port);
    expect(record?.root).toBe("/proj");
  });

  it("reuses a running daemon instead of starting a second one", async () => {
    const fleet = fakeFleet();
    const opts = { root: "/proj", context: "ide", timeoutMs: 5_000, ...fleet };

    const first = await ensureSerenaDaemon(opts);
    const second = await ensureSerenaDaemon(opts);

    expect(second?.port).toBe(first?.port);
    expect(second?.started).toBe(false);
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(1);
  });

  it("gives each context its own daemon", async () => {
    // The context fixes serena's tool set at startup, so two vendors asking for
    // different ones cannot share a server.
    const fleet = fakeFleet();
    const ide = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });
    const claude = await ensureSerenaDaemon({
      root: "/proj",
      context: "claude-code",
      timeoutMs: 5_000,
      ...fleet,
    });

    expect(ide?.port).not.toBe(claude?.port);
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(2);
  });

  it("does not hand two projects the same port", async () => {
    const fleet = fakeFleet();
    const a = await ensureSerenaDaemon({
      root: "/proj-a",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });
    const b = await ensureSerenaDaemon({
      root: "/proj-b",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });

    expect(a?.port).not.toBe(b?.port);
  });

  it("steps over a port something else already occupies", async () => {
    const fleet = fakeFleet();
    const wanted = preferredPort(daemonKey("/proj", "ide"));
    fleet.listening.add(wanted); // squatted by an unrelated process

    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
      // The squatted port answers but is not ours, so the first probe must not
      // be taken as "our daemon is already up".
      probe: async (port: number) => fleet.listening.has(port),
    });

    expect(handle?.port).not.toBe(wanted);
  });

  it("returns null instead of throwing when the daemon cannot be spawned", async () => {
    // Callers fall back to a session-local stdio serena on null; throwing here
    // would leave the session with no code intelligence at all.
    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 2_000,
      spawnDaemon: () => null,
      probe: async () => false,
    });

    expect(handle).toBeNull();
  });

  it("drops the registration when the daemon dies during startup", async () => {
    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      spawnDaemon: () => 2 ** 30, // a pid that is not running
      probe: async () => false,
    });

    expect(handle).toBeNull();
    expect(readRegistry()[daemonKey("/proj", "ide")]).toBeUndefined();
  });

  it("releases the lock so a later call can proceed", async () => {
    const fleet = fakeFleet();
    await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });
    const again = await ensureSerenaDaemon({
      root: "/other",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });

    expect(again).not.toBeNull();
  });
});

describe("pruneRegistry", () => {
  it("removes records whose process is gone and keeps live ones", async () => {
    const listening = new Set<number>();
    await ensureSerenaDaemon({
      root: "/live",
      context: "ide",
      timeoutMs: 5_000,
      spawnDaemon: (port: number) => {
        listening.add(port);
        return process.pid;
      },
      probe: async (port: number) => listening.has(port),
    });

    const registry = readRegistry();
    registry[daemonKey("/dead", "ide")] = {
      root: "/dead",
      context: "ide",
      port: 12440,
      pid: 2 ** 30,
      startedAt: "2026-01-01T00:00:00.000Z",
    };
    writeFileSync(
      join(omaStateDir(), "serena-daemons.json"),
      JSON.stringify(registry),
    );

    const removed = pruneRegistry();

    expect(removed.map((r) => r.root)).toEqual(["/dead"]);
    expect(readRegistry()[daemonKey("/live", "ide")]).toBeDefined();
  });
});

describe("daemon lifecycle", () => {
  async function startDaemon(root: string, killed = { pid: 0 }) {
    const listening = new Set<number>();
    const handle = await ensureSerenaDaemon({
      root,
      context: "ide",
      timeoutMs: 5_000,
      spawnDaemon: (port: number) => {
        listening.add(port);
        return process.pid;
      },
      probe: async (port: number) => listening.has(port),
    });
    killed.pid = handle?.port ?? 0;
    return handle;
  }

  it("counts the starting session as a client", async () => {
    await startDaemon("/proj");
    expect(readRegistry()[daemonKey("/proj", "ide")]?.clients).toEqual([
      process.pid,
    ]);
  });

  it("keeps the daemon while another session is still attached", async () => {
    await startDaemon("/proj");
    const key = daemonKey("/proj", "ide");
    attachClient(key, process.ppid); // a second, definitely-live session

    detachClient(key, process.ppid);
    const record = readRegistry()[key];

    expect(record?.clients).toContain(process.pid);
    expect(record?.idleSince).toBeUndefined();
  });

  it("marks the daemon idle when the last client detaches", async () => {
    await startDaemon("/proj");
    const key = daemonKey("/proj", "ide");

    detachClient(key);

    const record = readRegistry()[key];
    expect(record?.clients).toEqual([]);
    expect(record?.idleSince).toBeDefined();
  });

  it("does not reclaim inside the grace period", async () => {
    // Closing one session and opening another is routine; tearing the daemon
    // down immediately would throw away a warm LSP stack for nothing.
    await startDaemon("/proj");
    const key = daemonKey("/proj", "ide");
    detachClient(key);

    const reclaimed = reclaimIdleDaemons(Date.now() + DAEMON_IDLE_GRACE_MS - 1);

    expect(reclaimed).toEqual([]);
    expect(readRegistry()[key]).toBeDefined();
  });

  it("re-attaching cancels the pending reclamation", async () => {
    await startDaemon("/proj");
    const key = daemonKey("/proj", "ide");
    detachClient(key);
    attachClient(key);

    const reclaimed = reclaimIdleDaemons(
      Date.now() + DAEMON_IDLE_GRACE_MS * 10,
    );

    expect(reclaimed).toEqual([]);
    expect(readRegistry()[key]?.idleSince).toBeUndefined();
  });

  it("ignores a client pid that died without detaching", async () => {
    // A SIGKILLed proxy never runs its exit handler, so liveness — not a
    // counter — has to decide whether the daemon is still in use.
    await startDaemon("/proj");
    const key = daemonKey("/proj", "ide");
    const registry = readRegistry();
    const record = registry[key];
    if (record) record.clients = [2 ** 30];
    writeFileSync(
      join(omaStateDir(), "serena-daemons.json"),
      JSON.stringify(registry),
    );

    reclaimIdleDaemons();

    expect(readRegistry()[key]?.idleSince).toBeDefined();
  });
});

describe("reclaimIdleDaemons — actually stopping a daemon", () => {
  it("SIGTERMs an abandoned daemon and forgets it", async () => {
    // The kill is injected rather than spawning a real victim process: a live
    // child handle inside a vitest worker is exactly what wedged worker
    // teardown on slow CI runners ("Timeout terminating forks worker"). The
    // daemon must still read as alive, so it registers under this process's
    // own pid and the injected kill records instead of signalling.
    const listening = new Set<number>();
    await ensureSerenaDaemon({
      root: "/abandoned",
      context: "ide",
      timeoutMs: 5_000,
      spawnDaemon: (port: number) => {
        listening.add(port);
        return process.pid;
      },
      probe: async (port: number) => listening.has(port),
    });

    const key = daemonKey("/abandoned", "ide");
    detachClient(key);

    const kills: Array<{ pid: number; signal: string }> = [];
    const reclaimed = reclaimIdleDaemons(
      Date.now() + DAEMON_IDLE_GRACE_MS + 1,
      (pid, signal) => kills.push({ pid, signal }),
    );

    expect(reclaimed.map((r) => r.root)).toEqual(["/abandoned"]);
    expect(kills).toEqual([{ pid: process.pid, signal: "SIGTERM" }]);
    expect(readRegistry()[key]).toBeUndefined();
  });

  it("still forgets the daemon when the kill itself fails", () => {
    // The process can die between the liveness check and the signal; a throw
    // from kill must not leave a zombie registration behind.
    const now = Date.now();
    mkdirSync(omaStateDir(), { recursive: true });
    writeFileSync(
      join(omaStateDir(), "serena-daemons.json"),
      JSON.stringify({
        [daemonKey("/gone", "ide")]: {
          root: "/gone",
          context: "ide",
          port: 12440,
          pid: process.pid,
          startedAt: new Date(now).toISOString(),
          clients: [],
          idleSince: new Date(now - DAEMON_IDLE_GRACE_MS - 1).toISOString(),
        },
      }),
    );

    const reclaimed = reclaimIdleDaemons(now, () => {
      throw new Error("ESRCH");
    });

    expect(reclaimed.map((r) => r.root)).toEqual(["/gone"]);
    expect(readRegistry()[daemonKey("/gone", "ide")]).toBeUndefined();
  });
});
