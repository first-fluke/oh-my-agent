import { type Direction, layoutLayered } from "../layered.js";
import {
  svgArrowMarker,
  svgCurve,
  svgFigure,
  svgRound,
  svgText,
} from "../svg.js";
import { escapeHtml, measure, slugId, wrapText } from "../text.js";
import {
  type Component,
  ComponentError,
  contentLines,
  type FlowModel,
} from "./types.js";

type Shape = "box" | "pill" | "diamond" | "cylinder";

interface FlowNode {
  key: string;
  label: string;
  shape: Shape;
  emphasis: boolean;
  lines: string[];
  width: number;
  height: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  dashed: boolean;
}

const NODE_SIZE = 13;
const NODE_LINE = 17;
const LABEL_SIZE = 11;
const LABEL_LINE = 14;
const DIRECTIONS = new Set(["TB", "LR", "BT", "RL"]);
const ALIAS_RE = /^([A-Za-z][\w-]*)\s*=\s*(.+)$/;
const ARROW_RE = /\s*(-->|->)\s*/;

/** `[(DB)]*` → label, shape, emphasis. */
function parseToken(raw: string): {
  label: string;
  shape?: Shape;
  emphasis: boolean;
} {
  let token = raw.trim();
  const emphasis = token.endsWith("*") && token.length > 1;
  if (emphasis) token = token.slice(0, -1).trim();
  const wrapped = (open: string, close: string) =>
    token.startsWith(open) &&
    token.endsWith(close) &&
    token.length > open.length + close.length;
  if (wrapped("[(", ")]")) {
    return { label: token.slice(2, -2).trim(), shape: "cylinder", emphasis };
  }
  if (wrapped("(", ")")) {
    return { label: token.slice(1, -1).trim(), shape: "pill", emphasis };
  }
  if (wrapped("{", "}")) {
    return { label: token.slice(1, -1).trim(), shape: "diamond", emphasis };
  }
  if (wrapped("[", "]")) {
    return { label: token.slice(1, -1).trim(), shape: "box", emphasis };
  }
  return { label: token, emphasis };
}

/** Split `target: edge label` at the first colon outside any bracket. */
function splitLabel(segment: string): [string, string | undefined] {
  let depth = 0;
  for (let index = 0; index < segment.length; index++) {
    const char = segment[index] as string;
    if ("([{".includes(char)) depth++;
    else if (")]}".includes(char)) depth = Math.max(0, depth - 1);
    else if (char === ":" && depth === 0) {
      const label = segment.slice(index + 1).trim();
      return [segment.slice(0, index).trim(), label || undefined];
    }
  }
  return [segment.trim(), undefined];
}

function sizeNode(node: FlowNode): void {
  node.lines = wrapText(node.label, 150, NODE_SIZE);
  const textWidth = Math.max(
    ...node.lines.map((line) => measure(line, NODE_SIZE)),
  );
  const textHeight = node.lines.length * NODE_LINE;
  if (node.shape === "diamond") {
    node.width = Math.max(96, textWidth * 1.35 + 44);
    node.height = textHeight + 36;
  } else {
    node.width = Math.max(64, textWidth + (node.shape === "pill" ? 36 : 28));
    node.height = textHeight + (node.shape === "cylinder" ? 30 : 18);
  }
}

function nodeShape(node: FlowNode, x: number, y: number): string {
  const left = svgRound(x - node.width / 2);
  const top = svgRound(y - node.height / 2);
  const w = svgRound(node.width);
  const h = svgRound(node.height);
  const cls = `oe-node${node.emphasis ? " oe-node-em" : ""}`;
  if (node.shape === "pill") {
    return `<rect class="${cls}" x="${left}" y="${top}" width="${w}" height="${h}" rx="${svgRound(node.height / 2)}"/>`;
  }
  if (node.shape === "diamond") {
    return `<polygon class="${cls}" points="${svgRound(x)},${top} ${svgRound(x + node.width / 2)},${svgRound(y)} ${svgRound(x)},${svgRound(y + node.height / 2)} ${left},${svgRound(y)}"/>`;
  }
  if (node.shape === "cylinder") {
    const cap = 6;
    const bottom = svgRound(y + node.height / 2);
    return `<path class="${cls}" d="M${left},${top + cap} a${svgRound(node.width / 2)},${cap} 0 0 1 ${w},0 V${bottom - cap} a${svgRound(node.width / 2)},${cap} 0 0 1 -${w},0 Z"/><path class="oe-node-line" d="M${left},${top + cap} a${svgRound(node.width / 2)},${cap} 0 0 0 ${w},0" fill="none"/>`;
  }
  return `<rect class="${cls}" x="${left}" y="${top}" width="${w}" height="${h}" rx="6"/>`;
}

