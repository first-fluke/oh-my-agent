import type { DraftLanguage } from "../text.js";

/** A component rejected its block. `line` counts from 1 inside the block. */
export class ComponentError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
    this.name = "ComponentError";
  }
}

export interface RenderContext {
  lang: DraftLanguage;
  /** Page-unique id, for SVG markers and aria references. */
  uid(prefix: string): string;
  /** Names of the diagram kinds in the page language, for aria labels. */
  labels: { flow: string; sequence: string; colon: string; separator: string };
}

/** Graph a flow block describes; the archify sidecar is derived from it. */
export interface FlowModel {
  kind: "flow";
  direction: "TB" | "LR" | "BT" | "RL";
  nodes: Array<{
    id: string;
    label: string;
    shape: string;
    rank: number;
    order: number;
  }>;
  edges: Array<{ from: string; to: string; label?: string; dashed: boolean }>;
  groups: Array<{ label: string; members: string[] }>;
}

export interface SequenceModel {
  kind: "sequence";
  participants: Array<{ id: string; label: string }>;
  messages: Array<{ from: string; to: string; label: string; dashed: boolean }>;
  /** Phases named by `== Title ==` dividers, as message index ranges. */
  phases: Array<{ label: string; from: number; to: number }>;
}

export type DiagramModel = FlowModel | SequenceModel;

export interface ComponentResult {
  html: string;
  model?: DiagramModel;
}

export interface Component {
  name: string;
  summary: string;
  /** The block's grammar, shown by `oma explain components` and in errors. */
  syntax: string;
  example: string;
  render(text: string, args: string, context: RenderContext): ComponentResult;
}

export interface ContentLine {
  text: string;
  /** 1-based line inside the block. */
  line: number;
  indent: number;
}

/** Non-empty lines of a block, without `//` comment lines. */
export function contentLines(text: string): ContentLine[] {
  return text
    .split("\n")
    .map((raw, index) => ({
      text: raw.trim(),
      line: index + 1,
      indent: raw.length - raw.trimStart().length,
    }))
    .filter((entry) => entry.text && !entry.text.startsWith("//"));
}

/** `a | b | c` → trimmed fields. */
export function fields(text: string): string[] {
  return text.split("|").map((field) => field.trim());
}
