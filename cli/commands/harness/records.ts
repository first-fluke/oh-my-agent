import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { sha256Hex } from "../../utils/hash.js";
import { harnessCheckSchema } from "./check-schema.js";
import { harnessSnapshotSchema, validateHarnessSnapshot } from "./evidence.js";
import type {
  HarnessArmRun,
  HarnessEvaluation,
  HarnessPartition,
} from "./types.js";

export interface HarnessRecordIdentity {
  suiteHash: string;
  baselineHash: string;
  candidateHash: string;
  partition?: HarnessPartition | "exploratory";
  evaluatorHash?: string;
}
export interface HarnessRecordInput extends HarnessRecordIdentity {
  runs: HarnessArmRun[];
  suiteId?: string;
  vendor?: string;
  executionMode?: HarnessEvaluation["executionMode"];
  sourceRecordHash?: string;
}
const incidentSchema = z.object({
  id: z.string(),
  manifestHash: z.string(),
  sourceRunId: z.string().optional(),
  sourceTraceId: z.string().optional(),
});
const evidenceSchema = z.object({
  schemaVersion: z.literal(1),
  taskPromptHash: z.string(),
  outputHash: z.string(),
  initialWorkspace: harnessSnapshotSchema,
  artifacts: harnessSnapshotSchema,
  checkerReferences: z.array(
    z.object({
      check: harnessCheckSchema,
      checkerHash: z.string().optional(),
      executableHash: z.string().optional(),
    }),
  ),
});
const armRunSchema = z.object({
  taskId: z.string(),
  arm: z.enum(["baseline", "candidate"]),
  passed: z.boolean(),
  durationMs: z.number().nonnegative(),
  output: z.string(),
  checks: z.array(
    z.object({
      check: harnessCheckSchema,
      passed: z.boolean(),
      message: z.string(),
      exitCode: z.number().int().nullable().optional(),
      timedOut: z.boolean().optional(),
      checkerHash: z.string().optional(),
    }),
  ),
  dispatchError: z.string().optional(),
  incident: incidentSchema.optional(),
  evidence: evidenceSchema.optional(),
});
const recordPayloadSchema = z.object({
  suiteHash: z.string(),
  baselineHash: z.string(),
  candidateHash: z.string(),
  suiteId: z.string().optional(),
  partition: z.enum(["validation", "final-test", "exploratory"]).optional(),
  evaluatorHash: z.string().optional(),
  vendor: z.string().optional(),
  executionMode: z
    .enum(["live", "inspect", "rescore", "fixture-replay", "rerun"])
    .optional(),
  sourceRecordHash: z.string().optional(),
  runs: z.array(armRunSchema),
});
const recordSchema = recordPayloadSchema.extend({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  recordHash: z.string().optional(),
});
export type HarnessRecord = z.infer<typeof recordSchema>;

/** New records are immutable; identical writes are idempotent. */
export function writeHarnessRecord(
  path: string,
  record: HarnessRecordInput,
): void {
  const payload = recordPayloadSchema.parse(record);
  const recordHash = sha256Hex(JSON.stringify(payload));
  const serialized =
    JSON.stringify({ schemaVersion: 2, ...payload, recordHash }, null, 2) +
    "\n";
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    if (readFileSync(path, "utf-8") === serialized) return;
    throw new Error(
      "Harness recording is immutable; choose a new record file for a new run",
    );
  }
  writeFileSync(path, serialized, { encoding: "utf-8", flag: "wx" });
}

export function inspectHarnessRecord(path: string): HarnessRecord {
  const parsed = recordSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
  if (
    parsed.schemaVersion === 2 &&
    parsed.recordHash !==
      sha256Hex(JSON.stringify(recordPayloadSchema.parse(parsed)))
  ) {
    throw new Error("Harness recording integrity hash mismatch");
  }
  const seen = new Set<string>();
  for (const run of parsed.runs) {
    const key = `${run.taskId}:${run.arm}`;
    if (seen.has(key))
      throw new Error(`Harness recording contains duplicate arm: ${key}`);
    seen.add(key);
    if (run.evidence) {
      if (sha256Hex(run.output) !== run.evidence.outputHash)
        throw new Error("Recorded raw output hash mismatch");
      validateHarnessSnapshot(run.evidence.initialWorkspace);
      validateHarnessSnapshot(run.evidence.artifacts);
    }
  }
  return parsed;
}
export const readHarnessRecord = inspectHarnessRecord;

/** Legacy inspection preserves the strict original input-identity contract. */
export function loadHarnessRecord(
  path: string,
  expected: HarnessRecordIdentity,
): HarnessArmRun[] {
  const parsed = inspectHarnessRecord(path);
  if (
    parsed.suiteHash !== expected.suiteHash ||
    parsed.baselineHash !== expected.baselineHash ||
    parsed.candidateHash !== expected.candidateHash ||
    parsed.partition !== expected.partition ||
    parsed.evaluatorHash !== expected.evaluatorHash
  ) {
    throw new Error(
      "Harness recording is stale; suite, partition, evaluator, baseline, or candidate inputs changed",
    );
  }
  return parsed.runs as HarnessArmRun[];
}
