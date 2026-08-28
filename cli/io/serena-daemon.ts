import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { serenaDaemonMcpArgs } from "../vendors/serena.js";

/** Poll interval while waiting for a starting daemon to answer. */
export const STARTUP_CHECK_INTERVAL_MS = 1000;

/** Per-probe timeout when checking whether a daemon port is listening. */
export const STARTUP_PROBE_TIMEOUT_MS = Number.parseInt(
  process.env.OH_MY_AG_BRIDGE_PROBE_TIMEOUT_MS ?? "2000",
  10,
);

/**
 * Per-project Serena daemons.
 *
 * Serena's stdio transport gives every agent session its own Python process
 * plus a full language-server stack, so cost scales with (sessions × servers).
 * A shared HTTP server collapses that to one stack per project no matter how
 * many sessions are open.
 *
 * Sharing has to be scoped per project, not per machine: `SerenaAgent` holds a
 * single `_active_project`, and `session_id` only tracks which prompts a client
 * has already been shown. A server started WITHOUT `--project` exposes the
 * `activate_project` tool, so any session can swap the project out from under
 * every other one — the failure mode of the original machine-wide bridge.
 * Pinning `--project` removes that tool from the tool set entirely (verified:
 * 22 tools with it pinned vs 24 without, and `activate_project` answers
 * "Unknown tool"), which makes concurrent sessions safe.
 *
 * Daemons remain keyed by (project root, Serena context) so user-owned custom
 * contexts cannot collide with OMA's shared `oma` context. OMA-managed vendors
 * all converge on the latter.
 *
 * Cold-start numbers (measured, serena 1.6.1, this repo): the HTTP port binds
 * ~8s after spawn — Python interpreter + imports — while language-server init
 * runs as an async task behind it. `initialize` answered 247ms after bind and
 * the first `find_symbol` 2.3s after (the call waits internally for LSP init).
 * So the only wait a client ever sees is the ~8s port wait on the very first
 * session of a project, well inside MCP client startup timeouts (Claude Code
 * 30s, Codex 90s via `startup_timeout_sec`). Messages the client writes during
 * that window sit unread in the stdin pipe until the proxy attaches, so
 * nothing is dropped.
 */

/**
 * Test seam for the state root. A direct override instead of mocking
 * `node:os`: module mocks pull the whole module graph through the mock
 * pipeline during collection, and the daemon test file's worker was
 * intermittently wedging exactly there under load.
 */
let stateDirOverride: string | null = null;

/** @internal test-only */
export function _setOmaStateDirForTests(dir: string | null): void {
  stateDirOverride = dir;
}

/**
 * Runtime state root, matching the `~/.config/oma/` location the vault index
 * already uses. Deliberately not `~/.agents`, which install-mode detection reads.
 */
export function omaStateDir(): string {
  return stateDirOverride ?? join(homedir(), ".config", "oma");
}

export function daemonRegistryPath(): string {
  return join(omaStateDir(), "serena-daemons.json");
}

function daemonLogPath(port: number): string {
  return join(omaStateDir(), `serena-daemon-${port}.log`);
}

function lockPath(): string {
  return join(omaStateDir(), "serena-daemons.lock");
}

export interface DaemonRecord {
  root: string;
  context: string;
  port: number;
  pid: number;
  startedAt: string;
  /**
   * PIDs of the bridge proxies currently attached. A daemon with no live
   * clients is a candidate for reclamation.
   *
   * Tracked by pid rather than a counter because a proxy can be SIGKILLed
   * without ever running its exit handler — a counter would leak upward and the
   * daemon would live forever. Liveness is re-derived from the pids instead.
   */
  clients?: number[];
  /** When the last client detached, for the idle grace period. */
  idleSince?: string;
}

export type DaemonRegistry = Record<string, DaemonRecord>;

export function daemonKey(root: string, context: string): string {
  return `${root}::${context}`;
}

