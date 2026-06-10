import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  atomicWriteJson,
  deriveMeta,
  eventsPath,
  indexPath,
  metaPath,
  type OmaEvent,
  readEvents,
  readIndex,
  refreshMeta,
  type SessionMeta,
  sessionsDir,
} from "../../../state/events.js";
import {
  archiveRoot,
  collectState,
  isValidSid,
  parseOlderThan,
} from "./sessions.js";
import type { ArchiveResult, PurgeResult, RepairResult } from "./types.js";

function isValidEvent(value: unknown): value is OmaEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<OmaEvent>;
  return (
    typeof event.sid === "string" &&
    typeof event.kind === "string" &&
    typeof event.eventId === "string" &&
    typeof event.ts === "string"
  );
}

function parseEventLines(content: string): {
  validLines: string[];
  invalidLines: string[];
} {
  const validLines: string[] = [];
  const invalidLines: string[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (isValidEvent(parsed)) {
        validLines.push(JSON.stringify(parsed));
      } else {
        invalidLines.push(line);
      }
    } catch {
      invalidLines.push(line);
    }
  }
  return { validLines, invalidLines };
}

function metaNeedsRepair(projectDir: string, sid: string): boolean {
  const path = metaPath(projectDir, sid);
  if (!existsSync(path)) return true;
  try {
    JSON.parse(readFileSync(path, "utf-8"));
    return false;
  } catch {
    return true;
  }
}

function newestRepairCandidate(
  projectDir: string,
  sessions: SessionMeta[],
): string | null {
  const sorted = [...sessions].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return (
      sessionTimestampMs(projectDir, b.sid, b) -
      sessionTimestampMs(projectDir, a.sid, a)
    );
  });
  return sorted[0]?.sid ?? null;
}

function sessionTimestampMs(
  projectDir: string,
  sid: string,
  meta: SessionMeta,
): number {
  const parsed = meta.createdAt ? Date.parse(meta.createdAt) : Number.NaN;
  if (!Number.isNaN(parsed)) return parsed;
  return statSync(join(sessionsDir(projectDir), sid)).mtimeMs;
}

export function repairStateSessions(
  args: { projectDir?: string; dryRun?: boolean } = {},
): RepairResult {
  const projectDir = args.projectDir ?? process.cwd();
  const dryRun = args.dryRun === true;
  const result: RepairResult = {
    dryRun,
    repairedMeta: [],
    quarantinedEvents: [],
    removedActive: [],
    reassignedActive: [],
    unchanged: true,
  };
  const root = sessionsDir(projectDir);
  const sessionIds = existsSync(root)
    ? readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && isValidSid(entry.name))
        .map((entry) => entry.name)
    : [];

  for (const sid of sessionIds) {
    const path = eventsPath(projectDir, sid);
    if (existsSync(path)) {
      const parsed = parseEventLines(readFileSync(path, "utf-8"));
      if (parsed.invalidLines.length > 0) {
        const badPath = join(sessionsDir(projectDir), sid, "events.bad.jsonl");
        result.quarantinedEvents.push({
          sid,
          invalidLines: parsed.invalidLines.length,
          badPath,
        });
        if (!dryRun) {
          writeFileSync(
            path,
            parsed.validLines.length > 0
              ? `${parsed.validLines.join("\n")}\n`
              : "",
            "utf-8",
          );
          appendFileSync(
            badPath,
            `${parsed.invalidLines.join("\n")}\n`,
            "utf-8",
          );
        }
      }
    }
    if (metaNeedsRepair(projectDir, sid)) {
      result.repairedMeta.push(sid);
      if (!dryRun) refreshMeta(projectDir, sid);
    }
  }

  const view = {
    index: readIndex(projectDir),
    sessions: sessionIds.map((sid) =>
      deriveMeta(sid, readEvents(projectDir, sid)),
    ),
  };
  const liveSids = new Set(sessionIds);
  const fallbackSid = newestRepairCandidate(projectDir, view.sessions);
  for (const [category, sid] of Object.entries(view.index.active)) {
    if (liveSids.has(sid)) continue;
    result.removedActive.push({ category, sid });
    delete view.index.active[category];
    if (category === "main" && fallbackSid) {
      view.index.active[category] = fallbackSid;
      result.reassignedActive.push({ category, from: sid, to: fallbackSid });
    }
  }

  if (
    !dryRun &&
    (result.removedActive.length > 0 || result.reassignedActive.length > 0)
  ) {
    atomicWriteJson(indexPath(projectDir), view.index);
  }

  result.unchanged =
    result.repairedMeta.length === 0 &&
    result.quarantinedEvents.length === 0 &&
    result.removedActive.length === 0 &&
    result.reassignedActive.length === 0;
  return result;
}

