export const MATRIX_VENDORS = ["claude", "codex"] as const;
export type MatrixVendor = (typeof MATRIX_VENDORS)[number];
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface MatrixCase {
  id: string;
  skill: string;
  prompt: string;
  /** Paths relative to the installed skill directory. */
  files: Record<string, string>;
  references?: string[];
  missing?: string[];
  expected: Record<string, JsonValue>;
  /** The placeholder is replaced with a new evaluator-generated nonce. */
  canary?: { file: string; field: string };
}

export interface MatrixSuite {
  schemaVersion: 1;
  cases: MatrixCase[];
}

export interface PreparedMatrixCase {
  testCase: MatrixCase;
  workspace: string;
  skillRoot: string;
  contentHash: string;
  canary?: { file: string; field: string; value: string };
}

export interface MatrixRead {
  /** Absolute resolved file path; unsupported/ambiguous reads are omitted. */
  path: string;
  success: boolean;
  missing: boolean;
  content: string;
}

/** Raw output is used only in memory, never included in a saved matrix report. */
export interface MatrixRun {
  exitCode: number | null;
  complete: boolean;
  nativeSuccess: boolean;
  output: string;
  reads: MatrixRead[];
  activations: string[];
  cliVersion: string | null;
  model: string | null;
  durationMs: number;
  costUsd?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
  };
  error?: string;
}

export interface MatrixInvocation {
  vendor: MatrixVendor;
  workspace: string;
  prompt: string;
  timeoutMs: number;
  model?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}

export interface MatrixCheck {
  id: string;
  status: "pass" | "fail" | "unverifiable";
  detail: string;
  proof?: "canary" | "read";
}

export interface MatrixCell {
  caseId: string;
  skill: string;
  vendor: MatrixVendor;
  status: "pass" | "fail" | "unverifiable" | "error";
  contentHash: string;
  checks: MatrixCheck[];
  nativeActivation: "observed" | "unobserved";
  cliVersion: string | null;
  model: string | null;
  durationMs: number;
  costUsd?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
  };
}
