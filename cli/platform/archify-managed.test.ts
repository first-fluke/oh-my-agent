import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureLatestArchify, readManagedState } from "./managed.js";

function fakeDownload(version: string) {
  return vi.fn(async (_ref: string, dest: string) => {
    fs.mkdirSync(path.join(dest, "bin"), { recursive: true });
    fs.writeFileSync(path.join(dest, "bin", "archify.mjs"), "// stub\n");
    fs.writeFileSync(
      path.join(dest, "package.json"),
      JSON.stringify({ version }),
    );
  });
}

describe("managed archify install (always latest)", () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "oma-archify-managed-"));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("downloads on first use and records state", async () => {
    const download = fakeDownload("2.15.0");
    const res = await ensureLatestArchify({
      channel: "stable",
      checkIntervalMin: 60,
      cacheRoot: root,
      fetchLatestRef: async () => ({ ref: "v2.15.0", version: "2.15.0" }),
      download,
    });
    expect(res?.status).toBe("fresh");
    expect(res?.version).toBe("2.15.0");
    expect(download).toHaveBeenCalledTimes(1);
    expect(readManagedState(root)?.ref).toBe("v2.15.0");
  });

  it("throttles remote checks, then upgrades and prunes the old ref", async () => {
    const fetchLatestRef = vi
      .fn<() => Promise<{ ref: string; version?: string }>>()
      .mockResolvedValueOnce({ ref: "v1.0.0", version: "1.0.0" })
      .mockResolvedValueOnce({ ref: "v2.0.0", version: "2.0.0" });
    const t0 = new Date("2026-01-01T00:00:00Z");
    let now = t0;
    const base = {
      channel: "stable" as const,
      checkIntervalMin: 60,
      cacheRoot: root,
      fetchLatestRef,
      download: fakeDownload("x"),
      now: () => now,
    };

    expect((await ensureLatestArchify(base))?.ref).toBe("v1.0.0");
    // within the window: no remote call
    now = new Date(t0.getTime() + 10 * 60_000);
    expect((await ensureLatestArchify(base))?.status).toBe("current");
    expect(fetchLatestRef).toHaveBeenCalledTimes(1);
    // window expired: upgrade
    now = new Date(t0.getTime() + 61 * 60_000);
    const up = await ensureLatestArchify(base);
    expect(up?.ref).toBe("v2.0.0");
    expect(up?.status).toBe("fresh");
    expect(fs.existsSync(path.join(root, "v1.0.0"))).toBe(false);
    expect(fs.existsSync(path.join(root, "v2.0.0", "bin", "archify.mjs"))).toBe(
      true,
    );
  });

  it("checkIntervalMin: 0 checks every call; force bypasses the window", async () => {
    const fetchLatestRef = vi.fn(async () => ({ ref: "v1.0.0" }));
    const base = {
      channel: "stable" as const,
      cacheRoot: root,
      fetchLatestRef,
      download: fakeDownload("1.0.0"),
    };
    await ensureLatestArchify({ ...base, checkIntervalMin: 0 });
    await ensureLatestArchify({ ...base, checkIntervalMin: 0 });
    expect(fetchLatestRef).toHaveBeenCalledTimes(2);
    await ensureLatestArchify({ ...base, checkIntervalMin: 60, force: true });
    expect(fetchLatestRef).toHaveBeenCalledTimes(3);
  });

  it("reuses the cached copy when the network fails, and returns undefined with no cache", async () => {
    const failing = vi.fn(async () => {
      throw new Error("ENOTFOUND api.github.com");
    });
    expect(
      await ensureLatestArchify({
        channel: "stable",
        checkIntervalMin: 0,
        cacheRoot: root,
        fetchLatestRef: failing,
        download: fakeDownload("1.0.0"),
      }),
    ).toBeUndefined();

    await ensureLatestArchify({
      channel: "stable",
      checkIntervalMin: 0,
      cacheRoot: root,
      fetchLatestRef: async () => ({ ref: "v1.0.0", version: "1.0.0" }),
      download: fakeDownload("1.0.0"),
    });
    const stale = await ensureLatestArchify({
      channel: "stable",
      checkIntervalMin: 0,
      cacheRoot: root,
      fetchLatestRef: failing,
      download: fakeDownload("1.0.0"),
    });
    expect(stale?.status).toBe("stale");
    expect(stale?.note).toContain("ENOTFOUND");
    expect(stale?.ref).toBe("v1.0.0");
  });

  it("offline mode never calls the network", async () => {
    const fetchLatestRef = vi.fn(async () => ({ ref: "v1.0.0" }));
    const res = await ensureLatestArchify({
      channel: "stable",
      checkIntervalMin: 0,
      cacheRoot: root,
      offline: true,
      fetchLatestRef,
    });
    expect(res).toBeUndefined();
    expect(fetchLatestRef).not.toHaveBeenCalled();
  });

  it("keeps a failed download from clobbering the cached copy", async () => {
    const ok = fakeDownload("1.0.0");
    await ensureLatestArchify({
      channel: "stable",
      checkIntervalMin: 0,
      cacheRoot: root,
      fetchLatestRef: async () => ({ ref: "v1.0.0", version: "1.0.0" }),
      download: ok,
    });
    const res = await ensureLatestArchify({
      channel: "stable",
      checkIntervalMin: 0,
      cacheRoot: root,
      fetchLatestRef: async () => ({ ref: "v2.0.0", version: "2.0.0" }),
      download: async () => {
        throw new Error("tar: broken");
      },
    });
    expect(res?.status).toBe("stale");
    expect(res?.ref).toBe("v1.0.0");
    expect(fs.existsSync(path.join(root, "v1.0.0", "bin", "archify.mjs"))).toBe(
      true,
    );
  });
});
