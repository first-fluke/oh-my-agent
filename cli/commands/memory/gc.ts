import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  COORDINATION_STORE_REL,
  LEGACY_SERENA_MEMORY_REL,
} from "../../io/memory.js";
import { listSessionIds } from "../../state/events.js";
import {
  activeSessionIds,
  DEFAULT_KEEP_SESSIONS,
  gcOrphanSessions,
  gcProjectSessions,
  loadMemoryGcConfig,
} from "../../state/session-gc.js";
import type {
  MemoryGcOptions,
  MemoryGcResult,
  MemoryGcScope,
} from "../../types/memory.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

// Session GC lives in state/ so `oma update` can run it without importing this
// command slice; the config loader is re-exported for existing callers.
export { loadMemoryGcConfig };

// Memory-store dirs swept for ephemeral artifacts: the canonical oma store
// plus the legacy Serena dir (pre-move projects and leftover legacy files).
const MEMORY_STORE_RELS = [COORDINATION_STORE_REL, LEGACY_SERENA_MEMORY_REL];

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
  const keep = parseNonNegativeInteger(
    opts.keep ?? cfg.keep,
    DEFAULT_KEEP_SESSIONS,
  );
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
      : gcProjectSessions(baseDir, keep, dryRun);
  // Sessions of projects that no longer exist are never reached by the
  // per-project sweep above; collect them with the session scope.
  const orphans =
    scope === "serena" ? { pruned: [] } : gcOrphanSessions({ dryRun, nowMs });
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

  const total =
    sessions.pruned.length + orphans.pruned.length + coordination.pruned.length;
  const verb = dryRun ? "would prune" : "pruned";
  const orphanPart =
    orphans.pruned.length > 0
      ? `, ${orphans.pruned.length} orphaned session(s) of removed projects`
      : "";
  const message =
    total === 0
      ? "Nothing to prune"
      : `${verb} ${sessions.pruned.length} session(s)${orphanPart} and ${coordination.pruned.length} coordination file(s)`;

  return {
    baseDir,
    scope,
    keep,
    maxAgeDays,
    dryRun,
    prunedSessions: sessions.pruned,
    keptSessions: sessions.kept,
    prunedOrphanSessions: orphans.pruned,
    // Public result keys remain for CLI/API compatibility.
    prunedSerena: coordination.pruned,
    keptSerena: coordination.kept,
    message,
  };
}
