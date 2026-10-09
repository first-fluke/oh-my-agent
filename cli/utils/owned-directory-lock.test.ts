import * as fs from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEAD_PID_GRACE_MS } from "./install-lock.js";
import {
  acquireOwnedDirectoryLock,
  type OwnedDirectoryLockResult,
} from "./owned-directory-lock.js";

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
}));

function errno(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

describe("acquireOwnedDirectoryLock", () => {
  let root: string;
  let path: string;
  const deadPid = 9999999;

  beforeEach(() => {
    root = fs.mkdtempSync(join(tmpdir(), "oma-owned-lock-"));
    path = join(root, "lifecycle.lock");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  function seedOwner(
    meta: unknown = {
      pid: deadPid,
      hostname: hostname(),
      startedAt: new Date(Date.now() - DEAD_PID_GRACE_MS - 5000).toISOString(),
    },
  ): string {
    const owner = `owner-${deadPid}-previous`;
    fs.mkdirSync(path);
    fs.writeFileSync(join(path, owner), JSON.stringify(meta));
    return owner;
  }

  function mockDeadPid(): void {
    const kill = process.kill.bind(process);
    vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (pid === deadPid) throw errno("ESRCH");
      return kill(pid, signal);
    });
  }

  it("publishes one owner and excludes another caller without candidate leaks", () => {
    const first = acquireOwnedDirectoryLock(path);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const [owner] = fs.readdirSync(path);
    expect(owner).toMatch(new RegExp(`^owner-${process.pid}-`));
    expect(
      JSON.parse(fs.readFileSync(join(path, owner ?? ""), "utf8")),
    ).toMatchObject({
      pid: process.pid,
      hostname: hostname(),
      startedAt: expect.any(String),
    });
    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(root)).toEqual(["lifecycle.lock"]);

    first.release();
    expect(fs.existsSync(path)).toBe(false);
    expect(() => first.release()).not.toThrow();
  });

  it("reclaims only a confirmed dead same-host owner after the grace period", () => {
    seedOwner();
    mockDeadPid();

    const result = acquireOwnedDirectoryLock(path);

    expect(result.ok).toBe(true);
    if (result.ok) result.release();
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("preserves a recently dead owner while orphaned installation work may remain", () => {
    const owner = seedOwner({
      pid: deadPid,
      hostname: hostname(),
      startedAt: new Date().toISOString(),
    });
    mockDeadPid();

    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(path)).toEqual([owner]);
    expect(fs.readdirSync(root)).toEqual(["lifecycle.lock"]);
  });

  it("preserves a live owner even when its timestamp is old", () => {
    const owner = seedOwner({
      pid: process.pid,
      hostname: hostname(),
      startedAt: new Date(0).toISOString(),
    });

    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(path)).toEqual([owner]);
    expect(fs.readdirSync(root)).toEqual(["lifecycle.lock"]);
  });

  it("preserves a foreign owner without probing its PID", () => {
    const owner = seedOwner({
      pid: deadPid,
      hostname: "another-host",
      startedAt: new Date(0).toISOString(),
    });
    const kill = vi.spyOn(process, "kill");

    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(path)).toEqual([owner]);
    expect(kill).not.toHaveBeenCalled();
  });

  it("does not mistake EPERM for a dead owner", () => {
    const owner = seedOwner();
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw errno("EPERM");
    });

    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(path)).toEqual([owner]);
  });

  it.each([
    null,
    { pid: deadPid, hostname: hostname() },
    { pid: -1, hostname: hostname(), startedAt: new Date(0).toISOString() },
    { pid: deadPid, hostname: hostname(), startedAt: "invalid" },
  ])("preserves unknown owner metadata: %j", (meta) => {
    const owner = seedOwner(meta);
    const kill = vi.spyOn(process, "kill");

    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(path)).toEqual([owner]);
    expect(kill).not.toHaveBeenCalled();
  });

  it("preserves an unreadable owner file", () => {
    const owner = seedOwner();
    const read = fs.readFileSync;
    vi.spyOn(fs, "readFileSync").mockImplementation(((file, options) => {
      if (file === join(path, owner)) throw errno("EACCES");
      return read(file, options);
    }) as typeof fs.readFileSync);

    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(path)).toEqual([owner]);
  });

  it("can publish over an empty directory left by an interrupted release", () => {
    fs.mkdirSync(path);

    const result = acquireOwnedDirectoryLock(path);

    expect(result.ok).toBe(true);
    if (result.ok) result.release();
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("does not delete a newly published owner after reading stale metadata", () => {
    const staleOwner = seedOwner();
    mockDeadPid();
    const read = fs.readFileSync;
    let advanced = false;
    let published: OwnedDirectoryLockResult | undefined;
    vi.spyOn(fs, "readFileSync").mockImplementation(((file, options) => {
      const snapshot = read(file, options);
      if (file === join(path, staleOwner) && !advanced) {
        // Caller B holds the stale snapshot. Caller A recovers and publishes
        // before B resumes removal of that original owner's unique file.
        advanced = true;
        published = acquireOwnedDirectoryLock(path);
        expect(published.ok).toBe(true);
      }
      return snapshot;
    }) as typeof fs.readFileSync);

    const staleCaller = acquireOwnedDirectoryLock(path);

    expect(staleCaller).toEqual({ ok: false });
    expect(published?.ok).toBe(true);
    expect(fs.readdirSync(path)).toHaveLength(1);
    expect(fs.readdirSync(path)).not.toContain(staleOwner);
    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    expect(fs.readdirSync(root)).toEqual(["lifecycle.lock"]);
    if (published?.ok) published.release();
  });

  it("does not remove a replacement owner's directory when the previous owner releases", () => {
    const previous = acquireOwnedDirectoryLock(path);
    expect(previous.ok).toBe(true);
    if (!previous.ok) return;
    const previousDirectory = join(root, "previous-owner");
    fs.renameSync(path, previousDirectory);
    const replacement = acquireOwnedDirectoryLock(path);
    expect(replacement.ok).toBe(true);
    if (!replacement.ok) return;
    const owners = fs.readdirSync(path);

    previous.release();

    expect(fs.readdirSync(path)).toEqual(owners);
    expect(acquireOwnedDirectoryLock(path)).toEqual({ ok: false });
    replacement.release();
  });

  it("cleans an unpublished candidate after an unexpected publication failure", () => {
    vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw errno("EIO");
    });

    expect(() => acquireOwnedDirectoryLock(path)).toThrow("EIO");
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("cleans an unpublished candidate when owner metadata cannot be written", () => {
    vi.spyOn(fs, "writeFileSync").mockImplementationOnce(() => {
      throw errno("ENOSPC");
    });

    expect(() => acquireOwnedDirectoryLock(path)).toThrow("ENOSPC");
    expect(fs.readdirSync(root)).toEqual([]);
  });
});
