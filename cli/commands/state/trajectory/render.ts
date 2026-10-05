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

// Widest event kind in regular use ("session.created").
const LABEL_WIDTH = 15;

/** Terminal cells a string occupies; CJK and fullwidth glyphs take two. */
function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    width +=
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x3fffd)
        ? 2
        : 1;
  }
  return width;
}

/** Cut text to fit `cells` terminal cells, marking the cut with an ellipsis. */
function fitText(text: string, cells: number): string {
  if (displayWidth(text) <= cells) return text;
  let out = "";
  let used = 0;
  for (const char of text) {
    const next = displayWidth(char);
    if (used + next > cells - 1) break;
    out += char;
    used += next;
  }
  return `${out}…`;
}

/** One ledger row; with `fit`, the summary is cut so the row stays on a line. */
function renderRecord(record: TrajectoryRecord, fit?: number): string {
  const label =
    record.kind === "oma" && record.event ? record.event.kind : record.kind;
  const tokens = record.tokens
    ? ` ${formatTokens(record.tokens.input + record.tokens.cacheRead + record.tokens.cacheWrite)}→${formatTokens(record.tokens.output)}`
    : "";
  const duration =
    record.durationMs === null ? "" : ` ${formatDuration(record.durationMs)}`;
  const index = `#${record.index}`.padEnd(6);
  const clock = formatClock(record.startedAt);
  const kind = label.padEnd(LABEL_WIDTH);
  const agent = record.agent ? ` [${record.agent}]` : "";
  const error = record.isError ? " ERROR" : "";
  let text = record.text;
  if (fit !== undefined) {
    const fixed = `  ${index}${clock} ${kind}${agent}${error} ${duration}${tokens}`;
    text = fitText(text, Math.max(8, fit - displayWidth(fixed)));
  }
  return [
    "  ",
    pc.dim(index),
    pc.dim(clock),
    " ",
    KIND_COLOR[record.kind](kind),
    agent ? pc.cyan(agent) : "",
    error ? pc.red(error) : "",
    ` ${text}`,
    pc.dim(duration),
    pc.dim(tokens),
  ].join("");
}

const OVERVIEW_LANES: Array<{
  label: string;
  kinds: TrajectoryRecordKind[];
  color: (text: string) => string;
}> = [
  { label: "OMA", kinds: ["oma"], color: pc.yellow },
  { label: "Input", kinds: ["user", "context", "compacted"], color: pc.blue },
  { label: "Assistant", kinds: ["assistant"], color: pc.magenta },
  { label: "Tool", kinds: ["tool", "subtool"], color: pc.green },
];
const OVERVIEW_GUTTER = 10;

/**
 * Timing overview: one lane per record family, laid out by recorded time with
 * the idle gaps between operations removed. A cell's shade is the share of its
 * time slice the lane was busy; instant records (events, prompts) are marks.
 */
// Block elements are East Asian Ambiguous width: a terminal configured to
// draw them two cells wide doubles the overview, so ASCII is available.
const OVERVIEW_GLYPHS = {
  unicode: { full: "█", half: "▓", low: "▒", event: "◆", mark: "▏" },
  ascii: { full: "#", half: "=", low: "-", event: "*", mark: "|" },
};

export interface OverviewOptions {
  /** Draw with ASCII instead of block characters. */
  ascii?: boolean;
  /**
   * Give every record the same width, in ledger order, instead of laying
   * records out by recorded time. Records without a timestamp only appear
   * in this mode.
   */
  sequence?: boolean;
}

