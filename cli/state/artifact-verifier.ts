import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AGENTS_RESULTS_DIR } from "../constants/paths.js";
import {
  COORDINATION_STORE_REL,
  LEGACY_SERENA_MEMORY_REL,
} from "../io/memory.js";
import {
  listAgentRuns,
  resultEvidenceValid,
  workspaceFingerprint,
} from "./agent-results.js";
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
  "repair the missing or stale evidence within the authorized scope and re-run the gate. " +
  "Ask only if proceeding needs missing information or new authorization. " +
  "Record runs with agent:begin, checks with agent:verify, and results with agent:finish.";

/**
 * Resolve memoryConfig.basePath from .agents/mcp.json. Default is the
 * canonical store `.agents/state/memories`, falling back to an existing
 * legacy `.serena/memories` for projects created before the move.
 */
export function resolveCoordinationBasePath(projectDir: string): string {
  try {
    const parsed = JSON.parse(
      readFileSync(join(projectDir, ".agents", "mcp.json"), "utf-8"),
    ) as { memoryConfig?: { basePath?: string } };
    const basePath = parsed.memoryConfig?.basePath;
    if (typeof basePath === "string" && basePath.length > 0) return basePath;
  } catch {
    // missing or malformed mcp.json falls back to the default base path
  }
  if (existsSync(join(projectDir, COORDINATION_STORE_REL))) {
    return COORDINATION_STORE_REL;
  }
  if (existsSync(join(projectDir, LEGACY_SERENA_MEMORY_REL))) {
    return LEGACY_SERENA_MEMORY_REL;
  }
  return COORDINATION_STORE_REL;
}

/** @deprecated Use resolveCoordinationBasePath. */
export const resolveMemoryBasePath = resolveCoordinationBasePath;

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
const REFINE_SKIP_PATTERN = /^.*REFINE skipped:\s*(\S.{9,})$/im;

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
  const allRuns = listAgentRuns(projectDir);
  const sessions = [...new Set(allRuns.map((run) => run.sessionId))];
  const sid =
    args.sid ??
    getActiveSid(readIndex(projectDir)) ??
    (sessions.length === 1 ? sessions[0] : null) ??
    null;
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

  const memBase = resolveCoordinationBasePath(projectDir);
  const memDir = join(projectDir, memBase);
  const resultsDir = join(projectDir, AGENTS_RESULTS_DIR);
  const sidPattern = sid ? escapeRegExp(sid) : ".+";

  const checks: [ArtifactCheck, ArtifactCheck, ArtifactCheck, ArtifactCheck] = [
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

  // Presence and timestamps are discovery filters, not proof. Reject empty
  // phase logs and plans; bind reports to validated task/run identities.
  const phase = checks[0];
  phase.matches = phase.matches.filter((name) => {
    try {
      return /PLAN[^\n]*(?:done|complete|passed)/i.test(
        readFileSync(join(memDir, name), "utf8"),
      );
    } catch {
      return false;
    }
  });
  const plan = checks[1];
  const taskIds = new Set<string>();
  plan.matches = plan.matches.filter((name) => {
    try {
      const data = JSON.parse(readFileSync(join(resultsDir, name), "utf8")) as {
        tasks?: Array<{
          id?: string;
          description?: string;
          title?: string;
          scope?: string[];
        }>;
      };
      if (!Array.isArray(data.tasks) || data.tasks.length === 0) return false;
      const ids = data.tasks.map((task) => task.id);
      if (
        new Set(ids).size !== ids.length ||
        !data.tasks.every(
          (task) =>
            typeof task.id === "string" &&
            task.id.trim() &&
            (task.description?.trim() ||
              task.title?.trim() ||
              (Array.isArray(task.scope) && task.scope.length > 0)),
        )
      )
        return false;
      for (const task of data.tasks) {
        if (task.id) taskIds.add(task.id);
      }
      return true;
    } catch {
      return false;
    }
  });
  const latestTasks = new Map(
    allRuns
      .filter((run) => run.sessionId === sid)
      .map((run) => [run.taskId, run]),
  );
  const runs = [...latestTasks.values()].filter(
    (run) =>
      run.after === workspaceFingerprint(projectDir, run.contract?.inputs) &&
      taskIds.has(run.taskId) &&
      (newerThanMs === null || Date.parse(run.startedAt) >= newerThanMs) &&
      resultEvidenceValid(run),
  );
  for (const check of checks.slice(2)) {
    const role =
      check.id === "A3"
        ? /(?:^|-)qa(?:-|$)/
        : /(?:^|-)(?:refactor|debug)(?:-|$)/;
    check.matches = check.matches.filter(
      (name) =>
        readFileSync(join(projectDir, name), "utf8").trim().length > 0 &&
        runs.some(
          (run) =>
            role.test(run.agentId) &&
            run.artifacts[name] &&
            phase.matches.some((file) => run.artifacts[`${memBase}/${file}`]) &&
            plan.matches.some(
              (file) => run.artifacts[`${AGENTS_RESULTS_DIR}/${file}`],
            ),
        ),
    );
  }

  for (const check of checks) {
    if (check.matches.length > 0) check.status = "present";
  }

  // REFINE skip exception: A4 may be legitimately absent when
  // session-ultrawork.md records the documented skip reason (ralph.md Step 1.3).
  const a4 = checks.find((check) => check.id === "A4");
  if (a4 && a4.status === "missing") {
    const skipRecord = readRefineSkipRecord(memDir);
    if (
      skipRecord !== null &&
      phase.status === "present" &&
      checks[2].status === "present"
    ) {
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
