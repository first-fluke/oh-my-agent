import { resolveWindowBounds } from "../../../cli-kit/time-window.js";
import { filterParsers, getAvailableParsers } from "./registry.js";
import type { RecapOutput, ToolName } from "./schema.js";

// Side-effect imports: register all parsers
import "./parsers/claude.js";
import "./parsers/codex.js";
import "./parsers/gemini.js";
import "./parsers/qwen.js";
import "./parsers/cursor.js";

export interface RecapOptions {
  window?: string;
  date?: string;
  tool?: string;
  top?: number;
  sort?: "count" | "duration";
}

export async function collectRecap(
  options: RecapOptions,
): Promise<RecapOutput> {
  const { start, end, timezone } = resolveWindowBounds(
    options.window,
    options.date,
  );

  const tools = options.tool
    ? options.tool.split(",").map((t) => t.trim())
    : undefined;
  const parsers = filterParsers(tools);

  const results = await Promise.all(
    parsers.map(async (p) => {
      const available = await p.detect();
      if (!available) return [];
      return p.parse(start, end);
    }),
  );

  const entries = results.flat().sort((a, b) => a.timestamp - b.timestamp);

  // Compute stats
  const byTool = {} as Record<ToolName, number>;
  const projectCounts = new Map<
    string,
    { count: number; first: number; last: number }
  >();

  for (const entry of entries) {
    byTool[entry.tool] = (byTool[entry.tool] || 0) + 1;
    const proj = entry.project || "(unknown)";
    const existing = projectCounts.get(proj);
    if (existing) {
      existing.count++;
      existing.first = Math.min(existing.first, entry.timestamp);
      existing.last = Math.max(existing.last, entry.timestamp);
    } else {
      projectCounts.set(proj, {
        count: 1,
        first: entry.timestamp,
        last: entry.timestamp,
      });
    }
  }

  const sortMetric = options.sort || "count";
  let topProjects = [...projectCounts.entries()]
    .map(([name, { count, first, last }]) => ({
      name,
      count,
      duration: last - first,
    }))
    .sort((a, b) =>
      sortMetric === "duration" ? b.duration - a.duration : b.count - a.count,
    );

  if (options.top && options.top > 0) {
    topProjects = topProjects.slice(0, options.top);
  }

  return {
    window: { start, end },
    timezone,
    entries,
    stats: {
      totalPrompts: entries.length,
      byTool,
      topProjects,
    },
  };
}

export { getAvailableParsers };