export const flow: Component = {
  name: "flow",
  summary: "Boxes and arrows, laid out automatically from relations",
  syntax: [
    "```flow [TB|LR|BT|RL]",
    "A -> B -> C            chain; the nodes are created on first use",
    "A -> B: label          label on the arrow",
    "A --> B                dashed arrow (async, optional, returns)",
    "A -> B & C             one arrow to each target",
    "(Start)  {Choice?}  [(Store)]  [Box]    pill, diamond, cylinder, box",
    "Core*                  a trailing * emphasizes the node",
    "api = [(Orders DB)]    short name for a long label",
    "group Backend: A, B    frame around related nodes",
    "```",
    "- Write relations only. Positions are computed; do not try to align.",
    "- Keep a label under about 20 characters and a diagram under about 12 nodes.",
  ].join("\n"),
  example:
    "```flow LR\n(Draft) -> Parser -> Layout* -> (HTML)\nParser --> Lint: prose\ngroup oma: Parser, Layout, Lint\n```",
  render(text, args, context) {
    const direction = (args.split(/\s+/)[0] || "TB").toUpperCase();
    if (!DIRECTIONS.has(direction)) {
      throw new ComponentError(
        `flow direction must be TB, LR, BT, or RL, not "${args}"`,
        0,
      );
    }
    const nodes = new Map<string, FlowNode>();
    const aliases = new Map<string, string>();
    const edges: FlowEdge[] = [];
    const groups: Array<{ title: string; members: string[]; line: number }> =
      [];

    const touch = (raw: string, line: number): string => {
      const token = parseToken(raw);
      if (!token.label) {
        throw new ComponentError(`flow has an empty node name: "${raw}"`, line);
      }
      const key = aliases.get(token.label) ?? token.label;
      const existing = nodes.get(key);
      if (existing) {
        if (token.shape) existing.shape = token.shape;
        if (token.emphasis) existing.emphasis = true;
        return key;
      }
      nodes.set(key, {
        key,
        label: token.label,
        shape: token.shape ?? "box",
        emphasis: token.emphasis,
        lines: [],
        width: 0,
        height: 0,
      });
      return key;
    };

    for (const { text: line, line: at } of contentLines(text)) {
      const group = /^group\s+([^:]+):\s*(.+)$/i.exec(line);
      if (group) {
        groups.push({
          title: (group[1] as string).trim(),
          members: (group[2] as string).split(",").map((name) => name.trim()),
          line: at,
        });
        continue;
      }
      const alias = ALIAS_RE.exec(line);
      if (alias && !ARROW_RE.test(line)) {
        const id = alias[1] as string;
        const token = parseToken(alias[2] as string);
        aliases.set(id, id);
        nodes.set(id, {
          key: id,
          label: token.label,
          shape: token.shape ?? "box",
          emphasis: token.emphasis,
          lines: [],
          width: 0,
          height: 0,
        });
        continue;
      }
      const parts = line.split(ARROW_RE);
      if (parts.length < 3) {
        // A line without an arrow declares one node.
        touch(line, at);
        continue;
      }
      const lastIndex = parts.length - 1;
      const [lastTargets, label] = splitLabel(parts[lastIndex] as string);
      parts[lastIndex] = lastTargets;
      let sources = (parts[0] as string)
        .split(/\s+&\s+/)
        .map((name) => touch(name, at));
      for (let index = 1; index < parts.length; index += 2) {
        const dashed = parts[index] === "-->";
        const segment = parts[index + 1] as string;
        if (!segment.trim()) {
          throw new ComponentError(`flow arrow has no target: "${line}"`, at);
        }
        const targets = segment.split(/\s+&\s+/).map((name) => touch(name, at));
        for (const from of sources) {
          for (const to of targets) {
            edges.push({
              from,
              to,
              dashed,
              label: index + 1 === lastIndex ? label : undefined,
            });
          }
        }
        sources = targets;
      }
    }
    if (nodes.size === 0) {
      throw new ComponentError("flow needs at least one node", 1);
    }

    for (const node of nodes.values()) sizeNode(node);
    const horizontal = direction === "LR" || direction === "RL";
    const labelLines = new Map<FlowEdge, string[]>();
    for (const edge of edges) {
      if (edge.label)
        labelLines.set(edge, wrapText(edge.label, 130, LABEL_SIZE));
    }
    const layout = layoutLayered(
      [...nodes.values()].map((node) => ({
        id: node.key,
        width: node.width,
        height: node.height,
      })),
      edges.map((edge) => {
        const lines = labelLines.get(edge);
        return {
          from: edge.from,
          to: edge.to,
          label: lines
            ? {
                width:
                  Math.max(...lines.map((l) => measure(l, LABEL_SIZE))) + 12,
                height: lines.length * LABEL_LINE + 6,
              }
            : undefined,
        };
      }),
      { direction: direction as Direction, rankGap: horizontal ? 52 : 44 },
    );

    const pad = groups.length > 0 ? 30 : 12;
    const padTop = groups.length > 0 ? 40 : 12;
    const marker = context.uid("arrow");
    const parts: string[] = [`<defs>${svgArrowMarker(marker)}</defs>`];

    for (const group of groups) {
      const members = group.members.map((name) => {
        const key = aliases.get(name) ?? parseToken(name).label;
        const placed = layout.nodes.get(key);
        if (!placed) {
          throw new ComponentError(
            `group "${group.title}" names "${name}", which no arrow or node line defines`,
            group.line,
          );
        }
        return placed;
      });
      const left = Math.min(...members.map((m) => m.x - m.width / 2)) - 14;
      const right = Math.max(...members.map((m) => m.x + m.width / 2)) + 14;
      const top = Math.min(...members.map((m) => m.y - m.height / 2)) - 24;
      const bottom = Math.max(...members.map((m) => m.y + m.height / 2)) + 12;
      parts.push(
        `<rect class="oe-group" x="${svgRound(left + pad)}" y="${svgRound(top + padTop)}" width="${svgRound(right - left)}" height="${svgRound(bottom - top)}" rx="8"/>`,
        `<text class="oe-group-t" x="${svgRound(left + pad + 8)}" y="${svgRound(top + padTop + 13)}" font-size="10.5">${escapeHtml(group.title)}</text>`,
      );
    }

    // Edges of the layout come back in the order the edges went in.
    const drawn = edges.filter(
      (edge) =>
        edge.from !== edge.to && nodes.has(edge.from) && nodes.has(edge.to),
    );
    layout.edges.forEach((placed, index) => {
      const edge = drawn[index] as FlowEdge;
      const points = placed.points.map(([x, y]): [number, number] => [
        x + pad,
        y + padTop,
      ]);
      parts.push(
        `<path class="oe-edge${edge.dashed ? " oe-edge-dashed" : ""}" d="${svgCurve(points, horizontal)}" fill="none" marker-end="url(#${marker})"/>`,
      );
    });
    layout.edges.forEach((placed, index) => {
      const edge = drawn[index] as FlowEdge;
      const lines = labelLines.get(edge);
      if (!lines || !placed.label) return;
      const width = Math.max(...lines.map((l) => measure(l, LABEL_SIZE))) + 10;
      const height = lines.length * LABEL_LINE + 4;
      const x = placed.label[0] + pad;
      const y = placed.label[1] + padTop;
      parts.push(
        `<rect class="oe-edge-bg" x="${svgRound(x - width / 2)}" y="${svgRound(y - height / 2)}" width="${svgRound(width)}" height="${svgRound(height)}" rx="3"/>`,
        svgText(lines, x, y, {
          size: LABEL_SIZE,
          lineHeight: LABEL_LINE,
          className: "oe-edge-t",
        }),
      );
    });
    for (const node of nodes.values()) {
      const placed = layout.nodes.get(node.key);
      if (!placed) continue;
      const x = placed.x + pad;
      const y = placed.y + padTop;
      parts.push(
        nodeShape(node, x, y),
        svgText(node.lines, x, node.shape === "cylinder" ? y + 4 : y, {
          size: NODE_SIZE,
          lineHeight: NODE_LINE,
          className: `oe-node-t${node.emphasis ? " oe-node-t-em" : ""}`,
        }),
      );
    }

    const used = new Set<string>();
    const idOf = new Map<string, string>();
    for (const node of nodes.values()) {
      let id = slugId(node.key).replace(/^n-(?=[a-z])/, "");
      if (!/^[a-zA-Z]/.test(id)) id = `n-${id}`;
      while (used.has(id)) id += "x";
      used.add(id);
      idOf.set(node.key, id);
    }
    const model: FlowModel = {
      kind: "flow",
      direction: direction as Direction,
      nodes: [...nodes.values()].map((node) => {
        const placed = layout.nodes.get(node.key);
        return {
          id: idOf.get(node.key) as string,
          label: node.label,
          shape: node.shape,
          rank: placed?.rank ?? 0,
          order: placed?.order ?? 0,
        };
      }),
      edges: drawn.map((edge) => ({
        from: idOf.get(edge.from) as string,
        to: idOf.get(edge.to) as string,
        label: edge.label,
        dashed: edge.dashed,
      })),
    };
    const summary = drawn
      .slice(0, 12)
      .map(
        (edge) =>
          `${nodes.get(edge.from)?.label} → ${nodes.get(edge.to)?.label}`,
      )
      .join(", ");
    return {
      html: svgFigure(
        layout.width + pad * 2,
        layout.height + padTop + pad,
        summary || [...nodes.values()].map((node) => node.label).join(", "),
        parts.join(""),
      ),
      model,
    };
  },
};
