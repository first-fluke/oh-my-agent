import { homedir } from "node:os";
import type { OmaEvent } from "../../../state/events.js";
import { resolveProjectRoot } from "../../../utils/fs-utils.js";
import { collectState, viewSession } from "../sessions.js";
import { loadAntigravityTranscript } from "./antigravity.js";
import { loadClaudeTranscript } from "./claude.js";
import { loadCodexTranscript } from "./codex.js";
import { loadCursorTranscript } from "./cursor.js";
import { loadDshTranscript } from "./dsh.js";
import { loadGrokTranscript } from "./grok.js";
import { loadKimiTranscript } from "./kimi.js";
import { loadKiroTranscript } from "./kiro.js";
import { loadCommandCodeTranscript, loadPiTranscript } from "./pi.js";
import { loadQwenTranscript } from "./qwen.js";
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
  commandcode: loadCommandCodeTranscript,
  cursor: loadCursorTranscript,
  dsh: loadDshTranscript,
  grok: loadGrokTranscript,
  kimi: loadKimiTranscript,
  kiro: loadKiroTranscript,
  pi: loadPiTranscript,
  qwen: loadQwenTranscript,
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

interface VendorSessionRef {
  vendor: string;
  vendorSid: string;
  vendorHome?: string;
  /** When this OMA session first touched the vendor session. */
  firstSeen: number | null;
}

/** Vendor sessions this OMA session ran on, in first-seen order. */
function referencedVendorSessions(events: OmaEvent[]): VendorSessionRef[] {
  const seen = new Map<string, VendorSessionRef>();
  const add = (
    event: OmaEvent,
    vendor: unknown,
    vendorSid: unknown,
    vendorHome?: unknown,
  ) => {
    if (typeof vendor !== "string" || typeof vendorSid !== "string") return;
    if (!vendor || !vendorSid || vendorSid === "unknown") return;
    const key = `${vendor}\u0000${vendorSid}`;
    const entry = seen.get(key) ?? {
      vendor,
      vendorSid,
      firstSeen: eventMs(event),
    };
    if (typeof vendorHome === "string" && vendorHome) {
      entry.vendorHome ??= vendorHome;
    }
    seen.set(key, entry);
  };
  for (const event of events) {
    // The emitting hook ran inside the vendor process named on the event.
    add(event, event.vendor, event.vendorSid, event.payload?.vendorHome);
    // A runtime outside OMA's vendor list (DeepSeek Harness) names itself,
    // and its home, only in the payload.
    add(
      event,
      event.payload?.toVendor,
      event.payload?.toVendorSid,
      event.payload?.vendorHome,
    );
  }
  return [...seen.values()];
}

/** How many recent sessions to search for a vendor home recorded elsewhere. */
const VENDOR_HOME_SCAN_LIMIT = 300;

/**
 * Vendor homes other sessions of this project recorded. A session from before
 * homes were recorded can still find its transcript under a launcher-managed
 * home that a later session ran in.
 */
