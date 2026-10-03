import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { MemoryGcConfig } from "../types/memory.js";
import { loadOmaConfig } from "../utils/config.js";
import { findFileUpwards } from "../utils/fs-utils.js";
import { isRecord } from "../utils/type-guards.js";
import {
  isValidSid,
  listSessionIds,
  profileDir,
  profileSlot,
  readIndex,
  sessionDir,
  sessionsDir,
} from "./events.js";

export const DEFAULT_KEEP_SESSIONS = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Orphaned sessions younger than this are kept: a temporary worktree or a
 * project that is only being moved may still come back.
 */
export const ORPHAN_SESSION_MIN_AGE_MS = 7 * DAY_MS;

type RawGcConfig = { keep_sessions?: number; max_age_days?: number };
type RawConfigFile = { memory?: { gc?: RawGcConfig } };

/**
 * Load `memory.gc` defaults from config files. Precedence (first match wins):
 *   1. .agents/oma-config.yaml          — canonical user config
 *   2. .agents/config/defaults.yaml     — OMA-shipped SSOT fallback
 * Same lookup as `loadQuotaCap`. Returns {} when nothing is configured.
 */
export function loadMemoryGcConfig(
  cwd: string = process.cwd(),
): MemoryGcConfig {
  let raw = (loadOmaConfig(cwd) as RawConfigFile | null)?.memory?.gc;
  if (!raw) {
    const fallback = findFileUpwards(
      cwd,
      join(".agents", "config", "defaults.yaml"),
    );
    if (fallback) {
      try {
        raw = (
          parseYaml(readFileSync(fallback, "utf8")) as RawConfigFile | null
        )?.memory?.gc;
      } catch {
        /* optional defaults */
      }
    }
  }
  if (raw) {
    const cfg: MemoryGcConfig = {};
    if (typeof raw.keep_sessions === "number") cfg.keep = raw.keep_sessions;
    if (typeof raw.max_age_days === "number") cfg.maxAgeDays = raw.max_age_days;
    return cfg;
  }

  return {};
}

/** Session ids that must never be pruned (the live session per worktree). */
export function activeSessionIds(projectDir: string): Set<string> {
  return new Set(Object.values(readIndex(projectDir).active));
}

export interface ProjectSessionGcResult {
  /** Absolute paths of pruned session directories. */
  pruned: string[];
  kept: number;
  /** Active sessions plus the keep window — their cost records stay valid. */
  retainedSessionIds: Set<string>;
}

/**
 * Keep the `keep` most-recently-modified sessions of one project (plus every
 * active pointer) and prune the rest.
 */
export function gcProjectSessions(
  baseDir: string,
  keep: number,
  dryRun: boolean,
): ProjectSessionGcResult {
  const active = activeSessionIds(baseDir);
  const retainedSessionIds = new Set(active);
  const entries = listSessionIds(baseDir)
    .map((name) => {
      const path = sessionDir(baseDir, name);
      return { name, path, mtimeMs: statSync(path).mtimeMs };
    })
    // Most-recently-modified first → keep window is LRU.
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const pruned: string[] = [];
  entries.forEach((entry, rank) => {
    if (active.has(entry.name)) return; // never delete the live session
    if (rank < keep) {
      retainedSessionIds.add(entry.name);
      return;
    }
    pruned.push(entry.path);
    if (!dryRun) rmSync(entry.path, { recursive: true, force: true });
  });

  return { pruned, kept: entries.length - pruned.length, retainedSessionIds };
}

interface SessionOwner {
  projectId: string;
  projectDir: string;
  profile: string;
}

function readSessionOwner(dir: string): SessionOwner | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(dir, "context.json"), "utf-8"),
    );
    if (
      isRecord(parsed) &&
      typeof parsed.projectId === "string" &&
      typeof parsed.projectDir === "string" &&
      typeof parsed.profile === "string"
    ) {
      return {
        projectId: parsed.projectId,
        projectDir: parsed.projectDir,
        profile: parsed.profile,
      };
    }
  } catch {
    // Missing or unreadable ownership: leave the session to `oma doctor`.
  }
  return null;
}

/** Last activity: newest mtime of the session dir and its event/meta files. */
function lastActivityMs(dir: string): number {
  let latest = statSync(dir).mtimeMs;
  for (const name of ["events.jsonl", "meta.json"]) {
    try {
      latest = Math.max(latest, statSync(join(dir, name)).mtimeMs);
    } catch {
      // absent — the directory mtime stands in
    }
  }
  return latest;
}

/** Active pointers recorded for a project id in this profile's index. */
function activePointersFor(projectId: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(
        join(profileDir(), "projects", projectId, "_index.json"),
        "utf-8",
      ),
    );
    if (isRecord(parsed) && isRecord(parsed.active)) {
      return new Set(
        Object.values(parsed.active).filter(
          (sid): sid is string => typeof sid === "string",
        ),
      );
    }
  } catch {
    // No index (or unreadable): no active pointers to protect.
  }
  return new Set();
}

export interface OrphanSessionGcOptions {
  dryRun?: boolean;
  /** Injectable clock for deterministic tests. */
  nowMs?: number;
  /** Minimum idle age before an orphan is pruned. */
  minAgeMs?: number;
}

/**
 * Prune profile sessions whose project directory no longer exists.
 *
 * Every other GC path is scoped to one project, so sessions from deleted
 * checkouts, temp directories, and removed worktrees are otherwise never
 * collected. Conservative by construction: only sessions of the current
 * profile, idle longer than `minAgeMs`, with readable ownership, and not an
 * active pointer in their project's index. Legacy in-project sessions are not
 * touched (they disappear with their project).
 */
export function gcOrphanSessions(opts: OrphanSessionGcOptions = {}): {
  pruned: string[];
} {
  const nowMs = opts.nowMs ?? Date.now();
  const minAgeMs = opts.minAgeMs ?? ORPHAN_SESSION_MIN_AGE_MS;
  const root = sessionsDir();
  if (!existsSync(root)) return { pruned: [] };

  const profile = profileSlot();
  const activeByProject = new Map<string, Set<string>>();
  const pruned: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !isValidSid(entry.name)) continue;
    const dir = join(root, entry.name);
    const owner = readSessionOwner(dir);
    if (!owner || owner.profile !== profile) continue;
    if (existsSync(owner.projectDir)) continue;
    // A missing parent can be an unmounted volume or a tree being moved, not a
    // deleted checkout: only a project removed from a parent that still exists
    // counts as orphaned.
    if (!existsSync(dirname(owner.projectDir))) continue;
    if (nowMs - lastActivityMs(dir) < minAgeMs) continue;
    let active = activeByProject.get(owner.projectId);
    if (!active) {
      active = activePointersFor(owner.projectId);
      activeByProject.set(owner.projectId, active);
    }
    if (active.has(entry.name)) continue;
    pruned.push(dir);
    if (!opts.dryRun) rmSync(dir, { recursive: true, force: true });
  }
  return { pruned };
}
