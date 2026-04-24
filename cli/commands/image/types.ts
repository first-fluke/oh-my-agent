export type Size = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
export type Quality = "low" | "medium" | "high" | "auto";

export interface GenerateInput {
  prompt: string;
  size: Size;
  quality: Quality;
  n: number;
  model?: string;
  outDir: string;
  signal: AbortSignal;
  timeoutSec?: number;
  referenceImages?: ReferenceImage[];
  runShortid?: string;
}

export interface ReferenceImage {
  path: string;
  mime: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
}

export interface StrategyAttempt {
  strategy: string;
  status: "ok" | "skipped" | "failed";
  reason?: string;
  duration_ms?: number;
}

export interface GenerateResult {
  vendor: string;
  model: string;
  strategy: string;
  strategyAttempts: StrategyAttempt[];
  filePath: string;
  mime: "image/png";
  durationMs: number;
  costUsd?: number;
}

export type HealthResult =
  | {
      ok: true;
      supportedModels: string[];
      estimatedCostPerImage?: Partial<Record<Quality, number>>;
      detail?: string;
    }
  | {
      ok: false;
      reason: "not-installed" | "not-authenticated" | "other";
      hint: string;
      setup?: {
        url?: string;
        envVar?: string;
        steps?: string[];
      };
    };

export interface VendorProvider {
  name: string;
  health(): Promise<HealthResult>;
  generate(input: GenerateInput): Promise<GenerateResult[]>;
}

export type VendorError =
  | { kind: "not-installed"; hint: string }
  | { kind: "auth-required"; hint: string }
  | { kind: "invalid-input"; field: string; reason: string }
  | { kind: "safety-refused"; message: string }
  | { kind: "rate-limit"; retry_after_sec?: number }
  | { kind: "timeout"; after_ms: number }
  | { kind: "network"; retryable: boolean; cause: unknown }
  | { kind: "other"; cause?: unknown };

export interface ManifestRun {
  vendor: string;
  model: string;
  strategy: string;
  strategy_attempts: StrategyAttempt[];
  files: string[];
  duration_ms: number;
  cost_usd?: number;
  status: "ok" | "failed" | "timeout" | "auth-required" | "safety-refused";
  error?: { kind: VendorError["kind"]; message: string };
}

export interface Manifest {
  schema_version: 1;
  timestamp: string;
  prompt?: string;
  prompt_sha256?: string;
  options: { size: string; quality: string; count: number };
  cost_estimate_usd: number;
  runs: ManifestRun[];
  reference_images?: string[];
}

export function exitForError(kind: VendorError["kind"] | undefined): number {
  switch (kind) {
    case "safety-refused":
      return 2;
    case "invalid-input":
      return 4;
    case "auth-required":
    case "not-installed":
      return 5;
    case "timeout":
      return 6;
    default:
      return 1;
  }
}
