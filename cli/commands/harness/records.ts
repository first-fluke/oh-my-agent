import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import type { HarnessArmRun } from "./types.js";

export interface HarnessRecordIdentity {
  suiteHash: string;
  baselineHash: string;
  candidateHash: string;
}

export interface HarnessRecordInput extends HarnessRecordIdentity {
  runs: HarnessArmRun[];
}

const checkSchema = z.union([
  z.object({
    type: z.enum(["file_exists", "file_not_exists"]),
    path: z.string(),
  }),
  z.object({
    type: z.enum(["file_contains", "file_not_contains"]),
    path: z.string(),
    value: z.string(),
  }),
  z.object({
    type: z.enum(["output_contains", "output_not_contains"]),
    value: z.string(),
  }),
]);

const armRunSchema = z.object({
  taskId: z.string(),
  arm: z.enum(["baseline", "candidate"]),
  passed: z.boolean(),
  durationMs: z.number().nonnegative(),
  output: z.string(),
  checks: z.array(
    z.object({
      check: checkSchema,
      passed: z.boolean(),
      message: z.string(),
    }),
  ),
  dispatchError: z.string().optional(),
});

const recordSchema = z.object({
  schemaVersion: z.literal(1),
  suiteHash: z.string(),
  baselineHash: z.string(),
  candidateHash: z.string(),
  runs: z.array(armRunSchema),
});

export function writeHarnessRecord(
  path: string,
  record: HarnessRecordInput,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify({ schemaVersion: 1, ...record }, null, 2)}\n`,
    "utf-8",
  );
}

export function loadHarnessRecord(
  path: string,
  expected: HarnessRecordIdentity,
): HarnessArmRun[] {
  const parsed = recordSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
  if (
    parsed.suiteHash !== expected.suiteHash ||
    parsed.baselineHash !== expected.baselineHash ||
    parsed.candidateHash !== expected.candidateHash
  ) {
    throw new Error(
      "Harness recording is stale; suite, baseline, or candidate inputs changed",
    );
  }
  const seenArms = new Set<string>();
  for (const run of parsed.runs) {
    const key = `${run.taskId}:${run.arm}`;
    if (seenArms.has(key)) {
      throw new Error(`Harness recording contains duplicate arm: ${key}`);
    }
    seenArms.add(key);
  }
  return parsed.runs as HarnessArmRun[];
}
