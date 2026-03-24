import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// --- Types ---

export interface RetroCommit {
  hash: string;
  author: string;
  email: string;
  timestamp: number;
  subject: string;
  insertions: number;
  deletions: number;
}

export interface RetroFileChange {
  file: string;
  insertions: number;
  deletions: number;
  author: string;
}

export interface RetroSession {
  startTime: number;
  endTime: number;
  commits: number;
  type: "deep" | "medium" | "micro";
  durationMinutes: number;
}

export interface RetroAuthorDetail {
  commits: number;
  insertions: number;
  deletions: number;
  testInsertions: number;
  topAreas: string[];
  commitTypes: Record<string, number>;
  peakHour: number;
}

export interface RetroSnapshotAuthor {
  commits: number;
  insertions: number;
  deletions: number;
  testRatio: number;
  topArea: string;
}

export interface RetroMetrics {
  commits: number;
  contributors: number;
  insertions: number;
  deletions: number;
  netLoc: number;
  testLoc: number;
  testRatio: number;
  activeDays: number;
  sessions: number;
  deepSessions: number;
  avgSessionMinutes: number;
  locPerSessionHour: number;
  peakHour: number;
  focusScore: number;
  focusArea: string;
  streakDays: number;
  aiAssistedCommits: number;
}

export interface RetroSnapshot {
  date: string;
  window: string;
  metrics: RetroMetrics;
  authors: Record<string, RetroSnapshotAuthor>;
  commitTypes: Record<string, number>;
  hotspots: Array<{ file: string; count: number }>;
}

export interface TimeWindow {
  since: string;
  until?: string;
  label: string;
  days: number;
}

// --- Time Window ---

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

// --- Git Data Collection ---

function execGit(cwd: string, cmd: string): string {
  try {
    return execSync(cmd, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

export function fetchOrigin(cwd: string): void {
  execGit(cwd, "git fetch origin --quiet 2>/dev/null || true");
}

export function getDefaultBranch(cwd: string): string {
  const branch = execGit(
    cwd,
    "git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'",
  );
  return branch || "main";
}

export function getGitUserName(cwd: string): string {
  return execGit(cwd, "git config user.name") || "Unknown";
}

export function getCommitsWithStats(
  cwd: string,
  window: TimeWindow,
  branch: string,
): RetroCommit[] {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="COMMIT:%H|%aN|%ae|%at|%s" --shortstat`,
  );

  if (!raw) return [];

  const commits: RetroCommit[] = [];
  let current: Partial<RetroCommit> | null = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("COMMIT:")) {
      if (current?.hash) {
        commits.push({
          hash: current.hash,
          author: current.author || "",
          email: current.email || "",
          timestamp: current.timestamp || 0,
          subject: current.subject || "",
          insertions: current.insertions || 0,
          deletions: current.deletions || 0,
        });
      }
      const parts = line.slice(7).split("|");
      current = {
        hash: parts[0],
        author: parts[1],
        email: parts[2],
        timestamp: parseInt(parts[3] || "0", 10),
        subject: parts.slice(4).join("|"),
        insertions: 0,
        deletions: 0,
      };
    } else if (current && line.trim()) {
      const insMatch = line.match(/(\d+) insertions?\(\+\)/);
      const delMatch = line.match(/(\d+) deletions?\(-\)/);
      if (insMatch) current.insertions = parseInt(insMatch[1] || "0", 10);
      if (delMatch) current.deletions = parseInt(delMatch[1] || "0", 10);
    }
  }

  if (current?.hash) {
    commits.push({
      hash: current.hash,
      author: current.author || "",
      email: current.email || "",
      timestamp: current.timestamp || 0,
      subject: current.subject || "",
      insertions: current.insertions || 0,
      deletions: current.deletions || 0,
    });
  }

  return commits;
}

export function getFileChanges(
  cwd: string,
  window: TimeWindow,
  branch: string,
): RetroFileChange[] {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="COMMIT:%H|%aN" --numstat`,
  );

  if (!raw) return [];

  const changes: RetroFileChange[] = [];
  let currentAuthor = "";

  for (const line of raw.split("\n")) {
    if (line.startsWith("COMMIT:")) {
      const parts = line.slice(7).split("|");
      currentAuthor = parts[1] || "";
    } else if (line.trim() && currentAuthor) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const ins = parseInt(parts[0] || "0", 10);
        const del = parseInt(parts[1] || "0", 10);
        if (!Number.isNaN(ins) && !Number.isNaN(del) && parts[2]) {
          changes.push({
            file: parts[2],
            insertions: ins,
            deletions: del,
            author: currentAuthor,
          });
        }
      }
    }
  }

  return changes;
}

