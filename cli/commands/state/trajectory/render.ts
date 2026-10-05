import pc from "picocolors";
import type {
  Trajectory,
  TrajectoryRecord,
  TrajectoryRecordKind,
} from "./types.js";

const KIND_COLOR: Record<TrajectoryRecordKind, (text: string) => string> = {
  oma: pc.yellow,
  user: pc.blue,
  assistant: pc.magenta,
  tool: pc.green,
  subtool: pc.cyan,
  context: pc.dim,
  compacted: pc.yellow,
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 59_950) return `${(ms / 1000).toFixed(1)}s`;
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds - minutes * 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatTokens(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000)
    return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

function formatClock(ms: number | null): string {
  return ms === null ? "        " : new Date(ms).toISOString().slice(11, 19);
}

function renderRecord(record: TrajectoryRecord): string {
  const label =
    record.kind === "oma" && record.event ? record.event.kind : record.kind;
  const tokens = record.tokens
    ? pc.dim(
        ` ${formatTokens(record.tokens.input + record.tokens.cacheRead + record.tokens.cacheWrite)}→${formatTokens(record.tokens.output)}`,
      )
    : "";
  const duration =
    record.durationMs === null
      ? ""
      : pc.dim(` ${formatDuration(record.durationMs)}`);
  return [
    "  ",
    pc.dim(`#${record.index}`.padEnd(6)),
    pc.dim(formatClock(record.startedAt)),
    " ",
    KIND_COLOR[record.kind](label.padEnd(10)),
    record.agent ? pc.cyan(` [${record.agent}]`) : "",
    record.isError ? pc.red(" ERROR") : "",
    ` ${record.text}`,
    duration,
    tokens,
  ].join("");
}

export function renderTrajectory(trajectory: Trajectory): string {
  const { meta, totals } = trajectory;
  const lines = [pc.bold(`OMA trajectory ${trajectory.sid}`)];
  lines.push(
    `workflow: ${meta.workflow ?? "(unknown)"}  status: ${meta.status}${trajectory.archived ? " (archived)" : ""}`,
  );
  const wall =
    totals.startedAt !== null && totals.endedAt !== null
      ? `  wall: ${formatDuration(totals.endedAt - totals.startedAt)}`
      : "";
  lines.push(
    `records: ${totals.records}  turns: ${totals.turns}  tools: ${totals.toolCalls}${totals.toolErrors ? ` (${totals.toolErrors} failed)` : ""}${wall}`,
  );
  lines.push(
    `tokens: in ${formatTokens(totals.tokens.input)}  cache read ${formatTokens(totals.tokens.cacheRead)}  cache write ${formatTokens(totals.tokens.cacheWrite)}  out ${formatTokens(totals.tokens.output)}`,
  );
  if (trajectory.vendorSessions.length > 0) {
    lines.push("");
    lines.push(pc.bold("Vendor sessions"));
    for (const session of trajectory.vendorSessions) {
      const note =
        session.status === "loaded"
          ? `${session.records} records`
          : session.status === "missing"
            ? pc.yellow("transcript not found")
            : pc.yellow("transcript not supported");
      lines.push(`  ${session.vendor} ${session.vendorSid}  ${note}`);
    }
  }
  let turn: number | null | undefined;
  for (const record of trajectory.records) {
    if (record.turn !== turn) {
      turn = record.turn;
      lines.push("");
      lines.push(pc.bold(turn === null ? "Before first turn" : `Turn ${turn}`));
    }
    lines.push(renderRecord(record));
  }
  return lines.join("\n");
}
