import type { TimeWindow } from "../../../cli-kit/time-window.js";
import {
  countAIAssistedCommits,
  getCommitsWithStats,
  getDefaultBranch,
  getFileChanges,
  getFileHotspots,
  getShippingStreak,
} from "./git.js";
import {
  computeAuthorStats,
  computeCommitTypes,
  computeFocusScore,
  computeHourlyDistribution,
  detectSessions,
  isTestFile,
} from "./metrics.js";
import type { RetroSnapshot, RetroSnapshotAuthor } from "./types.js";

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
  for (const fileChange of fileChanges) {
    if (isTestFile(fileChange.file)) {
      testLoc += fileChange.insertions;
    }
  }

  const totalIns = commits.reduce((sum, commit) => sum + commit.insertions, 0);
  const totalDel = commits.reduce((sum, commit) => sum + commit.deletions, 0);
  const activeDays = new Set(
    commits.map(
      (commit) => new Date(commit.timestamp * 1000).toISOString().split("T")[0],
    ),
  ).size;

  const totalSessionMin = sessions.reduce(
    (sum, session) => sum + session.durationMinutes,
    0,
  );
  const totalSessionHours = totalSessionMin / 60;
  const locPerHour =
    totalSessionHours > 0
      ? Math.round((totalIns + totalDel) / totalSessionHours / 50) * 50
      : 0;

  const peakHour = hourly.indexOf(Math.max(...hourly));
  const snapshotAuthors: Record<string, RetroSnapshotAuthor> = {};

  for (const [name, stat] of Object.entries(authorStats)) {
    const testRatio =
      stat.insertions > 0
        ? Math.round((stat.testInsertions / stat.insertions) * 100)
        : 0;
    snapshotAuthors[name] = {
      commits: stat.commits,
      insertions: stat.insertions,
      deletions: stat.deletions,
      testRatio,
      topArea: stat.topAreas[0] || "-",
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
      deepSessions: sessions.filter((session) => session.type === "deep")
        .length,
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

export function getDisplayData(cwd: string, window: TimeWindow) {
  const branch = `origin/${getDefaultBranch(cwd)}`;
  const commits = getCommitsWithStats(cwd, window, branch);
  return {
    sessions: detectSessions(commits),
    hourly: computeHourlyDistribution(commits),
  };
}
