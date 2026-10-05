import { annot, callout, kv, limits, quiz, timeline, tree } from "./blocks.js";
import { flow } from "./flow.js";
import { sequence } from "./sequence.js";
import type { Component } from "./types.js";

/**
 * The closed set of components a draft can use. A draft cannot add markup of
 * its own, so every page built from these looks like the others.
 */
export const COMPONENTS: Component[] = [
  flow,
  sequence,
  tree,
  timeline,
  limits,
  annot,
  kv,
  callout,
  quiz,
];

export function findComponent(name: string): Component | undefined {
  return COMPONENTS.find((component) => component.name === name);
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_value, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0] as number;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j] as number;
      row[j] = Math.min(
        above + 1,
        (row[j - 1] as number) + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length] as number;
}

/** A component the author probably meant: `flwo` or `flows` → flow. */
export function nearComponent(name: string): Component | undefined {
  if (name.length < 3) return undefined;
  const letters = (text: string) => [...text].sort().join("");
  return COMPONENTS.find(
    (component) =>
      distance(name, component.name) <= 1 ||
      letters(name) === letters(component.name),
  );
}

export type {
  Component,
  DiagramModel,
  FlowModel,
  RenderContext,
  SequenceModel,
} from "./types.js";
export { ComponentError } from "./types.js";
