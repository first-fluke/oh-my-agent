import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  AGENTS_STATE_RETRY_DIR,
  AGENTS_STATE_SESSIONS_DIR,
  agentsPathFromRoot,
} from "../constants/paths.js";
import type { MemoryProvider } from "../types/memory.js";
import { createAgentMemoryProvider } from "./memory-provider.js";

export const STATE_ROOT = AGENTS_STATE_SESSIONS_DIR;
export const RETRY_ROOT = AGENTS_STATE_RETRY_DIR;
export const INDEX_SCHEMA_VERSION = 1;
export const SEMANTIC_EVENT_KINDS = new Set([
  "workflow.phase",
  "gate.passed",
  "gate.failed",
  "blocker.raised",
  "session.ended",
  "decision.made",
  "decision.missing",
]);

export type EventKind =
  | "boundary"
  | "session.created"
  | "workflow.phase"
  | "gate.passed"
  | "gate.failed"
  | "blocker.raised"
  | "decision.made"
  | "decision.missing"
  | "session.ended";

export interface LastSessionMarker {
  vendor: string;
  vendorSid: string;
  ts: string;
}

export interface StateIndex {
  schemaVersion: 1;
  lastSession?: LastSessionMarker;
  active: Record<string, string>;
}

export interface OmaEvent {
  eventId: string;
  ts: string;
  sid: string;
  kind: EventKind | string;
  writerPid: number;
  vendor?: string;
  vendorSid?: string;
  parentEventId?: string;
  causalityKey?: string;
  payload?: Record<string, unknown>;
}

export interface SessionMeta {
  sid: string;
  schemaVersion: 1;
  workflow?: string;
  category: string;
  status: "active" | "completed" | "failed";
  createdAt?: string;
  currentPhase?: string;
  gatesPassedBy: Array<Record<string, unknown>>;
  pendingPeerReviews: Array<Record<string, unknown>>;
}

export function sessionsDir(projectDir: string): string {
  return agentsPathFromRoot(projectDir, STATE_ROOT);
}

export function indexPath(projectDir: string): string {
  return join(sessionsDir(projectDir), "_index.json");
}

export function sessionDir(projectDir: string, sid: string): string {
  return join(sessionsDir(projectDir), sid);
}

export function eventsPath(projectDir: string, sid: string): string {
  return join(sessionDir(projectDir, sid), "events.jsonl");
}

export function metaPath(projectDir: string, sid: string): string {
  return join(sessionDir(projectDir, sid), "meta.json");
}

export function retryObservePath(projectDir: string): string {
  return join(agentsPathFromRoot(projectDir, RETRY_ROOT), "observe.jsonl");
}

export function defaultIndex(): StateIndex {
  return { schemaVersion: INDEX_SCHEMA_VERSION, active: {} };
}

export function createEventId(now = Date.now()): string {
  const time = now.toString(36).padStart(10, "0");
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${time}${random}`;
}

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function fsyncParent(path: string): void {
  try {
    const fd = openSync(dirname(path), "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    // Some filesystems do not support directory fsync.
  }
}

export function atomicWriteJson(path: string, value: unknown): void {
  ensureParent(path);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  // Open read-write ("r+"): fsyncSync on a read-only handle fails with EPERM
  // on Windows, which aborts the metadata write even though the durable
  // JSONL event was already appended. See issue #613.
  const fd = openSync(tmp, "r+");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, path);
  fsyncParent(path);
}

export function readIndex(projectDir: string): StateIndex {
  const path = indexPath(projectDir);
  if (!existsSync(path)) return defaultIndex();
  try {
    const parsed = JSON.parse(
      readFileSync(path, "utf-8"),
    ) as Partial<StateIndex>;
    return {
      schemaVersion: INDEX_SCHEMA_VERSION,
      active: parsed.active ?? {},
      lastSession: parsed.lastSession,
    };
  } catch {
    return defaultIndex();
  }
}

export function updateIndex(
  projectDir: string,
  mutate: (index: StateIndex) => void,
): StateIndex {
  const path = indexPath(projectDir);
  const next = readIndex(projectDir);
  mutate(next);
  atomicWriteJson(path, next);
  return next;
}

export function getActiveSid(
  index: StateIndex,
  category = "main",
): string | null {
  return index.active[category] ?? index.active.main ?? null;
}

export function setActiveSession(
  projectDir: string,
  category: string,
  sid: string,
): StateIndex {
  return updateIndex(projectDir, (index) => {
    index.active[category] = sid;
  });
}

export function setLastSession(
  projectDir: string,
  vendor: string,
  vendorSid: string,
): StateIndex {
  return updateIndex(projectDir, (index) => {
    index.lastSession = { vendor, vendorSid, ts: new Date().toISOString() };
  });
}

export function emitEvent(
  projectDir: string,
  sid: string,
  event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
): OmaEvent {
  const enriched: OmaEvent = {
    eventId: event.eventId ?? createEventId(),
    ts: event.ts ?? new Date().toISOString(),
    sid,
    kind: event.kind,
    writerPid: event.writerPid ?? process.pid,
    vendor: event.vendor,
    vendorSid: event.vendorSid,
    parentEventId: event.parentEventId,
    causalityKey: event.causalityKey,
    payload: event.payload,
  };
  const path = eventsPath(projectDir, sid);
  try {
    ensureParent(path);
    appendFileSync(path, `${JSON.stringify(enriched)}\n`, {
      encoding: "utf-8",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[oma] L1 events.jsonl write failed: ${msg}\n`);
    process.stderr.write(`[oma]   path=${path}\n`);
    process.stderr.write(
      "[oma]   hint: run 'oma doctor' to diagnose disk/permission/corruption\n",
    );
    throw e;
  }
  if (
    event.kind === "session.created" ||
    event.kind === "workflow.phase" ||
    event.kind === "session.ended"
  ) {
    refreshMeta(projectDir, sid);
  }
  return enriched;
}

