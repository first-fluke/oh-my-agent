import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  COORDINATION_STORE_REL,
  LEGACY_SERENA_MEMORY_REL,
} from "../../io/memory.js";
import { listSessionIds, readIndex, sessionDir } from "../../state/events.js";
import type {
  MemoryGcConfig,
  MemoryGcOptions,
  MemoryGcResult,
  MemoryGcScope,
} from "../../types/memory.js";
import { loadOmaConfig } from "../../utils/config.js";
import { findFileUpwards, resolveProjectRoot } from "../../utils/fs-utils.js";

// Memory-store dirs swept for ephemeral artifacts: the canonical oma store
// plus the legacy Serena dir (pre-move projects and leftover legacy files).
const MEMORY_STORE_RELS = [COORDINATION_STORE_REL, LEGACY_SERENA_MEMORY_REL];

const DEFAULT_KEEP = 100;
const DEFAULT_MAX_AGE_DAYS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

// Memory-store files safe to prune. Curated knowledge (decisions/, designs/,
// plans/, code_style.md, project_purpose.md, …) is never matched and so always
// kept — only ephemeral run/cost artifacts are swept.
//   - COST:   cost records for removed sessions — age-independent.
//   - AGED:   workflow run artifacts — pruned only when older than maxAgeDays.
const SESSION_COST_RECORD = /^session-cost-(.+)\.md$/;
const RUN_ARTIFACT_AGED = [
  /^progress-.*\.md$/,
  /^result-.*\.md$/,
  /^orchestrator-session.*\.md$/,
];

function parseNonNegativeInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid count: ${value}`);
  }
  return parsed;
}

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
function activeSessionIds(projectDir: string): Set<string> {
  return new Set(Object.values(readIndex(projectDir).active));
}

function gcSessions(
  baseDir: string,
  keep: number,
  dryRun: boolean,
): { pruned: string[]; kept: number; retainedSessionIds: Set<string> } {
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

function gcCoordinationArtifacts(
  baseDir: string,
  maxAgeMs: number | null,
  nowMs: number,
  dryRun: boolean,
  retainedSessionIds: Set<string>,
): { pruned: string[]; kept: number } {
  const pruned: string[] = [];
  let considered = 0;
  for (const rel of MEMORY_STORE_RELS) {
    const dir = join(baseDir, rel);
    if (!existsSync(dir)) continue;

    for (const e of readdirSync(dir, { withFileTypes: true })) {
      // Directories (decisions/, designs/, plans/, …) are curated — always kept.
      if (!e.isFile()) continue;
      const costSessionId = SESSION_COST_RECORD.exec(e.name)?.[1];
      const aged = RUN_ARTIFACT_AGED.some((re) => re.test(e.name));
      if (costSessionId === undefined && !aged) continue;

      considered += 1;
      if (costSessionId && retainedSessionIds.has(costSessionId)) continue;
      const path = join(dir, e.name);
      // Cost records remain valid for every retained session. Removed-session
      // records are pruned regardless of age; other run artifacts use the age gate.
      if (costSessionId === undefined) {
        if (maxAgeMs === null) continue; // aged pruning disabled — keep
        const ageMs = nowMs - statSync(path).mtimeMs;
        if (ageMs < maxAgeMs) continue; // not old enough — keep
      }
      pruned.push(path);
      if (!dryRun) rmSync(path, { force: true });
    }
  }

  return { pruned, kept: considered - pruned.length };
}

/**
 * Garbage-collect project-local memory stores that accumulate unbounded:
 *   - L1 profile sessions (+ legacy project sessions), scoped to this project.
 *   - Memory store `.agents/state/memories/` (+ legacy `.serena/memories/`)
 *     — prune ephemeral cost/run artifacts only.
 *
 * The live session and all curated knowledge are never touched. Pure aside
 * from filesystem writes; `dryRun` reports the plan without deleting.
 */
export function garbageCollectLocalState(
  opts: MemoryGcOptions = {},
): MemoryGcResult {
  const baseDir = opts.baseDir ?? resolveProjectRoot();
  // Resolution: explicit option (CLI flag) > oma-config.yaml > built-in default.
  const cfg = loadMemoryGcConfig(baseDir);
  const keep = parseNonNegativeInteger(opts.keep ?? cfg.keep, DEFAULT_KEEP);
  const maxAgeDays = parseNonNegativeInteger(
    opts.maxAgeDays ?? cfg.maxAgeDays,
    DEFAULT_MAX_AGE_DAYS,
  );
  const maxAgeMs = maxAgeDays === 0 ? null : maxAgeDays * DAY_MS;
  const nowMs = opts.nowMs ?? Date.now();
  const dryRun = opts.dryRun === true;
  const scope: MemoryGcScope = opts.scope ?? "all";

  const sessions =
    scope === "serena"
      ? {
          pruned: [],
          kept: 0,
          retainedSessionIds: new Set([
            ...activeSessionIds(baseDir),
            ...listSessionIds(baseDir),
          ]),
        }
      : gcSessions(baseDir, keep, dryRun);
  const coordination =
    scope === "sessions"
      ? { pruned: [], kept: 0 }
      : gcCoordinationArtifacts(
          baseDir,
          maxAgeMs,
          nowMs,
          dryRun,
          sessions.retainedSessionIds,
        );

  const total = sessions.pruned.length + coordination.pruned.length;
  const verb = dryRun ? "would prune" : "pruned";
  const message =
    total === 0
      ? "Nothing to prune"
      : `${verb} ${sessions.pruned.length} session(s) and ${coordination.pruned.length} coordination file(s)`;

  return {
    baseDir,
    scope,
    keep,
    maxAgeDays,
    dryRun,
    prunedSessions: sessions.pruned,
    keptSessions: sessions.kept,
    // Public result keys remain for CLI/API compatibility.
    prunedSerena: coordination.pruned,
    keptSerena: coordination.kept,
    message,
  };
}
