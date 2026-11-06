import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "./http.js";
import {
  getInstallationInfo,
  isOutdated,
  maybeSelfUpdate,
} from "./self-update.js";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawn: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("isOutdated", () => {
  it("returns true when latest patch is newer", () => {
    expect(isOutdated("5.4.3", "5.9.0")).toBe(true);
    expect(isOutdated("5.9.0", "5.9.1")).toBe(true);
    expect(isOutdated("4.0.0", "5.0.0")).toBe(true);
  });

  it("returns false when versions are equal or current is newer", () => {
    expect(isOutdated("5.9.0", "5.9.0")).toBe(false);
    expect(isOutdated("5.9.1", "5.9.0")).toBe(false);
    expect(isOutdated("6.0.0", "5.9.9")).toBe(false);
  });

  it("ignores prerelease/build metadata", () => {
    expect(isOutdated("5.9.0-nightly.1", "5.9.0")).toBe(false);
    expect(isOutdated("5.9.0", "5.9.0-rc.1")).toBe(false);
  });

  it("returns false on malformed versions (fail open)", () => {
    expect(isOutdated("not-a-version", "5.9.0")).toBe(false);
    expect(isOutdated("5.9.0", "")).toBe(false);
  });
});

describe("maybeSelfUpdate guards", () => {
  it("skips when disabled by config", async () => {
    const result = await maybeSelfUpdate({
      currentVersion: "5.0.0",
      enabled: false,
    });
    expect(result.triggered).toBe(false);
    expect(result.reason).toBe("disabled");
  });

  it("skips when OMA_SKIP_VERSION_CHECK=1", async () => {
    const original = process.env.OMA_SKIP_VERSION_CHECK;
    process.env.OMA_SKIP_VERSION_CHECK = "1";
    try {
      const result = await maybeSelfUpdate({
        currentVersion: "5.0.0",
        enabled: true,
      });
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe("skipped-env");
    } finally {
      if (original === undefined) delete process.env.OMA_SKIP_VERSION_CHECK;
      else process.env.OMA_SKIP_VERSION_CHECK = original;
    }
  });

  it("does not throw when registry fetch fails", async () => {
    vi.stubEnv("OMA_SKIP_VERSION_CHECK", "0");
    vi.stubEnv("NODE_ENV", "test");
    const fetchLatest = vi
      .spyOn(http, "get")
      .mockRejectedValueOnce(new Error("offline"));
    const noticed = vi.fn();
    const spawned = vi.fn();
    await expect(
      maybeSelfUpdate({
        currentVersion: "0.0.0-test",
        enabled: true,
        onNotice: noticed,
        onSpawnStart: spawned,
      }),
    ).resolves.toEqual({ triggered: false, reason: "fetch-failed" });
    expect(fetchLatest).toHaveBeenCalledOnce();
    expect(spawn).not.toHaveBeenCalled();
    expect(spawned).not.toHaveBeenCalled();
    expect(noticed).not.toHaveBeenCalled();
  });
});

describe("getInstallationInfo", () => {
  it("pins Bun self-updates to the version returned by the registry", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-self-update-"));
    const cli = join(
      root,
      ".bun",
      "install",
      "global",
      "node_modules",
      "oh-my-agent",
      "bin",
      "cli.js",
    );
    mkdirSync(dirname(cli), { recursive: true });
    writeFileSync(cli, "#!/usr/bin/env node\n");

    try {
      expect(getInstallationInfo(cli, "14.8.0").updateCommand).toBe(
        "bun add -g oh-my-agent@14.8.0",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
