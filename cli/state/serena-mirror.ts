/**
 * Deprecated Serena-specific compatibility facade.
 *
 * OMA session summaries are coordination artifacts and are exported by
 * session-summary.ts. Serena remains a code-intelligence service; callers that
 * still inject its historical memory writer continue to work through this
 * facade during the compatibility window.
 */

import {
  buildSessionSummary,
  exportSessionSummary,
  type SessionSummaryExportResult,
  sessionSummaryName,
} from "./session-summary.js";

export interface SerenaMirrorWriter {
  write(name: string, content: string): Promise<boolean> | boolean;
}

export type SerenaMirrorMethod = "serena-mcp" | "direct-fs" | "none";

export interface SerenaMirrorResult {
  sid: string;
  workflow: string;
  memoryName: string;
  path: string;
  method: SerenaMirrorMethod;
  written: boolean;
  warning?: string;
}

/** @deprecated Use sessionSummaryName. */
export const mirrorMemoryName = sessionSummaryName;
/** @deprecated Use buildSessionSummary. */
export const buildSessionMirror = buildSessionSummary;

function toLegacyResult(
  result: SessionSummaryExportResult,
): SerenaMirrorResult {
  return {
    sid: result.sid,
    workflow: result.workflow,
    memoryName: result.summaryName,
    path: result.path,
    method: result.method === "external-writer" ? "serena-mcp" : result.method,
    written: result.written,
    warning: result.warning,
  };
}

/** @deprecated Use exportSessionSummary. */
export async function mirrorSessionToSerena(args: {
  sid: string;
  projectDir?: string;
  writer?: SerenaMirrorWriter;
}): Promise<SerenaMirrorResult> {
  return toLegacyResult(await exportSessionSummary(args));
}

/** @deprecated Use renderSessionSummaryResult. */
export function renderSerenaMirrorResult(result: SerenaMirrorResult): string {
  if (result.written) {
    return `Mirrored ${result.sid} → ${result.memoryName} (${result.method})\n  ${result.path}`;
  }
  return `Serena mirror skipped for ${result.sid}: ${result.warning ?? "unknown error"}`;
}
