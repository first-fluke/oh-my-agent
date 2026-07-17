import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AGENTS_RESULTS_DIR } from "../constants/paths.js";
import { CANONICAL_MEMORIES_REL, LEGACY_MEMORIES_REL } from "../io/memory.js";
import { emitEventWithMemory, getActiveSid, readIndex } from "./events.js";

/**
 * Deterministic verifier for ralph's EXEC anti-circumvention gate
 * (ralph.md Step 1.3). Prose instructions can be rationalized away; this
 * module checks the durable artifacts ultrawork's phases leave behind and
 * returns a structured verdict the workflow treats as the gate result.
 */

export interface ArtifactCheck {
  id: string;
  description: string;
  /** Directory-relative filename pattern the check looked for. */
  pattern: string;
  status: "present" | "missing" | "skip-recorded";
  matches: string[];
}

export interface RalphArtifactVerificationResult {
  ok: boolean;
  memBase: string;
  sid: string | null;
  newerThan: string | null;
  checks: ArtifactCheck[];
  missing: ArtifactCheck[];
  remediation: string | null;
  /** True when a gate.failed L1 event was appended for this failure. */
  emitted: boolean;
}

const REMEDIATION =
  "Treat EXEC as NOT performed: record the violation in session memory, then " +
  "STOP and ask the user whether to re-run the iteration with ultrawork in " +
  "full or to explicitly authorize a reduced-scope run (ralph.md Step 1.3).";

/**
 * Resolve memoryConfig.basePath from .agents/mcp.json. Default is the
 * canonical store `.agents/state/memories`, falling back to an existing
 * legacy `.serena/memories` for projects created before the move.
 */
export function resolveMemoryBasePath(projectDir: string): string {
  try {
    const parsed = JSON.parse(
      readFileSync(join(projectDir, ".agents", "mcp.json"), "utf-8"),
    ) as { memoryConfig?: { basePath?: string } };
    const basePath = parsed.memoryConfig?.basePath;
    if (typeof basePath === "string" && basePath.length > 0) return basePath;
  } catch {
    // missing or malformed mcp.json falls back to the default base path
  }
  if (existsSync(join(projectDir, CANONICAL_MEMORIES_REL))) {
    return CANONICAL_MEMORIES_REL;
  }
  if (existsSync(join(projectDir, LEGACY_MEMORIES_REL))) {
    return LEGACY_MEMORIES_REL;
  }
  return CANONICAL_MEMORIES_REL;
}

function listMatches(
  dir: string,
  pattern: RegExp,
  newerThanMs: number | null,
): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => pattern.test(name))
    .filter((name) => {
      if (newerThanMs === null) return true;
      try {
        return statSync(join(dir, name)).mtimeMs >= newerThanMs;
      } catch {
        return false;
      }
    })
    .sort();
}

// Capture the full line so the verdict carries the recorded reason as evidence.
const REFINE_SKIP_PATTERN = /^.*(?:refine.*skip|skip.*refine).*$/im;