function recordedVendorHomes(projectDir: string, vendor: string): string[] {
  const homes = new Set<string>();
  const sessions = collectState(projectDir).sessions.slice(
    0,
    VENDOR_HOME_SCAN_LIMIT,
  );
  for (const session of sessions) {
    for (const event of viewSession(session.sid, projectDir).events) {
      const home = event.payload?.vendorHome;
      if (event.vendor === vendor && typeof home === "string" && home) {
        homes.add(home);
      }
    }
  }
  return [...homes];
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

/** A transcript record with the time it is placed at in the ledger. */
export interface PlacedTranscriptRecord {
  record: TranscriptRecord;
  /** Own start time, or the time inherited from the preceding record. */
  at: number;
}

/**
 * Keep the transcript turns that overlap the OMA session window. A vendor
 * session usually outlives one workflow, so whole turns are kept or dropped:
 * the turn in flight when the session ended stays, later turns do not.
 *
 * Some vendors timestamp only prompts, or nothing at all. A record without a
 * time is placed at the preceding record's time, or at `anchor` (when the
 * session first touched this transcript) if nothing before it has one.
 */
export function windowTranscript(
  records: TranscriptRecord[],
  from: number,
  until: number,
  anchor: number | null = null,
): PlacedTranscriptRecord[] {
  let last = anchor;
  const ordered = records
    .flatMap((record, order) => {
      // Nested agent logs run on their own clock, apart from the main thread.
      if (record.agent === undefined && record.startedAt !== null) {
        last = record.startedAt;
      }
      const at = record.startedAt ?? last;
      return at === null ? [] : [{ record, at, order }];
    })
    .sort((a, b) => a.at - b.at || a.order - b.order);

  const turns: PlacedTranscriptRecord[][] = [];
  for (const { record, at } of ordered) {
    if (record.opensTurn || turns.length === 0) turns.push([]);
    turns[turns.length - 1]?.push({ record, at });
  }

  const kept: PlacedTranscriptRecord[] = [];
  for (const turn of turns) {
    const start = turn[0]?.at as number;
    const end = Math.max(
      ...turn.map((entry) => entry.at + (entry.record.durationMs ?? 0)),
    );
    // The prompt that created the session is logged just before the hook
    // emits; keep that turn even while it has no response yet.
    if (end < from && start < from - TURN_START_SLACK_MS) continue;
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
    projectDir,
  };
  const view = viewSession(sid, projectDir);
  const { events, meta } = view;

  const eventTimes = events
    .map(eventMs)
    .filter((ms): ms is number => ms !== null);
  const from = eventTimes.length > 0 ? Math.min(...eventTimes) : 0;
  const ended = events.find((event) => event.kind === "session.ended");
  const lastEvent = eventTimes.length > 0 ? Math.max(...eventTimes) : 0;
  const superseded =
    ended || view.archived
      ? null
      : supersededAt(projectDir, sid, meta.category, meta.createdAt);
  // A successor's creation normally closes an unfinished session, but events
  // after it show the session kept running; its last event then closes it.
  const outlived = superseded !== null && lastEvent > superseded;
  const until =
    (ended ? eventMs(ended) : null) ??
    (outlived ? lastEvent : superseded) ??
    Number.POSITIVE_INFINITY;
  // A session that stopped mid-turn keeps that turn; the slack only separates
  // a successor's opening prompt.
  const windowEnd = ended || outlived ? until + TURN_START_SLACK_MS : until;

  const placed: Array<{
    record: Omit<TrajectoryRecord, "index" | "turn">;
    at: number | null;
  }> = [];
  const vendorSessions: TrajectoryVendorSession[] = [];

  const knownHomes = new Map<string, string[]>();
  for (const ref of referencedVendorSessions(events)) {
    const { vendor, vendorSid } = ref;
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
    let loaded =
      eventTimes.length > 0
        ? loader(vendorSid, { ...roots, vendorHome: ref.vendorHome })
        : null;
    if (!loaded && eventTimes.length > 0 && !view.archived) {
      if (!knownHomes.has(vendor)) {
        knownHomes.set(vendor, recordedVendorHomes(projectDir, vendor));
      }
      for (const vendorHome of knownHomes.get(vendor) ?? []) {
        loaded = loader(vendorSid, { ...roots, vendorHome });
        if (loaded) break;
      }
    }
    if (!loaded) {
      vendorSessions.push({ vendor, vendorSid, status: "missing", records: 0 });
      continue;
    }
    const kept = windowTranscript(
      loaded.records,
      from,
      windowEnd,
      ref.firstSeen,
    );
    for (const { record, at } of kept) {
      placed.push({ record: { ...record, vendor, vendorSid }, at });
    }
    const timed = kept.filter((entry) => entry.record.startedAt !== null);
    vendorSessions.push({
      vendor,
      vendorSid,
      status: "loaded",
      sourcePath: loaded.sourcePath,
      records: kept.length,
      timing:
        timed.length === kept.length
          ? "full"
          : timed.length === 0
            ? "none"
            : "partial",
    });
  }

  for (const event of events) {
    placed.push({
      at: eventMs(event),
      record: {
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
      },
    });
  }

  const ordered = placed
    .map((entry, order) => ({ ...entry, order }))
    // At the same instant, a record with its own time precedes the untimed
    // records placed at it.
    .sort(
      (a, b) =>
        (a.at ?? 0) - (b.at ?? 0) ||
        Number(a.record.startedAt === null) -
          Number(b.record.startedAt === null) ||
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
