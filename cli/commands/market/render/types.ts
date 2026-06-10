/**
 * Public types for `oma market render`.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RenderOptions {
  topic: string;
  intent: "pain" | "trend" | "competitor" | "discovery";
  format?: "md" | "json";
  frameworks?: "auto" | "none" | string;
  vs?: string | null;
  minTrust?: "verified" | "community" | "external";
  selfCheck?: boolean;
  outputDir?: string;
  nowMs?: number;
  version?: string;
  sourcesUsed?: string[];
  sourcesFailed?: string[];
  cacheHit?: boolean;
  latencyMs?: number;
}

export interface RenderResult {
  markdown: string;
  outputPath: string;
  selfCheckPassed: boolean;
  violations: string[];
}
