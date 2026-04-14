import { isTestFile } from "./metrics.js";
import type {
  RetroMetrics,
  RetroSession,
  RetroSnapshot,
  RetroSnapshotAuthor,
} from "./types.js";

export function bar(count: number, max: number, width = 30): string {
  if (max === 0) return "";
  const filled = Math.round((count / max) * width);
  return "█".repeat(filled);
}

export function fmtPctBar(
  label: string,
  count: number,
  total: number,
  width = 25,
): string {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const b = bar(count, total, width);
  return `  ${label.padEnd(12)} ${String(count).padStart(4)}  (${String(pct).padStart(2)}%)  ${b}`;
}

export function fmtHourlyHistogram(hours: number[]): string {
  const max = Math.max(...hours, 1);
  const lines: string[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const count = hours[hour] || 0;
    if (count === 0) continue;
    lines.push(
      `  ${String(hour).padStart(2)}:00  ${String(count).padStart(3)}  ${bar(count, max, 20)}`,
    );
  }

  return lines.length > 0 ? lines.join("\n") : "  (no commits)";
}

export function fmtMetricsTable(metrics: RetroMetrics): string {
  const rows: [string, string][] = [
    ["Commits", String(metrics.commits)],
    ["Contributors", String(metrics.contributors)],
    ["Insertions", `+${metrics.insertions}`],
    ["Deletions", `-${metrics.deletions}`],
    ["Net LOC", String(metrics.netLoc)],
    ["Test LOC (ins)", String(metrics.testLoc)],
    ["Test ratio", `${metrics.testRatio}%`],
    ["Active days", String(metrics.activeDays)],
    ["Sessions", String(metrics.sessions)],
    ["Deep sessions", String(metrics.deepSessions)],
    ["Avg session", `${metrics.avgSessionMinutes} min`],
    ["LOC/session-hour", String(metrics.locPerSessionHour)],
    ["Peak hour", `${metrics.peakHour}:00`],
    ["Focus score", `${metrics.focusScore}% (${metrics.focusArea})`],
    ["Streak", `${metrics.streakDays} days`],
    ["AI-assisted", String(metrics.aiAssistedCommits)],
  ];

  return rows.map(([key, value]) => `  ${key?.padEnd(20)} ${value}`).join("\n");
}

export function fmtLeaderboard(
  authors: Record<string, RetroSnapshotAuthor>,
  currentUser: string,
): string {
  const entries = Object.entries(authors).sort(
    ([, a], [, b]) => b.commits - a.commits,
  );

  const userIdx = entries.findIndex(([name]) => name === currentUser);
  if (userIdx > 0) {
    const [entry] = entries.splice(userIdx, 1);
    if (entry) entries.unshift(entry);
  }

  const header = `  ${"Contributor".padEnd(24)} ${"Commits".padStart(7)}   ${"+/-".padStart(14)}   Top area`;
  const sep = `  ${"-".repeat(24)} ${"-".repeat(7)}   ${"-".repeat(14)}   ${"-".repeat(15)}`;
  const rows = entries.map(([name, snapshot]) => {
    const display = name === currentUser ? `You (${name})` : name;
    const loc = `+${snapshot.insertions}/-${snapshot.deletions}`;
    return `  ${display.padEnd(24)} ${String(snapshot.commits).padStart(7)}   ${loc.padStart(14)}   ${snapshot.topArea}`;
  });

  return [header, sep, ...rows].join("\n");
}

export function fmtDelta(
  current: RetroSnapshot,
  previous: RetroSnapshot,
): string {
  const currentMetrics = current.metrics;
  const previousMetrics = previous.metrics;

  function d(cur: number, prev: number, suffix = ""): string {
    const diff = cur - prev;
    const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    const sign = diff > 0 ? "+" : "";
    return `${prev}${suffix}  →  ${cur}${suffix}  ${arrow}${sign}${diff}${suffix}`;
  }

  const rows = [
    `  ${"Metric".padEnd(20)} Change`,
    `  ${"-".repeat(20)} ${"-".repeat(35)}`,
    `  ${"Commits".padEnd(20)} ${d(currentMetrics.commits, previousMetrics.commits)}`,
    `  ${"Test ratio".padEnd(20)} ${d(currentMetrics.testRatio, previousMetrics.testRatio, "%")}`,
    `  ${"Sessions".padEnd(20)} ${d(currentMetrics.sessions, previousMetrics.sessions)}`,
    `  ${"Deep sessions".padEnd(20)} ${d(currentMetrics.deepSessions, previousMetrics.deepSessions)}`,
    `  ${"LOC/session-hour".padEnd(20)} ${d(currentMetrics.locPerSessionHour, previousMetrics.locPerSessionHour)}`,
    `  ${"Focus score".padEnd(20)} ${d(currentMetrics.focusScore, previousMetrics.focusScore, "%")}`,
    `  ${"Streak".padEnd(20)} ${d(currentMetrics.streakDays, previousMetrics.streakDays, "d")}`,
  ];

  return rows.join("\n");
}

export function fmtSessions(sessions: RetroSession[]): string {
  const deep = sessions.filter((session) => session.type === "deep").length;
  const medium = sessions.filter((session) => session.type === "medium").length;
  const micro = sessions.filter((session) => session.type === "micro").length;
  const totalMin = sessions.reduce(
    (sum, session) => sum + session.durationMinutes,
    0,
  );
  const avgMin =
    sessions.length > 0 ? Math.round(totalMin / sessions.length) : 0;

  return [
    `  Total sessions:    ${sessions.length}`,
    `  Deep (50+ min):    ${deep}`,
    `  Medium (20-50):    ${medium}`,
    `  Micro (<20 min):   ${micro}`,
    `  Total active time: ${Math.floor(totalMin / 60)}h ${totalMin % 60}m`,
    `  Avg session:       ${avgMin} min`,
  ].join("\n");
}

export function fmtHotspots(
  hotspots: Array<{ file: string; count: number }>,
): string {
  if (hotspots.length === 0) return "  (no file changes)";

  return hotspots
    .map((hotspot, index) => {
      const churn = hotspot.count >= 5 ? " [churn]" : "";
      const test = isTestFile(hotspot.file) ? " [test]" : "";
      return `  ${String(index + 1).padStart(2)}. ${hotspot.file} (${hotspot.count}x)${test}${churn}`;
    })
    .join("\n");
}

export function fmtCommitTypes(
  types: Record<string, number>,
  total: number,
): string {
  if (total === 0) return "  (no commits)";

  return Object.entries(types)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => fmtPctBar(type, count, total))
    .join("\n");
}

export function fmtTweetable(snapshot: RetroSnapshot): string {
  const metrics = snapshot.metrics;
  const dateRange = snapshot.date.split("T")[0] || "";
  return `${dateRange} (${snapshot.window}): ${metrics.commits} commits (${metrics.contributors} contrib), ${metrics.netLoc > 0 ? "+" : ""}${metrics.netLoc} LOC, ${metrics.testRatio}% tests, peak: ${metrics.peakHour}:00 | Streak: ${metrics.streakDays}d`;
}
