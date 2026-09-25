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
  parseRunningDaemons,
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
    // Keep the opening sweep off the real process table: on a developer
    // machine it would adopt whatever daemons happen to be running.
    listDaemons: noDaemons,
    pollIntervalMs: 5,
  };
}

const noDaemons = () => [];

describe("ensureSerenaDaemon", () => {
  it("waits for a busy same-revision daemon with bounded polling", async () => {
    const fleet = fakeFleet();
    const opts = {
      root: "/proj",
      context: "oma",
      runtimeRevision: "v1",
      timeoutMs: 500,
      ...fleet,
    };
    await ensureSerenaDaemon(opts);
    let polls = 0;
    const probe = vi.fn(async () => ++polls > 3);
    const start = Date.now();
    expect(
      (await ensureSerenaDaemon({ ...opts, probe, pollIntervalMs: 10 }))
        ?.started,
    ).toBe(false);
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
    expect(probe).toHaveBeenCalledTimes(5);
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(1);
  });
  it("reuses the loaded revision and refuses to interrupt live clients on a revision change", async () => {
    const fleet = fakeFleet();
    const opts = {
      root: "/proj",
      context: "oma",
      runtimeRevision: "v1",
      timeoutMs: 100,
      ...fleet,
    };
    await ensureSerenaDaemon(opts);
    expect((await ensureSerenaDaemon(opts))?.started).toBe(false);
    const stopDaemon = vi.fn();
    await expect(
      ensureSerenaDaemon({ ...opts, runtimeRevision: "v2", stopDaemon }),
    ).rejects.toThrow("active MCP sessions");
    expect(stopDaemon).not.toHaveBeenCalled();
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(1);
  });

  it("restarts an idle verified daemon exactly once after settings change", async () => {
    const fleet = fakeFleet();
    const opts = {
      root: "/proj",
      context: "oma",
      runtimeRevision: "v1",
      timeoutMs: 1000,
      ...fleet,
    };
    await ensureSerenaDaemon(opts);
    const key = daemonKey(opts.root, opts.context);
    const record = readRegistry()[key];
    if (!record) throw new Error("missing daemon");
    detachClient(key);
    const stopDaemon = vi.fn(async () => {
      fleet.listening.delete(record.port);
    });
    const changed = {
      ...opts,
      runtimeRevision: "v2",
      stopDaemon,
      listDaemons: () => [record],
    };
    expect((await ensureSerenaDaemon(changed))?.started).toBe(true);
    expect((await ensureSerenaDaemon(changed))?.started).toBe(false);
    expect(stopDaemon).toHaveBeenCalledExactlyOnceWith(record.pid);
    expect(readRegistry()[key]?.runtimeRevision).toBe("v2");
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(2);
  });

  it("never signals a stale registry PID whose process identity does not match", async () => {
    const fleet = fakeFleet();
    const opts = {
      root: "/proj",
      context: "oma",
      runtimeRevision: "v1",
      timeoutMs: 100,
      ...fleet,
    };
    await ensureSerenaDaemon(opts);
    detachClient(daemonKey(opts.root, opts.context));
    const stopDaemon = vi.fn();
    await expect(
      ensureSerenaDaemon({ ...opts, runtimeRevision: "v2", stopDaemon }),
    ).rejects.toThrow("process identity");
    expect(stopDaemon).not.toHaveBeenCalled();
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(1);
  });

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
    // The bridge reports this failure without spawning a private server.
    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 2_000,
      spawnDaemon: () => null,
      probe: async () => false,
      listDaemons: noDaemons,
    });

    expect(handle).toBeNull();
  });

  it("handles a missing serena executable without an unhandled spawn error", async () => {
    const originalPath = process.env.PATH;
    const emptyBin = join(work, "empty-bin");
    mkdirSync(emptyBin, { recursive: true });
    process.env.PATH = emptyBin;

    try {
      const handle = await ensureSerenaDaemon({
        root: work,
        context: "ide",
        timeoutMs: 2_000,
        probe: async () => false,
        listDaemons: noDaemons,
      });
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(handle).toBeNull();
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it("drops the registration when the daemon dies during startup", async () => {
    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      spawnDaemon: () => 2 ** 30, // a pid that is not running
      probe: async () => false,
      listDaemons: noDaemons,
      pollIntervalMs: 5,
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
  /**
   * These tests register the daemon under `process.pid` (it has to be a live
   * pid), so reclaiming one with the REAL `process.kill` would SIGTERM the
   * vitest process itself and take the whole run down with exit 143. Every
   * reclaim here therefore injects a kill that records instead of signalling —
   * the tests below assert nothing is reclaimed anyway.
   */
  const kills: Array<{ pid: number; signal: NodeJS.Signals }> = [];
  const recordKill = (pid: number, signal: NodeJS.Signals) => {
    kills.push({ pid, signal });
  };

  beforeEach(() => {
    kills.length = 0;
  });

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
      listDaemons: noDaemons,
      pollIntervalMs: 5,
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
    // Anchor the clock BEFORE detaching: `idleSince` is stamped inside
    // detachClient, so `Date.now()` afterwards is already past it and
    // `now + GRACE - 1` can land outside the grace on a slow run.
    const beforeDetach = Date.now();
    detachClient(key);

    const reclaimed = reclaimIdleDaemons(
      beforeDetach + DAEMON_IDLE_GRACE_MS - 1,
      recordKill,
      noDaemons,
    );

    expect(reclaimed).toEqual([]);
    expect(kills).toEqual([]);
    expect(readRegistry()[key]).toBeDefined();
  });

  it("re-attaching cancels the pending reclamation", async () => {
    await startDaemon("/proj");
    const key = daemonKey("/proj", "ide");
    detachClient(key);
    attachClient(key);

    const reclaimed = reclaimIdleDaemons(
      Date.now() + DAEMON_IDLE_GRACE_MS * 10,
      recordKill,
      noDaemons,
    );

    expect(reclaimed).toEqual([]);
    expect(kills).toEqual([]);
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

    reclaimIdleDaemons(Date.now(), recordKill, noDaemons);

    expect(kills).toEqual([]);
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
      listDaemons: noDaemons,
    });

    const key = daemonKey("/abandoned", "ide");
    detachClient(key);

    const kills: Array<{ pid: number; signal: string }> = [];
    const reclaimed = reclaimIdleDaemons(
      Date.now() + DAEMON_IDLE_GRACE_MS + 1,
      (pid, signal) => kills.push({ pid, signal }),
      () => [
        {
          pid: process.pid,
          port: readRegistry()[key]?.port ?? 0,
          root: "/abandoned",
          context: "ide",
        },
      ],
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

    const reclaimed = reclaimIdleDaemons(
      now,
      () => {
        throw new Error("ESRCH");
      },
      () => [{ pid: process.pid, port: 12440, root: "/gone", context: "ide" }],
    );

    expect(reclaimed.map((r) => r.root)).toEqual(["/gone"]);
    expect(readRegistry()[daemonKey("/gone", "ide")]).toBeUndefined();
  });

  it("never signals a PID whose current command is not the registered daemon", () => {
    const now = Date.now();
    mkdirSync(omaStateDir(), { recursive: true });
    const key = daemonKey("/old", "ide");
    writeFileSync(
      join(omaStateDir(), "serena-daemons.json"),
      JSON.stringify({
        [key]: {
          root: "/old",
          context: "ide",
          port: 12389,
          pid: process.pid,
          startedAt: new Date(now - DAEMON_IDLE_GRACE_MS * 2).toISOString(),
          clients: [],
          idleSince: new Date(now - DAEMON_IDLE_GRACE_MS - 1).toISOString(),
        },
      }),
    );
    const kill = vi.fn();

    const reclaimed = reclaimIdleDaemons(now, kill, () => [
      { pid: process.pid, port: 12390, root: "/other", context: "ide" },
    ]);

    expect(reclaimed).toEqual([]);
    expect(kill).not.toHaveBeenCalled();
  });
});