export function readRegistry(): DaemonRegistry {
  try {
    const parsed = JSON.parse(readFileSync(daemonRegistryPath(), "utf-8"));
    return parsed && typeof parsed === "object"
      ? (parsed as DaemonRegistry)
      : {};
  } catch {
    return {};
  }
}

function writeRegistry(registry: DaemonRegistry): void {
  mkdirSync(omaStateDir(), { recursive: true });
  writeFileSync(daemonRegistryPath(), `${JSON.stringify(registry, null, 2)}\n`);
}

/**
 * Walk up from `cwd` for the project root, matching what serena's
 * `--project-from-cwd` resolves to: the nearest `.serena/project.yml`, else the
 * nearest `.git`, else `cwd` itself. Sessions started in different
 * subdirectories of one repo must land on the same daemon.
 */
export function resolveProjectRoot(cwd: string): string {
  let dir = resolve(cwd);
  for (let i = 0; i < 30; i++) {
    if (existsSync(join(dir, ".serena", "project.yml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  dir = resolve(cwd);
  for (let i = 0; i < 30; i++) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return resolve(cwd);
}

/** Port window for daemons. Wide enough that collisions are rare, bounded so probing terminates. */
const PORT_BASE = 12341;
const PORT_RANGE = 100;

/** Stable starting port for a key, so repeated runs converge without a registry read. */
export function preferredPort(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return PORT_BASE + (Math.abs(hash) % PORT_RANGE);
}

/** True when something answers on the port — any HTTP status counts as "listening". */
export function probePort(port: number): Promise<boolean> {
  return new Promise((done) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: "/mcp" },
      (res) => {
        res.resume();
        done(true);
        req.destroy();
      },
    );
    req.setTimeout(STARTUP_PROBE_TIMEOUT_MS, () => {
      req.destroy();
      done(false);
    });
    req.on("error", () => done(false));
    req.end();
  });
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const LOCK_STALE_MS = 60_000;

/**
 * Serialize daemon startup across sessions. Two clients launching at once must
 * not both bind the same port — the loser would die and take its session's
 * serena with it.
 */
function acquireLock(): (() => void) | null {
  mkdirSync(omaStateDir(), { recursive: true });
  const path = lockPath();
  try {
    const fd = openSync(path, "wx");
    try {
      // writeFileSync with a descriptor does NOT close it; leaving it open
      // leaks one fd per lock, and on Windows an open handle can make the
      // release's rmSync fail — permanently wedging the lock.
      writeFileSync(fd, String(process.pid));
    } finally {
      closeSync(fd);
    }
    return () => {
      try {
        rmSync(path, { force: true });
      } catch {
        // best-effort
      }
    };
  } catch {
    // Held by someone else — unless it is stale, in which case take it over.
    try {
      const age = Date.now() - statSync(path).mtimeMs;
      if (age > LOCK_STALE_MS) {
        rmSync(path, { force: true });
        return acquireLock();
      }
    } catch {
      // vanished between calls — retry once
      return acquireLock();
    }
    return null;
  }
}

async function waitForLock(timeoutMs: number): Promise<(() => void) | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const release = acquireLock();
    if (release) return release;
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, 200));
  }
}

export interface EnsureDaemonOptions {
  root: string;
  context: string;
  /** Overall budget for "is it up, else start it and wait". */
  timeoutMs?: number;
  /** Injected for tests. */
  spawnDaemon?: (port: number, root: string, context: string) => number | null;
  /** Injected for tests. */
  probe?: (port: number) => Promise<boolean>;
}

export interface DaemonHandle {
  url: string;
  port: number;
  /** True when this call started the daemon rather than reusing one. */
  started: boolean;
}

