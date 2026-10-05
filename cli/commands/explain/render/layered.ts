// Layered graph layout (Sugiyama style) for flow diagrams: the draft names
// only relations, and this computes every coordinate. Ranks run along the main
// axis; nodes in a rank are ordered to reduce crossings, then nudged toward
// their neighbours so edges run straight where they can.

export type Direction = "TB" | "LR" | "BT" | "RL";

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  /** Size of the edge's label; the layout reserves room for it mid-edge. */
  label?: { width: number; height: number };
}

export interface PlacedNode {
  /** Centre. */
  x: number;
  y: number;
  width: number;
  height: number;
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

export interface LayeredLayout {
  nodes: Map<string, PlacedNode>;
  edges: PlacedEdge[];
  width: number;
  height: number;
}

export interface LayeredOptions {
  direction?: Direction;
  /** Space between ranks. */
  rankGap?: number;
  /** Space between nodes of one rank. */
  nodeGap?: number;
}

interface Vertex {
  id: string;
  /** Size across the rank and along the main axis. */
  cross: number;
  main: number;
  rank: number;
  order: number;
  position: number;
  dummy: boolean;
}

export function layoutLayered(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayeredOptions = {},
): LayeredLayout {
  const direction = options.direction ?? "TB";
  const horizontal = direction === "LR" || direction === "RL";
  // With labels, every edge spans two ranks and the label sits in the middle
  // one, so a label never lands on a node or another label.
  const labelled = edges.some((edge) => edge.label);
  const span = labelled ? 2 : 1;
  const rankGap = (options.rankGap ?? 56) / span;
  const nodeGap = options.nodeGap ?? 28;

  const vertices = new Map<string, Vertex>();
  for (const node of nodes) {
    vertices.set(node.id, {
      id: node.id,
      cross: horizontal ? node.height : node.width,
      main: horizontal ? node.width : node.height,
      rank: 0,
      order: 0,
      position: 0,
      dummy: false,
    });
  }
  const links = edges.filter(
    (edge) =>
      edge.from !== edge.to && vertices.has(edge.from) && vertices.has(edge.to),
  );

  // 1. Break cycles: an edge that closes a loop is laid out reversed.
  const state = new Map<string, "open" | "done">();
  const reversed = new Set<LayoutEdge>();
  const visit = (id: string) => {
    state.set(id, "open");
    for (const link of links) {
      if (link.from !== id || reversed.has(link)) continue;
      const seen = state.get(link.to);
      if (seen === "open") reversed.add(link);
      else if (seen === undefined) visit(link.to);
    }
    state.set(id, "done");
  };
  for (const id of vertices.keys()) if (!state.has(id)) visit(id);
  const directed = links.map((link) =>
    reversed.has(link)
      ? { from: link.to, to: link.from, source: link }
      : { from: link.from, to: link.to, source: link },
  );

  // 2. Rank = longest path from a source.
  const incoming = new Map<string, number>();
  for (const id of vertices.keys()) incoming.set(id, 0);
  for (const link of directed) {
    incoming.set(link.to, (incoming.get(link.to) ?? 0) + 1);
  }
  const queue = [...vertices.keys()].filter((id) => incoming.get(id) === 0);
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const rank = (vertices.get(id) as Vertex).rank;
    for (const link of directed) {
      if (link.from !== id) continue;
      const target = vertices.get(link.to) as Vertex;
      target.rank = Math.max(target.rank, rank + span);
      const left = (incoming.get(link.to) ?? 1) - 1;
      incoming.set(link.to, left);
      if (left === 0) queue.push(link.to);
    }
  }

  // 3. An edge that spans several ranks gets a dummy vertex in each.
  const chains: Array<{ source: LayoutEdge; path: string[] }> = [];
  const segments: Array<{ from: string; to: string }> = [];
  const labelAt = new Map<LayoutEdge, string>();
  let dummyCount = 0;
  for (const link of directed) {
    const from = vertices.get(link.from) as Vertex;
    const to = vertices.get(link.to) as Vertex;
    const path = [link.from];
    const label = link.source.label;
    const labelRank = from.rank + Math.floor((to.rank - from.rank) / 2);
    for (let rank = from.rank + 1; rank < to.rank; rank++) {
      const id = `\u0000dummy${dummyCount++}`;
      const sized = label && rank === labelRank ? label : undefined;
      if (sized) labelAt.set(link.source, id);
      vertices.set(id, {
        id,
        cross: sized ? (horizontal ? sized.height : sized.width) : 0,
        main: sized ? (horizontal ? sized.width : sized.height) : 0,
        rank,
        order: 0,
        position: 0,
        dummy: true,
      });
      path.push(id);
    }
    path.push(link.to);
    for (let step = 0; step + 1 < path.length; step++) {
      segments.push({
        from: path[step] as string,
        to: path[step + 1] as string,
      });
    }
    chains.push({ source: link.source, path });
  }

