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
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { omaPaths } from "../../utils/oma-home.js";
import {
  isSerenaLockActive,
  SERENA_LOCK_STALE_MS as LOCK_STALE_MS,
} from "../serena-lock.js";

/**
 * Test seam for the state root. A direct override instead of mocking
 * `node:os`: module mocks pull the whole module graph through the mock
 * pipeline during collection, and the daemon test file's worker was
 * intermittently wedging exactly there under load.
 */
let stateDirOverride: string | null = null;
let legacyStateDirOverride: string | null = null;
let selectedStateDir: string | null = null;

/** @internal test-only */
export function _setOmaStateDirForTests(
  dir: string | null,
  legacyDir: string | null = null,
): void {
  stateDirOverride = dir;
  legacyStateDirOverride = legacyDir;
  selectedStateDir = null;
}

/**
 * Keep every operation in this process on one registry and its matching lock.
 * Active legacy clients continue sharing their registry until they finish.
 */
export function omaStateDir(): string {
  if (stateDirOverride !== null) return stateDirOverride;
  selectedStateDir ??= selectSerenaStateDir();
  return selectedStateDir;
}

function selectSerenaStateDir(heldLock?: string): string {
  const canonical = omaPaths().serena;
  const legacy = legacyStateDirOverride ?? join(homedir(), ".config", "oma");
  if (resolve(legacy) === resolve(canonical)) return canonical;

  function activeRegistry(directory: string): boolean {
    const active = (pid: unknown): boolean => {
      if (!Number.isSafeInteger(pid) || (pid as number) <= 0)
        throw new Error("Invalid process ID");
      try {
        process.kill(pid as number, 0);
        return true;
      } catch (error) {
        return (error as NodeJS.ErrnoException).code !== "ESRCH";
      }
    };
    try {
      const lock = join(directory, "serena-daemons.lock");
      let busy = lock !== heldLock && isSerenaLockActive(lock);
      const registry = join(directory, "serena-daemons.json");
      if (existsSync(registry)) {
        const records: unknown = JSON.parse(readFileSync(registry, "utf8"));
        if (!records || typeof records !== "object" || Array.isArray(records))
          throw new Error("Invalid registry");
        for (const record of Object.values(records)) {
          if (!record || typeof record !== "object")
            throw new Error("Invalid daemon record");
          if (record.clients !== undefined && !Array.isArray(record.clients))
            throw new Error("Invalid daemon clients");
          // Inspect every record, even when another daemon is already active.
          const daemonActive = active(record.pid);
          const clientsActive = (record.clients ?? [])
            .map(active)
            .some(Boolean);
          busy ||= daemonActive || clientsActive;
        }
      }
      return busy;
    } catch {
      throw new Error(
        `Unreadable ${directory === legacy ? "legacy " : ""}Serena registry at ${directory}. Run "oma doctor" before starting or cleaning shared Serena daemons.`,
      );
    }
  }

  if (activeRegistry(legacy)) {
    if (activeRegistry(canonical))
      throw new Error(
        `Both legacy and canonical Serena registries are active at ${legacy} and ${canonical}. Run "oma doctor" to reconcile them without interrupting attached clients.`,
      );
    return legacy;
  }
  // Keep new clients on legacy until migration has published its destination.
  // Otherwise a fresh canonical registry would conflict with that later copy.
  return existsSync(join(legacy, "serena-daemons.json")) &&
    !existsSync(join(canonical, "serena-daemons.json"))
    ? legacy
    : canonical;
}

export function daemonRegistryPath(): string {
  return join(omaStateDir(), "serena-daemons.json");
}

export function daemonLogPath(port: number): string {
  return join(omaStateDir(), `serena-daemon-${port}.log`);
}

export const DAEMON_LOG_PATTERN = /^serena-daemon-(\d+)\.log$/;

/** A live daemon's log is emptied once it passes this size. */
export const DAEMON_LOG_MAX_BYTES = 20 * 1024 * 1024;

function lockPath(): string {
  return join(omaStateDir(), "serena-daemons.lock");
}

