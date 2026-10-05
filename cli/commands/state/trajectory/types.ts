import type { SessionMeta } from "../../../state/events.js";

/**
 * Record kinds of the session trajectory ledger. Vendor transcript rows map to
 * the conversational kinds; `oma` rows are L1 events (phase, decision, gate,
 * boundary) that give the ledger its workflow spine.
 */
export type TrajectoryRecordKind =
  | "user"
  | "assistant"
  | "tool"
  | "subtool"
  | "context"
  | "compacted"
  | "oma";

/** Token usage of one model request. `output` includes `think`. */
export interface TrajectoryTokens {
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
  think: number;
}

/** One record as read from a vendor transcript, before session placement. */
export interface TranscriptRecord {
  id: string;
  kind: Exclude<TrajectoryRecordKind, "oma">;
  /** Single-line summary shown in the ledger row. */
  text: string;
  /** First record of a vendor turn: a user prompt or a resumed task. */
  opensTurn?: boolean;
  /** Unix epoch milliseconds, or null when the transcript has no timestamp. */
  startedAt: number | null;
  /** Own duration, or null when unknown or still in flight. */
  durationMs: number | null;
  /** Subagent label when the record comes from a nested agent transcript. */
  agent?: string;
  /** Tool call that spawned the nested agent this record belongs to. */
  parentCallId?: string;
  toolName?: string;
  callId?: string;
  isError?: boolean;
  model?: string;
  input?: string;
  output?: string;
  thinking?: string;
  tokens?: TrajectoryTokens;
}

export interface TrajectoryRecord extends Omit<TranscriptRecord, "kind"> {
  /** 1-based position shown as `#N`. */
  index: number;
  kind: TrajectoryRecordKind;
  /** 1-based turn opened by a user record; null before the first turn. */
  turn: number | null;
  vendor?: string;
  vendorSid?: string;
  /** Source L1 event for `oma` records. */
  event?: {
    eventId: string;
    kind: string;
    payload?: Record<string, unknown>;
  };
}

export type TranscriptStatus = "loaded" | "missing" | "unsupported";

/** One vendor session referenced by the OMA session's L1 events. */
export interface TrajectoryVendorSession {
  vendor: string;
  vendorSid: string;
  status: TranscriptStatus;
  sourcePath?: string;
  /** Records placed in the ledger after windowing to this OMA session. */
  records: number;
}

export interface TrajectoryTotals {
  records: number;
  turns: number;
  toolCalls: number;
  toolErrors: number;
  startedAt: number | null;
  endedAt: number | null;
  tokens: TrajectoryTokens;
}

export interface Trajectory {
  sid: string;
  meta: SessionMeta;
  archived: boolean;
  vendorSessions: TrajectoryVendorSession[];
  records: TrajectoryRecord[];
  totals: TrajectoryTotals;
}

export interface TranscriptLoadResult {
  sourcePath: string;
  records: TranscriptRecord[];
}

/** Where vendor transcripts live; vendors honor their own home overrides. */
export interface TranscriptRoots {
  home: string;
  env: NodeJS.ProcessEnv;
  /** Vendor home the L1 events recorded for this vendor session, if any. */
  vendorHome?: string;
}

/** Locates and parses one vendor session transcript. */
export type TranscriptLoader = (
  vendorSid: string,
  roots: TranscriptRoots,
) => TranscriptLoadResult | null;
