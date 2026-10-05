import { Graph, layout } from "@dagrejs/dagre";

// Layout for flow diagrams: the draft names only relations, and dagre (a
// layered, Sugiyama-style engine) computes every coordinate. dagre ranks the
// nodes, orders each rank to cut crossings, reserves room for edge labels,
// and lays a group out as a cluster that no other node enters.

export type Direction = "TB" | "LR" | "BT" | "RL";

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
  /** The outline is a diamond: edges end on its slanted sides. */
  diamond?: boolean;
}

export interface LayoutEdge {
  from: string;
  to: string;
  /** Size of the edge's label; the layout reserves room for it mid-edge. */
  label?: { width: number; height: number };
}

export interface LayoutGroup {
  members: string[];
}

export interface PlacedNode {
  /** Centre. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Index of the node's rank along the flow, from 0. */
  rank: number;
  /** Position within the rank, from 0. */
  order: number;
}

export interface PlacedEdge {
  from: string;
  to: string;
  /** Polyline from the source border to the target border. */
  points: Array<[number, number]>;
  /** Centre of the label, when the edge has one. */
  label?: [number, number];
}

export interface PlacedGroup {
  /** Top-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayeredLayout {
  nodes: Map<string, PlacedNode>;
  edges: PlacedEdge[];
  groups: PlacedGroup[];
  width: number;
  height: number;
}

export interface LayeredOptions {
  direction?: Direction;
  /** Space between ranks. */
  rankGap?: number;
  /** Space between nodes of one rank. */
  nodeGap?: number;
  groups?: LayoutGroup[];
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where the line from a diamond's centre toward `toward` leaves the diamond. */
function diamondPoint(
  node: Box,
  toward: { x: number; y: number },
): [number, number] {
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  const reach =
    Math.abs(dx) / (node.width / 2) + Math.abs(dy) / (node.height / 2);
  if (reach === 0) return [node.x, node.y];
  return [node.x + dx / reach, node.y + dy / reach];
}

export function layoutLayered(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayeredOptions = {},
): LayeredLayout {
  const direction = options.direction ?? "TB";
  const horizontal = direction === "LR" || direction === "RL";
  const groups = options.groups ?? [];
  const graph = new Graph({ compound: groups.length > 0, multigraph: true });
  graph.setGraph({
    rankdir: direction,
    nodesep: options.nodeGap ?? 36,
    ranksep: options.rankGap ?? 46,
    marginx: 14,
    // A group's title sits inside the top of its frame.
    marginy: groups.length > 0 ? 26 : 14,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  // dagre reserves some ids for itself, so nodes and groups get numbers and
  // no name from a draft can collide with them.
  const key = new Map(nodes.map((node, index) => [node.id, `n${index}`]));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    graph.setNode(key.get(node.id) as string, {
      width: node.width,
      height: node.height,
    });
  }
  const owned = new Set<string>();
  groups.forEach((group, index) => {
    graph.setNode(`g${index}`, {});
    for (const member of group.members) {
      const id = key.get(member);
      // A node belongs to the first group that names it.
      if (!id || owned.has(id)) continue;
      owned.add(id);
      graph.setParent(id, `g${index}`);
    }
  });
  const drawn = edges
    .map((edge, index) => ({ edge, name: `e${index}` }))
    .filter(
      ({ edge }) =>
        edge.from !== edge.to && key.has(edge.from) && key.has(edge.to),
    );
  for (const { edge, name } of drawn) {
    graph.setEdge(
      key.get(edge.from) as string,
      key.get(edge.to) as string,
      edge.label
        ? {
            label: "label",
            width: edge.label.width,
            height: edge.label.height,
            labelpos: "c",
          }
        : {},
      name,
    );
  }
  layout(graph);

  const boxOf = (id: string) => graph.node(key.get(id) as string) as Box;
  // Rank and order are read back from the coordinates: nodes of one rank
  // share their position along the flow.
  const along = (box: Box) => Math.round(horizontal ? box.x : box.y);
  const across = (box: Box) => (horizontal ? box.y : box.x);
  const reversedFlow = direction === "BT" || direction === "RL";
  const ranks = [...new Set(nodes.map((node) => along(boxOf(node.id))))].sort(
    (a, b) => (reversedFlow ? b - a : a - b),
  );
  const placed = new Map<string, PlacedNode>();
  for (const node of nodes) {
    const box = boxOf(node.id);
    const peers = nodes
      .filter((other) => along(boxOf(other.id)) === along(box))
      .sort((a, b) => across(boxOf(a.id)) - across(boxOf(b.id)));
    placed.set(node.id, {
      x: box.x,
      y: box.y,
      width: node.width,
      height: node.height,
      rank: ranks.indexOf(along(box)),
      order: peers.indexOf(node),
    });
  }

  const placedEdges: PlacedEdge[] = drawn.map(({ edge, name }) => {
    const data = graph.edge({
      v: key.get(edge.from) as string,
      w: key.get(edge.to) as string,
      name,
    }) as { points: Array<{ x: number; y: number }>; x?: number; y?: number };
    const points = data.points.map((p): [number, number] => [p.x, p.y]);
    // dagre ends an edge on the node's bounding box; on a diamond that point
    // floats off the outline, so it moves to the slanted side.
    if (points.length > 1) {
      if (byId.get(edge.from)?.diamond) {
        const next = points[1] as [number, number];
        points[0] = diamondPoint(boxOf(edge.from), { x: next[0], y: next[1] });
      }
      if (byId.get(edge.to)?.diamond) {
        const previous = points[points.length - 2] as [number, number];
        points[points.length - 1] = diamondPoint(boxOf(edge.to), {
          x: previous[0],
          y: previous[1],
        });
      }
    }
    return {
      from: edge.from,
      to: edge.to,
      points,
      label:
        edge.label && data.x !== undefined && data.y !== undefined
          ? [data.x, data.y]
          : undefined,
    };
  });

  const placedGroups: PlacedGroup[] = groups.map((_group, index) => {
    const box = graph.node(`g${index}`) as Box | undefined;
    if (!box || !Number.isFinite(box.x) || !box.width) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
      x: box.x - box.width / 2,
      y: box.y - box.height / 2,
      width: box.width,
      height: box.height,
    };
  });

  const size = graph.graph() as { width?: number; height?: number };
  return {
    nodes: placed,
    edges: placedEdges,
    groups: placedGroups,
    width: size.width ?? 0,
    height: size.height ?? 0,
  };
}
