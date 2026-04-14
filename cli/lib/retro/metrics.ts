import type {
  RetroAuthorDetail,
  RetroCommit,
  RetroFileChange,
  RetroSession,
} from "./types.js";

const TEST_FILE_PATTERN = /(?:test|spec|__tests__|\.test\.|\.spec\.)/i;
const COMMIT_TYPE_PATTERN =
  /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf)(\(.+\))?!?:/;

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

  for (let index = 1; index < sorted.length; index++) {
    const ts = sorted[index]?.timestamp ?? 0;
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
  for (const commit of commits) {
    const hour = new Date(commit.timestamp * 1000).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  }
  return hours;
}

export function computeCommitTypes(
  commits: RetroCommit[],
): Record<string, number> {
  const types: Record<string, number> = {};

  for (const commit of commits) {
    const match = commit.subject.match(COMMIT_TYPE_PATTERN);
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

  for (const commit of commits) {
    if (!stats[commit.author]) {
      stats[commit.author] = {
        commits: 0,
        insertions: 0,
        deletions: 0,
        testInsertions: 0,
        topAreas: [],
        commitTypes: {},
        peakHour: 0,
      };
    }
    const stat = stats[commit.author];
    if (!stat) continue;

    stat.commits++;
    stat.insertions += commit.insertions;
    stat.deletions += commit.deletions;

    const typeMatch = commit.subject.match(COMMIT_TYPE_PATTERN);
    const type = typeMatch ? typeMatch[1] || "other" : "other";
    stat.commitTypes[type] = (stat.commitTypes[type] || 0) + 1;
  }

  const authorDirs: Record<string, Record<string, number>> = {};
  const authorHours: Record<string, number[]> = {};

  for (const fileChange of fileChanges) {
    if (!authorDirs[fileChange.author]) {
      authorDirs[fileChange.author] = {};
    }

    const dir = fileChange.file.split("/")[0] || fileChange.file;
    const authorDir = authorDirs[fileChange.author];
    if (authorDir) {
      authorDir[dir] = (authorDir[dir] || 0) + 1;
    }

    const authorStat = stats[fileChange.author];
    if (authorStat && isTestFile(fileChange.file)) {
      authorStat.testInsertions += fileChange.insertions;
    }
  }

  for (const commit of commits) {
    if (!authorHours[commit.author]) {
      authorHours[commit.author] = new Array<number>(24).fill(0);
    }
    const hour = new Date(commit.timestamp * 1000).getHours();
    const hours = authorHours[commit.author];
    if (hours) {
      hours[hour] = (hours[hour] || 0) + 1;
    }
  }

  for (const [author, stat] of Object.entries(stats)) {
    const dirs = authorDirs[author] || {};
    stat.topAreas = Object.entries(dirs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([dir]) => dir);

    const hours = authorHours[author] || [];
    const maxVal = Math.max(...hours, 0);
    stat.peakHour = maxVal > 0 ? hours.indexOf(maxVal) : 0;
  }

  return stats;
}
