import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getCoordinationStorePath } from "../io/memory.js";
import { resolveProjectRoot } from "../utils/fs-utils.js";
import {
  deriveMeta,
  emitEvent,
  type OmaEvent,
  eventPayloadText as payloadText,
  readEvents,
  type SessionMeta,
} from "./events.js";

/**
 * Export a human-readable view of authoritative L1 events.
 *
 * The summary is an OMA coordination artifact. Production callers write it
 * directly to the project coordination store and never depend on Serena or
 * AgentMemory. An explicitly injected writer is supported for compatibility;
 * failure always falls back to the durable file export.
 */

export interface SessionSummaryWriter {
  write(name: string, content: string): Promise<boolean> | boolean;
}

export type SessionSummaryExportMethod =
  | "external-writer"
  | "direct-fs"
  | "none";

export interface SessionSummaryExportResult {
  sid: string;
  workflow: string;
  summaryName: string;
  path: string;
  method: SessionSummaryExportMethod;
  written: boolean;
  warning?: string;
}

// Keep the historical event kind stable for existing L1 consumers.
const SUMMARY_WARNING_KIND = "mirror.warning";

function sanitizeSegment(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "session";
}

export function sessionSummaryName(workflow: string, sid: string): string {
  return `session-${sanitizeSegment(workflow)}-${sanitizeSegment(sid)}`;
}

export function buildSessionSummary(
  sid: string,
  meta: SessionMeta,
  events: OmaEvent[],
): string {
  const gates = events.filter((event) => event.kind === "gate.passed");
  const decisions = events.filter((event) => event.kind === "decision.made");
  const boundaries = events.filter((event) => event.kind === "boundary");

  const lines: string[] = [
    `# OMA Session Summary: ${meta.workflow || "(unknown)"} ${sid}`,
    "",
    `- workflow: ${meta.workflow || "(unknown)"}`,
    `- status: ${meta.status}`,
    `- phase: ${meta.currentPhase || "(none)"}`,
    `- created: ${meta.createdAt || "(unknown)"}`,
    `- events: ${events.length}`,
    "",
    "## Decisions",
  ];

  if (decisions.length === 0) {
    lines.push("- (none recorded)");
  } else {
    for (const event of decisions) {
      const subject = payloadText(event, "subject", "(unspecified)");
      const decision = payloadText(event, "decision", "(unspecified)");
      const rationale = payloadText(event, "rationale");
      lines.push(
        `- **${subject}** → ${decision}${rationale ? ` _(${rationale})_` : ""}`,
      );
    }
  }

  lines.push("", "## Gates");
  if (gates.length === 0) {
    lines.push("- (none recorded)");
  } else {
    for (const event of gates) {
      const gate = payloadText(event, "gate", "(unnamed)");
      const by = payloadText(event, "by");
      lines.push(`- ${gate}${by ? ` by ${by}` : ""} (${event.ts})`);
    }
  }

  if (boundaries.length > 0) {
    lines.push("", "## Vendor Boundaries");
    for (const event of boundaries) {
      const from = payloadText(event, "fromVendor", "(new)");
      const to = payloadText(event, "toVendor", event.vendor ?? "(unknown)");
      lines.push(`- ${from} → ${to} (${event.ts})`);
    }
  }

  lines.push("", "## Recent Events");
  for (const event of events.slice(-20)) {
    lines.push(`- ${event.ts} \`${event.kind}\``);
  }
  lines.push("");

  return lines.join("\n");
}

export async function exportSessionSummary(args: {
  sid: string;
  projectDir?: string;
  writer?: SessionSummaryWriter;
}): Promise<SessionSummaryExportResult> {
  const projectDir = args.projectDir ?? resolveProjectRoot();
  const events = readEvents(projectDir, args.sid);
  const meta = deriveMeta(args.sid, events);
  const workflow = meta.workflow || "session";
  const summaryName = sessionSummaryName(workflow, args.sid);
  const coordinationDir = getCoordinationStorePath(projectDir);
  const path = join(coordinationDir, `${summaryName}.md`);
  const content = buildSessionSummary(args.sid, meta, events);
  const base = { sid: args.sid, workflow, summaryName, path };

  if (args.writer) {
    try {
      const written = await args.writer.write(summaryName, content);
      if (written) {
        return { ...base, method: "external-writer", written: true };
      }
    } catch {
      // Fall through to the durable coordination-store export.
    }
  }

  try {
    mkdirSync(coordinationDir, { recursive: true });
    writeFileSync(path, content, "utf-8");
    return { ...base, method: "direct-fs", written: true };
  } catch (error) {
    const warning = error instanceof Error ? error.message : String(error);
    emitSummaryWarning(projectDir, args.sid, summaryName, warning);
    return { ...base, method: "none", written: false, warning };
  }
}

function emitSummaryWarning(
  projectDir: string,
  sid: string,
  summaryName: string,
  warning: string,
): void {
  try {
    emitEvent(projectDir, sid, {
      kind: SUMMARY_WARNING_KIND,
      payload: { memoryName: summaryName, summaryName, warning },
    });
  } catch {
    process.stderr.write(
      `[oma] Session summary export failed and warning event could not be written: ${warning}\n`,
    );
  }
}

export function renderSessionSummaryResult(
  result: SessionSummaryExportResult,
): string {
  if (result.written) {
    return `Exported ${result.sid} → ${result.summaryName} (${result.method})\n  ${result.path}`;
  }
  return `Session summary skipped for ${result.sid}: ${result.warning ?? "unknown error"}`;
}
