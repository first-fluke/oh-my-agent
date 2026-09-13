import type { HarnessWorkspaceSnapshot } from "./evidence.js";

export const HARNESS_MIN_TASKS = 5;
export const HARNESS_PASS_LIFT = 0.05;

export type HarnessPartition = "validation" | "final-test";
export type HarnessJsonValue =
  | null
  | boolean
  | number
  | string
  | HarnessJsonValue[]
  | { [key: string]: HarnessJsonValue };

export type HarnessCheck =
  | { type: "file_exists"; path: string }
  | { type: "file_not_exists"; path: string }
  | { type: "file_contains"; path: string; value: string }
  | { type: "file_not_contains"; path: string; value: string }
  | { type: "output_contains"; value: string }
  | { type: "output_not_contains"; value: string }
  | {
      type: "file_json_equals";
      path: string;
      pointer?: string;
      value: HarnessJsonValue;
    }
  | { type: "output_json_equals"; pointer?: string; value: HarnessJsonValue }
  | {
      type: "command";
      argv: string[];
      checker: string;
      timeout_ms: number;
      expected_exit_code: number;
    };

export interface HarnessTask {
  id: string;
  prompt: string;
  workspace: string;
  weight: number;
  checks: HarnessCheck[];
  partition?: HarnessPartition;
  incident?: {
    id: string;
    manifestHash: string;
    sourceRunId?: string;
    sourceTraceId?: string;
  };
}

export interface HarnessSuite {
  schemaVersion: 1 | 2;
  id: string;
  agent: string;
  tasks: HarnessTask[];
  sourcePath: string;
}

export interface CandidateOverlayManifest {
  root: string;
  files: string[];
  hash: string;
}

export interface HarnessCheckResult {
  check: HarnessCheck;
  passed: boolean;
  message: string;
  exitCode?: number | null;
  timedOut?: boolean;
  checkerHash?: string;
}

export type HarnessReplayAction =
  | "inspect"
  | "rescore"
  | "fixture-replay"
  | "rerun";

export interface HarnessArmEvidence {
  schemaVersion: 1;
  taskPromptHash: string;
  outputHash: string;
  initialWorkspace: HarnessWorkspaceSnapshot;
  artifacts: HarnessWorkspaceSnapshot;
  checkerReferences: Array<{
    check: HarnessCheck;
    checkerHash?: string;
    executableHash?: string;
  }>;
}

export interface HarnessArmRun {
  taskId: string;
  arm: "baseline" | "candidate";
  passed: boolean;
  durationMs: number;
  output: string;
  checks: HarnessCheckResult[];
  dispatchError?: string;
  incident?: HarnessTask["incident"];
  evidence?: HarnessArmEvidence;
}

export interface HarnessScore {
  taskCount: number;
  scoredTaskCount: number;
  baselineScore: number;
  candidateScore: number;
  lift: number;
  correctedTaskIds: string[];
  regressedTaskIds: string[];
  coverage: "ok" | "insufficient";
  decision: "pass" | "warn" | "fail" | "insufficient";
}

export interface HarnessEvaluation {
  suiteId: string;
  suiteHash: string;
  baselineHash: string;
  candidateHash: string;
  vendor: string;
  runs: HarnessArmRun[];
  score: HarnessScore;
  partition: HarnessPartition | "exploratory";
  evaluatorHash: string;
  executionMode?: "live" | HarnessReplayAction;
  evidenceStatus?: "complete" | "insufficient" | "legacy";
  replayLimitations?: string[];
  sourceRecordHash?: string;
  promotionReady: false;
  promotionBlockers: string[];
}

export interface HarnessDispatchInput {
  agent: string;
  arm: "baseline" | "candidate";
  prompt: string;
  workspace: string;
}

export type HarnessDispatchFn = (input: HarnessDispatchInput) => string;
