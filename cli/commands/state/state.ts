import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import {
  AGENTS_STATE_ARCHIVE_DIR,
  agentsPathFromRoot,
} from "../../constants/paths.js";
import {
  atomicWriteJson,
  deriveMeta,
  indexPath,
  type OmaEvent,
  readEvents,
  readIndex,
  refreshMeta,
  type SessionMeta,
  sessionsDir,
  setActiveSession,
  sortEvents,
} from "../../state/events.js";

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

function sessionTimestampMs(
  projectDir: string,
  sid: string,
  meta: SessionMeta,
): number {
  const parsed = meta.createdAt ? Date.parse(meta.createdAt) : Number.NaN;
  if (!Number.isNaN(parsed)) return parsed;
  return statSync(join(sessionsDir(projectDir), sid)).mtimeMs;
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

function archiveRoot(projectDir: string): string {
  return agentsPathFromRoot(projectDir, AGENTS_STATE_ARCHIVE_DIR);
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

function payloadText(
  event: OmaEvent,
  key: string,
  fallback = "(none)",
): string {
  const value = event.payload?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function renderStateList(view: StateView): string {
  const lines = [pc.bold("OMA state sessions")];
  const active = view.index.active;
  const activeEntries = Object.entries(active);
  if (activeEntries.length > 0) {
    lines.push("");
    lines.push(pc.bold("Active"));
    for (const [category, sid] of activeEntries) {
      lines.push(`  ${category}: ${sid}`);
    }
  }
  lines.push("");
  lines.push(pc.bold("Sessions"));
  if (view.sessions.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }
  for (const session of view.sessions) {
    const workflow = session.workflow || "(unknown)";
    const phase = session.currentPhase
      ? ` ${pc.dim(session.currentPhase)}`
      : "";
    lines.push(`  ${session.sid} ${workflow} ${session.status}${phase}`);
  }
  return lines.join("\n");
}

export function renderArchivedStateList(view: ArchivedStateView): string {
  const lines = [pc.bold("OMA archived state sessions")];
  if (view.sessions.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }
  for (const session of view.sessions) {
    const workflow = session.meta.workflow || "(unknown)";
    const created = session.meta.createdAt ?? "(unknown)";
    lines.push(
      `  ${session.sid} ${workflow} ${session.meta.status} ${pc.dim(session.bucket)} ${pc.dim(created)}`,
    );
  }
  return lines.join("\n");
}

export function renderPurgeResult(result: PurgeResult): string {
  const lines = [
    pc.bold(result.dryRun ? "OMA state purge preview" : "OMA state purge"),
    `cutoff: ${result.cutoff}`,
    `purged: ${result.purged.length}`,
  ];
  for (const sid of result.purged) lines.push(`  ${sid}`);
  if (result.skippedActive.length > 0) {
    lines.push(`skipped active: ${result.skippedActive.length}`);
    for (const sid of result.skippedActive) lines.push(`  ${sid}`);
  }
  return lines.join("\n");
}

export function renderArchiveResult(result: ArchiveResult): string {
  const lines = [
    pc.bold(result.dryRun ? "OMA state archive preview" : "OMA state archive"),
    `cutoff: ${result.cutoff}`,
    `archived: ${result.archived.length}`,
  ];
  for (const entry of result.archived)
    lines.push(`  ${entry.sid} -> ${entry.to}`);
  if (result.skippedActive.length > 0) {
    lines.push(`skipped active: ${result.skippedActive.length}`);
    for (const sid of result.skippedActive) lines.push(`  ${sid}`);
  }
  if (result.skippedOpen.length > 0) {
    lines.push(`skipped open: ${result.skippedOpen.length}`);
    for (const sid of result.skippedOpen) lines.push(`  ${sid}`);
  }
  return lines.join("\n");
}

export function renderSessionView(
  sid: string,
  meta: SessionMeta,
  events: ReturnType<typeof readEvents>,
  options: { archived?: boolean; archivePath?: string } = {},
): string {
  const lines = [
    pc.bold(`OMA session ${sid}`),
    `workflow: ${meta.workflow || "(unknown)"}`,
    `status: ${meta.status}`,
    `phase: ${meta.currentPhase || "(none)"}`,
    `archived: ${options.archived === true ? "yes" : "no"}`,
    `events: ${events.length}`,
  ];
  if (options.archivePath) lines.push(`archivePath: ${options.archivePath}`);
  const gates = events.filter((event) => event.kind.startsWith("gate."));
  const decisions = events.filter((event) => event.kind === "decision.made");
  const missing = events.filter((event) => event.kind === "decision.missing");

  if (gates.length > 0) {
    lines.push("", pc.bold("Gates"));
    for (const event of gates) {
      lines.push(`  ${event.kind} ${payloadText(event, "gate")} ${event.ts}`);
    }
  }
  if (decisions.length > 0) {
    lines.push("", pc.bold("Decisions"));
    for (const event of decisions) {
      lines.push(
        `  ${payloadText(event, "subject")} -> ${payloadText(event, "decision")} ${event.ts}`,
      );
    }
  }
  if (missing.length > 0) {
    lines.push("", pc.bold("Missing Decisions"));
    for (const event of missing) {
      lines.push(
        `  ${payloadText(event, "workflow")}/${payloadText(event, "checkpoint")} ${event.ts}`,
      );
    }
  }

  lines.push("", pc.bold("Events"));
  for (const event of events) {
    lines.push(`  ${event.ts} ${event.kind} ${event.eventId}`);
  }
  return lines.join("\n");
}
