import type { Command } from "commander";
import {
  emitEventWithMemory,
  getActiveSid,
  readIndex,
} from "../../state/events.js";
import {
  exportSessionSummary,
  type SessionSummaryExportResult,
} from "../../state/session-summary.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

export interface EmitOptions {
  sid?: string;
  category?: string;
  vendor?: string;
  vendorSid?: string;
  parentEventId?: string;
  causalityKey?: string;
  ts?: string;
}

export function parsePayload(
  raw?: string,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("payload must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function resolveEmitSid(
  projectDir: string,
  options: Pick<EmitOptions, "sid" | "category">,
): string {
  if (options.sid) return options.sid;
  const sid = getActiveSid(readIndex(projectDir), options.category ?? "main");
  if (!sid) {
    throw new Error(
      "No active L1 session found. Pass --sid or run a workflow first.",
    );
  }
  return sid;
}

export function registerEmit(program: Command): void {
  addOutputOptions(
    program
      .command("state:emit <kind> [payload]")
      .description("Append an OMA L1 workflow event")
      .option("--sid <sid>", "Target session id")
      .option("--category <category>", "Active category lookup", "main")
      .option("--vendor <vendor>", "Runtime/vendor name")
      .option("--vendor-sid <vendorSid>", "Runtime/vendor session id")
      .option("--parent-event-id <eventId>", "Parent event id")
      .option("--causality-key <key>", "Causality grouping key")
      .option("--ts <iso>", "Override event timestamp")
      .option(
        "--no-mirror",
        "Skip the session summary export on session.ended",
      ),
  ).action(
    runAction(
      async (kind: string, payloadRaw: string | undefined, options) => {
        const jsonMode = resolveJsonMode(options);
        const emitOptions = options as EmitOptions;
        // Normalize cwd to the OMA project root so running `oma state emit`
        // from a monorepo sub-package writes to the repo-level `.agents/`
        // instead of materializing a stray `<sub-package>/.agents/`.
        const projectDir = resolveProjectRoot();
        const sid = resolveEmitSid(projectDir, emitOptions);
        const event = await emitEventWithMemory(projectDir, sid, {
          kind,
          ts: emitOptions.ts,
          vendor: emitOptions.vendor,
          vendorSid: emitOptions.vendorSid,
          parentEventId: emitOptions.parentEventId,
          causalityKey: emitOptions.causalityKey,
          payload: parsePayload(payloadRaw),
        });

        // A terminal session gets a best-effort human-readable summary. The
        // authoritative L1 event write above never depends on this export.
        let summary: SessionSummaryExportResult | undefined;
        if (kind === "session.ended" && options.mirror !== false) {
          summary = await exportSessionSummary({
            projectDir,
            sid,
          });
        }

        if (jsonMode) {
          const mirror = summary
            ? { ...summary, memoryName: summary.summaryName }
            : undefined;
          console.log(JSON.stringify({ event, summary, mirror }, null, 2));
        } else {
          console.log(`Emitted ${event.kind} ${event.eventId} -> ${sid}`);
          if (summary) {
            console.log(
              summary.written
                ? `Exported summary to ${summary.summaryName} (${summary.method})`
                : `Session summary skipped: ${summary.warning ?? "unknown error"}`,
            );
          }
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
