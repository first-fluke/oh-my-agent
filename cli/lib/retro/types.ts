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
