// Duplicate-delivery suppression for `oma hook run`.
//
// A project install and a global install can both register the same vendor
// event, so a single prompt or tool call reaches `oma hook run` twice: same
// vendor, event and payload, launched from two different oma-hook.sh wrappers.
// Only that pair is a duplicate. A different payload (another tool call,
// prompt or session) or a repeat from the same wrapper (a second Stop, the
// same prompt sent again) always dispatches. When the wrapper identity or the
// claim store is unavailable, the delivery dispatches (fail-open).
//
// The registration's --matcher is not part of the key: the two installs may
// run different oma versions whose matcher unions differ, yet one tool call
// is still one tool call.

import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join, resolve } from "node:path";

/** A second registration's identical delivery within this window is dropped. */
export const HOOK_DEDUP_TTL_MS = 5_000;

/** Claims older than this are removed by the opportunistic sweep. */
const SWEEP_AGE_MS = 60_000;

export interface HookDelivery {
  vendor: string;
  nativeEvent: string;
  rawStdin: string;
  /** Path of the oma-hook.sh wrapper that launched this run (`$OMA_HOOK_WRAPPER`). */
  wrapper?: string;
}

export interface HookDedupOptions {
  /** Claim directory; `null` disables deduplication. Defaults to {@link resolveHookDedupDir}. */
  dir?: string | null;
  ttlMs?: number;
  now?: number;
}

interface Claim {
  wrapper: string;
  at: number;
}

export function hookDeliveryKey(delivery: HookDelivery): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        delivery.vendor,
        delivery.nativeEvent,
        delivery.rawStdin,
      ]),
    )
    .digest("hex");
}

function userTag(): string {
  if (typeof process.getuid === "function") return String(process.getuid());
  try {
    return userInfo().username.replace(/[^A-Za-z0-9._-]/g, "_") || "user";
  } catch {
    return "user";
  }
}

/**
 * Private, per-user claim directory. Returns null (no dedup) when disabled with
 * `OMA_HOOK_DEDUP=0` or when the directory is not a real directory owned by the
 * current user — a pre-created shared path must never steer hook dispatch.
 */
export function resolveHookDedupDir(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (env.OMA_HOOK_DEDUP === "0") return null;
  const dir = resolve(
    env.OMA_HOOK_DEDUP_DIR ||
      (env.XDG_RUNTIME_DIR
        ? join(env.XDG_RUNTIME_DIR, "oma-hook-dedup")
        : join(tmpdir(), `oma-hook-dedup-${userTag()}`)),
  );
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = lstatSync(dir);
  if (!stat.isDirectory()) return null;
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    return null;
  }
  if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) {
    chmodSync(dir, 0o700);
  }
  return dir;
}

function wrapperIdentity(wrapper: string): string {
  const absolute = resolve(wrapper);
  try {
    return realpathSync(absolute);
  } catch {
    return absolute;
  }
}

function readClaim(entry: string): Claim | null {
  try {
    const parsed = JSON.parse(readFileSync(entry, "utf-8")) as Partial<Claim>;
    return typeof parsed.wrapper === "string" && typeof parsed.at === "number"
      ? { wrapper: parsed.wrapper, at: parsed.at }
      : null;
  } catch {
    return null;
  }
}

function writeTemp(entry: string, record: string): string {
  const tmp = `${entry}.${randomUUID()}.tmp`;
  writeFileSync(tmp, record, { mode: 0o600 });
  return tmp;
}

function removeQuietly(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // Already removed by a concurrent run or the sweep.
  }
}

/** Publish a complete claim only if none exists. False when one already does. */
function publishExclusive(entry: string, record: string): boolean {
  const tmp = writeTemp(entry, record);
  try {
    linkSync(tmp, entry);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    // No hard links on this filesystem: O_EXCL create instead.
    try {
      writeFileSync(entry, record, { flag: "wx", mode: 0o600 });
      return true;
    } catch (fallbackError) {
      if ((fallbackError as NodeJS.ErrnoException).code === "EEXIST") {
        return false;
      }
      throw fallbackError;
    }
  } finally {
    removeQuietly(tmp);
  }
}

function sweep(dir: string, now: number): void {
  try {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      try {
        if (now - statSync(path).mtimeMs > SWEEP_AGE_MS) unlinkSync(path);
      } catch {
        // Raced with another run's cleanup.
      }
    }
  } catch {
    // Cleanup is opportunistic.
  }
}

/**
 * Decide whether this run should dispatch the hook chain. False only when the
 * same payload was already claimed, within the TTL, by a different wrapper —
 * i.e. the other registration of a double-registered event handles it.
 */
export function shouldDispatchHookDelivery(
  delivery: HookDelivery,
  options: HookDedupOptions = {},
): boolean {
  // Without a wrapper identity a duplicate cannot be told apart from a
  // legitimate repeat; an empty payload carries nothing to compare.
  if (!delivery.wrapper || !delivery.rawStdin.trim()) return true;
  try {
    const dir = options.dir === undefined ? resolveHookDedupDir() : options.dir;
    if (!dir) return true;
    const now = options.now ?? Date.now();
    const ttl = options.ttlMs ?? HOOK_DEDUP_TTL_MS;
    const wrapper = wrapperIdentity(delivery.wrapper);
    const entry = join(dir, hookDeliveryKey(delivery));
    const record = `${JSON.stringify({ wrapper, at: now } satisfies Claim)}\n`;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (publishExclusive(entry, record)) {
        sweep(dir, now);
        return true;
      }
      const prior = readClaim(entry);
      const age = prior ? now - prior.at : Number.NaN;
      if (prior && age >= 0 && age < ttl) {
        if (prior.wrapper !== wrapper) return false;
        // Same registration firing again: dispatch and restart the window so
        // the other registration's copy of this repeat is still recognized.
        renameSync(writeTemp(entry, record), entry);
        return true;
      }
      // Expired or unreadable claim: replace it and retry once.
      removeQuietly(entry);
    }
    return true;
  } catch {
    return true;
  }
}
