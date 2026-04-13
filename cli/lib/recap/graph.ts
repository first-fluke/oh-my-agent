import type { NormalizedEntry, ToolName } from "./schema.js";

export interface GraphNode {
  id: string;
  label: string;
  count: number;
  duration: number;
  tools: Record<string, number>;
  primaryTool: ToolName;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Build a graph from recap entries.
 * Nodes = projects, edges = tool transitions within 30min.
 */
export function buildGraphData(
  entries: NormalizedEntry[],
  top?: number,
): GraphData {
  if (entries.length === 0) return { nodes: [], edges: [] };

  // Aggregate by project
  const projectMap = new Map<
    string,
    {
      count: number;
      first: number;
      last: number;
      tools: Record<string, number>;
    }
  >();

  for (const entry of entries) {
    const proj = entry.project || "(unknown)";
    const existing = projectMap.get(proj);
    if (existing) {
      existing.count++;
      existing.first = Math.min(existing.first, entry.timestamp);
      existing.last = Math.max(existing.last, entry.timestamp);
      existing.tools[entry.tool] = (existing.tools[entry.tool] || 0) + 1;
    } else {
      projectMap.set(proj, {
        count: 1,
        first: entry.timestamp,
        last: entry.timestamp,
        tools: { [entry.tool]: 1 },
      });
    }
  }

  // Build nodes sorted by count
  let nodes: GraphNode[] = [...projectMap.entries()]
    .map(([name, data]) => {
      const primaryTool = Object.entries(data.tools).sort(
        ([, a], [, b]) => b - a,
      )[0][0] as ToolName;
      return {
        id: name,
        label: name,
        count: data.count,
        duration: data.last - data.first,
        tools: data.tools,
        primaryTool,
      };
    })
    .sort((a, b) => b.count - a.count);

  if (top && top > 0) {
    nodes = nodes.slice(0, top);
  }

  // Build edges: projects connected if used within 30min window
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeMap = new Map<string, number>();
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const projA = a.project || "(unknown)";
    if (!nodeIds.has(projA)) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.timestamp - a.timestamp > 30 * 60 * 1000) break;

      const projB = b.project || "(unknown)";
      if (projB === projA || !nodeIds.has(projB)) continue;

      const key = [projA, projB].sort().join("|||");
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }
  }

  const edges: GraphEdge[] = [...edgeMap.entries()].map(([key, weight]) => {
    const [source, target] = key.split("|||");
    return { source, target, weight };
  });

  return { nodes, edges };
}