/** Launch a detached serena HTTP server. Returns its pid, or null if spawn failed. */
function spawnDaemonProcess(
  port: number,
  root: string,
  context: string,
): number | null {
  mkdirSync(omaStateDir(), { recursive: true });
  const log = openSync(daemonLogPath(port), "a");

  // Detached on purpose: the daemon outlives the session that happened to start
  // it, so one client exiting does not tear serena out from under its peers.
  const child = spawn("serena", serenaDaemonMcpArgs(context, root, port), {
    detached: true,
    stdio: ["ignore", log, log],
    // On Windows a detached console app pops open its own console window;
    // this suppresses it. No-op elsewhere. (Windows behaviour is untested —
    // these are the standard flags, but the detach semantics differ.)
    windowsHide: true,
  });

  // A missing executable reports failure asynchronously through `error`.
  // Always consume it: pid is undefined in that case, so the caller can return
  // null and use the stdio fallback instead of crashing on an unhandled event.
  child.once("error", () => {});
  if (typeof child.pid !== "number") return null;
  child.unref();
  return child.pid;
}

/**
 * Return a reachable shared daemon for (root, context), starting one if needed.
 *
 * Returns null when no daemon could be made reachable — callers must fall back
 * to plain stdio rather than fail, so a broken daemon never costs the user
 * their code intelligence.
 */
export async function ensureSerenaDaemon(
  opts: EnsureDaemonOptions,
): Promise<DaemonHandle | null> {
  const { root, context } = opts;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const spawnFn = opts.spawnDaemon ?? spawnDaemonProcess;
  const probe = opts.probe ?? probePort;
  const key = daemonKey(root, context);
  const deadline = Date.now() + timeoutMs;

  const urlFor = (port: number) => `http://127.0.0.1:${port}/mcp`;

  // Every start is also a sweep: daemons whose sessions have all gone away get
  // reclaimed here, so the fleet stays bounded with nothing to schedule or run.
  reclaimIdleDaemons();

  // Fast path: a live registration that still answers.
  const known = readRegistry()[key];
  if (known && (await probe(known.port))) {
    attachClient(key);
    return { url: urlFor(known.port), port: known.port, started: false };
  }

  const release = await waitForLock(Math.min(timeoutMs, 30_000));
  if (!release) return null;

  try {
    // Re-check under the lock: another session may have just started it.
    const registry = readRegistry();
    const current = registry[key];
    if (current && (await probe(current.port))) {
      attachClient(key);
      return { url: urlFor(current.port), port: current.port, started: false };
    }

    // Pick a free port, skipping ones another key owns or anything already bound.
    const taken = new Set(
      Object.entries(registry)
        .filter(([otherKey, record]) => otherKey !== key && isAlive(record.pid))
        .map(([, record]) => record.port),
    );

    let port: number | null = null;
    const first = preferredPort(key);
    for (let i = 0; i < PORT_RANGE; i++) {
      const candidate = PORT_BASE + ((first - PORT_BASE + i) % PORT_RANGE);
      if (taken.has(candidate)) continue;
      if (await probe(candidate)) continue; // occupied by something else
      port = candidate;
      break;
    }
    if (port === null) return null;

    const pid = spawnFn(port, root, context);
    if (pid === null) return null;

    registry[key] = {
      root,
      context,
      port,
      pid,
      startedAt: new Date().toISOString(),
      clients: [process.pid],
    };
    writeRegistry(registry);

    while (Date.now() < deadline) {
      if (await probe(port)) {
        return { url: urlFor(port), port, started: true };
      }
      if (!isAlive(pid)) {
        // Died during startup (bad project.yml, missing binary, port race).
        const pruned = readRegistry();
        delete pruned[key];
        writeRegistry(pruned);
        return null;
      }
      await new Promise((r) => setTimeout(r, STARTUP_CHECK_INTERVAL_MS));
    }

    return null;
  } finally {
    release();
  }
}

/**
 * PIDs of shared daemons that currently have at least one live client.
 *
 * The serena reaper's activity signals (log writes, mtime, cpu) cannot see MCP
 * clients: a daemon whose sessions are merely between tool calls looks idle to
 * all three. The reaper feeds this set in as an activity floor so it never
 * strips the warm LSP stack out from under attached sessions — serena would
 * self-heal, but the rebuild cost is exactly what sharing exists to avoid.
 */
