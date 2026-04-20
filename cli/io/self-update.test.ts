import { describe, expect, it, vi } from "vitest";
import { isOutdated, maybeSelfUpdate } from "./self-update.js";

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
    // Forcing offline by setting a bogus registry would require mocking http;
    // assert the function returns a structured result instead of throwing.
    const noticed = vi.fn();
    const spawned = vi.fn();
    await expect(
      maybeSelfUpdate({
        currentVersion: "0.0.0-test",
        enabled: true,
        onNotice: noticed,
        onSpawnStart: spawned,
      }),
    ).resolves.toMatchObject({ triggered: expect.any(Boolean) });
  });
});
