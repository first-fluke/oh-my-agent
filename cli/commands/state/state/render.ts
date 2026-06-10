import pc from "picocolors";
import {
  eventPayloadText,
  type OmaEvent,
  type readEvents,
  type SessionMeta,
} from "../../../state/events.js";
import type {
  ArchivedStateView,
  ArchiveResult,
  InjectLogView,
  PurgeResult,
  RepairResult,
  StateView,
} from "./types.js";

export function renderInjectLogView(view: InjectLogView): string {
  if (view.content !== undefined) return view.content;
  const lines = [pc.bold(`OMA inject logs ${view.sid}`)];
  if (view.entries.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }
  for (const entry of view.entries) lines.push(`  ${entry.file}`);
  return lines.join("\n");
}

function payloadText(event: OmaEvent, key: string): string {
  return eventPayloadText(event, key, "(none)");
}

export function renderStateList(view: StateView): string {
  const lines = [pc.bold("OMA state sessions")];
  const active = view.index.active;
  const activeEntries = Object.entries(active);
  if (activeEntries.length > 0) {
    lines.push("");
    lines.push(pc.bold("Active"));
    for (const [category, sid] of activeEntries) {
      lines.push(`  ${category}: ${sid}`);
    }
  }
  lines.push("");
  lines.push(pc.bold("Sessions"));
  if (view.sessions.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }
  for (const session of view.sessions) {
    const workflow = session.workflow || "(unknown)";
    const phase = session.currentPhase
      ? ` ${pc.dim(session.currentPhase)}`
      : "";
    lines.push(`  ${session.sid} ${workflow} ${session.status}${phase}`);
  }
  return lines.join("\n");
}

export function renderArchivedStateList(view: ArchivedStateView): string {
  const lines = [pc.bold("OMA archived state sessions")];
  if (view.sessions.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }
  for (const session of view.sessions) {
    const workflow = session.meta.workflow || "(unknown)";
    const created = session.meta.createdAt ?? "(unknown)";
    lines.push(
      `  ${session.sid} ${workflow} ${session.meta.status} ${pc.dim(session.bucket)} ${pc.dim(created)}`,
    );
  }
  return lines.join("\n");
}

export function renderPurgeResult(result: PurgeResult): string {
  const lines = [
    pc.bold(result.dryRun ? "OMA state purge preview" : "OMA state purge"),
    `cutoff: ${result.cutoff}`,
    `purged: ${result.purged.length}`,
  ];
  for (const sid of result.purged) lines.push(`  ${sid}`);
  if (result.skippedActive.length > 0) {
    lines.push(`skipped active: ${result.skippedActive.length}`);
    for (const sid of result.skippedActive) lines.push(`  ${sid}`);
  }
  return lines.join("\n");
}

export function renderArchiveResult(result: ArchiveResult): string {
  const lines = [
    pc.bold(result.dryRun ? "OMA state archive preview" : "OMA state archive"),
    `cutoff: ${result.cutoff}`,
    `archived: ${result.archived.length}`,
  ];
  for (const entry of result.archived)
    lines.push(`  ${entry.sid} -> ${entry.to}`);
  if (result.skippedActive.length > 0) {
    lines.push(`skipped active: ${result.skippedActive.length}`);
    for (const sid of result.skippedActive) lines.push(`  ${sid}`);
  }
  if (result.skippedOpen.length > 0) {
    lines.push(`skipped open: ${result.skippedOpen.length}`);
    for (const sid of result.skippedOpen) lines.push(`  ${sid}`);
  }
  return lines.join("\n");
}

export function renderRepairResult(result: RepairResult): string {
  const title = pc.bold(
    result.dryRun ? "OMA state repair preview" : "OMA state repair",
  );
  if (result.unchanged) {
    return `${title}\nno repairs needed`;
  }

  const repairedMeta =
    result.repairedMeta.length > 0
      ? `repaired meta: ${result.repairedMeta.length}\n${result.repairedMeta
          .map((sid) => `  ${sid}`)
          .join("\n")}`
      : null;
  const quarantinedEvents =
    result.quarantinedEvents.length > 0
      ? `quarantined event lines: ${result.quarantinedEvents.length}\n${result.quarantinedEvents
          .map(
            (entry) =>
              `  ${entry.sid}: ${entry.invalidLines} -> ${entry.badPath}`,
          )
          .join("\n")}`
      : null;
  const removedActive =
    result.removedActive.length > 0
      ? `removed stale active pointers: ${result.removedActive.length}\n${result.removedActive
          .map((entry) => `  ${entry.category}: ${entry.sid}`)
          .join("\n")}`
      : null;
  const reassignedActive =
    result.reassignedActive.length > 0
      ? `reassigned active pointers: ${result.reassignedActive.length}\n${result.reassignedActive
          .map((entry) => `  ${entry.category}: ${entry.from} -> ${entry.to}`)
          .join("\n")}`
      : null;

  return [
    title,
    repairedMeta,
    quarantinedEvents,
    removedActive,
    reassignedActive,
  ]
    .filter((section): section is string => section !== null)
    .join("\n");
}

export function renderSessionView(
  sid: string,
  meta: SessionMeta,
  events: ReturnType<typeof readEvents>,
  options: { archived?: boolean; archivePath?: string } = {},
): string {
  const lines = [
    pc.bold(`OMA session ${sid}`),
    `workflow: ${meta.workflow || "(unknown)"}`,
    `status: ${meta.status}`,
    `phase: ${meta.currentPhase || "(none)"}`,
    `archived: ${options.archived === true ? "yes" : "no"}`,
    `events: ${events.length}`,
  ];
  if (options.archivePath) lines.push(`archivePath: ${options.archivePath}`);
  const gates = events.filter((event) => event.kind.startsWith("gate."));
  const decisions = events.filter((event) => event.kind === "decision.made");
  const missing = events.filter((event) => event.kind === "decision.missing");

  if (gates.length > 0) {
    lines.push("", pc.bold("Gates"));
    for (const event of gates) {
      lines.push(`  ${event.kind} ${payloadText(event, "gate")} ${event.ts}`);
    }
  }
  if (decisions.length > 0) {
    lines.push("", pc.bold("Decisions"));
    for (const event of decisions) {
      lines.push(
        `  ${payloadText(event, "subject")} -> ${payloadText(event, "decision")} ${event.ts}`,
      );
    }
  }
  if (missing.length > 0) {
    lines.push("", pc.bold("Missing Decisions"));
    for (const event of missing) {
      lines.push(
        `  ${payloadText(event, "workflow")}/${payloadText(event, "checkpoint")} ${event.ts}`,
      );
    }
  }

  lines.push("", pc.bold("Events"));
  for (const event of events) {
    lines.push(`  ${event.ts} ${event.kind} ${event.eventId}`);
  }
  return lines.join("\n");
}
