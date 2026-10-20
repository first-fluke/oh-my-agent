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
  kind: "user" | "assistant" | "tool" | "subtool" | "context" | "compacted";
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
  /** Time from request start to the first streamed token, when recorded. */
  ttftMs?: number;
  input?: string;
  output?: string;
  thinking?: string;
  tokens?: TrajectoryTokens;
}

export interface TranscriptLoadResult {
  sourcePath: string;
  records: TranscriptRecord[];
}

/** Where vendor transcripts live; vendors honor their own home overrides. */
export interface TranscriptRoots {
  home: string;
  env: NodeJS.ProcessEnv;
  /** OMA project the session belongs to. */
  projectDir: string;
  /** Vendor home the L1 events recorded for this vendor session, if any. */
  vendorHome?: string;
  /** Exclude child transcripts when only the fresh root process is bound. */
  includeNestedAgents?: boolean;
  /** Refuse oversized native transcripts before parsing. */
  maxBytes?: number;
}

/** Locates and parses one vendor session transcript. */
export type TranscriptLoader = (
  vendorSid: string,
  roots: TranscriptRoots,
) => TranscriptLoadResult | null;
