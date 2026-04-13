import * as p from "@clack/prompts";
import { TZDate } from "@date-fns/tz";
import { format, intervalToDuration } from "date-fns";
import pc from "picocolors";
import type { SummaryOutput, ToolName } from "../schema.js";

const TOOL_COLORS: Record<ToolName, (s: string) => string> = {
  claude: pc.yellow,
  gemini: pc.blue,
  codex: pc.green,
  qwen: pc.magenta,
  cursor: pc.gray,
};

function toolBadge(tool: ToolName): string {
  const color = TOOL_COLORS[tool];
  return color(`[${tool}]`);
}

let _tz: string;

function fmtTime(ts: number): string {
  return format(new TZDate(ts, _tz), "HH:mm");
}

function fmtDate(ts: number): string {
  return format(new TZDate(ts, _tz), "yyyy-MM-dd");
}

function fmtDuration(ms: number): string {
  if (ms < 60_000) return "<1min";
  const { hours = 0, minutes = 0 } = intervalToDuration({ start: 0, end: ms });
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}min`;
}

function bar(value: number, max: number, width = 20): string {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function formatTerminal(output: SummaryOutput): void {
  _tz = output.timezone;
  const { stats, entries, window: win } = output;
  const startDate = fmtDate(win.start);
  const endDate = fmtDate(win.end);
  const title =
    startDate === endDate
      ? `Summary for ${startDate}`
      : `Summary for ${startDate} ~ ${endDate}`;

  p.intro(pc.bgMagenta(pc.white(` ${title} `)));

  // Tool breakdown
  if (stats.totalPrompts === 0) {
    p.note("No prompts found in the given window.", "Empty");
    p.outro(pc.dim("Try a wider window with --window"));
    return;
  }

  const maxToolCount = Math.max(...Object.values(stats.byTool));
  const toolLines = Object.entries(stats.byTool)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([tool, count]) =>
        `${toolBadge(tool as ToolName)} ${bar(count, maxToolCount)} ${count}`,
    )
    .join("\n");

  p.note(
    `Total prompts: ${pc.bold(String(stats.totalPrompts))}\n\n${toolLines}`,
    "By Tool",
  );

  // Top projects
  if (stats.topProjects.length > 0) {
    const maxCount = Math.max(...stats.topProjects.map((p) => p.count));
    const projLines = stats.topProjects
      .map((proj) => {
        const dur = proj.duration
          ? pc.dim(` (${fmtDuration(proj.duration)})`)
          : "";
        return `${pc.bold(proj.name)} ${bar(proj.count, maxCount, 15)} ${proj.count}${dur}`;
      })
      .join("\n");

    p.note(projLines, "Top Projects");
  }

  // Timeline (group by hour)
  const hourGroups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const hour = `${fmtTime(entry.timestamp).slice(0, 2)}:00`;
    const key = `${fmtDate(entry.timestamp)} ${hour}`;
    const group = hourGroups.get(key) || [];
    group.push(entry);
    hourGroups.set(key, group);
  }

  const timelineLines = [...hourGroups.entries()]
    .map(([hour, group]) => {
      const tools = [...new Set(group.map((e) => e.tool))]
        .map((t) => toolBadge(t as ToolName))
        .join(" ");
      return `${pc.dim(hour)} ${tools} ${pc.dim(`${group.length} prompts`)}`;
    })
    .join("\n");

  p.note(timelineLines, "Timeline");

  p.outro(
    pc.dim("Use --json for raw data or --mermaid for Mermaid gantt chart"),
  );
}