export function daemonPidsWithLiveClients(): Set<number> {
  const pids = new Set<number>();
  for (const record of Object.values(readRegistry())) {
    if (!isAlive(record.pid)) continue;
    if ((record.clients ?? []).some(isAlive)) pids.add(record.pid);
  }
  return pids;
}

/** Drop registrations whose process is gone. Used by `oma doctor` / reap paths. */
export function pruneRegistry(): DaemonRecord[] {
  const registry = readRegistry();
  const removed: DaemonRecord[] = [];
  for (const [key, record] of Object.entries(registry)) {
    if (!isAlive(record.pid)) {
      removed.push(record);
      delete registry[key];
    }
  }
  if (removed.length > 0) writeRegistry(registry);
  return removed;
}

/**
 * How long a daemon with no attached clients is kept alive.
 *
 * Not zero: restarting an agent, or closing one session and opening another, is
 * routine, and tearing the daemon down on the last detach would throw away a
 * warm language-server stack that costs ~15-25s to rebuild. Not unbounded
 * either — before sharing, everything died with the session, so an abandoned
 * daemon holding a full LSP stack forever would be a regression.
 */
export const DAEMON_IDLE_GRACE_MS = 10 * 60_000;

/** Register this process as a client of `key`, so the daemon is not reclaimed. */
export function attachClient(key: string, pid = process.pid): void {
  const registry = readRegistry();
  const record = registry[key];
  if (!record) return;

  const clients = new Set((record.clients ?? []).filter(isAlive));
  clients.add(pid);
  record.clients = [...clients];
  record.idleSince = undefined;
  writeRegistry(registry);
}

/**
 * Detach this process. When it was the last live client the daemon is marked
 * idle; reclamation itself is left to {@link reclaimIdleDaemons} so a quick
 * restart can re-attach inside the grace period.
 */
export function detachClient(key: string, pid = process.pid): void {
  const registry = readRegistry();
  const record = registry[key];
  if (!record) return;

  const clients = (record.clients ?? []).filter(
    (client) => client !== pid && isAlive(client),
  );
  record.clients = clients;
  record.idleSince =
    clients.length === 0 ? new Date().toISOString() : undefined;
  writeRegistry(registry);
}

/**
 * Stop daemons whose clients are all gone and whose grace period has expired,
 * and forget registrations whose process already died.
 *
 * Called opportunistically whenever a bridge starts, which keeps the fleet
 * bounded without a scheduler, a background process, or anything for the user
 * to run.
 *
 * `nowMs` and `kill` are injectable for tests: the grace period must be
 * steppable, and a test that lets the real `process.kill` fire would have to
 * spawn a live victim process — child handles in a vitest worker are exactly
 * the kind of thing that wedges its teardown on slow CI runners.
 */
export function reclaimIdleDaemons(
  nowMs = Date.now(),
  kill: (pid: number, signal: NodeJS.Signals) => void = (pid, signal) => {
    process.kill(pid, signal);
  },
): DaemonRecord[] {
  const registry = readRegistry();
  const reclaimed: DaemonRecord[] = [];

  for (const [key, record] of Object.entries(registry)) {
    if (!isAlive(record.pid)) {
      delete registry[key];
      continue;
    }

    const clients = (record.clients ?? []).filter(isAlive);
    if (clients.length > 0) {
      // Re-attached, or a client died without detaching: either way it is busy.
      if (clients.length !== (record.clients ?? []).length) {
        record.clients = clients;
        record.idleSince = undefined;
      }
      continue;
    }

    // Idle. Start the clock if this is the first time we noticed.
    if (!record.idleSince) {
      record.clients = [];
      record.idleSince = new Date(nowMs).toISOString();
      continue;
    }

    const idleMs = nowMs - Date.parse(record.idleSince);
    if (Number.isNaN(idleMs) || idleMs < DAEMON_IDLE_GRACE_MS) continue;

    try {
      kill(record.pid, "SIGTERM");
    } catch {
      // already gone
    }
    reclaimed.push(record);
    delete registry[key];
  }

  writeRegistry(registry);
  return reclaimed;
}
