import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type AgentRun, listAgentRuns } from "../../state/agent-results.js";

/**
 * Deployment feedback entry point.
 *
 * Agent runs that ended failed, blocked, or partial are the raw material for
 * regression cases, but nothing links them to `harness incident capture`
 * unless someone notices. This scan lists such runs that no captured incident
 * references yet, with the fields a specification needs, so the loop from
 * "an agent failed in this project" to "a pinned regression case" starts from
 * a list rather than from memory. It never invents acceptance checks: the
 * expected behavior stays a human decision.
 */

export interface IncidentCandidate {
  runId: string;
  taskId: string;
  agentId: string;
  vendor: string;
  status: AgentRun["status"];
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  unresolved: string[];
  hasPrompt: boolean;
  resumedFrom?: string;
}

export interface IncidentScanResult {
  candidates: IncidentCandidate[];
  alreadyCaptured: number;
  scannedRuns: number;
}

const FAILURE_STATUSES = new Set<AgentRun["status"]>([
  "failed",
  "blocked",
  "partial",
]);

function capturedRunIds(root: string): Set<string> {
  const dir = join(root, ".agents", "results", "incidents");
  const ids = new Set<string>();
  if (!existsSync(dir)) return ids;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name, "incident.json");
    if (!existsSync(path)) continue;
    try {
      const incident = JSON.parse(readFileSync(path, "utf-8")) as {
        source?: { runId?: string };
      };
      if (typeof incident.source?.runId === "string")
        ids.add(incident.source.runId);
    } catch {
      // A damaged manifest is reported by `incident show`, not here.
    }
  }
  return ids;
}

export function scanHarnessIncidents(
  root: string,
  options: { statuses?: Array<AgentRun["status"]>; limit?: number } = {},
): IncidentScanResult {
  const statuses = new Set(options.statuses ?? [...FAILURE_STATUSES]);
  const captured = capturedRunIds(root);
  const runs = listAgentRuns(root);
  let alreadyCaptured = 0;
  const candidates: IncidentCandidate[] = [];
  for (const run of runs) {
    if (!statuses.has(run.status)) continue;
    if (captured.has(run.runId)) {
      alreadyCaptured += 1;
      continue;
    }
    candidates.push({
      runId: run.runId,
      taskId: run.taskId,
      agentId: run.agentId,
      vendor: run.vendor,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      exitCode: run.exitCode,
      unresolved: (run.unresolved ?? []).map((item) =>
        String(item).slice(0, 200),
      ),
      hasPrompt: typeof run.dispatch?.prompt === "string",
      resumedFrom: run.resumedFrom,
    });
  }
  candidates.sort((a, b) =>
    (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt),
  );
  return {
    candidates:
      options.limit && options.limit > 0
        ? candidates.slice(0, options.limit)
        : candidates,
    alreadyCaptured,
    scannedRuns: runs.length,
  };
}

/** A specification skeleton for `incident capture --spec`; checks stay TODO. */
export function incidentSpecSkeleton(
  candidate: IncidentCandidate,
): Record<string, unknown> {
  return {
    schema_version: 1,
    id: `${candidate.taskId}-${candidate.runId.slice(0, 8)}`
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-"),
    summary: `TODO: what the ${candidate.agentId} run for ${candidate.taskId} got wrong`,
    agent: candidate.agentId,
    source: { run_id: candidate.runId },
    observed: {
      failure:
        candidate.unresolved[0] ??
        `Run ended ${candidate.status}${candidate.exitCode === undefined || candidate.exitCode === null ? "" : ` (exit ${candidate.exitCode})`}`,
      exit_code: candidate.exitCode ?? null,
    },
    expected_checks: [
      {
        type: "output_contains",
        value: "TODO: an observable the correct result must show",
      },
    ],
    dependencies: [],
  };
}
