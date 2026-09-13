import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { sha256Hex } from "../../utils/hash.js";
import { evaluateChecks } from "./checks.js";
import {
  captureHarnessSnapshot,
  type HarnessWorkspaceSnapshot,
  harnessTaskInputHash,
  materializeHarnessSnapshot,
  validateHarnessSnapshot,
} from "./evidence.js";
import { resolveInside } from "./paths.js";
import { type HarnessRecord, inspectHarnessRecord } from "./records.js";
import { scoreHarnessRuns } from "./scoring.js";
import { FIXTURE_HARNESS_CONTROLS, selectHarnessTasks } from "./suite.js";
import type {
  HarnessArmEvidence,
  HarnessArmRun,
  HarnessPartition,
  HarnessSuite,
  HarnessTask,
} from "./types.js";

const fixtureStepSchema = z
  .object({
    tool: z.string().min(1),
    request: z.unknown(),
    response: z.unknown(),
    writes: z
      .array(
        z
          .object({
            path: z.string(),
            content: z.string().max(5 * 1024 * 1024),
          })
          .strict(),
      )
      .max(2000)
      .optional(),
    removes: z.array(z.string()).max(2000).optional(),
  })
  .strict();
export const harnessFixtureTranscriptSchema = z
  .object({
    schemaVersion: z.literal(1),
    taskId: z.string().min(1),
    steps: z.array(fixtureStepSchema).max(2000),
    requests: z
      .array(z.object({ tool: z.string(), request: z.unknown() }).strict())
      .max(2000),
    output: z.string().optional(),
    dependencies: z
      .array(
        z
          .object({
            name: z.string(),
            repeatability: z.enum(["fixture", "live", "unavailable"]),
            reason: z.string().optional(),
            fixture: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export type HarnessFixtureTranscript = z.infer<
  typeof harnessFixtureTranscriptSchema
>;
export interface HarnessReplayResult {
  runs: HarnessArmRun[];
  evidenceStatus: "complete" | "insufficient";
  limitations: string[];
  sourceRecordHash?: string;
}
export interface HarnessRescoreOptions {
  suite: HarnessSuite;
  partition?: HarnessPartition;
}

function sourceRecord(value: HarnessRecord | string): HarnessRecord {
  return typeof value === "string" ? inspectHarnessRecord(value) : value;
}
export function assertHarnessRecordSuite(
  record: HarnessRecord,
  suiteId: string,
): void {
  if (!record.suiteId || record.suiteId !== suiteId)
    throw new Error(
      "Raw evidence cannot be reused: recorded suite identity is missing or does not match",
    );
}

function insufficient(
  task: HarnessTask,
  arm: HarnessArmRun["arm"],
  reason: string,
): HarnessArmRun {
  return {
    taskId: task.id,
    arm,
    incident: task.incident,
    output: "",
    passed: false,
    durationMs: 0,
    checks: [],
    dispatchError: `Insufficient replay evidence: ${reason}`,
  };
}
function rawRun(
  record: HarnessRecord,
  task: HarnessTask,
  arm: HarnessArmRun["arm"],
): { output: string; dispatchError?: string; evidence: HarnessArmEvidence } {
  if (record.schemaVersion !== 2)
    throw new Error(
      "Legacy recordings support inspection only; fresh raw evidence is required",
    );
  if (
    record.executionMode &&
    record.executionMode !== "live" &&
    record.executionMode !== "rerun"
  )
    throw new Error(
      "A non-execution report cannot replace the original live evidence record",
    );
  const matches = record.runs.filter(
    (run) => run.taskId === task.id && run.arm === arm,
  );
  const run = matches[0];
  if (matches.length !== 1 || !run?.evidence)
    throw new Error("Versioned raw output and artifact evidence is missing");
  if (run.evidence.taskPromptHash !== harnessTaskInputHash(task))
    throw new Error("Task prompt or incident identity changed");
  if (sha256Hex(run.output) !== run.evidence.outputHash)
    throw new Error("Raw output hash mismatch");
  return {
    output: run.output,
    dispatchError: run.dispatchError,
    evidence: run.evidence,
  };
}
function replayResult(
  record: HarnessRecord,
  runs: HarnessArmRun[],
  limitations: string[],
): HarnessReplayResult {
  const errors = runs.flatMap((run) =>
    run.dispatchError ? [`${run.taskId}/${run.arm}: ${run.dispatchError}`] : [],
  );
  return {
    runs,
    evidenceStatus: errors.length ? "insufficient" : "complete",
    limitations: [...limitations, ...errors],
    sourceRecordHash: record.recordHash,
  };
}

function checkTargetsExcludedPath(
  task: HarnessTask,
  workspace: string,
  excluded: string[],
): boolean {
  return task.checks.some((check) => {
    if (!("path" in check)) return false;
    const path = relative(
      workspace,
      resolveInside(workspace, check.path, "Current check"),
    )
      .split(sep)
      .join("/");
    return excluded.some(
      (control) => path === control || path.startsWith(`${control}/`),
    );
  });
}

/** Applies current checks to original bytes. Prior passed/check verdicts are never read. */
export function rescoreHarnessRecord(
  value: HarnessRecord | string,
  options: HarnessRescoreOptions,
): HarnessReplayResult {
  const record = sourceRecord(value);
  assertHarnessRecordSuite(record, options.suite.id);
  const tasks = selectHarnessTasks(options.suite, options.partition);
  const runs = tasks.flatMap((task) =>
    (["baseline", "candidate"] as const).map((arm) => {
      const workspace = mkdtempSync(join(tmpdir(), "oma-harness-rescore-"));
      try {
        const original = rawRun(record, task, arm);
        if (original.dispatchError)
          throw new Error(
            "Original dispatch failed; partial output is diagnostic only",
          );
        if (task.checks.some((check) => check.type === "command"))
          throw new Error(
            "Command checks require a live rerun; the external runtime and environment were not pinned",
          );
        const artifacts = validateHarnessSnapshot(original.evidence.artifacts);
        if (checkTargetsExcludedPath(task, workspace, artifacts.excludedPaths))
          throw new Error(
            "Current check targets an artifact path excluded from the recording",
          );
        if (task.checks.some((check) => check.type.startsWith("file_"))) {
          materializeHarnessSnapshot(artifacts, workspace);
        }
        const checks = evaluateChecks(workspace, original.output, task.checks);
        return {
          taskId: task.id,
          arm,
          incident: task.incident,
          output: original.output,
          durationMs: 0,
          checks,
          passed: checks.every((check) => check.passed),
          evidence: original.evidence,
        };
      } catch (error) {
        return insufficient(
          task,
          arm,
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    }),
  );
  return replayResult(record, runs, [
    "Current output/file checks were applied to recorded bytes; no agent or external service was re-executed",
  ]);
}

/** Require matched pre-run snapshots for both arms before any actual agent call. */
export function initialSnapshotsFromHarnessRecord(
  value: HarnessRecord | string,
  tasks: HarnessTask[],
  suiteId: string,
): Map<string, HarnessWorkspaceSnapshot> {
  const record = sourceRecord(value);
  assertHarnessRecordSuite(record, suiteId);
  return new Map(
    tasks.map((task) => {
      const baseline = validateHarnessSnapshot(
        rawRun(record, task, "baseline").evidence.initialWorkspace,
      );
      const candidate = validateHarnessSnapshot(
        rawRun(record, task, "candidate").evidence.initialWorkspace,
      );
      if (
        !baseline.complete ||
        !candidate.complete ||
        baseline.digest !== candidate.digest
      )
        throw new Error(
          `Pinned initial workspace is missing, incomplete, or mismatched for ${task.id}`,
        );
      return [task.id, baseline];
    }),
  );
}

export function loadHarnessFixtureTranscripts(
  path: string,
): HarnessFixtureTranscript[] {
  if (statSync(path).size > 48 * 1024 * 1024)
    throw new Error("Fixture transcript exceeds its evidence budget");
  const value: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = Array.isArray(value)
    ? value.map((item) => harnessFixtureTranscriptSchema.parse(item))
    : [harnessFixtureTranscriptSchema.parse(value)];
  if (new Set(parsed.map((item) => item.taskId)).size !== parsed.length)
    throw new Error("Duplicate fixture transcript task");
  return parsed;
}

/** Consumes exact fixture requests and applies data-only filesystem deltas. Tool names never execute commands. */
export function replayHarnessFixtureTranscript(
  snapshot: HarnessWorkspaceSnapshot,
  value: HarnessFixtureTranscript,
  workspace: string,
): unknown[] {
  const transcript = harnessFixtureTranscriptSchema.parse(value);
  if (
    transcript.requests.length !== transcript.steps.length ||
    transcript.requests.some((request, index) => {
      const step = transcript.steps[index];
      return (
        !step ||
        request.tool !== step.tool ||
        !isDeepStrictEqual(request.request, step.request)
      );
    })
  )
    throw new Error(
      "Fixture tool request sequence does not match the recorded responses",
    );
  for (const dependency of transcript.dependencies ?? []) {
    if (dependency.repeatability !== "fixture")
      throw new Error(
        `Unrepeatable dependency ${dependency.name}: ${dependency.reason ?? dependency.repeatability}`,
      );
    if (!transcript.steps.some((step) => step.tool === dependency.name))
      throw new Error(
        `Fixture response missing for dependency ${dependency.name}`,
      );
  }
  const checkedPath = (path: string): string => {
    if (
      !path ||
      path.includes("\\") ||
      path.split("/").some((part) => !part || part === "." || part === "..") ||
      FIXTURE_HARNESS_CONTROLS.some(
        (control) => path === control || path.startsWith(`${control}/`),
      )
    )
      throw new Error("Fixture replay cannot change harness controls");
    return resolveInside(workspace, path, "Fixture delta");
  };
  let totalBytes = 0;
  let totalWrites = 0;
  for (const step of transcript.steps)
    for (const item of step.writes ?? []) {
      totalBytes += Buffer.byteLength(item.content);
      totalWrites++;
      if (totalBytes > 32 * 1024 * 1024 || totalWrites > 2000)
        throw new Error("Fixture deltas exceed the artifact budget");
    }
  // Validate every delta before mutating the runner-owned workspace.
  for (const step of transcript.steps) {
    for (const item of step.writes ?? []) checkedPath(item.path);
    for (const path of step.removes ?? []) checkedPath(path);
  }
  materializeHarnessSnapshot(snapshot, workspace);
  for (const step of transcript.steps) {
    for (const path of step.removes ?? [])
      rmSync(checkedPath(path), { recursive: true, force: true });
    for (const item of step.writes ?? []) {
      const path = checkedPath(item.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, item.content, "utf-8");
    }
  }
  if (!captureHarnessSnapshot(workspace).complete)
    throw new Error("Fixture replay produced incomplete artifact evidence");
  return transcript.steps.map((step) => step.response);
}

export function fixtureReplayHarnessRecord(
  value: HarnessRecord | string,
  options: HarnessRescoreOptions & { transcripts: HarnessFixtureTranscript[] },
): HarnessReplayResult {
  const record = sourceRecord(value);
  assertHarnessRecordSuite(record, options.suite.id);
  const tasks = selectHarnessTasks(options.suite, options.partition);
  const runs = tasks.flatMap((task) =>
    (["baseline", "candidate"] as const).map((arm) => {
      const workspace = mkdtempSync(join(tmpdir(), "oma-harness-fixture-"));
      try {
        const transcript = options.transcripts.find(
          (item) => item.taskId === task.id,
        );
        if (!transcript) throw new Error("Task tool transcript is missing");
        const snapshots = initialSnapshotsFromHarnessRecord(
          record,
          [task],
          options.suite.id,
        );
        if (task.checks.some((check) => check.type === "command"))
          throw new Error("Command checks require a live rerun");
        if (
          transcript.output === undefined &&
          task.checks.some((check) => check.type.startsWith("output_"))
        )
          throw new Error("Fixture output is missing");
        if (checkTargetsExcludedPath(task, workspace, FIXTURE_HARNESS_CONTROLS))
          throw new Error(
            "Current check targets harness controls absent from task fixtures",
          );
        const snapshot = snapshots.get(task.id);
        if (!snapshot) throw new Error("Pinned initial workspace is missing");
        replayHarnessFixtureTranscript(snapshot, transcript, workspace);
        const output = transcript.output ?? "";
        const checks = evaluateChecks(workspace, output, task.checks);
        return {
          taskId: task.id,
          arm,
          incident: task.incident,
          output,
          durationMs: 0,
          checks,
          passed: checks.every((check) => check.passed),
        };
      } catch (error) {
        return insufficient(
          task,
          arm,
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    }),
  );
  return replayResult(record, runs, [
    "Only recorded tool fixtures and filesystem deltas were replayed; no model, tool command, or agent was executed",
    "The same fixture transcript is applied to both arms; these results cannot establish candidate behavioral improvement",
  ]);
}

export function scoreHarnessReplay(
  tasks: HarnessTask[],
  result: HarnessReplayResult,
) {
  const score = scoreHarnessRuns(
    tasks,
    result.runs.filter((run) => !run.dispatchError),
  );
  if (result.evidenceStatus === "insufficient")
    return {
      ...score,
      coverage: "insufficient" as const,
      decision: "insufficient" as const,
    };
  return score;
}
