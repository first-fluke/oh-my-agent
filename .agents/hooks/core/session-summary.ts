import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  deriveMeta,
  emitEvent,
  type OmaEvent,
  readEvents,
  type SessionMeta,
} from "./state-core.ts";
import { renderEventPayload, snapshotText } from "./vendor-renderer.ts";

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

export function getSessionSummaryPath(
  projectDir: string,
  workflow: string,
  sid: string,
): string {
  return join(
    projectDir,
    ".agents",
    "state",
    "memories",
    `${sessionSummaryName(workflow, sid)}.md`,
  );
}

function payloadText(
  event: OmaEvent,
  key: string,
  fallback = "",
  limit = 160,
): string {
  return snapshotText(event.payload?.[key], limit) || fallback;
}

export function buildSessionSummary(
  sid: string,
  meta: SessionMeta,
  events: OmaEvent[],
): string {
  const decisions = events
    .filter((event) => event.kind === "decision.made")
    .slice(-8);
  const gates = events
    .filter(
      (event) => event.kind === "gate.passed" || event.kind === "gate.failed",
    )
    .slice(-12);
  const blockers = events
    .filter((event) => event.kind === "blocker.raised")
    .slice(-8);
  const endings = events
    .filter((event) => event.kind === "session.ended")
    .slice(-8);
  const boundaries = events
    .filter((event) => event.kind === "boundary")
    .slice(-8);
  const workflow = snapshotText(meta.workflow) || "(unknown)";
  const lines = [
    `# OMA Session Summary: ${workflow} ${snapshotText(sid)}`,
    "",
    `- workflow: ${workflow}`,
    `- status: ${snapshotText(meta.status)}`,
    `- phase: ${snapshotText(meta.currentPhase) || "(none)"}`,
    `- created: ${snapshotText(meta.createdAt) || "(unknown)"}`,
    `- events: ${events.length}`,
    "",
    "## Decisions",
  ];
  if (!decisions.length) lines.push("- (none recorded)");
  for (const event of decisions) {
    const subject = payloadText(event, "subject", "(unspecified)");
    const decision = payloadText(event, "decision", "(unspecified)", 240);
    const rationale = payloadText(event, "rationale");
    const instanceId = payloadText(event, "instanceId", "", 96);
    lines.push(
      `- **${subject}** → ${decision}${rationale ? ` _(${rationale})_` : ""}${instanceId ? ` [instance: ${instanceId}]` : ""}`,
    );
  }
  lines.push("", "## Gates");
  if (!gates.length) lines.push("- (none recorded)");
  for (const event of gates) {
    const gate = payloadText(event, "gate", "(unnamed)");
    const by = payloadText(event, "by") || payloadText(event, "reviewer");
    const outcome = event.kind === "gate.passed" ? "passed" : "failed";
    const reason = payloadText(event, "reason");
    const summary = payloadText(event, "summary");
    lines.push(
      `- ${gate}${by ? ` by ${by}` : ""}: ${outcome}${reason ? ` (${reason})` : ""}${summary ? ` — ${summary}` : ""} (${snapshotText(event.ts, 32)})`,
    );
  }
  lines.push("", "## Blockers");
  if (!blockers.length) lines.push("- (none recorded)");
  for (const event of blockers) lines.push(`- ${renderEventPayload(event)}`);
  lines.push("", "## Session Endings");
  if (!endings.length) lines.push("- (none recorded)");
  for (const event of endings) lines.push(`- ${renderEventPayload(event)}`);
  if (boundaries.length) {
    lines.push("", "## Vendor Boundaries");
    for (const event of boundaries)
      lines.push(
        `- ${payloadText(event, "fromVendor", "(new)")} → ${payloadText(event, "toVendor", snapshotText(event.vendor) || "(unknown)")} (${snapshotText(event.ts, 32)})`,
      );
  }
  lines.push("", "## Recent Events");
  for (const event of events.slice(-12)) {
    const details = renderEventPayload(event);
    lines.push(
      `- ${snapshotText(event.ts, 32)} \`${snapshotText(event.kind, 72)}\`${details ? ` | ${details}` : ""}`,
    );
  }
  return `${lines.join("\n").slice(0, 24_000)}\n`;
}

export async function exportSessionSummary(args: {
  sid: string;
  projectDir: string;
  writer?: SessionSummaryWriter;
}): Promise<SessionSummaryExportResult> {
  const events = readEvents(args.projectDir, args.sid);
  const meta = deriveMeta(args.sid, events);
  const workflow = meta.workflow || "session";
  const summaryName = sessionSummaryName(workflow, args.sid);
  const path = getSessionSummaryPath(args.projectDir, workflow, args.sid);
  const content = buildSessionSummary(args.sid, meta, events);
  const base = { sid: args.sid, workflow, summaryName, path };
  if (args.writer) {
    try {
      if (await args.writer.write(summaryName, content))
        return { ...base, method: "external-writer", written: true };
    } catch {
      // An optional external writer can fall back to the coordination store.
    }
  }
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf-8");
    return { ...base, method: "direct-fs", written: true };
  } catch (error) {
    const warning = error instanceof Error ? error.message : String(error);
    try {
      emitEvent(args.projectDir, args.sid, {
        kind: "mirror.warning",
        payload: { memoryName: summaryName, summaryName, warning },
      });
    } catch {
      process.stderr.write(
        `[oma] Session summary export failed and warning event could not be written: ${warning}\n`,
      );
    }
    return { ...base, method: "none", written: false, warning };
  }
}

export function renderSessionSummaryResult(
  result: SessionSummaryExportResult,
): string {
  if (result.written)
    return `Exported ${result.sid} → ${result.summaryName} (${result.method})\n  ${result.path}`;
  return `Session summary skipped for ${result.sid}: ${result.warning ?? "unknown error"}`;
}