export interface DaemonRecord {
  root: string;
  context: string;
  port: number;
  pid: number;
  startedAt: string;
  /** Adapter, project settings, context, and SDK loaded at startup. */
  runtimeRevision?: string;
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

export function writeRegistry(registry: DaemonRegistry): void {
  mkdirSync(omaStateDir(), { recursive: true });
  writeFileSync(daemonRegistryPath(), `${JSON.stringify(registry, null, 2)}\n`);
}

/** How long a synchronous registry mutation waits for the file lock. */
const REGISTRY_LOCK_WAIT_MS = 5_000;
const REGISTRY_LOCK_POLL_MS = 25;
export class SerenaRegistryLockTimeout extends Error {}

function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      // busy-wait fallback where Atomics.wait is unavailable
    }
  }
}

/**
 * Read-modify-write the registry under the file lock.
 *
 * Every mutation goes through here. Attach, detach and reclaim used to read the
 * file, edit their record and write the whole thing back with no lock, so two
 * bridges doing that at once (codex starts several per session) lost whichever
 * write landed first — a daemon that had just been registered vanished from
 * the file while its process lived on, invisible to reclamation.
 *
 * Synchronous because detach runs from process exit handlers. A migration can
 * hold the same lock while copying logs, so a timeout must never bypass it.
 * Exit-time detach can be skipped; a later sweep removes dead client PIDs.
 */
export function withRegistryLock<T>(
  mutate: (registry: DaemonRegistry) => T,
): T {
  const deadline = Date.now() + REGISTRY_LOCK_WAIT_MS;
  let release: (() => void) | null = null;
  for (;;) {
    release = acquireLock();
    if (release || Date.now() >= deadline) break;
    sleepSync(REGISTRY_LOCK_POLL_MS);
  }
  if (!release)
    throw new SerenaRegistryLockTimeout(
      "Timed out waiting for Serena registry lock",
    );
  try {
    const registry = readRegistry();
    const before = JSON.stringify(registry);
    const result = mutate(registry);
    // Write only on change: a read-only sweep must not touch the file, and a
    // caller whose read failed (unreadable file, mocked fs) must not replace
    // the registry with the empty object it fell back to.
    if (JSON.stringify(registry) !== before) writeRegistry(registry);
    return result;
  } finally {
    release?.();
  }
}

/**
 * Serialize daemon startup across sessions. Two clients launching at once must
 * not both bind the same port — the loser would die and take its session's
 * serena with it.
 */
function acquireLock(): (() => void) | null {
  mkdirSync(omaStateDir(), { recursive: true });
  const path = lockPath();
  let fd: number;
  try {
    fd = openSync(path, "wx");
  } catch {
    // Held by someone else — unless it is stale, in which case take it over.
    try {
      const age = Date.now() - statSync(path).mtimeMs;
      const content = readFileSync(path, "utf8");
      const owner = Number(content);
      if (!Number.isSafeInteger(owner) || owner <= 0) {
        if (content.trim() === "" && !isSerenaLockActive(path))
          return acquireLock();
        return null;
      }
      try {
        process.kill(owner, 0);
        return null;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") return null;
      }
      if (age > LOCK_STALE_MS) {
        rmSync(path, { force: true });
        return acquireLock();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return acquireLock();
    }
    return null;
  }
  try {
    try {
      // Close the descriptor before publishing or releasing the lock on Windows.
      writeFileSync(fd, String(process.pid));
    } finally {
      closeSync(fd);
    }
    if (stateDirOverride === null) {
      // Migration uses this same legacy lock. Recheck before any mutation so a
      // bridge that selected legacy just before migration follows its new home.
      const selected = selectSerenaStateDir(path);
      if (selected !== omaStateDir()) {
        selectedStateDir = selected;
        rmSync(path, { force: true });
        return acquireLock();
      }
    }
  } catch (error) {
    rmSync(path, { force: true });
    throw error;
  }
  return () => {
    try {
      rmSync(path, { force: true });
    } catch {
      // best-effort
    }
  };
}

export async function waitForLock(
  timeoutMs: number,
): Promise<(() => void) | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const release = acquireLock();
    if (release) return release;
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, 200));
  }
}
