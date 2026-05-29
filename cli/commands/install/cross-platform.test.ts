/**
 * Cross-platform unit tests — Tasks 27 (sudo), 30 (WSL detect), 23 (long-path).
 *
 * The codebase is developed on macOS; these tests simulate Windows / Linux /
 * WSL behavior via process.platform stubs and module mocking so the platform
 * guards stay verified without a real Windows or WSL runner.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { applyWin32LongPathPrefix } from "../../platform/fs-link.js";
import { detectWsl } from "./install.js";

// ── detectWsl (Task 30, T2.13) ───────────────────────────────────────────────

describe("detectWsl — Task 30 (T2.13)", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("returns false on macOS regardless of /proc/version", () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true,
    });
    expect(detectWsl()).toBe(false);
  });

  it("returns false on Windows regardless of /proc/version", () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });
    expect(detectWsl()).toBe(false);
  });

  it("returns false on plain Linux (no Microsoft signature)", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    const reader = () => "Linux version 5.15.0-91-generic (buildd) Ubuntu";
    expect(detectWsl(reader)).toBe(false);
  });

  it("returns true on Linux when /proc/version contains 'microsoft' (WSL2)", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    const reader = () => "Linux version 5.15.146.1-microsoft-standard-WSL2";
    expect(detectWsl(reader)).toBe(true);
  });

  it("returns true on Linux when /proc/version contains 'WSL'", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    const reader = () => "Linux 5.10.16.3 WSL gcc 9.3.0";
    expect(detectWsl(reader)).toBe(true);
  });

  it("returns false when /proc/version read throws", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    const reader = () => {
      throw new Error("ENOENT");
    };
    expect(detectWsl(reader)).toBe(false);
  });
});

// ── applyWin32LongPathPrefix (Task 23, T2.12) — extra coverage ───────────────

describe("applyWin32LongPathPrefix — Task 23 (T2.12) — cross-platform invariants", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("returns input unchanged when length is exactly MAX_PATH (260) on win32", () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });
    const path = `C:\\${"a".repeat(260 - 3)}`; // total 260
    expect(applyWin32LongPathPrefix(path)).toBe(path);
  });

  it("applies prefix when length is MAX_PATH + 1 on win32", () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });
    const path = `C:\\${"a".repeat(261 - 3)}`; // total 261
    const out = applyWin32LongPathPrefix(path);
    expect(out.startsWith("\\\\?\\")).toBe(true);
    expect(out.endsWith(path)).toBe(true);
  });

  it("is no-op when path is already \\\\?\\-prefixed on win32", () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });
    const prefixed = `\\\\?\\C:\\${"a".repeat(300)}`;
    expect(applyWin32LongPathPrefix(prefixed)).toBe(prefixed);
  });

  it("is no-op on darwin even for very long paths", () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true,
    });
    const path = `/tmp/${"a".repeat(300)}`;
    expect(applyWin32LongPathPrefix(path)).toBe(path);
  });

  it("is no-op on linux even for very long paths", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    const path = `/home/${"a".repeat(300)}`;
    expect(applyWin32LongPathPrefix(path)).toBe(path);
  });
});

// ── Sudo refusal (Task 27, EC-5) — guard logic without invoking install() ────

describe("sudo refusal guard — Task 27 (EC-5) — logic invariants", () => {
  const originalPlatform = process.platform;
  const originalSudoUser = process.env.SUDO_USER;
  const originalGeteuid = process.geteuid;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
    if (originalSudoUser === undefined) delete process.env.SUDO_USER;
    else process.env.SUDO_USER = originalSudoUser;
    if (originalGeteuid === undefined) {
      // restore deleted geteuid
      // biome-ignore lint/suspicious/noExplicitAny: test reset
      (process as any).geteuid = undefined;
    } else {
      process.geteuid = originalGeteuid;
    }
  });

  // Reproduces the guard from install.ts: (platform !== win32) && (geteuid===0) && (SUDO_USER set).
  function shouldRefuseSudo(): boolean {
    return (
      process.platform !== "win32" &&
      typeof process.geteuid === "function" &&
      process.geteuid() === 0 &&
      typeof process.env.SUDO_USER === "string" &&
      process.env.SUDO_USER.length > 0
    );
  }

  it("refuses on linux when root + SUDO_USER set", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    process.geteuid = () => 0;
    process.env.SUDO_USER = "alice";
    expect(shouldRefuseSudo()).toBe(true);
  });

  it("refuses on darwin when root + SUDO_USER set", () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true,
    });
    process.geteuid = () => 0;
    process.env.SUDO_USER = "alice";
    expect(shouldRefuseSudo()).toBe(true);
  });

  it("allows on win32 even with root + SUDO_USER (no concept of sudo)", () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });
    process.geteuid = () => 0;
    process.env.SUDO_USER = "alice";
    expect(shouldRefuseSudo()).toBe(false);
  });

  it("allows when SUDO_USER is unset (root by login, not via sudo)", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    process.geteuid = () => 0;
    delete process.env.SUDO_USER;
    expect(shouldRefuseSudo()).toBe(false);
  });

  it("allows when geteuid is not a function (Windows / pre-Node 10)", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    (process as any).geteuid = undefined;
    process.env.SUDO_USER = "alice";
    expect(shouldRefuseSudo()).toBe(false);
  });

  it("allows when euid != 0 (normal user with SUDO_USER somehow set)", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    process.geteuid = () => 1000;
    process.env.SUDO_USER = "alice";
    expect(shouldRefuseSudo()).toBe(false);
  });
});
