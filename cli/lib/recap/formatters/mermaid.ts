import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type { NormalizedEntry, RecapOutput, ToolName } from "../schema.js";

let _tz: string;

function fmtHHMM(ts: number): string {
  return format(new TZDate(ts, _tz), "HH:mm");
}

function fmtDate(ts: number): string {
  return format(new TZDate(ts, _tz), "yyyy-MM-dd");
}

/**
 * Group entries into sessions: consecutive entries within 30min gap.
 */
function groupSessions(
  entries: NormalizedEntry[],
): Array<{ tool: ToolName; project: string; start: number; end: number }> {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const sessions: Array<{
    tool: ToolName;
    project: string;
    start: number;
    end: number;
  }> = [];

  let current = {
    tool: sorted[0].tool,
    project: sorted[0].project || "(unknown)",
    start: sorted[0].timestamp,
    end: sorted[0].timestamp,
  };

  for (let i = 1; i < sorted.length; i++) {
    const entry = sorted[i];
    const gap = entry.timestamp - current.end;
    const sameContext =
      entry.tool === current.tool &&
      (entry.project || "(unknown)") === current.project;

    if (sameContext && gap < 30 * 60 * 1000) {
      // Same session: extend
      current.end = entry.timestamp;
    } else {
      // New session
      sessions.push({ ...current });
      current = {
        tool: entry.tool,
        project: entry.project || "(unknown)",
        start: entry.timestamp,
        end: entry.timestamp,
      };
    }
  }
  sessions.push(current);

  // Ensure minimum 5min duration for visibility
  return sessions.map((s) => ({
    ...s,
    end: Math.max(s.end, s.start + 5 * 60 * 1000),
  }));
}

function escapeLabel(s: string): string {
  return s.replace(/[;#:]/g, " ");
}

export function formatMermaid(output: RecapOutput): string {
  _tz = output.timezone;
  const { entries, window: win } = output;

  if (entries.length === 0) {
    return "No data to visualize.";
  }

  const startDate = fmtDate(win.start);
  const endDate = fmtDate(win.end);
  const title = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;

  const sessions = groupSessions(entries);

  // Group sessions by tool
  const byTool = new Map<ToolName, typeof sessions>();
  for (const session of sessions) {
    const group = byTool.get(session.tool) || [];
    group.push(session);
    byTool.set(session.tool, group);
  }

  const lines: string[] = [
    "gantt",
    `    title ${title} AI Tool Activity`,
    "    dateFormat HH:mm",
    "    axisFormat %H:%M",
  ];

  for (const [tool, toolSessions] of byTool) {
    lines.push(`    section ${tool}`);
    for (const session of toolSessions) {
      const label = escapeLabel(session.project);
      const startTime = fmtHHMM(session.start);
      const durationMin = Math.max(
        5,
        Math.round((session.end - session.start) / 60_000),
      );
      lines.push(`    ${label} :${startTime}, ${durationMin}m`);
    }
  }

  return lines.join("\n");
}
