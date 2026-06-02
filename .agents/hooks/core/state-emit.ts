#!/usr/bin/env bun
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { observeWithTimeout } from "./agentmemory-client.ts";
import { atomicWriteJson, sessionDir } from "./state-marker.ts";

const RETRY_FILE = join(".agents", "state", "retry", "observe.jsonl");
const SEMANTIC_KINDS = new Set([
  "workflow.phase",
  "gate.passed",
  "gate.failed",
  "blocker.raised",
  "session.ended",
  "decision.made",
  "decision.missing",
]);

export interface OmaEvent {
  eventId: string;
  ts: string;
  sid: string;
  kind: string;
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

export function createEventId(now = Date.now()): string {
  const time = now.toString(36).padStart(10, "0");
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${time}${random}`;
}

export function eventsPath(projectDir: string, sid: string): string {
  return join(sessionDir(projectDir, sid), "events.jsonl");
}

export function metaPath(projectDir: string, sid: string): string {
  return join(sessionDir(projectDir, sid), "meta.json");
}

export async function emitEvent(
  projectDir: string,
  sid: string,
  event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
): Promise<OmaEvent> {
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
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(enriched)}\n`, "utf-8");
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
  if (SEMANTIC_KINDS.has(enriched.kind)) {
    const observed = await observeWithTimeout({
      sessionId: sid,
      content: `${JSON.stringify(enriched)}\n`,
      source: "oma-workflow",
      projectDir,
    });
    if (!observed) enqueueRetry(projectDir, enriched);
  }
  return enriched;
}

function enqueueRetry(projectDir: string, event: OmaEvent): void {
  const path = join(projectDir, RETRY_FILE);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf-8");
}

export function sortEvents(events: OmaEvent[]): OmaEvent[] {
  return [...events].sort((a, b) => {
    const ts = a.ts.localeCompare(b.ts);
    if (ts !== 0) return ts;
    return a.eventId.localeCompare(b.eventId);
  });
}

export function readEvents(projectDir: string, sid: string): OmaEvent[] {
  const path = eventsPath(projectDir, sid);
  if (!existsSync(path)) return [];
  const events: OmaEvent[] = [];
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as OmaEvent;
      if (event.sid && event.kind && event.eventId && event.ts) {
        events.push(event);
      }
    } catch {
      // Bad lines are ignored here; doctor/state repair can quarantine.
    }
  }
  return sortEvents(events);
}

export function deriveMeta(sid: string, events: OmaEvent[]): SessionMeta {
  const meta: SessionMeta = {
    sid,
    schemaVersion: 1,
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
      meta.status = event.payload?.status === "failed" ? "failed" : "completed";
    }
  }
  return meta;
}

export function refreshMeta(projectDir: string, sid: string): SessionMeta {
  const meta = deriveMeta(sid, readEvents(projectDir, sid));
  atomicWriteJson(metaPath(projectDir, sid), meta);
  return meta;
}
