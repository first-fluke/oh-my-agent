#!/usr/bin/env bun
import type { OmaEvent } from "./state-emit.ts";
import type { Vendor } from "./types.ts";

export interface MemoryFact {
  text: string;
  source?: string;
  score?: number;
}

export interface StateSnapshotRenderInput {
  vendor: Vendor;
  sid: string;
  reason: string;
  recentEvents: OmaEvent[];
  facts?: MemoryFact[];
}

function renderRecentEvents(events: OmaEvent[]): string[] {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      if (event.kind !== "boundary") return true;
      if (seen.has(event.kind)) return false;
      seen.add(event.kind);
      return true;
    })
    .map((event) =>
      event.kind === "boundary" ? "- boundary" : `- ${event.ts} ${event.kind}`,
    );
}

function renderMemoryFacts(facts: MemoryFact[]): string[] {
  if (facts.length === 0) return ["- none"];
  return facts.map((fact) => {
    const source = fact.source ? ` (${fact.source})` : "";
    return `- ${fact.text}${source}`;
  });
}

function renderClaudeSnapshot(input: StateSnapshotRenderInput): string {
  const facts = input.facts ?? [];
  const events = renderRecentEvents(input.recentEvents);
  return [
    "[OMA STATE SNAPSHOT]",
    `sid: ${input.sid}`,
    `reason: ${input.reason}`,
    ...(events.length ? ["recent events:", ...events] : []),
    ...(facts.length ? ["memory facts:", ...renderMemoryFacts(facts)] : []),
  ].join("\n");
}

export function renderStateSnapshot(input: StateSnapshotRenderInput): string {
  switch (input.vendor) {
    case "claude":
      return renderClaudeSnapshot(input);
    case "antigravity":
    case "codex":
    case "commandcode":
    case "cursor":
    case "grok":
    case "kimi":
    case "kiro":
    case "pi":
    case "qwen":
      return renderClaudeSnapshot(input);
  }
}