export function purgeStateSessions(args: {
  projectDir?: string;
  olderThan: string;
  dryRun?: boolean;
  now?: Date;
}): PurgeResult {
  const projectDir = args.projectDir ?? process.cwd();
  const olderThanMs = parseOlderThan(args.olderThan);
  const cutoffMs = (args.now ?? new Date()).getTime() - olderThanMs;
  const view = collectState(projectDir);
  const activeSids = new Set(Object.values(view.index.active));
  const result: PurgeResult = {
    cutoff: new Date(cutoffMs).toISOString(),
    dryRun: args.dryRun === true,
    purged: [],
    skippedActive: [],
    skippedRecent: [],
  };

  for (const session of view.sessions) {
    if (activeSids.has(session.sid)) {
      result.skippedActive.push(session.sid);
      continue;
    }
    if (sessionTimestampMs(projectDir, session.sid, session) > cutoffMs) {
      result.skippedRecent.push(session.sid);
      continue;
    }
    result.purged.push(session.sid);
    if (!result.dryRun) {
      rmSync(join(sessionsDir(projectDir), session.sid), {
        recursive: true,
        force: true,
      });
    }
  }

  if (!result.dryRun && result.purged.length > 0) {
    const purged = new Set(result.purged);
    for (const [category, sid] of Object.entries(view.index.active)) {
      if (purged.has(sid)) delete view.index.active[category];
    }
    atomicWriteJson(indexPath(projectDir), view.index);
  }

  return result;
}

function archiveBucket(meta: SessionMeta): string {
  const basis = meta.createdAt ?? new Date().toISOString();
  const parsed = new Date(basis);
  if (Number.isNaN(parsed.getTime())) return "unknown";
  return parsed.toISOString().slice(0, 7);
}

export function archiveStateSessions(args: {
  projectDir?: string;
  olderThan: string;
  dryRun?: boolean;
  now?: Date;
}): ArchiveResult {
  const projectDir = args.projectDir ?? process.cwd();
  const olderThanMs = parseOlderThan(args.olderThan);
  const cutoffMs = (args.now ?? new Date()).getTime() - olderThanMs;
  const view = collectState(projectDir);
  const activeSids = new Set(Object.values(view.index.active));
  const result: ArchiveResult = {
    cutoff: new Date(cutoffMs).toISOString(),
    dryRun: args.dryRun === true,
    archived: [],
    skippedActive: [],
    skippedRecent: [],
    skippedOpen: [],
  };

  for (const session of view.sessions) {
    if (activeSids.has(session.sid)) {
      result.skippedActive.push(session.sid);
      continue;
    }
    if (session.status === "active") {
      result.skippedOpen.push(session.sid);
      continue;
    }
    if (sessionTimestampMs(projectDir, session.sid, session) > cutoffMs) {
      result.skippedRecent.push(session.sid);
      continue;
    }

    const to = join(
      archiveRoot(projectDir),
      archiveBucket(session),
      session.sid,
    );
    result.archived.push({ sid: session.sid, to });
    if (!result.dryRun) {
      mkdirSync(archiveRoot(projectDir), { recursive: true });
      mkdirSync(join(archiveRoot(projectDir), archiveBucket(session)), {
        recursive: true,
      });
      renameSync(join(sessionsDir(projectDir), session.sid), to);
    }
  }

  if (!result.dryRun && result.archived.length > 0) {
    const archived = new Set(result.archived.map((entry) => entry.sid));
    for (const [category, sid] of Object.entries(view.index.active)) {
      if (archived.has(sid)) delete view.index.active[category];
    }
    atomicWriteJson(indexPath(projectDir), view.index);
  }

  return result;
}
