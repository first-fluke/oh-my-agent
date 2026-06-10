import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AGENTS_STATE_ARCHIVE_DIR,
  agentsPathFromRoot,
} from "../../../constants/paths.js";
import {
  deriveMeta,
  type OmaEvent,
  readEvents,
  readIndex,
  refreshMeta,
  type SessionMeta,
  sessionsDir,
  setActiveSession,
  sortEvents,
} from "../../../state/events.js";
import type {
  ArchivedSession,
  ArchivedStateView,
  SessionView,
  StateView,
} from "./types.js";

function loadSessionMeta(projectDir: string, sid: string): SessionMeta {
  const metaPath = join(sessionsDir(projectDir), sid, "meta.json");
  if (existsSync(metaPath)) {
    try {
      return JSON.parse(readFileSync(metaPath, "utf-8")) as SessionMeta;
    } catch {
      return refreshMeta(projectDir, sid);
    }
  }
  return deriveMeta(sid, readEvents(projectDir, sid));
}

function eventsFromDir(dir: string): OmaEvent[] {
  const path = join(dir, "events.jsonl");
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
      // Bad archive lines stay ignored here; doctor/repair can quarantine.
    }
  }
  return sortEvents(events);
}

function loadArchivedSession(
  bucket: string,
  sid: string,
  archivePath: string,
): ArchivedSession {
  const metaPath = join(archivePath, "meta.json");
  if (existsSync(metaPath)) {
    try {
      return {
        bucket,
        sid,
        archivePath,
        meta: JSON.parse(readFileSync(metaPath, "utf-8")) as SessionMeta,
      };
    } catch {
      // Re-derive below.
    }
  }
  const events = eventsFromDir(archivePath);
  return {
    bucket,
    sid,
    archivePath,
    meta: deriveMeta(sid, events),
  };
}

export function collectState(projectDir = process.cwd()): StateView {
  const index = readIndex(projectDir);
  const root = sessionsDir(projectDir);
  const sessions: SessionMeta[] = [];
  if (existsSync(root)) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!isValidSid(entry.name)) continue;
      sessions.push(loadSessionMeta(projectDir, entry.name));
    }
  }
  sessions.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return { index, sessions };
}

export function collectArchivedState(
  projectDir = process.cwd(),
): ArchivedStateView {
  const root = archiveRoot(projectDir);
  const sessions: ArchivedSession[] = [];
  if (existsSync(root)) {
    for (const bucketEntry of readdirSync(root, { withFileTypes: true })) {
      if (!bucketEntry.isDirectory()) continue;
      const bucket = bucketEntry.name;
      const bucketPath = join(root, bucket);
      for (const sessionEntry of readdirSync(bucketPath, {
        withFileTypes: true,
      })) {
        if (!sessionEntry.isDirectory()) continue;
        sessions.push(
          loadArchivedSession(
            bucket,
            sessionEntry.name,
            join(bucketPath, sessionEntry.name),
          ),
        );
      }
    }
  }
  sessions.sort((a, b) =>
    (b.meta.createdAt ?? "").localeCompare(a.meta.createdAt ?? ""),
  );
  return { sessions };
}

export function viewSession(
  sid: string,
  projectDir = process.cwd(),
): SessionView {
  const livePath = join(sessionsDir(projectDir), sid);
  if (existsSync(livePath)) {
    const events = readEvents(projectDir, sid);
    return { meta: deriveMeta(sid, events), events, archived: false };
  }

  const archived = collectArchivedState(projectDir).sessions.find(
    (session) => session.sid === sid,
  );
  if (archived) {
    const events = eventsFromDir(archived.archivePath);
    return {
      meta: deriveMeta(sid, events),
      events,
      archived: true,
      archivePath: archived.archivePath,
    };
  }

  const events = readEvents(projectDir, sid);
  return { meta: deriveMeta(sid, events), events, archived: false };
}

export function activateStateSession(
  sid: string,
  category = "main",
  projectDir = process.cwd(),
): void {
  setActiveSession(projectDir, category, sid);
}

/**
 * Validate that a session directory name is safe to use as a path component.
 * Accepts the formats actually used by oma (e.g. "oma-main", "sid-1").
 * Rejects anything containing ".." or characters outside [A-Za-z0-9._-].
 */
export function isValidSid(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 128 &&
    !name.includes("..") &&
    /^[A-Za-z0-9._-]+$/.test(name)
  );
}

export function parseOlderThan(value: string): number {
  const match = value.trim().match(/^(\d+)([dhm]?)$/i);
  if (!match) {
    throw new Error("older-than must be a duration like 90d, 24h, or 30m");
  }
  const amount = Number(match[1] ?? "0");
  const unit = (match[2] ?? "d").toLowerCase() || "d";
  const multipliers = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
  } as const;
  const multiplier =
    multipliers[unit as keyof typeof multipliers] ?? multipliers.d;
  return amount * multiplier;
}

export function archiveRoot(projectDir: string): string {
  return agentsPathFromRoot(projectDir, AGENTS_STATE_ARCHIVE_DIR);
}
