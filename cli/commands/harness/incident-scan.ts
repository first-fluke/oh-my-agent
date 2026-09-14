import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  type AgentRun,
  listAgentRuns,
  readAgentRun,
} from "../../state/agent-results.js";
import { unwrapVendorEnvelope } from "../skills/eval/envelope.js";
import type { JudgeDispatchFn } from "../skills/eval.js";
import { judgeVerdict } from "../skills/eval.js";
import { captureHarnessIncident, type HarnessIncident } from "./incident.js";

/** Characters of preserved output quoted into a specification skeleton. */
const SKELETON_OUTPUT_LIMIT = 4_000;

/** The preserved tail of a run's output, when the runner kept one. */
export function readRunOutput(root: string, run: AgentRun): string | undefined {
  if (!run.output) return undefined;
  const path = join(root, run.output.path);
  if (!existsSync(path)) return undefined;
  const raw = readFileSync(path, "utf-8");
  // A vendor that prints a JSON result envelope leaves it as the last line;
  // the observation is the answer inside it, not the bookkeeping around it.
  const lines = raw.split("\n").filter((line) => line.trim());
  const last = lines.at(-1) ?? "";
  if (last.trimStart().startsWith("{")) {
    const unwrapped = unwrapVendorEnvelope(last);
    if (unwrapped !== last) return unwrapped;
  }
  return unwrapVendorEnvelope(raw);
}

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
  hasOutput: boolean;
  /** Tail of the preserved output, for a skeleton's observed.output. */
  output?: string;
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
    const output = readRunOutput(root, run);
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
      hasOutput: output !== undefined,
      ...(output === undefined
        ? {}
        : { output: output.slice(-SKELETON_OUTPUT_LIMIT) }),
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
      ...(candidate.output === undefined ? {} : { output: candidate.output }),
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

// --- Automatic capture from a failed run ---

export type RubricDrafter = (prompt: string) => string | Promise<string>;

/**
 * The acceptance criteria a failed run did not meet. Criteria covered by a
 * failing verification receipt are the precise set; a run that never
 * verified leaves every criterion unmet.
 */
export function unmetCriteria(
  run: AgentRun,
): Array<{ id: string; description: string }> {
  const contract = run.contract;
  if (!contract) return [];
  const failedCheckIds = new Set(
    run.checks
      .filter((receipt) => receipt.exitCode !== 0 && receipt.checkId)
      .map((receipt) => receipt.checkId as string),
  );
  if (failedCheckIds.size === 0) return contract.acceptance_criteria;
  const unmet = new Set(
    contract.required_checks
      .filter((check) => failedCheckIds.has(check.id))
      .flatMap((check) => check.criteria),
  );
  return contract.acceptance_criteria.filter((criterion) =>
    unmet.has(criterion.id),
  );
}

export function draftRunRubricPrompt(
  run: AgentRun,
  output: string,
  criteria: Array<{ id: string; description: string }>,
): string {
  return [
    "You write grading rubrics for regression tests of an agent skill.",
    "An agent run did not meet its acceptance criteria. Write ONE rubric",
    "paragraph a judge can apply to a written answer alone (no files, no",
    "commands). It must start with 'PASS only if' and restate the unmet",
    "criteria as concrete observable statements, then 'FAIL if' naming what",
    "the observed output did instead. Output the rubric only.",
    "",
    `## Task prompt\n${run.dispatch?.prompt ?? ""}`,
    `## Unmet acceptance criteria\n${criteria.map((c) => `- ${c.id}: ${c.description}`).join("\n")}`,
    `## Unresolved items reported by the run\n${run.unresolved.map((u) => `- ${u}`).join("\n") || "- none"}`,
    `## Observed output (failing)\n${output.slice(-4_000)}`,
  ].join("\n\n");
}

/**
 * Capture a failed run as an incident without a hand-written specification.
 * The expected behavior comes from the task contract's acceptance criteria,
 * which were decided before the run; a model rewrites the unmet ones as a
 * judge rubric, and the rubric is admitted only when it fails the run's own
 * observed output.
 */
export async function captureRunAsIncident(options: {
  root: string;
  runId: string;
  drafter: RubricDrafter;
  judge: JudgeDispatchFn;
}): Promise<{ incident: HarnessIncident; specPath: string; rubric: string }> {
  const { root, runId } = options;
  const run = readAgentRun(root, runId);
  if (!FAILURE_STATUSES.has(run.status))
    throw new Error(
      `Run ${runId} ended ${run.status}; only failed, blocked, or partial runs are captured.`,
    );
  const prompt = run.dispatch?.prompt;
  if (!prompt) throw new Error(`Run ${runId} recorded no prompt.`);
  const output = readRunOutput(root, run);
  if (!output)
    throw new Error(
      `Run ${runId} preserved no output to validate a rubric against.`,
    );
  const criteria = unmetCriteria(run);
  if (criteria.length === 0)
    throw new Error(
      `Run ${runId} has no task contract; acceptance criteria are required to derive the expected behavior.`,
    );
  const rubric = String(
    await options.drafter(draftRunRubricPrompt(run, output, criteria)),
  ).trim();
  if (!/^PASS only if/i.test(rubric))
    throw new Error(
      `Drafted rubric for run ${runId} does not start with "PASS only if": ${rubric.slice(0, 120)}`,
    );
  const verdict = await judgeVerdict(prompt, output, rubric, options.judge);
  if (verdict.score !== 0)
    throw new Error(
      `Drafted rubric for run ${runId} passes the run's own failing output; it does not capture the failure.`,
    );
  const id = `run-${run.taskId}-${run.runId.slice(0, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-");
  const specDir = join(root, ".agents", "results", "incidents", "_specs");
  mkdirSync(specDir, { recursive: true });
  const specPath = join(specDir, `${id}.json`);
  const failure =
    run.unresolved[0] ??
    `Run ended ${run.status}; unmet: ${criteria.map((c) => c.id).join(", ")}`;
  writeFileSync(
    specPath,
    `${JSON.stringify(
      {
        schema_version: 1,
        id,
        summary:
          `Unmet acceptance criteria: ${criteria.map((c) => c.description).join("; ")}`.slice(
            0,
            4000,
          ),
        agent: run.agentId,
        source: { run_id: run.runId },
        observed: {
          failure: failure.slice(0, 4000),
          exit_code: run.exitCode ?? null,
        },
        expected_checks: [{ type: "output_judge", rubric }],
        cause: {
          category: "unknown",
          hypothesis: "Derived from the task contract; cause not established",
          confidence: 0,
          evidence: [
            `acceptance criteria ${criteria.map((c) => c.id).join(", ")} unmet`,
          ],
        },
        dependencies: [],
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  const captured = captureHarnessIncident(root, specPath, run.runId);
  return { incident: captured.incident, specPath, rubric };
}
