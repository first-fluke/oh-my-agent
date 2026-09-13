import type { HarnessWorkspaceSnapshot } from "./evidence.js";
import type { HarnessExecutionManifest } from "./execution.js";

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

/** Bounded process diagnostics preserved from a failed or completed arm. */
export interface HarnessArmDiagnostics {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stderr: string;
  stderrStatus: "captured" | "truncated" | "unavailable";
}

/**
 * What the harness could observe for one arm. Missing observation is a
 * recorded state, never an implied normal run. Tool-call observation is not
 * available through vendor CLIs and is reported as unsupported.
 */
export interface HarnessArmTrace {
  schemaVersion: 1;
  causalityKey: string;
  output: "complete" | "partial" | "unavailable";
  stderr: "captured" | "truncated" | "unavailable";
  artifacts: "complete" | "insufficient";
  toolCalls: "unsupported";
  changedPaths: string[];
  changedPathsTruncated: boolean;
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
  diagnostics?: HarnessArmDiagnostics;
  trace?: HarnessArmTrace;
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
  /** Conditions the arms ran under; recorded ones are preserved for replays. */
  manifest?: HarnessExecutionManifest;
  conditions?: "current" | "recorded" | "unavailable";
  traceSession?: string;
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

export type HarnessTraceObserver = (event: {
  kind: "arm.completed";
  run: HarnessArmRun;
}) => void;