describe("ensureSerenaDaemon — a registered daemon that is alive but not answering", () => {
  // Regression: the fleet on one machine grew to three daemons per project.
  // A probe timed out against a busy daemon, a rival was spawned on the same
  // port (the probe said it was free), the rival died on bind, and pruning it
  // as "died during startup" deleted the live daemon's registration. From then
  // on every session saw an unregistered, occupied port and started another.

  it("waits for it instead of starting a rival", async () => {
    const fleet = fakeFleet();
    const opts = { root: "/proj", context: "ide", timeoutMs: 5_000, ...fleet };
    const first = await ensureSerenaDaemon(opts);

    // The daemon is alive (registered under this process's pid) but its port
    // stops answering for the first few probes, as a pinned main thread would.
    let misses = 3;
    const slowProbe = async (port: number) => {
      if (port === first?.port && misses > 0) {
        misses--;
        return false;
      }
      return fleet.listening.has(port);
    };

    const second = await ensureSerenaDaemon({ ...opts, probe: slowProbe });

    expect(second?.port).toBe(first?.port);
    expect(second?.started).toBe(false);
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(1);
    expect(readRegistry()[daemonKey("/proj", "ide")]?.pid).toBe(process.pid);
  });

  it("gives up on this session, not on the daemon, when it never answers", async () => {
    const fleet = fakeFleet();
    const opts = { root: "/proj", context: "ide", timeoutMs: 5_000, ...fleet };
    const first = await ensureSerenaDaemon(opts);

    const handle = await ensureSerenaDaemon({
      ...opts,
      probe: async () => false,
      busyWaitMs: 20,
    });

    // The bridge reports unavailability; the daemon remains registered.
    expect(handle).toBeNull();
    expect(fleet.spawnDaemon).toHaveBeenCalledTimes(1);
    expect(readRegistry()[daemonKey("/proj", "ide")]?.port).toBe(first?.port);
  });

  it("only forgets a startup casualty while the registration is still its own", async () => {
    // While our spawn is dying, a peer registers a live daemon under the same
    // key. The prune must leave that record alone.
    const key = daemonKey("/proj", "ide");
    let spawnedPort: number | null = null;
    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      spawnDaemon: (port: number) => {
        spawnedPort = port;
        return 2 ** 30; // our own spawn: not running
      },
      probe: async (port: number) => {
        // The first probe of our own port is the startup poll, which runs
        // after our record is written and before the death check: the peer's
        // registration lands here, exactly where the race used to bite.
        if (spawnedPort !== null && port === spawnedPort) {
          const registry = readRegistry();
          registry[key] = {
            root: "/proj",
            context: "ide",
            port: port + 1,
            pid: process.pid,
            startedAt: new Date().toISOString(),
            clients: [process.ppid],
          };
          writeFileSync(
            join(omaStateDir(), "serena-daemons.json"),
            JSON.stringify(registry),
          );
        }
        return false;
      },
      listDaemons: noDaemons,
      pollIntervalMs: 20,
    });

    expect(handle).toBeNull();
    expect(readRegistry()[key]?.pid).toBe(process.pid);
  });
});

