import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import { readAgentRun } from "../../state/agent-results.js";
import { emitEvent } from "../../state/events.js";
import { sha256Hex } from "../../utils/hash.js";
import { redactEvolutionText } from "../skills/opt/evolution-memory.js";
import { harnessCheckSchema } from "./check-schema.js";
import {
  captureHarnessSnapshot,
  materializeHarnessSnapshot,
  validateHarnessSnapshot,
} from "./evidence.js";
import { readRunOutput } from "./incident-scan.js";
import { assertExistingPathInside, isPathInside } from "./paths.js";
import { computeBaselineHash } from "./provenance.js";
import { loadHarnessSuite } from "./suite.js";

const idSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/)
  .refine((id) => !id.includes(".."));
const causeSchema = z.object({
  category: z.enum([
    "model",
    "tool",
    "config",
    "context",
    "application",
    "evaluator",
    "unknown",
  ]),
  hypothesis: z.string().min(1).max(4000),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().min(1).max(2000)).min(1).max(20),
});
const dependencySchema = z.object({
  name: z.string().min(1),
  repeatability: z.enum(["fixture", "live", "unavailable"]),
  reason: z.string().min(1),
  fixture: z.string().optional(),
});
export const incidentSpecSchema = z.object({
  schema_version: z.literal(1),
  id: idSchema,
  summary: z.string().min(1).max(4000),
  prompt: z.string().min(1).max(64000).optional(),
  agent: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .optional(),
  source: z
    .object({
      run_id: z.string().uuid().optional(),
      trace_id: z.string().min(1).optional(),
    })
    .optional(),
  observed: z.object({
    failure: z.string().min(1).max(4000),
    output: z.string().max(64000).optional(),
    exit_code: z.number().int().nullable().optional(),
  }),
  expected_checks: z.array(harnessCheckSchema).min(1),
  cause: causeSchema.optional(),
  initial_workspace: z.string().min(1).optional(),
  evidence_files: z.array(z.string().min(1)).max(20).default([]),
  dependencies: z.array(dependencySchema).max(20).default([]),
});
export type IncidentSpec = z.infer<typeof incidentSpecSchema>;
type EvidenceReference = { path: string; sha256: string; bytes: number };
export interface HarnessIncident {
  schemaVersion: 1;
  id: string;
  capturedAt: string;
  summary: string;
  prompt: string;
  agent: string;
  source: {
    kind: "agent-run" | "report";
    runId?: string;
    sessionId?: string;
    traceId?: string;
    vendor?: string;
    status?: string;
    before?: string;
    record?: EvidenceReference;
  };
  observed: { failure: string; output?: string; exitCode?: number | null };
  expectedChecks: z.infer<typeof harnessCheckSchema>[];
  cause: z.infer<typeof causeSchema>;
  evidence: EvidenceReference[];
  checkerSources: EvidenceReference[];
  dependencies: z.infer<typeof dependencySchema>[];
  initial?: {
    snapshot: ReturnType<typeof captureHarnessSnapshot>;
    provenance: "supplied-snapshot";
    sourcePath: string;
  };
  baselineHash: string;
  limitations: string[];
  manifestHash: string;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function incidentDirectory(root: string, id: string): string {
  idSchema.parse(id);
  const directory = join(resolve(root), ".agents", "results", "incidents", id);
  assertExistingPathInside(root, directory, "Incident destination");
  return directory;
}
function localFile(root: string, path: string): string {
  const absolute = resolve(root, path);
  if (!isPathInside(root, absolute))
    throw new Error("Incident input must stay inside the project");
  assertExistingPathInside(root, absolute, "Incident input");
  if (!lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink())
    throw new Error("Incident evidence must be a regular file");
  return absolute;
}
function reference(root: string, path: string): EvidenceReference {
  const file = localFile(root, path);
  const size = lstatSync(file).size;
  if (size > 5 * 1024 * 1024)
    throw new Error("Incident evidence file exceeds 5 MiB");
  return {
    path: relative(root, file).replaceAll("\\", "/"),
    sha256: sha256Hex(readFileSync(file)),
    bytes: size,
  };
}
function clean(value: string): string {
  return redactEvolutionText(value);
}

/** Capture only supplied observations and an explicitly supplied pre-run snapshot. */
export function captureHarnessIncident(
  root: string,
  specPath: string,
  runId?: string,
): { incident: HarnessIncident; path: string } {
  root = resolve(root);
  const specFile = localFile(root, specPath);
  if (lstatSync(specFile).size > 1024 * 1024)
    throw new Error("Incident spec exceeds 1 MiB");
  const spec = incidentSpecSchema.parse(
    JSON.parse(readFileSync(specFile, "utf8")),
  );
  if (runId && spec.source?.run_id && runId !== spec.source.run_id)
    throw new Error("Incident source run IDs disagree");
  const sourceId = runId ?? spec.source?.run_id;
  const run = sourceId ? readAgentRun(root, sourceId) : undefined;
  const prompt = spec.prompt ?? run?.dispatch?.prompt;
  if (!prompt)
    throw new Error(
      "Incident requires the original prompt; no prompt was captured by the source run",
    );
  // A run that preserved its output supplies the observation the spec omits,
  // so the incident can be validated against what the agent actually said.
  const observedOutput =
    spec.observed.output ?? (run ? readRunOutput(root, run) : undefined);
  const limitations: string[] = [];
  if (run && spec.agent && spec.agent !== run.agentId)
    limitations.push(
      `Agent override changes the historical route from ${run.agentId} to ${spec.agent}`,
    );
  if (
    clean(prompt) !== prompt ||
    (observedOutput && clean(observedOutput) !== observedOutput)
  )
    limitations.push(
      "Sensitive text was redacted; exact original-input replay is unavailable",
    );
  let initial: HarnessIncident["initial"];
  if (spec.initial_workspace) {
    const initialPath = resolve(dirname(specFile), spec.initial_workspace);
    if (!isPathInside(root, initialPath))
      throw new Error("Initial workspace escapes the project");
    assertExistingPathInside(root, initialPath, "Initial workspace");
    initial = {
      snapshot: captureHarnessSnapshot(initialPath, {
        strict: true,
        excludeHarnessControls: false,
      }),
      provenance: "supplied-snapshot",
      sourcePath: relative(root, initialPath),
    };
    if (run)
      limitations.push(
        "Supplied initial snapshot is pinned but its equivalence to the historical run fingerprint is not established",
      );
  } else
    limitations.push(
      "Initial workspace was not captured; full execution replay is unavailable",
    );
  const dependencies = spec.dependencies.map((dependency) => ({
    ...dependency,
    reason: clean(dependency.reason),
    ...(dependency.fixture
      ? {
          fixture: reference(
            root,
            resolve(dirname(specFile), dependency.fixture),
          ).path,
        }
      : {}),
  }));
  for (const dependency of dependencies)
    if (dependency.repeatability !== "fixture" || !dependency.fixture)
      limitations.push(
        `Dependency ${dependency.name} cannot be replayed offline: ${dependency.reason}`,
      );
  const evidence = [
    reference(root, specFile),
    ...spec.evidence_files.map((file) =>
      reference(root, resolve(dirname(specFile), file)),
    ),
    ...dependencies
      .filter((item) => item.fixture)
      .map((item) => reference(root, item.fixture as string)),
  ];
  const payload: Omit<HarnessIncident, "manifestHash"> = {
    schemaVersion: 1,
    id: spec.id,
    capturedAt: new Date().toISOString(),
    summary: clean(spec.summary),
    prompt: clean(prompt),
    agent: spec.agent ?? run?.agentId ?? "backend",
    source: run
      ? {
          kind: "agent-run",
          runId: run.runId,
          sessionId: run.sessionId,
          traceId: spec.source?.trace_id,
          vendor: run.vendor,
          status: run.status,
          before: run.before,
          record: reference(root, `.agents/state/agent-runs/${run.runId}.json`),
        }
      : { kind: "report", traceId: spec.source?.trace_id },
    observed: {
      failure: clean(spec.observed.failure),
      output: observedOutput === undefined ? undefined : clean(observedOutput),
      exitCode:
        spec.observed.exit_code === undefined
          ? run?.exitCode
          : spec.observed.exit_code,
    },
    expectedChecks: spec.expected_checks,
    cause: spec.cause
      ? {
          ...spec.cause,
          hypothesis: clean(spec.cause.hypothesis),
          evidence: spec.cause.evidence.map(clean),
        }
      : {
          category: "unknown",
          hypothesis: "Cause has not been established",
          confidence: 0,
          evidence: ["Only the captured observation is available"],
        },
    evidence,
    checkerSources: spec.expected_checks
      .filter((check) => check.type === "command")
      .map((check) => reference(root, check.checker)),
    dependencies,
    initial,
    baselineHash: computeBaselineHash(root),
    limitations,
  };
  const incident = { ...payload, manifestHash: sha256Hex(canonical(payload)) };
  const directory = incidentDirectory(root, incident.id);
  const path = join(directory, "incident.json");
  if (existsSync(path))
    throw new Error(
      "Incident already exists; use a new ID to preserve the original evidence",
    );
  mkdirSync(directory, { recursive: true });
  writeFileSync(path, `${JSON.stringify(incident, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  emitEvent(root, `oma-incident-${incident.id}`, {
    kind: "harness.incident.captured",
    payload: {
      incidentId: incident.id,
      manifestHash: incident.manifestHash,
      sourceRunId: run?.runId,
      sourceTraceId: incident.source.traceId,
      cause: incident.cause.category,
    },
  });
  return { incident, path };
}

export function readHarnessIncident(root: string, id: string): HarnessIncident {
  const path = localFile(
    root,
    join(incidentDirectory(root, id), "incident.json"),
  );
  if (lstatSync(path).size > 48 * 1024 * 1024)
    throw new Error("Incident manifest exceeds its evidence budget");
  const incident = JSON.parse(readFileSync(path, "utf8")) as HarnessIncident;
  const { manifestHash, ...payload } = incident;
  if (
    incident.schemaVersion !== 1 ||
    incident.id !== id ||
    manifestHash !== sha256Hex(canonical(payload))
  )
    throw new Error("Incident manifest integrity check failed");
  if (incident.initial) validateHarnessSnapshot(incident.initial.snapshot);
  return incident;
}

/** An offline replay must account for the dependencies declared at capture time. */
export function assertIncidentFixtureDependencies(
  root: string,
  incident: HarnessIncident,
): void {
  for (const dependency of incident.dependencies) {
    if (dependency.repeatability !== "fixture" || !dependency.fixture)
      throw new Error(
        `Incident dependency ${dependency.name} cannot be replayed offline: ${dependency.reason}`,
      );
    const pinned = incident.evidence.find(
      (item) => item.path === dependency.fixture,
    );
    if (!pinned || reference(root, dependency.fixture).sha256 !== pinned.sha256)
      throw new Error(
        `Incident dependency fixture changed: ${dependency.name}`,
      );
  }
}

/** An incident is one exploratory regression, never a fabricated final-test partition. */
export function exportHarnessIncident(
  root: string,
  id: string,
): { suitePath: string; incident: HarnessIncident } {
  const incident = readHarnessIncident(root, id);
  if (!incident.initial)
    throw new Error(
      "Cannot export a runnable regression: initial workspace evidence is missing",
    );
  for (const checker of incident.checkerSources)
    if (reference(root, checker.path).sha256 !== checker.sha256)
      throw new Error(
        "Incident checker source changed; create a new incident for the new acceptance contract",
      );
  const directory = incidentDirectory(root, id);
  const fixtureRoot = join(directory, "fixture");
  const suitePath = join(directory, "suite.yaml");
  const checks = incident.expectedChecks.map((check) =>
    check.type === "command"
      ? { ...check, checker: relative(directory, resolve(root, check.checker)) }
      : check,
  );
  const suite = {
    schema_version: 1,
    id: `incident-${id}`,
    agent: incident.agent,
    tasks: [
      {
        id,
        prompt: incident.prompt,
        workspace: "fixture",
        weight: 1,
        checks,
        incident: {
          id,
          manifestHash: incident.manifestHash,
          sourceRunId: incident.source.runId,
          sourceTraceId: incident.source.traceId,
        },
      },
    ],
  };
  if (existsSync(suitePath)) {
    loadHarnessSuite(suitePath, root);
    const exported = parseYaml(
      readFileSync(localFile(root, suitePath), "utf8"),
    );
    if (
      canonical(exported) !== canonical(suite) ||
      captureHarnessSnapshot(fixtureRoot, {
        strict: true,
        excludeHarnessControls: false,
      }).digest !== incident.initial.snapshot.digest
    )
      throw new Error(
        "Exported incident fixture changed; create a new incident instead of reusing it",
      );
    return { suitePath, incident };
  }
  materializeHarnessSnapshot(incident.initial.snapshot, fixtureRoot);
  writeFileSync(suitePath, stringifyYaml(suite), { flag: "wx", mode: 0o600 });
  loadHarnessSuite(suitePath, root);
  emitEvent(root, `oma-incident-${id}`, {
    kind: "harness.incident.exported",
    payload: {
      incidentId: id,
      manifestHash: incident.manifestHash,
      suite: relative(root, suitePath),
    },
  });
  return { suitePath, incident };
}
