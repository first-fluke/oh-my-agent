export { analyze, getDisplayData } from "./retro/analysis.js";
export {
  bar,
  fmtCommitTypes,
  fmtDelta,
  fmtHotspots,
  fmtHourlyHistogram,
  fmtLeaderboard,
  fmtMetricsTable,
  fmtPctBar,
  fmtSessions,
  fmtTweetable,
} from "./retro/formatters.js";
export {
  countAIAssistedCommits,
  fetchOrigin,
  getCommitsWithStats,
  getDefaultBranch,
  getFileChanges,
  getFileHotspots,
  getGitUserName,
  getShippingStreak,
} from "./retro/git.js";
export {
  computeAuthorStats,
  computeCommitTypes,
  computeFocusScore,
  computeHourlyDistribution,
  detectSessions,
  isTestFile,
} from "./retro/metrics.js";
export { loadPreviousSnapshot, saveSnapshot } from "./retro/persistence.js";
export type {
  RetroAuthorDetail,
  RetroCommit,
  RetroFileChange,
  RetroMetrics,
  RetroSession,
  RetroSnapshot,
  RetroSnapshotAuthor,
} from "./retro/types.js";
export type { TimeWindow } from "./time-window.js";
export { getCompareWindows, parseTimeWindow } from "./time-window.js";