function enqueueObserveRetry(projectDir: string, event: OmaEvent): void {
  const path = retryObservePath(projectDir);
  ensureParent(path);
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf-8");
}

/**
 * Build a human-readable narrative for events worth recalling across vendor /
 * session boundaries. `observe` keeps the raw JSON envelope (which AgentMemory
 * never enriches), so decisions and blockers are additionally `remember`ed as
 * durable facts so `/search` can surface them with a meaningful score.
 *
 * Returns null for events that should not become durable facts.
 */
function rememberContentForEvent(
  event: OmaEvent,
): { content: string; importance: number } | null {
  const payload = event.payload ?? {};
  const str = (key: string): string => {
    const value = payload[key];
    return typeof value === "string" && value.trim() ? value.trim() : "";
  };

  if (event.kind === "decision.made") {
    const subject = str("subject");
    const decision = str("decision");
    const rationale = str("rationale");
    if (!subject && !decision) return null;
    const content = [
      subject ? `Decision [${subject}]:` : "Decision:",
      decision,
      rationale ? `Rationale: ${rationale}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { content, importance: 8 };
  }

  if (event.kind === "blocker.raised") {
    const summary = str("summary");
    if (!summary) return null;
    const severity = str("severity");
    const remediation = str("remediation");
    const content = [
      `Blocker: ${summary}`,
      severity ? `(severity: ${severity})` : "",
      remediation ? `Remediation: ${remediation}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { content, importance: 7 };
  }

  return null;
}

export async function emitEventWithMemory(
  projectDir: string,
  sid: string,
  event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
  provider: MemoryProvider = createAgentMemoryProvider(),
): Promise<OmaEvent> {
  const enriched = emitEvent(projectDir, sid, event);
  if (!SEMANTIC_EVENT_KINDS.has(enriched.kind)) return enriched;

  const observed = await provider.observe({
    sessionId: sid,
    content: `${JSON.stringify(enriched)}\n`,
    source: "oma-workflow",
  });
  if (!observed) enqueueObserveRetry(projectDir, enriched);

  // Durable, recallable fact for cross-boundary rehydration (best-effort: a
  // failure here never affects L1 or the observe retry queue). Feature-detected
  // so provider stubs without `remember` stay valid.
  const memo = rememberContentForEvent(enriched);
  if (memo && typeof provider.remember === "function") {
    try {
      await provider.remember({
        sessionId: sid,
        content: memo.content,
        importance: memo.importance,
      });
    } catch {
      // Non-fatal: recall is an enhancement, not an L1 correctness guarantee.
    }
  }
  return enriched;
}

export function readEvents(projectDir: string, sid: string): OmaEvent[] {
  const path = eventsPath(projectDir, sid);
  if (!existsSync(path)) return [];
  const events: OmaEvent[] = [];
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as OmaEvent;
      if (event.sid && event.kind && event.eventId && event.ts)
        events.push(event);
    } catch {
      // Bad lines are ignored by the library; doctor/state repair can quarantine.
    }
  }
  return sortEvents(events);
}

export function sortEvents(events: OmaEvent[]): OmaEvent[] {
  return [...events].sort((a, b) => {
    const ts = a.ts.localeCompare(b.ts);
    if (ts !== 0) return ts;
    return a.eventId.localeCompare(b.eventId);
  });
}

/** Read a string field from an event payload, falling back when missing/blank. */
export function eventPayloadText(
  event: OmaEvent,
  key: string,
  fallback = "",
): string {
  const value = event.payload?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function deriveMeta(sid: string, events: OmaEvent[]): SessionMeta {
  const meta: SessionMeta = {
    sid,
    schemaVersion: INDEX_SCHEMA_VERSION,
    category: "main",
    status: "active",
    gatesPassedBy: [],
    pendingPeerReviews: [],
  };
  for (const event of sortEvents(events)) {
    if (event.kind === "session.created") {
      meta.createdAt = meta.createdAt ?? event.ts;
      meta.workflow = String(event.payload?.workflow ?? meta.workflow ?? "");
      meta.category = String(event.payload?.category ?? meta.category);
    } else if (event.kind === "workflow.phase") {
      meta.currentPhase = String(event.payload?.phase ?? "");
    } else if (event.kind === "gate.passed") {
      meta.gatesPassedBy.push({ ts: event.ts, ...(event.payload ?? {}) });
    } else if (event.kind === "session.ended") {
      const status = event.payload?.status;
      meta.status = status === "failed" ? "failed" : "completed";
    }
  }
  return meta;
}

export function refreshMeta(projectDir: string, sid: string): SessionMeta {
  const meta = deriveMeta(sid, readEvents(projectDir, sid));
  atomicWriteJson(metaPath(projectDir, sid), meta);
  return meta;
}

export function activateWorkflowSession(args: {
  projectDir: string;
  workflow: string;
  category?: string;
  sid: string;
  vendor?: string;
  vendorSid?: string;
}): void {
  const category = args.category ?? "main";
  setActiveSession(args.projectDir, category, args.sid);
  emitEvent(args.projectDir, args.sid, {
    kind: "session.created",
    vendor: args.vendor,
    vendorSid: args.vendorSid,
    payload: { workflow: args.workflow, category },
  });
}
