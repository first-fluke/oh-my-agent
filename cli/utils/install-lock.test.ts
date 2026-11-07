import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _forceReleaseLock,
  acquireLock,
  bindInstallLockRelease,
  DEAD_PID_GRACE_MS,
  lockPath,
} from "./install-lock.js";

describe("lockPath", () => {
  it("returns <installRoot>/.agents/_install.lock", () => {
    expect(lockPath("/home/user")).toBe(
      join("/home/user", ".agents", "_install.lock"),
    );
    expect(lockPath("/tmp/project")).toBe(
      join("/tmp/project", ".agents", "_install.lock"),
    );
  });
});

describe("acquireLock", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("returns ok on a fresh directory", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    const result = acquireLock(root);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(existsSync(lockPath(root))).toBe(true);
      result.release();
      expect(existsSync(lockPath(root))).toBe(false);
    }
  });

  it("returns ok:false when another live process holds it (simulate with self pid)", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    // Write a lock file with the current process's PID (definitely alive)
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      lockPath(root),
      JSON.stringify({
        pid: process.pid,
        hostname: hostname(),
        startedAt: new Date().toISOString(),
        uid: 0,
      }),
    );

    const result = acquireLock(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("active");
      expect(result.held.pid).toBe(process.pid);
    }
  });

  it("auto-clears a dead-pid lock older than the grace window", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    // pid that is definitely dead (very high number unlikely to exist), with a
    // startedAt past DEAD_PID_GRACE_MS — should be reclaimed.
    const deadPid = 9999999;
    const pastGrace = new Date(
      Date.now() - (DEAD_PID_GRACE_MS + 5000),
    ).toISOString();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      lockPath(root),
      JSON.stringify({
        pid: deadPid,
        hostname: hostname(),
        startedAt: pastGrace,
        uid: 0,
      }),
    );

    const result = acquireLock(root);
    expect(result.ok).toBe(true);
    if (result.ok) result.release();
  });

  it("does NOT clear a dead-pid lock still within the grace window", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    // Dead pid, but the lock was created just now: a SIGKILLed install/update may
    // have orphaned child processes still finishing, so the short grace must hold.
    const deadPid = 9999999;
    const withinGrace = new Date(Date.now() - 5000).toISOString();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      lockPath(root),
      JSON.stringify({
        pid: deadPid,
        hostname: hostname(),
        startedAt: withinGrace,
        uid: 0,
      }),
    );

    const result = acquireLock(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("active");
      expect(result.held.pid).toBe(deadPid);
    }
  });

  it("does NOT auto-clear when hostname differs", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    // Write a lock with a different hostname and a dead pid
    const deadPid = 9999999;
    const staleTime = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      lockPath(root),
      JSON.stringify({
        pid: deadPid,
        hostname: "some-other-machine.example.com",
        startedAt: staleTime,
        uid: 0,
      }),
    );

    const result = acquireLock(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should be treated as active (foreign host)
      expect(result.reason).toBe("active");
    }
  });

  it("release() is idempotent and does not throw on double-call", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    const result = acquireLock(root);
    expect(result.ok).toBe(true);
    if (result.ok) {
      result.release();
      expect(() => result.release()).not.toThrow();
    }
  });

  it("_forceReleaseLock removes the lock file", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    const result = acquireLock(root);
    expect(result.ok).toBe(true);
    expect(existsSync(lockPath(root))).toBe(true);

    _forceReleaseLock(root);
    expect(existsSync(lockPath(root))).toBe(false);
  });

  it("_forceReleaseLock is a no-op when no lock exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    expect(() => _forceReleaseLock(root)).not.toThrow();
  });
});

describe("bindInstallLockRelease", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("release is idempotent and removes the lock file", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    const acquired = acquireLock(root);
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;

    const release = bindInstallLockRelease(acquired.release);
    release();
    expect(existsSync(lockPath(root))).toBe(false);
    expect(() => release()).not.toThrow();
  });

  it("removes signal listeners after normal release", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    const acquired = acquireLock(root);
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;

    const sigintBefore = process.listenerCount("SIGINT");
    const sigtermBefore = process.listenerCount("SIGTERM");

    const release = bindInstallLockRelease(acquired.release);
    expect(process.listenerCount("SIGINT")).toBe(sigintBefore + 1);
    expect(process.listenerCount("SIGTERM")).toBe(sigtermBefore + 1);

    release();
    expect(process.listenerCount("SIGINT")).toBe(sigintBefore);
    expect(process.listenerCount("SIGTERM")).toBe(sigtermBefore);
  });

  it("releases the lock before exiting on SIGINT", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-lock-"));
    tempRoots.push(root);

    const acquired = acquireLock(root);
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;

    bindInstallLockRelease(acquired.release);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as typeof process.exit);

    expect(() => process.emit("SIGINT")).toThrow("process.exit");
    expect(existsSync(lockPath(root))).toBe(false);
    expect(exitSpy).toHaveBeenCalledWith(130);

    exitSpy.mockRestore();
  });
});
