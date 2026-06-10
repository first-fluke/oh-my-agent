import type { makeVideoRunId } from "../naming.js";
import type { VideoManifest } from "../types.js";
import type { NormalizedGenerateOptions } from "./options.js";

export interface RunContext {
  runId: ReturnType<typeof makeVideoRunId>;
  runDir: string;
  normalized: NormalizedGenerateOptions;
  warnings: string[];
  providers: VideoManifest["providers"];
  assets: VideoManifest["assets"];
  costBreakdown: Record<string, number>;
  outputs: VideoManifest["outputs"];
  /** Run-dir-relative path of a live web capture, when one was recorded. */
  capturedFootage?: string;
  /** True when this run included nondeterministic live capture. */
  nondeterministic?: boolean;
}