export function renderOverview(
  trajectory: Trajectory,
  width: number,
  options: OverviewOptions = {},
): string {
  const glyphs = options.ascii
    ? OVERVIEW_GLYPHS.ascii
    : OVERVIEW_GLYPHS.unicode;
  const timed = options.sequence
    ? trajectory.records.map((record, position) => ({
        record,
        start: position,
        end: position + 1,
      }))
    : trajectory.records
        .filter((record) => record.startedAt !== null)
        .map((record) => ({
          record,
          start: record.startedAt as number,
          end: (record.startedAt as number) + (record.durationMs ?? 0),
        }))
        .sort((a, b) => a.start - b.start || a.end - b.end);
  if (timed.length === 0) return "";

  let removed = 0;
  let covered: number | null = null;
  for (const span of timed) {
    if (options.sequence) break;
    if (covered !== null && span.start > covered)
      removed += span.start - covered;
    covered = covered === null ? span.end : Math.max(covered, span.end);
    span.start -= removed;
    span.end -= removed;
  }
  const low = timed[0]?.start ?? 0;
  const high = Math.max(...timed.map((span) => span.end));
  const columns = Math.max(20, width - OVERVIEW_GUTTER);
  const step = Math.max(1, high - low) / columns;
  const column = (time: number): number =>
    Math.min(columns - 1, Math.max(0, Math.floor((time - low) / step)));

  const busy = OVERVIEW_LANES.map(() => new Array<number>(columns).fill(0));
  const marks = OVERVIEW_LANES.map(() =>
    new Array<boolean>(columns).fill(false),
  );
  const failed = new Array<boolean>(columns).fill(false);
  const turnRow = new Array<string>(columns).fill(" ");
  let turnLabelEnd = -1;
  let turn: number | null = null;

  for (const span of timed) {
    const lane = OVERVIEW_LANES.findIndex((entry) =>
      entry.kinds.includes(span.record.kind),
    );
    const first = column(span.start);
    const last = column(span.end);
    (marks[lane] as boolean[])[first] = true;
    for (let index = first; index <= last; index++) {
      const from = low + index * step;
      const overlap =
        Math.min(span.end, from + step) - Math.max(span.start, from);
      const lanes = busy[lane] as number[];
      lanes[index] = (lanes[index] ?? 0) + Math.max(0, overlap) / step;
      if (span.record.isError) failed[index] = true;
    }
    if (span.record.turn !== null && span.record.turn !== turn) {
      turn = span.record.turn;
      const label = `T${turn}`;
      if (first > turnLabelEnd && first + label.length <= columns) {
        for (let index = 0; index < label.length; index++) {
          turnRow[first + index] = label[index] as string;
        }
        turnLabelEnd = first + label.length;
      }
    }
  }

  const lines = [
    `${" ".repeat(OVERVIEW_GUTTER)}${pc.dim(turnRow.join("").trimEnd())}`,
  ];
  OVERVIEW_LANES.forEach((lane, index) => {
    let row = "";
    for (let cell = 0; cell < columns; cell++) {
      const share = (busy[index] as number[])[cell] as number;
      const marked = (marks[index] as boolean[])[cell];
      const glyph =
        lane.label === "OMA" && (share > 0 || marked)
          ? glyphs.event
          : share >= 0.66
            ? glyphs.full
            : share >= 0.33
              ? glyphs.half
              : share > 0
                ? glyphs.low
                : marked
                  ? glyphs.mark
                  : " ";
      const paint = lane.label === "Tool" && failed[cell] ? pc.red : lane.color;
      row += glyph === " " ? glyph : paint(glyph);
    }
    lines.push(`${lane.label.padEnd(OVERVIEW_GUTTER)}${row.trimEnd()}`);
  });
  lines.push(
    pc.dim(
      `${" ".repeat(OVERVIEW_GUTTER)}${
        options.sequence
          ? `${timed.length} records in order, equal width`
          : `${formatDuration(high - low)} of activity, idle gaps removed`
      }`,
    ),
  );
  return lines.join("\n");
}

export interface RenderTrajectoryOptions {
  /** Cells available for the overview (default 100). */
  width?: number;
  /** Cut each ledger row to `width` so a terminal never wraps it. */
  fitRows?: boolean;
  /** Draw the overview with ASCII instead of block characters. */
  ascii?: boolean;
  /** Lay the overview out by record order instead of recorded time. */
  sequence?: boolean;
}

export function renderTrajectory(
  trajectory: Trajectory,
  options: RenderTrajectoryOptions = {},
): string {
  const width = options.width ?? 100;
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
      const timing =
        session.timing === "none"
          ? pc.yellow(" (no timestamps: whole transcript shown)")
          : session.timing === "partial"
            ? pc.dim(" (only prompts are timestamped)")
            : "";
      const note =
        session.status === "loaded"
          ? `${session.records} records${timing}`
          : session.status === "missing"
            ? pc.yellow("transcript not found")
            : pc.yellow("transcript not supported");
      lines.push(`  ${session.vendor} ${session.vendorSid}  ${note}`);
    }
  }
  const overview = renderOverview(trajectory, width, {
    ascii: options.ascii,
    sequence: options.sequence,
  });
  if (overview) {
    lines.push("");
    lines.push(pc.bold("Overview"));
    lines.push(overview);
  }
  let turn: number | null | undefined;
  for (const record of trajectory.records) {
    if (record.turn !== turn) {
      turn = record.turn;
      lines.push("");
      lines.push(pc.bold(turn === null ? "Before first turn" : `Turn ${turn}`));
    }
    lines.push(renderRecord(record, options.fitRows ? width : undefined));
  }
  return lines.join("\n");
}
