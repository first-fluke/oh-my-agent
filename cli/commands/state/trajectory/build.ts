import { homedir } from "node:os";
import type { OmaEvent } from "../../../state/events.js";
import { resolveProjectRoot } from "../../../utils/fs-utils.js";
import { collectState, viewSession } from "../sessions.js";
import { loadAntigravityTranscript } from "./antigravity.js";
import { loadClaudeTranscript } from "./claude.js";
import { loadCodexTranscript } from "./codex.js";
import { loadGrokTranscript } from "./grok.js";
import { summarize } from "./text.js";
import type {
  Trajectory,
  TrajectoryRecord,
  TrajectoryTokens,
  TrajectoryVendorSession,
  TranscriptLoader,
  TranscriptRecord,
  TranscriptRoots,
} from "./types.js";

const LOADERS: Record<string, TranscriptLoader> = {
  antigravity: loadAntigravityTranscript,
  claude: loadClaudeTranscript,
  codex: loadCodexTranscript,
  grok: loadGrokTranscript,
};

/**
 * A prompt that starts the next OMA session is logged by the vendor slightly
 * before the hook emits `session.created`; turns starting inside this slack
 * belong to the next session.
 */
const TURN_START_SLACK_MS = 5_000;

const SUMMARY_KEYS = [
  "workflow",
  "phase",
  "subject",
  "gate",
  "summary",
  "decision",
  "reason",
  "status",
  "code",
];

export interface BuildTrajectoryOptions {
  projectDir?: string;
  /** Home directory holding vendor transcripts (default: os.homedir()). */
  home?: string;
  /** Environment consulted for vendor home overrides (default: process.env). */
  env?: NodeJS.ProcessEnv;
}

function eventSummary(event: OmaEvent): string {
  const payload = event.payload ?? {};
  const text = (key: string): string => {
    const value = payload[key];
    return typeof value === "string" ? value : "";
  };
  if (event.kind === "boundary") {
    const from = text("fromVendor");
    const to = text("toVendor");
    return summarize(
      [text("reason"), from && to ? `${from} → ${to}` : to]
        .filter(Boolean)
        .join(" · "),
    );
  }
  // The row already labels the event kind; the summary carries its payload.
  const parts = SUMMARY_KEYS.map(text).filter(Boolean);
  return summarize(parts.length > 0 ? parts.join(" · ") : event.kind);
}

function eventMs(event: OmaEvent): number | null {
  const ms = Date.parse(event.ts);
  return Number.isFinite(ms) ? ms : null;
}

/** Vendor sessions this OMA session ran on, in first-seen order. */
function referencedVendorSessions(
  events: OmaEvent[],
): Array<{ vendor: string; vendorSid: string; vendorHome?: string }> {
  const seen = new Map<
    string,
    { vendor: string; vendorSid: string; vendorHome?: string }
  >();
  const add = (vendor: unknown, vendorSid: unknown, vendorHome?: unknown) => {
    if (typeof vendor !== "string" || typeof vendorSid !== "string") return;
    if (!vendor || !vendorSid || vendorSid === "unknown") return;
    const key = `${vendor}\u0000${vendorSid}`;
    const entry = seen.get(key) ?? { vendor, vendorSid };
    if (typeof vendorHome === "string" && vendorHome) {
      entry.vendorHome ??= vendorHome;
    }
    seen.set(key, entry);
  };
  for (const event of events) {
    // The emitting hook ran inside the vendor process named on the event.
    add(event.vendor, event.vendorSid, event.payload?.vendorHome);
    add(event.payload?.toVendor, event.payload?.toVendorSid);
  }
  return [...seen.values()];
}

/** When a later session of the same category replaced this one as active. */
function supersededAt(
  projectDir: string,
  sid: string,
  category: string,
  createdAt: string | undefined,
): number | null {
  if (!createdAt) return null;
  let next: string | null = null;
  for (const session of collectState(projectDir).sessions) {
    if (session.sid === sid || session.category !== category) continue;
    const candidate = session.createdAt;
    if (!candidate || candidate <= createdAt) continue;
    if (next === null || candidate < next) next = candidate;
  }
  return next === null ? null : Date.parse(next);
}

function recordEnd(record: TranscriptRecord): number | null {
  if (record.startedAt === null) return null;
  return record.startedAt + (record.durationMs ?? 0);
}

/**
 * Keep the transcript turns that overlap the OMA session window. A vendor
 * session usually outlives one workflow, so whole turns are kept or dropped:
 * the turn in flight when the session ended stays, later turns do not.
 */
