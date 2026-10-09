import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import { DEAD_PID_GRACE_MS } from "./install-lock.js";

export type OwnedDirectoryLockResult =
  | { ok: true; release(): void }
  | { ok: false };

const CONTENTION_CODES = new Set([
  "EEXIST",
  "ENOTEMPTY",
  "ENOTDIR",
  "EPERM",
  "EACCES",
]);

function removeOwner(directory: string, owner: string): void {
  try {
    unlinkSync(join(directory, owner));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    // A newly published owner's unique file prevents this directory removal.
    rmdirSync(directory);
  } catch (error) {
    if (
      !["ENOENT", "ENOTEMPTY", "EEXIST"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      throw error;
  }
}

function recoverDeadOwner(directory: string): void {
  try {
    const owners = readdirSync(directory);
    if (owners.length === 0) {
      // Windows requires removing an empty destination before publication.
      rmdirSync(directory);
      return;
    }
    for (const owner of owners) {
      if (!owner.startsWith("owner-")) continue;
      const meta: unknown = JSON.parse(
        readFileSync(join(directory, owner), "utf-8"),
      );
      if (!meta || typeof meta !== "object") continue;
      const {
        pid,
        hostname: ownerHost,
        startedAt,
      } = meta as Record<string, unknown>;
      if (
        ownerHost !== hostname() ||
        typeof pid !== "number" ||
        !Number.isSafeInteger(pid) ||
        pid <= 0 ||
        typeof startedAt !== "string"
      )
        continue;
      const started = Date.parse(startedAt);
      // A dead parent may leave package installation or OS activation running.
      if (
        !Number.isFinite(started) ||
        Date.now() - started <= DEAD_PID_GRACE_MS
      )
        continue;
      try {
        process.kill(pid, 0);
      } catch (error) {
        // EPERM and unknown failures do not establish that the owner is dead.
        if ((error as NodeJS.ErrnoException).code === "ESRCH")
          removeOwner(directory, owner);
      }
    }
  } catch {
    // Unreadable metadata and racing release/recovery never grant ownership.
  }
}

/**
 * Publish a populated directory atomically; callers own retry timing.
 * Recovery and release remove only an observed unique owner, never recursively.
 */
export function acquireOwnedDirectoryLock(
  path: string,
): OwnedDirectoryLockResult {
  const root = dirname(path);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const owner = `owner-${process.pid}-${randomUUID()}`;
  const candidate = join(root, `.${basename(path)}-${owner}`);
  mkdirSync(candidate, { mode: 0o700 });
  let acquired = false;
  try {
    writeFileSync(
      join(candidate, owner),
      JSON.stringify({
        pid: process.pid,
        hostname: hostname(),
        startedAt: new Date().toISOString(),
      }),
      { encoding: "utf-8", mode: 0o600 },
    );
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Nonempty directories cannot replace another nonempty owner directory.
        renameSync(candidate, path);
        acquired = true;
        let released = false;
        return {
          ok: true,
          release() {
            if (released) return;
            removeOwner(path, owner);
            released = true;
          },
        };
      } catch (error) {
        if (!CONTENTION_CODES.has((error as NodeJS.ErrnoException).code ?? ""))
          throw error;
        if (attempt === 0) recoverDeadOwner(path);
      }
    }
    return { ok: false };
  } finally {
    if (!acquired) removeOwner(candidate, owner);
  }
}
