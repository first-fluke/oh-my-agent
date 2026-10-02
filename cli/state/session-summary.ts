import {
  exportSessionSummary as exportHookSessionSummary,
  type SessionSummaryExportResult,
  type SessionSummaryWriter,
} from "../../.agents/hooks/core/session-summary.ts";
import { resolveProjectRoot } from "../utils/fs-utils.js";

export {
  buildSessionSummary,
  getSessionSummaryPath,
  renderSessionSummaryResult,
  type SessionSummaryExportMethod,
  type SessionSummaryExportResult,
  type SessionSummaryWriter,
  sessionSummaryName,
} from "../../.agents/hooks/core/session-summary.ts";

export async function exportSessionSummary(args: {
  sid: string;
  projectDir?: string;
  writer?: SessionSummaryWriter;
}): Promise<SessionSummaryExportResult> {
  return exportHookSessionSummary({
    ...args,
    projectDir: args.projectDir ?? resolveProjectRoot(),
  });
}