function readRefineSkipRecord(memDir: string): string | null {
  try {
    const content = readFileSync(join(memDir, "session-ultrawork.md"), "utf-8");
    const match = content.match(REFINE_SKIP_PATTERN);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Agent result files have two naming/location schemes depending on dispatch
 * path: CLI fallback (`oma agent:spawn qa-agent`) writes
 * `{memBase}/result-qa-agent*.md`, while Claude-native subagents
 * (qa-reviewer / refactor-engineer) write `.agents/results/result-qa*.md`.
 * Scan both so a fully executed native run is not falsely gated.
 */
function listMatchesAcross(
  dirs: Array<{ dir: string; label: string }>,
  pattern: RegExp,
  newerThanMs: number | null,
): string[] {
  return dirs.flatMap(({ dir, label }) =>
    listMatches(dir, pattern, newerThanMs).map((name) => `${label}/${name}`),
  );
}

export async function verifyRalphExecArtifacts(args: {
  projectDir: string;
  sid?: string;
  newerThan?: string;
  emitOnFail?: boolean;
}): Promise<RalphArtifactVerificationResult> {
  const { projectDir } = args;
  const sid = args.sid ?? null;
  const newerThan = args.newerThan ?? null;
  let newerThanMs: number | null = null;
  if (newerThan !== null) {
    newerThanMs = Date.parse(newerThan);
    if (Number.isNaN(newerThanMs)) {
      throw new Error(
        `Invalid --newer-than timestamp: ${newerThan} (expected ISO-8601)`,
      );
    }
  }

  const memBase = resolveMemoryBasePath(projectDir);
  const memDir = join(projectDir, memBase);
  const resultsDir = join(projectDir, AGENTS_RESULTS_DIR);
  const sidPattern = sid ? escapeRegExp(sid) : ".+";

  const checks: ArtifactCheck[] = [
    {
      id: "A1",
      description:
        "session-ultrawork.md with this iteration's phase-completion records (PLAN + gate progression)",
      pattern: `${memBase}/session-ultrawork.md`,
      status: "missing",
      matches: listMatches(memDir, /^session-ultrawork\.md$/, newerThanMs),
    },
    {
      id: "A2",
      description: "PLAN produced a real task breakdown",
      pattern: `${AGENTS_RESULTS_DIR}/plan-${sid ?? "*"}.json`,
      status: "missing",
      matches: listMatches(
        resultsDir,
        new RegExp(`^plan-${sidPattern}\\.json$`),
        newerThanMs,
      ),
    },
    {
      id: "A3",
      description: "a distinct QA agent ran (VERIFY phase)",
      pattern: `${memBase}/result-qa*.md or ${AGENTS_RESULTS_DIR}/result-qa*.md`,
      status: "missing",
      matches: listMatchesAcross(
        [
          { dir: memDir, label: memBase },
          { dir: resultsDir, label: AGENTS_RESULTS_DIR },
        ],
        /^result-qa.*\.md$/,
        newerThanMs,
      ),
    },
    {
      id: "A4",
      description:
        "a distinct Refactor agent ran (REFINE phase), or a documented skip reason is recorded",
      pattern: `${memBase}/result-refactor*.md or ${AGENTS_RESULTS_DIR}/result-refactor*.md`,
      status: "missing",
      matches: listMatchesAcross(
        [
          { dir: memDir, label: memBase },
          { dir: resultsDir, label: AGENTS_RESULTS_DIR },
        ],
        // result-debug* accepted for runs from before REFINE moved to refactor-engineer
        /^result-(?:refactor|debug).*\.md$/,
        newerThanMs,
      ),
    },
  ];

  for (const check of checks) {
    if (check.matches.length > 0) check.status = "present";
  }

  // REFINE skip exception: A4 may be legitimately absent when
  // session-ultrawork.md records the documented skip reason (ralph.md Step 1.3).
  const a4 = checks.find((check) => check.id === "A4");
  if (a4 && a4.status === "missing") {
    const skipRecord = readRefineSkipRecord(memDir);
    if (skipRecord !== null) {
      a4.status = "skip-recorded";
      a4.matches = [skipRecord];
    }
  }

  const missing = checks.filter((check) => check.status === "missing");
  const ok = missing.length === 0;

  let emitted = false;
  if (!ok && args.emitOnFail !== false) {
    const activeSid = getActiveSid(readIndex(projectDir), "main");
    if (activeSid) {
      await emitEventWithMemory(projectDir, activeSid, {
        kind: "gate.failed",
        payload: {
          workflow: "ralph",
          gate: "exec-artifacts",
          missing: missing.map((check) => ({
            id: check.id,
            pattern: check.pattern,
          })),
          remediation: REMEDIATION,
        },
      });
      emitted = true;
    }
  }

  return {
    ok,
    memBase,
    sid,
    newerThan,
    checks,
    missing,
    remediation: ok ? null : REMEDIATION,
    emitted,
  };
}
