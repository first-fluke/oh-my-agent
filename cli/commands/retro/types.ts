export type { TimeWindow } from "../../cli-kit/time-window.js";
export {
  getCompareWindows,
  parseTimeWindow,
} from "../../cli-kit/time-window.js";
export { analyze, getDisplayData } from "./internal/analysis.js";
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
} from "./internal/formatters.js";
export {
  countAIAssistedCommits,
  fetchOrigin,
  getCommitsWithStats,
  getDefaultBranch,
  getFileChanges,
  getFileHotspots,
  getGitUserName,
  getShippingStreak,
} from "./internal/git.js";
export {
  computeAuthorStats,
  computeCommitTypes,
  computeFocusScore,
  computeHourlyDistribution,
  detectSessions,
  isTestFile,
} from "./internal/metrics.js";
export { loadPreviousSnapshot, saveSnapshot } from "./internal/persistence.js";
export type {
  RetroAuthorDetail,
  RetroCommit,
  RetroFileChange,
  RetroMetrics,
  RetroSession,
  RetroSnapshot,
  RetroSnapshotAuthor,
} from "./internal/types.js";
