/**
 * Tests for schedule/port.ts — selectAdapter() wiring
 *
 * Covers:
 * - darwin  → LaunchdAdapter
 * - linux + systemd available  → SystemdAdapter
 * - linux + systemd unavailable + crontab available → CrontabAdapter
 * - linux + neither available → throws
 * - win32  → SchtasksAdapter
 * - other POSIX + crontab available → CrontabAdapter
 * - other POSIX + crontab unavailable → throws
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted adapter mocks
// ---------------------------------------------------------------------------

const launchdAvailable = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
const systemdAvailable = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
const crontabAvailable = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
const schtasksAvailable = vi.hoisted(() => vi.fn<() => Promise<boolean>>());

// vitest v4 requires a `function`/`class` (not arrow) for a mock invoked with
// `new`. Classes are used here because biome's useArrowFunction lint rewrites a
// plain `function` expression back into an arrow, reintroducing the failure.
vi.mock("../../io/schedule/adapters/launchd.js", () => ({
  LaunchdAdapter: class {
    isAvailable = launchdAvailable;
    name = "LaunchdAdapter";
  },
}));

vi.mock("../../io/schedule/adapters/systemd.js", () => ({
  SystemdAdapter: class {
    isAvailable = systemdAvailable;
    name = "SystemdAdapter";
  },
}));

vi.mock("../../io/schedule/adapters/crontab.js", () => ({
  CrontabAdapter: class {
    isAvailable = crontabAvailable;
    name = "CrontabAdapter";
  },
}));

vi.mock("../../io/schedule/adapters/schtasks.js", () => ({
  SchtasksAdapter: class {
    isAvailable = schtasksAvailable;
    name = "SchtasksAdapter";
  },
}));

import { selectAdapter } from "../../io/schedule/port.js";

describe("selectAdapter", () => {
  let origPlatform: NodeJS.Platform;

  beforeEach(() => {
    origPlatform = process.platform;
    launchdAvailable.mockResolvedValue(true);
    systemdAvailable.mockResolvedValue(true);
    crontabAvailable.mockResolvedValue(true);
    schtasksAvailable.mockResolvedValue(true);
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: origPlatform });
    vi.clearAllMocks();
  });

  it("returns LaunchdAdapter on darwin", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    const adapter = (await selectAdapter()) as unknown as { name: string };
    expect(adapter.name).toBe("LaunchdAdapter");
  });

  it("returns SchtasksAdapter on win32", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const adapter = (await selectAdapter()) as unknown as { name: string };
    expect(adapter.name).toBe("SchtasksAdapter");
  });

  it("returns SystemdAdapter on linux when systemd --user is available", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    systemdAvailable.mockResolvedValue(true);

    const adapter = (await selectAdapter()) as unknown as { name: string };
    expect(adapter.name).toBe("SystemdAdapter");
  });

  it("returns CrontabAdapter on linux when systemd unavailable but crontab available", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    systemdAvailable.mockResolvedValue(false);
    crontabAvailable.mockResolvedValue(true);

    const adapter = (await selectAdapter()) as unknown as { name: string };
    expect(adapter.name).toBe("CrontabAdapter");
  });

  it("throws on linux when neither systemd nor crontab is available", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    systemdAvailable.mockResolvedValue(false);
    crontabAvailable.mockResolvedValue(false);

    await expect(selectAdapter()).rejects.toThrow(/Linux/);
  });

  it("returns CrontabAdapter on other POSIX platforms when crontab available", async () => {
    Object.defineProperty(process, "platform", { value: "freebsd" });
    crontabAvailable.mockResolvedValue(true);

    const adapter = (await selectAdapter()) as unknown as { name: string };
    expect(adapter.name).toBe("CrontabAdapter");
  });

  it("throws on unsupported platform with no crontab", async () => {
    Object.defineProperty(process, "platform", { value: "freebsd" });
    crontabAvailable.mockResolvedValue(false);

    await expect(selectAdapter()).rejects.toThrow(/supported/);
  });
});