  // 4. Order each rank; sweep with the barycentre heuristic to cut crossings.
  const rankCount = Math.max(...[...vertices.values()].map((v) => v.rank)) + 1;
  const ranks: Vertex[][] = Array.from({ length: rankCount }, () => []);
  for (const vertex of vertices.values()) {
    (ranks[vertex.rank] as Vertex[]).push(vertex);
  }
  for (const rank of ranks)
    rank.forEach((vertex, order) => {
      vertex.order = order;
    });
  const neighbours = (id: string, towards: "up" | "down"): Vertex[] =>
    segments
      .filter(
        (segment) => (towards === "up" ? segment.to : segment.from) === id,
      )
      .map(
        (segment) =>
          vertices.get(towards === "up" ? segment.from : segment.to) as Vertex,
      );
  const reorder = (rank: Vertex[], towards: "up" | "down") => {
    const key = new Map<Vertex, number>();
    for (const vertex of rank) {
      const near = neighbours(vertex.id, towards);
      key.set(
        vertex,
        near.length > 0
          ? near.reduce((sum, other) => sum + other.order, 0) / near.length
          : vertex.order,
      );
    }
    rank.sort((a, b) => (key.get(a) as number) - (key.get(b) as number));
    rank.forEach((vertex, order) => {
      vertex.order = order;
    });
  };
  for (let sweep = 0; sweep < 6; sweep++) {
    for (let index = 1; index < rankCount; index++) {
      reorder(ranks[index] as Vertex[], "up");
    }
    for (let index = rankCount - 2; index >= 0; index--) {
      reorder(ranks[index] as Vertex[], "down");
    }
  }

  // 5. Cross-axis positions: pack each rank, then pull vertices toward the
  // mean of their neighbours while keeping order and spacing.
  const pack = (rank: Vertex[]) => {
    let cursor = 0;
    for (const vertex of rank) {
      vertex.position = cursor + vertex.cross / 2;
      cursor += vertex.cross + nodeGap;
    }
  };
  for (const rank of ranks) pack(rank);
  const settle = (rank: Vertex[], towards: "up" | "down") => {
    const wanted = rank.map((vertex) => {
      const near = neighbours(vertex.id, towards);
      return near.length > 0
        ? near.reduce((sum, other) => sum + other.position, 0) / near.length
        : vertex.position;
    });
    const gap = (a: Vertex, b: Vertex) => a.cross / 2 + nodeGap + b.cross / 2;
    const forward = [...wanted];
    for (let index = 1; index < rank.length; index++) {
      forward[index] = Math.max(
        forward[index] as number,
        (forward[index - 1] as number) +
          gap(rank[index - 1] as Vertex, rank[index] as Vertex),
      );
    }
    const backward = [...wanted];
    for (let index = rank.length - 2; index >= 0; index--) {
      backward[index] = Math.min(
        backward[index] as number,
        (backward[index + 1] as number) -
          gap(rank[index] as Vertex, rank[index + 1] as Vertex),
      );
    }
    rank.forEach((vertex, index) => {
      vertex.position =
        ((forward[index] as number) + (backward[index] as number)) / 2;
    });
    // Averaging the two passes can leave a pair too close; push apart.
    for (let index = 1; index < rank.length; index++) {
      const previous = rank[index - 1] as Vertex;
      const current = rank[index] as Vertex;
      current.position = Math.max(
        current.position,
        previous.position + gap(previous, current),
      );
    }
  };
  for (let pass = 0; pass < 8; pass++) {
    for (let index = 1; index < rankCount; index++) {
      settle(ranks[index] as Vertex[], "up");
    }
    for (let index = rankCount - 2; index >= 0; index--) {
      settle(ranks[index] as Vertex[], "down");
    }
  }
  const low = Math.min(
    ...[...vertices.values()].map((v) => v.position - v.cross / 2),
  );
  for (const vertex of vertices.values()) vertex.position -= low;

  // 6. Main-axis offset of each rank.
  const rankMain = ranks.map((rank) => Math.max(0, ...rank.map((v) => v.main)));
  const rankStart: number[] = [];
  let offset = 0;
  rankMain.forEach((size, index) => {
    rankStart[index] = offset;
    offset += size + rankGap;
  });
  const mainSize = offset - rankGap;
  const crossSize = Math.max(
    ...[...vertices.values()].map((v) => v.position + v.cross / 2),
  );
  const flip = direction === "BT" || direction === "RL";
  const centre = (vertex: Vertex): [number, number] => {
    const along =
      (rankStart[vertex.rank] as number) +
      (rankMain[vertex.rank] as number) / 2;
    const main = flip ? mainSize - along : along;
    return horizontal ? [main, vertex.position] : [vertex.position, main];
  };

  const placed = new Map<string, PlacedNode>();
  for (const node of nodes) {
    const vertex = vertices.get(node.id) as Vertex;
    const [x, y] = centre(vertex);
    placed.set(node.id, {
      x,
      y,
      width: node.width,
      height: node.height,
      rank: vertex.rank,
      order: vertex.order,
    });
  }

  // An edge leaves and enters on the sides that face along the main axis.
  const border = (id: string, towards: [number, number]): [number, number] => {
    const node = placed.get(id) as PlacedNode;
    if (horizontal) {
      return [
        node.x + (towards[0] >= node.x ? 1 : -1) * (node.width / 2),
        node.y,
      ];
    }
    return [
      node.x,
      node.y + (towards[1] >= node.y ? 1 : -1) * (node.height / 2),
    ];
  };
  const placedEdges: PlacedEdge[] = chains.map(({ source, path }) => {
    const centres = path.map((id) => centre(vertices.get(id) as Vertex));
    const first = path[0] as string;
    const last = path[path.length - 1] as string;
    const points: Array<[number, number]> = [
      border(first, centres[1] as [number, number]),
      ...centres.slice(1, -1),
      border(last, centres[centres.length - 2] as [number, number]),
    ];
    const labelVertex = labelAt.get(source);
    // A reversed edge was laid out backwards; draw it in its real direction.
    return {
      from: source.from,
      to: source.to,
      points: reversed.has(source) ? points.reverse() : points,
      label: labelVertex
        ? centre(vertices.get(labelVertex) as Vertex)
        : undefined,
    };
  });

  return {
    nodes: placed,
    edges: placedEdges,
    width: horizontal ? mainSize : crossSize,
    height: horizontal ? crossSize : mainSize,
  };
}