export function getFileHotspots(
  cwd: string,
  window: TimeWindow,
  branch: string,
  limit = 10,
): Array<{ file: string; count: number }> {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -${limit}`,
  );

  if (!raw) return [];

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
      if (!match) return null;
      return { count: parseInt(match[1] || "0", 10), file: match[2] || "" };
    })
    .filter((x): x is { file: string; count: number } => x !== null);
}

export function getShippingStreak(
  cwd: string,
  branch: string,
  author?: string,
): number {
  const authorArg = author ? ` --author="${author}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch}${authorArg} --format="%ad" --date=format:"%Y-%m-%d" | sort -u`,
  );

  if (!raw) return 0;

  const dates = raw.split("\n").filter(Boolean).sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);

  for (const dateStr of dates) {
    const [y = 0, m = 0, d = 0] = dateStr.split("-").map(Number);
    const commitDate = new Date(y, m - 1, d);
    commitDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (checkDate.getTime() - commitDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diffDays === 1 && streak === 0) {
      streak++;
      checkDate.setTime(commitDate.getTime());
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function countAIAssistedCommits(
  cwd: string,
  window: TimeWindow,
  branch: string,
): number {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="%b" | grep -ci "co-authored-by.*noreply@anthropic\\.com\\|co-authored-by.*copilot\\|co-authored-by.*openai" 2>/dev/null || echo 0`,
  );
  return parseInt(raw || "0", 10);
}

// --- Metrics Computation ---

const TEST_FILE_PATTERN = /(?:test|spec|__tests__|\.test\.|\.spec\.)/i;

export function isTestFile(filepath: string): boolean {
  return TEST_FILE_PATTERN.test(filepath);
}

export function detectSessions(
  commits: RetroCommit[],
  gapMinutes = 45,
): RetroSession[] {
  if (commits.length === 0) return [];

  const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);
  const sessions: RetroSession[] = [];

  let sessionStart = sorted[0]?.timestamp ?? 0;
  let sessionEnd = sorted[0]?.timestamp ?? 0;
  let sessionCommits = 1;

  const pushSession = () => {
    const dur = Math.max(Math.round((sessionEnd - sessionStart) / 60), 1);
    const type: RetroSession["type"] =
      dur >= 50 ? "deep" : dur >= 20 ? "medium" : "micro";
    sessions.push({
      startTime: sessionStart,
      endTime: sessionEnd,
      commits: sessionCommits,
      type,
      durationMinutes: dur,
    });
  };

  for (let i = 1; i < sorted.length; i++) {
    const ts = sorted[i]?.timestamp ?? 0;
    const gap = (ts - sessionEnd) / 60;
    if (gap > gapMinutes) {
      pushSession();
      sessionStart = ts;
      sessionEnd = ts;
      sessionCommits = 1;
    } else {
      sessionEnd = ts;
      sessionCommits++;
    }
  }

  pushSession();
  return sessions;
}

export function computeHourlyDistribution(commits: RetroCommit[]): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const c of commits) {
    const hour = new Date(c.timestamp * 1000).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  }
  return hours;
}

export function computeCommitTypes(
  commits: RetroCommit[],
): Record<string, number> {
  const types: Record<string, number> = {};
  const pattern =
    /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf)(\(.+\))?!?:/;

  for (const c of commits) {
    const match = c.subject.match(pattern);
    const type = match ? match[1] || "other" : "other";
    types[type] = (types[type] || 0) + 1;
  }

  return types;
}

export function computeFocusScore(fileChanges: RetroFileChange[]): {
  score: number;
  area: string;
} {
  const dirCounts: Record<string, number> = {};

  for (const change of fileChanges) {
    const topDir = change.file.split("/")[0] || change.file;
    dirCounts[topDir] = (dirCounts[topDir] || 0) + 1;
  }

  const total = fileChanges.length;
  if (total === 0) return { score: 0, area: "-" };

  const entries = Object.entries(dirCounts).sort(([, a], [, b]) => b - a);
  const top = entries[0];
  if (!top) return { score: 0, area: "-" };

  return {
    score: Math.round((top[1] / total) * 100),
    area: top[0],
  };
}

export function computeAuthorStats(
  commits: RetroCommit[],
  fileChanges: RetroFileChange[],
): Record<string, RetroAuthorDetail> {
  const stats: Record<string, RetroAuthorDetail> = {};

  for (const c of commits) {
    if (!stats[c.author]) {
      stats[c.author] = {
        commits: 0,
        insertions: 0,
        deletions: 0,
        testInsertions: 0,
        topAreas: [],
        commitTypes: {},
        peakHour: 0,
      };
    }
    const s = stats[c.author];
    if (!s) continue;
    s.commits++;
    s.insertions += c.insertions;
    s.deletions += c.deletions;

    const typeMatch = c.subject.match(
      /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf)(\(.+\))?!?:/,
    );
    const type = typeMatch ? typeMatch[1] || "other" : "other";
    s.commitTypes[type] = (s.commitTypes[type] || 0) + 1;
  }

  // Per-author file stats
  const authorDirs: Record<string, Record<string, number>> = {};
  const authorHours: Record<string, number[]> = {};

  for (const fc of fileChanges) {
    if (!authorDirs[fc.author]) authorDirs[fc.author] = {};
    const dir = fc.file.split("/")[0] || fc.file;
    const authorDir = authorDirs[fc.author];
    if (authorDir) authorDir[dir] = (authorDir[dir] || 0) + 1;

    const authorStat = stats[fc.author];
    if (authorStat && isTestFile(fc.file)) {
      authorStat.testInsertions += fc.insertions;
    }
  }

  for (const c of commits) {
    if (!authorHours[c.author])
      authorHours[c.author] = new Array<number>(24).fill(0);
    const hour = new Date(c.timestamp * 1000).getHours();
    const hrs = authorHours[c.author];
    if (hrs) hrs[hour] = (hrs[hour] || 0) + 1;
  }

  for (const [author, s] of Object.entries(stats)) {
    const dirs = authorDirs[author] || {};
    s.topAreas = Object.entries(dirs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([d]) => d);

    const hours = authorHours[author] || [];
    const maxVal = Math.max(...hours, 0);
    s.peakHour = maxVal > 0 ? hours.indexOf(maxVal) : 0;
  }

  return stats;
}

// --- Snapshot Persistence ---

function getRetroDir(cwd: string): string {
  return join(cwd, ".serena", "retrospectives");
}

export function saveSnapshot(cwd: string, snapshot: RetroSnapshot): string {
  const dir = getRetroDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const dateStr = snapshot.date.split("T")[0] || snapshot.date;
  const existing = readdirSync(dir).filter((f) => f.startsWith(dateStr)).length;
  const filename = `${dateStr}-${existing + 1}.json`;
  const filepath = join(dir, filename);

  writeFileSync(filepath, JSON.stringify(snapshot, null, 2), "utf-8");
  return filepath;
}

export function loadPreviousSnapshot(cwd: string): RetroSnapshot | null {
  const dir = getRetroDir(cwd);
  if (!existsSync(dir)) return null;

  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const content = readFileSync(join(dir, files[0] || ""), "utf-8");
    const parsed = JSON.parse(content);
    // Check if it's the new schema (has metrics field)
    if (parsed.metrics) return parsed as RetroSnapshot;
    return null;
  } catch {
    return null;
  }
}

// --- Formatting ---

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

  for (let h = 0; h < 24; h++) {
    const count = hours[h] || 0;
    if (count === 0) continue;
    lines.push(
      `  ${String(h).padStart(2)}:00  ${String(count).padStart(3)}  ${bar(count, max, 20)}`,
    );
  }

  return lines.length > 0 ? lines.join("\n") : "  (no commits)";
}

export function fmtMetricsTable(m: RetroMetrics): string {
  const rows: [string, string][] = [
    ["Commits", String(m.commits)],
    ["Contributors", String(m.contributors)],
    ["Insertions", `+${m.insertions}`],
    ["Deletions", `-${m.deletions}`],
    ["Net LOC", String(m.netLoc)],
    ["Test LOC (ins)", String(m.testLoc)],
    ["Test ratio", `${m.testRatio}%`],
    ["Active days", String(m.activeDays)],
    ["Sessions", String(m.sessions)],
    ["Deep sessions", String(m.deepSessions)],
    ["Avg session", `${m.avgSessionMinutes} min`],
    ["LOC/session-hour", String(m.locPerSessionHour)],
    ["Peak hour", `${m.peakHour}:00`],
    ["Focus score", `${m.focusScore}% (${m.focusArea})`],
    ["Streak", `${m.streakDays} days`],
    ["AI-assisted", String(m.aiAssistedCommits)],
  ];

  return rows.map(([k, v]) => `  ${k?.padEnd(20)} ${v}`).join("\n");
}

export function fmtLeaderboard(
  authors: Record<string, RetroSnapshotAuthor>,
  currentUser: string,
): string {
  const entries = Object.entries(authors).sort(
    ([, a], [, b]) => b.commits - a.commits,
  );

  // Move current user to top
  const userIdx = entries.findIndex(([name]) => name === currentUser);
  if (userIdx > 0) {
    const [entry] = entries.splice(userIdx, 1);
    if (entry) entries.unshift(entry);
  }

  const header = `  ${"Contributor".padEnd(24)} ${"Commits".padStart(7)}   ${"+/-".padStart(14)}   Top area`;
  const sep = `  ${"-".repeat(24)} ${"-".repeat(7)}   ${"-".repeat(14)}   ${"-".repeat(15)}`;

  const rows = entries.map(([name, s]) => {
    const display = name === currentUser ? `You (${name})` : name;
    const loc = `+${s.insertions}/-${s.deletions}`;
    return `  ${display.padEnd(24)} ${String(s.commits).padStart(7)}   ${loc.padStart(14)}   ${s.topArea}`;
  });

  return [header, sep, ...rows].join("\n");
}

export function fmtDelta(
  current: RetroSnapshot,
  previous: RetroSnapshot,
): string {
  const c = current.metrics;
  const p = previous.metrics;

  function d(cur: number, prev: number, suffix = ""): string {
    const diff = cur - prev;
    const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    const sign = diff > 0 ? "+" : "";
    return `${prev}${suffix}  →  ${cur}${suffix}  ${arrow}${sign}${diff}${suffix}`;
  }

  const rows = [
    `  ${"Metric".padEnd(20)} Change`,
    `  ${"-".repeat(20)} ${"-".repeat(35)}`,
    `  ${"Commits".padEnd(20)} ${d(c.commits, p.commits)}`,
    `  ${"Test ratio".padEnd(20)} ${d(c.testRatio, p.testRatio, "%")}`,
    `  ${"Sessions".padEnd(20)} ${d(c.sessions, p.sessions)}`,
    `  ${"Deep sessions".padEnd(20)} ${d(c.deepSessions, p.deepSessions)}`,
    `  ${"LOC/session-hour".padEnd(20)} ${d(c.locPerSessionHour, p.locPerSessionHour)}`,
    `  ${"Focus score".padEnd(20)} ${d(c.focusScore, p.focusScore, "%")}`,
    `  ${"Streak".padEnd(20)} ${d(c.streakDays, p.streakDays, "d")}`,
  ];

  return rows.join("\n");
}

export function fmtSessions(sessions: RetroSession[]): string {
  const deep = sessions.filter((s) => s.type === "deep").length;
  const medium = sessions.filter((s) => s.type === "medium").length;
  const micro = sessions.filter((s) => s.type === "micro").length;
  const totalMin = sessions.reduce((s, sess) => s + sess.durationMinutes, 0);
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
    .map((h, i) => {
      const churn = h.count >= 5 ? " [churn]" : "";
      const test = isTestFile(h.file) ? " [test]" : "";
      return `  ${String(i + 1).padStart(2)}. ${h.file} (${h.count}x)${test}${churn}`;
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
  const m = snapshot.metrics;
  const dateRange = snapshot.date.split("T")[0] || "";
  return `${dateRange} (${snapshot.window}): ${m.commits} commits (${m.contributors} contrib), ${m.netLoc > 0 ? "+" : ""}${m.netLoc} LOC, ${m.testRatio}% tests, peak: ${m.peakHour}:00 | Streak: ${m.streakDays}d`;
}

// --- Main Analysis ---

export function analyze(cwd: string, window: TimeWindow): RetroSnapshot {
  const branch = `origin/${getDefaultBranch(cwd)}`;
  const commits = getCommitsWithStats(cwd, window, branch);
  const fileChanges = getFileChanges(cwd, window, branch);
  const hotspots = getFileHotspots(cwd, window, branch);
  const authorStats = computeAuthorStats(commits, fileChanges);
  const sessions = detectSessions(commits);
  const hourly = computeHourlyDistribution(commits);
  const commitTypes = computeCommitTypes(commits);
  const focus = computeFocusScore(fileChanges);
  const streak = getShippingStreak(cwd, branch);
  const aiCommits = countAIAssistedCommits(cwd, window, branch);

  let testLoc = 0;
  for (const fc of fileChanges) {
    if (isTestFile(fc.file)) testLoc += fc.insertions;
  }

  const totalIns = commits.reduce((s, c) => s + c.insertions, 0);
  const totalDel = commits.reduce((s, c) => s + c.deletions, 0);
  const activeDays = new Set(
    commits.map(
      (c) => new Date(c.timestamp * 1000).toISOString().split("T")[0],
    ),
  ).size;

  const totalSessionMin = sessions.reduce(
    (s, sess) => s + sess.durationMinutes,
    0,
  );
  const totalSessionHours = totalSessionMin / 60;
  const locPerHour =
    totalSessionHours > 0
      ? Math.round((totalIns + totalDel) / totalSessionHours / 50) * 50
      : 0;

  const peakHour = hourly.indexOf(Math.max(...hourly));

  const snapshotAuthors: Record<string, RetroSnapshotAuthor> = {};
  for (const [name, s] of Object.entries(authorStats)) {
    const testRatio =
      s.insertions > 0
        ? Math.round((s.testInsertions / s.insertions) * 100)
        : 0;
    snapshotAuthors[name] = {
      commits: s.commits,
      insertions: s.insertions,
      deletions: s.deletions,
      testRatio,
      topArea: s.topAreas[0] || "-",
    };
  }

  return {
    date: new Date().toISOString(),
    window: window.label,
    metrics: {
      commits: commits.length,
      contributors: Object.keys(authorStats).length,
      insertions: totalIns,
      deletions: totalDel,
      netLoc: totalIns - totalDel,
      testLoc,
      testRatio: totalIns > 0 ? Math.round((testLoc / totalIns) * 100) : 0,
      activeDays,
      sessions: sessions.length,
      deepSessions: sessions.filter((s) => s.type === "deep").length,
      avgSessionMinutes:
        sessions.length > 0 ? Math.round(totalSessionMin / sessions.length) : 0,
      locPerSessionHour: locPerHour,
      peakHour,
      focusScore: focus.score,
      focusArea: focus.area,
      streakDays: streak,
      aiAssistedCommits: aiCommits,
    },
    authors: snapshotAuthors,
    commitTypes,
    hotspots,
  };
}

/** Additional data needed for rendering but not stored in snapshot */
export function getDisplayData(cwd: string, window: TimeWindow) {
  const branch = `origin/${getDefaultBranch(cwd)}`;
  const commits = getCommitsWithStats(cwd, window, branch);
  return {
    sessions: detectSessions(commits),
    hourly: computeHourlyDistribution(commits),
  };
}
