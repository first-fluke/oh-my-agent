import { describe, expect, it, vi } from "vitest";
import {
  getCompareWindows,
  parseTimeWindow,
  resolveWindowBounds,
} from "../lib/time-window.js";

describe("parseTimeWindow", () => {
  it("returns 7d default when no arg", () => {
    const w = parseTimeWindow();
    expect(w).toEqual({ since: "7 days ago", label: "7d", days: 7 });
  });

  it("parses hours", () => {
    const w = parseTimeWindow("24h");
    expect(w).toEqual({ since: "24 hours ago", label: "24h", days: 1 });
  });

  it("parses days", () => {
    const w = parseTimeWindow("14d");
    expect(w).toEqual({ since: "14 days ago", label: "14d", days: 14 });
  });

  it("parses weeks", () => {
    const w = parseTimeWindow("2w");
    expect(w).toEqual({ since: "14 days ago", label: "2w", days: 14 });
  });

  it("throws on invalid format", () => {
    expect(() => parseTimeWindow("abc")).toThrow("Invalid window");
  });

  it("throws on unsupported unit", () => {
    expect(() => parseTimeWindow("3m")).toThrow("Invalid window");
  });
});

describe("getCompareWindows", () => {
  it("creates current and previous windows", () => {
    const { current, previous } = getCompareWindows("7d");
    expect(current.days).toBe(7);
    expect(previous.since).toBe("14 days ago");
    expect(previous.until).toBe("7 days ago");
    expect(previous.days).toBe(7);
  });

  it("uses default when no arg", () => {
    const { current } = getCompareWindows();
    expect(current.label).toBe("7d");
  });
});

describe("resolveWindowBounds", () => {
  it("defaults to 1d window", () => {
    const { start, end } = resolveWindowBounds();
    const diff = end - start;
    expect(diff).toBe(86_400_000);
  });

  it("respects date arg", () => {
    const { start, end } = resolveWindowBounds(undefined, "2026-01-15", "UTC");
    expect(end - start).toBe(86_400_000);
    const d = new Date(start);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(15);
  });

  it("throws on invalid date", () => {
    expect(() => resolveWindowBounds(undefined, "not-a-date")).toThrow(
      "Invalid date",
    );
  });

  it("caps at 30d maximum", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { start, end } = resolveWindowBounds("60d");
    const days = (end - start) / 86_400_000;
    expect(days).toBe(30);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Maximum window"),
    );
    warnSpy.mockRestore();
  });

  it("does not warn when within limit", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    resolveWindowBounds("7d");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns provided timezone", () => {
    const { timezone } = resolveWindowBounds("1d", undefined, "Asia/Seoul");
    expect(timezone).toBe("Asia/Seoul");
  });

  it("returns fallback timezone when not provided", () => {
    const { timezone } = resolveWindowBounds("1d");
    expect(timezone).toBeTruthy();
  });

  it("calculates date boundaries in Asia/Seoul (UTC+9)", () => {
    // midnight KST = 2026-01-14T15:00:00Z
    const { start, end } = resolveWindowBounds(
      undefined,
      "2026-01-15",
      "Asia/Seoul",
    );
    const s = new Date(start);
    expect(s.getUTCDate()).toBe(14);
    expect(s.getUTCHours()).toBe(15);
    expect(end - start).toBe(86_400_000);
  });

  it("calculates date boundaries in America/New_York (UTC-5 EST)", () => {
    // midnight EST on Jan 15 = 2026-01-15T05:00:00Z
    const { start } = resolveWindowBounds(
      undefined,
      "2026-01-15",
      "America/New_York",
    );
    const s = new Date(start);
    expect(s.getUTCDate()).toBe(15);
    expect(s.getUTCHours()).toBe(5);
  });

  it("calculates date boundaries in America/Los_Angeles (UTC-8 PST)", () => {
    // midnight PST on Jan 15 = 2026-01-15T08:00:00Z
    const { start } = resolveWindowBounds(
      undefined,
      "2026-01-15",
      "America/Los_Angeles",
    );
    const s = new Date(start);
    expect(s.getUTCDate()).toBe(15);
    expect(s.getUTCHours()).toBe(8);
  });

  it("calculates date boundaries in Asia/Kolkata (UTC+5:30)", () => {
    // midnight IST on Jan 15 = 2026-01-14T18:30:00Z
    const { start } = resolveWindowBounds(
      undefined,
      "2026-01-15",
      "Asia/Kolkata",
    );
    const s = new Date(start);
    expect(s.getUTCDate()).toBe(14);
    expect(s.getUTCHours()).toBe(18);
    expect(s.getUTCMinutes()).toBe(30);
  });

  it("calculates date boundaries in Asia/Kathmandu (UTC+5:45)", () => {
    // midnight NPT on Jan 15 = 2026-01-14T18:15:00Z
    const { start } = resolveWindowBounds(
      undefined,
      "2026-01-15",
      "Asia/Kathmandu",
    );
    const s = new Date(start);
    expect(s.getUTCDate()).toBe(14);
    expect(s.getUTCHours()).toBe(18);
    expect(s.getUTCMinutes()).toBe(15);
  });

  it("calculates date boundaries in Pacific/Auckland (UTC+13 NZDT)", () => {
    // midnight NZDT on Jan 15 = 2026-01-14T11:00:00Z
    const { start } = resolveWindowBounds(
      undefined,
      "2026-01-15",
      "Pacific/Auckland",
    );
    const s = new Date(start);
    expect(s.getUTCDate()).toBe(14);
    expect(s.getUTCHours()).toBe(11);
  });

  it("handles US DST: summer in America/New_York (UTC-4 EDT)", () => {
    // July 15 = EDT (UTC-4), midnight = 2026-07-15T04:00:00Z
    const { start } = resolveWindowBounds(
      undefined,
      "2026-07-15",
      "America/New_York",
    );
    const s = new Date(start);
    expect(s.getUTCDate()).toBe(15);
    expect(s.getUTCHours()).toBe(4); // EDT = UTC-4
  });

  it("handles US DST: winter in America/New_York (UTC-5 EST)", () => {
    // Jan 15 = EST (UTC-5), midnight = 2026-01-15T05:00:00Z
    const { start } = resolveWindowBounds(
      undefined,
      "2026-01-15",
      "America/New_York",
    );
    const s = new Date(start);
    expect(s.getUTCHours()).toBe(5); // EST = UTC-5
  });

  it("window always spans exactly 24h regardless of timezone", () => {
    const timezones = [
      "UTC",
      "Asia/Seoul",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Kolkata",
      "Europe/London",
      "Pacific/Auckland",
    ];
    for (const tz of timezones) {
      const { start, end } = resolveWindowBounds(undefined, "2026-06-15", tz);
      expect(end - start).toBe(86_400_000);
    }
  });
});