export function windowTranscript(
  records: TranscriptRecord[],
  from: number,
  until: number,
): TranscriptRecord[] {
  const ordered = records
    .filter((record) => record.startedAt !== null)
    .map((record, order) => ({ record, order }))
    .sort(
      (a, b) =>
        (a.record.startedAt as number) - (b.record.startedAt as number) ||
        a.order - b.order,
    )
    .map((entry) => entry.record);

  const turns: TranscriptRecord[][] = [];
  for (const record of ordered) {
    if (record.opensTurn || turns.length === 0) turns.push([]);
    turns[turns.length - 1]?.push(record);
  }

  const kept: TranscriptRecord[] = [];
  for (const turn of turns) {
    const start = turn[0]?.startedAt as number;
    const end = Math.max(...turn.map((record) => recordEnd(record) ?? start));
    if (end < from) continue;
    if (start >= until - TURN_START_SLACK_MS) continue;
    kept.push(...turn);
  }
  return kept;
}

function emptyTokens(): TrajectoryTokens {
  return { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, think: 0 };
}

export function buildTrajectory(
  sid: string,
  options: BuildTrajectoryOptions = {},
): Trajectory {
  const projectDir = options.projectDir ?? resolveProjectRoot();
  const roots: TranscriptRoots = {
    home: options.home ?? homedir(),
    env: options.env ?? process.env,
  };
  const view = viewSession(sid, projectDir);
  const { events, meta } = view;

  const eventTimes = events
    .map(eventMs)
    .filter((ms): ms is number => ms !== null);
  const from = eventTimes.length > 0 ? Math.min(...eventTimes) : 0;
  const ended = events.find((event) => event.kind === "session.ended");
  const until =
    (ended ? eventMs(ended) : null) ??
    (view.archived
      ? null
      : supersededAt(projectDir, sid, meta.category, meta.createdAt)) ??
    Number.POSITIVE_INFINITY;
  // A session that ended mid-turn keeps that turn; the slack only separates a
  // successor's opening prompt.
  const windowEnd = ended ? until + TURN_START_SLACK_MS : until;

  const placed: Array<Omit<TrajectoryRecord, "index" | "turn">> = [];
  const vendorSessions: TrajectoryVendorSession[] = [];

  for (const { vendor, vendorSid, vendorHome } of referencedVendorSessions(
    events,
  )) {
    const loader = LOADERS[vendor];
    if (!loader) {
      vendorSessions.push({
        vendor,
        vendorSid,
        status: "unsupported",
        records: 0,
      });
      continue;
    }
    const loaded =
      eventTimes.length > 0
        ? loader(vendorSid, { ...roots, vendorHome })
        : null;
    if (!loaded) {
      vendorSessions.push({ vendor, vendorSid, status: "missing", records: 0 });
      continue;
    }
    const records = windowTranscript(loaded.records, from, windowEnd);
    for (const record of records) placed.push({ ...record, vendor, vendorSid });
    vendorSessions.push({
      vendor,
      vendorSid,
      status: "loaded",
      sourcePath: loaded.sourcePath,
      records: records.length,
    });
  }

  for (const event of events) {
    placed.push({
      id: `oma:${event.eventId}`,
      kind: "oma",
      text: eventSummary(event),
      startedAt: eventMs(event),
      durationMs: null,
      vendor: event.vendor,
      vendorSid: event.vendorSid,
      event: {
        eventId: event.eventId,
        kind: event.kind,
        payload: event.payload,
      },
    });
  }

  const ordered = placed
    .map((record, order) => ({ record, order }))
    .sort(
      (a, b) =>
        (a.record.startedAt ?? 0) - (b.record.startedAt ?? 0) ||
        a.order - b.order,
    );

  const tokens = emptyTokens();
  let turn = 0;
  let toolCalls = 0;
  let toolErrors = 0;
  let endedAt: number | null = null;
  const records: TrajectoryRecord[] = ordered.map(({ record }, position) => {
    if (record.opensTurn) turn++;
    if (record.kind === "tool" || record.kind === "subtool") {
      toolCalls++;
      if (record.isError) toolErrors++;
    }
    if (record.tokens) {
      for (const key of Object.keys(tokens) as Array<keyof TrajectoryTokens>) {
        tokens[key] += record.tokens[key];
      }
    }
    if (record.startedAt !== null) {
      endedAt = Math.max(
        endedAt ?? 0,
        record.startedAt + (record.durationMs ?? 0),
      );
    }
    return { ...record, index: position + 1, turn: turn === 0 ? null : turn };
  });

  return {
    sid,
    meta,
    archived: view.archived,
    vendorSessions,
    records,
    totals: {
      records: records.length,
      turns: turn,
      toolCalls,
      toolErrors,
      startedAt:
        records.find((record) => record.startedAt !== null)?.startedAt ?? null,
      endedAt,
      tokens,
    },
  };
}
