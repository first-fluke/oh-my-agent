export const HARNESS_MIN_TASKS = 5;
export const HARNESS_PASS_LIFT = 0.05;

export type HarnessCheck =
  | { type: "file_exists"; path: string }
  | { type: "file_not_exists"; path: string }
  | { type: "file_contains"; path: string; value: string }
  | { type: "file_not_contains"; path: string; value: string }
  | { type: "output_contains"; value: string }
  | { type: "output_not_contains"; value: string };

export interface HarnessTask {
  id: string;
  prompt: string;
  workspace: string;
  weight: number;
  checks: HarnessCheck[];
}

export interface HarnessSuite {
  schemaVersion: 1;
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
}

export interface HarnessArmRun {
  taskId: string;
  arm: "baseline" | "candidate";
  passed: boolean;
  durationMs: number;
  output: string;
  checks: HarnessCheckResult[];
  dispatchError?: string;
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
}

export interface HarnessDispatchInput {
  agent: string;
  arm: "baseline" | "candidate";
  prompt: string;
  workspace: string;
}

export type HarnessDispatchFn = (input: HarnessDispatchInput) => string;
