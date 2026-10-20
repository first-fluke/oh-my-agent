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

export type {
  TrajectoryTokens,
  TranscriptLoader,
  TranscriptLoadResult,
  TranscriptRecord,
  TranscriptRoots,
} from "../../../io/native-transcript/types.js";

import type {
  TrajectoryTokens,
  TranscriptRecord,
} from "../../../io/native-transcript/types.js";

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
  /**
   * How much of the transcript carries timestamps. Without them (`none`) the
   * whole transcript is shown, since it cannot be windowed to this session.
   */
  timing?: "full" | "partial" | "none";
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