describe("parseRunningDaemons", () => {
  const python =
    "/opt/homebrew/Cellar/python@3.13/3.13.15/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python";

  it("finds bridge daemons and reads their key and port off the command line", () => {
    const ps = [
      "  PID COMMAND",
      `89861 ${python} /Users/me/.local/bin/serena start-mcp-server --transport streamable-http --host 127.0.0.1 --port 12389 --project /Users/me/workspace/dahaejo --context oma --add-mode no-memories --open-web-dashboard false`,
      `21710 ${python} /Users/me/.local/bin/serena start-mcp-server --context ide --project-from-cwd --open-web-dashboard false`,
      "90027 node /Users/me/.serena/language_servers/static/TypeScriptLanguageServer/ts-lsp/node_modules/.bin/typescript-language-server --stdio",
      `99 ${python} /Users/me/.local/bin/serena start-mcp-server --transport streamable-http --host 127.0.0.1 --port 8080 --project /Users/me/own --context ide`,
    ].join("\n");

    expect(parseRunningDaemons(ps)).toEqual([
      {
        pid: 89861,
        port: 12389,
        root: "/Users/me/workspace/dahaejo",
        context: "oma",
      },
    ]);
  });
});

describe("reclaimIdleDaemons — daemons missing from the registry", () => {
  const running = (pid: number, port: number, root = "/proj") => ({
    pid,
    port,
    root,
    context: "ide",
  });

  it("adopts a live unregistered daemon so later sessions reuse it", async () => {
    const key = daemonKey("/proj", "ide");
    const kills: number[] = [];

    reclaimIdleDaemons(
      Date.now(),
      (pid) => kills.push(pid),
      () => [running(process.pid, 12389)],
    );

    const record = readRegistry()[key];
    expect(record?.pid).toBe(process.pid);
    expect(record?.port).toBe(12389);
    expect(record?.clients).toEqual([]);
    expect(record?.idleSince).toBeDefined();
    expect(kills).toEqual([]);

    // The next session finds it instead of spawning yet another daemon.
    const spawnDaemon = vi.fn(() => process.pid);
    const handle = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      spawnDaemon,
      probe: async (port: number) => port === 12389,
      listDaemons: () => [running(process.pid, 12389)],
    });
    expect(handle?.port).toBe(12389);
    expect(handle?.started).toBe(false);
    expect(spawnDaemon).not.toHaveBeenCalled();
    expect(readRegistry()[key]?.clients).toEqual([process.pid]);
  });

  it("reclaims an adopted daemon nobody comes back for", () => {
    const now = Date.now();
    const kills: number[] = [];
    const scan = () => [running(process.pid, 12389)];

    reclaimIdleDaemons(now, (pid) => kills.push(pid), scan);
    const reclaimed = reclaimIdleDaemons(
      now + DAEMON_IDLE_GRACE_MS + 1,
      (pid) => kills.push(pid),
      scan,
    );

    expect(reclaimed.map((r) => r.port)).toEqual([12389]);
    expect(kills).toEqual([process.pid]);
  });

  it("parks a duplicate beside the registered daemon and ages it out", async () => {
    const fleet = fakeFleet();
    const first = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });
    const key = daemonKey("/proj", "ide");
    const now = Date.now();
    const kills: number[] = [];
    // A second live daemon for the same project, on the next port. process.ppid
    // stands in for its pid: it must read as alive.
    const scan = () => [running(process.ppid, (first?.port ?? 0) + 1)];

    reclaimIdleDaemons(now, (pid) => kills.push(pid), scan);

    // The registered daemon is untouched and still what sessions resolve to.
    expect(readRegistry()[key]?.pid).toBe(process.pid);
    expect(readRegistry()[key]?.clients).toEqual([process.pid]);
    const parked = Object.values(readRegistry()).find(
      (r) => r.pid === process.ppid,
    );
    expect(parked?.idleSince).toBeDefined();

    const reclaimed = reclaimIdleDaemons(
      now + DAEMON_IDLE_GRACE_MS + 1,
      (pid) => kills.push(pid),
      scan,
    );
    expect(reclaimed.map((r) => r.pid)).toEqual([process.ppid]);
    expect(kills).toEqual([process.ppid]);
    expect(readRegistry()[key]?.pid).toBe(process.pid);
  });

  it("does not re-adopt a daemon that is already registered", async () => {
    const fleet = fakeFleet();
    const first = await ensureSerenaDaemon({
      root: "/proj",
      context: "ide",
      timeoutMs: 5_000,
      ...fleet,
    });

    reclaimIdleDaemons(
      Date.now(),
      () => {},
      () => [running(process.pid, first?.port ?? 0)],
    );

    expect(Object.keys(readRegistry())).toEqual([daemonKey("/proj", "ide")]);
  });
});
