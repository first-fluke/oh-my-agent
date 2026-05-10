import { TZDate } from "@date-fns/tz";
import { addDays, parse, startOfDay } from "date-fns";
import { loadTimezone } from "../utils/config.js";

export interface TimeWindow {
  since: string;
  until?: string;
  label: string;
  days: number;
}

const MAX_DAYS = 30;

export function parseTimeWindow(arg?: string): TimeWindow {
  if (!arg) {
    return { since: "7 days ago", label: "7d", days: 7 };
  }

  const match = arg.match(/^(\d+)(h|d|w)$/);
  if (!match) {
    throw new Error(`Invalid window: ${arg}. Use: 24h, 7d, 14d, 30d, 2w`);
  }

  const num = parseInt(match[1] || "0", 10);
  const unit = match[2] || "";

  switch (unit) {
    case "h":
      return { since: `${num} hours ago`, label: `${num}h`, days: num / 24 };
    case "d":
      return { since: `${num} days ago`, label: `${num}d`, days: num };
    case "w":
      return {
        since: `${num * 7} days ago`,
        label: `${num}w`,
        days: num * 7,
      };
    default:
      throw new Error(`Invalid unit: ${unit}`);
  }
}

export function getCompareWindows(arg?: string): {
  current: TimeWindow;
  previous: TimeWindow;
} {
  const current = parseTimeWindow(arg);
  return {
    current,
    previous: {
      since: `${current.days * 2} days ago`,
      until: `${current.days} days ago`,
      label: current.label,
      days: current.days,
    },
  };
}

/**
 * Resolve a time window to absolute Unix ms boundaries.
 * Uses timezone from oma-config.yaml for date boundaries.
 */
export function resolveWindowBounds(
  windowArg?: string,
  dateArg?: string,
  timezone?: string,
): { start: number; end: number; timezone: string } {
  const tz = timezone || loadTimezone();
  const now = Date.now();

  if (dateArg) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
      throw new Error(`Invalid date: ${dateArg}. Use YYYY-MM-DD format.`);
    }
    const dayStart = startOfDay(
      parse(dateArg, "yyyy-MM-dd", new TZDate(now, tz)),
    );
    if (Number.isNaN(dayStart.getTime())) {
      throw new Error(`Invalid date: ${dateArg}. Use YYYY-MM-DD format.`);
    }
    const dayEnd = addDays(dayStart, 1);
    return {
      start: dayStart.getTime(),
      end: dayEnd.getTime(),
      timezone: tz,
    };
  }

  const window = parseTimeWindow(windowArg || "1d");
  const days = Math.min(window.days, MAX_DAYS);

  if (days < window.days) {
    console.warn(`⚠ Maximum window is ${MAX_DAYS}d. Capping to ${MAX_DAYS}d.`);
  }

  const ms = days * 86_400_000;
  return { start: now - ms, end: now, timezone: tz };
}
