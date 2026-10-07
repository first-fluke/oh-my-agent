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
import { join } from "node:path";

const sleeper = new Int32Array(new SharedArrayBuffer(4));

function release(directory: string, owner: string): void {
  try {
    unlinkSync(join(directory, owner));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
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
      rmdirSync(directory);
      return;
    }
    for (const owner of owners) {
      if (!owner.startsWith("owner-")) continue;
      const meta = JSON.parse(readFileSync(join(directory, owner), "utf-8"));
      if (
        meta.hostname !== hostname() ||
        !Number.isSafeInteger(meta.pid) ||
        meta.pid <= 0
      )
        continue;
      try {
        process.kill(meta.pid, 0);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ESRCH")
          release(directory, owner);
      }
    }
  } catch {
    // Unreadable metadata and racing releases do not grant ownership.
  }
}

/** Publish a populated directory atomically so crashes cannot leave an ownerless lock. */
export function withScheduleLock<T>(directory: string, action: () => T): T {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, "manifest.lock");
  const owner = `owner-${process.pid}-${randomUUID()}`;
  const candidate = join(directory, owner);
  mkdirSync(candidate, { mode: 0o700 });
  let acquired = false;
  try {
    writeFileSync(
      join(candidate, owner),
      JSON.stringify({ pid: process.pid, hostname: hostname() }),
      { mode: 0o600 },
    );
    const deadline = performance.now() + 5000;
    while (!acquired) {
      try {
        renameSync(candidate, lock);
        acquired = true;
      } catch (error) {
        if (
          !["EEXIST", "ENOTEMPTY", "EPERM", "EACCES"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        )
          throw error;
        recoverDeadOwner(lock);
        if (performance.now() >= deadline)
          throw new Error(
            `Timed out waiting for schedule manifest lock: ${lock}`,
          );
        Atomics.wait(sleeper, 0, 0, 10);
      }
    }
    return action();
  } finally {
    release(acquired ? lock : candidate, owner);
  }
}
