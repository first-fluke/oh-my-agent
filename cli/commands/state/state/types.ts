import type {
  readEvents,
  readIndex,
  SessionMeta,
} from "../../../state/events.js";

export interface StateView {
  index: ReturnType<typeof readIndex>;
  sessions: SessionMeta[];
}

export interface ArchivedSession {
  bucket: string;
  sid: string;
  archivePath: string;
  meta: SessionMeta;
}

export interface ArchivedStateView {
  sessions: ArchivedSession[];
}

export interface SessionView {
  meta: SessionMeta;
  events: ReturnType<typeof readEvents>;
  archived: boolean;
  archivePath?: string;
}

export interface PurgeResult {
  cutoff: string;
  dryRun: boolean;
  purged: string[];
  skippedActive: string[];
  skippedRecent: string[];
}

export interface ArchiveResult {
  cutoff: string;
  dryRun: boolean;
  archived: Array<{ sid: string; to: string }>;
  skippedActive: string[];
  skippedRecent: string[];
  skippedOpen: string[];
}

export interface RepairResult {
  dryRun: boolean;
  repairedMeta: string[];
  quarantinedEvents: Array<{
    sid: string;
    invalidLines: number;
    badPath: string;
  }>;
  removedActive: Array<{ category: string; sid: string }>;
  reassignedActive: Array<{ category: string; from: string; to: string }>;
  unchanged: boolean;
}

export interface InjectLogEntryRef {
  file: string;
  path: string;
}

export interface InjectLogView {
  sid: string;
  dir: string | null;
  entries: InjectLogEntryRef[];
  content?: string;
}
