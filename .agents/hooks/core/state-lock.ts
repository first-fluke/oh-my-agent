import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

/**
 * Dependency-free cross-process lock for shared `.agents/state/` files.
 *
 * Acquisition uses an O_EXCL lockfile (`openSync(path, "wx")`), which is
 * atomic on both POSIX and Windows. A crashed holder leaves the lockfile
 * behind; it is reclaimed once its mtime is older than `staleMs`, so a dead
 * session can never deadlock the repository permanently.
 *
 * This module is the hooks-side copy. The CLI-side copy lives at
 * `cli/state/state-lock.ts` and MUST stay algorithm-identical: hooks are
 * bundled/copied into vendor dirs and cannot import from cli/. Both copies
 * lock the SAME paths, so they interoperate across processes.
 */

export interface StateLockOptions {
  /** Maximum acquisition attempts before giving up (default 60). */
  retries?: number;
  /** Base backoff delay in ms; doubles per attempt up to maxDelayMs (default 10). */
  retryDelayMs?: number;
  /** Backoff ceiling in ms (default 200). */
  maxDelayMs?: number;
  /** Lockfiles older than this are treated as a crashed holder (default 10s). */
  staleMs?: number;
}

/** Thrown when the lock could not be acquired within the retry budget. */
export class StateLockTimeoutError extends Error {
  constructor(lockPath: string, attempts: number) {
    super(
      `could not acquire state lock after ${attempts} attempts: ${lockPath} ` +
        "(another session may be writing; if this persists, a stale lock can " +
        "be removed manually once no oma process is running)",
    );
    this.name = "StateLockTimeoutError";
  }
}

const DEFAULTS: Required<StateLockOptions> = {
  retries: 60,
  retryDelayMs: 10,
  maxDelayMs: 200,
  staleMs: 10_000,
};

/** Synchronous sleep without dependencies (Atomics.wait works on Node/Bun main threads). */
function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    // Environments that disallow main-thread Atomics.wait: bounded busy wait.
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // spin
    }
  }
}

function isExistsError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "EEXIST"
  );
}

/**
 * Run `fn` while holding the exclusive lock at `lockPath`.
 *
 * Semantics:
 * - Acquisition: O_EXCL create; on contention, bounded exponential backoff
 *   with jitter. A lockfile whose mtime is older than `staleMs` is unlinked
 *   and retried (crash recovery).
 * - Release: the lockfile is removed in `finally`, but only after verifying
 *   the stored token still matches (best-effort ABA guard: a holder that
 *   stalled past `staleMs` must not delete its successor's lock).
 * - Crash: the lockfile survives the dead process and is reclaimed by the
 *   next acquirer after `staleMs`.
 * - Exhaustion: throws StateLockTimeoutError — best-effort hook callers
 *   catch it and degrade (D69); the CLI copy propagates it to fail loud.
 */
export function withStateLock<T>(
  lockPath: string,
  fn: () => T,
  options: StateLockOptions = {},
): T {
  const opts = { ...DEFAULTS, ...options };
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  mkdirSync(dirname(lockPath), { recursive: true });

  let acquired = false;
  let delay = opts.retryDelayMs;
  for (let attempt = 0; attempt < opts.retries; attempt++) {
    let fd: number | null = null;
    try {
      fd = openSync(lockPath, "wx");
      writeFileSync(
        fd,
        JSON.stringify({ pid: process.pid, token, acquiredAt: Date.now() }),
        "utf-8",
      );
      acquired = true;
      break;
    } catch (e) {
      if (!isExistsError(e)) throw e;
      // Contended: reclaim a crashed holder's stale lock, else back off.
      try {
        const age = Date.now() - statSync(lockPath).mtimeMs;
        if (age > opts.staleMs) {
          // Re-stat immediately before unlink to shrink the race window
          // against a fresh lock created between the two checks.
          const recheck = Date.now() - statSync(lockPath).mtimeMs;
          if (recheck > opts.staleMs) {
            unlinkSync(lockPath);
            continue;
          }
        }
      } catch {
        // Lock vanished (or stat failed) — retry acquisition immediately.
        continue;
      }
      if (attempt < opts.retries - 1) {
        const jitter = 0.75 + Math.random() * 0.5;
        sleepSync(Math.min(opts.maxDelayMs, Math.round(delay * jitter)));
        delay = Math.min(opts.maxDelayMs, delay * 2);
      }
    } finally {
      if (fd !== null) {
        try {
          closeSync(fd);
        } catch {
          // Best-effort close; the lock token is already on disk.
        }
      }
    }
  }
  if (!acquired) throw new StateLockTimeoutError(lockPath, opts.retries);

  try {
    return fn();
  } finally {
    try {
      // Token check (best-effort): if the file was reclaimed while we
      // stalled, do not delete the new holder's lock.
      let stillOurs = true;
      try {
        const parsed = JSON.parse(readFileSync(lockPath, "utf-8")) as {
          token?: string;
        };
        stillOurs = parsed.token === token;
      } catch {
        // Unreadable/missing — fall through to unlink (ENOENT is ignored).
      }
      if (stillOurs) unlinkSync(lockPath);
    } catch {
      // Release is best-effort; staleness recovery covers any leftover.
    }
  }
}
