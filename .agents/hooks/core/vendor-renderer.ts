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
  if (events.length === 0) return ["- none"];
  return events.map((event) => `- ${event.ts} ${event.kind}`);
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
  return [
    "[OMA STATE SNAPSHOT]",
    `sid: ${input.sid}`,
    `reason: ${input.reason}`,
    "recent events:",
    ...renderRecentEvents(input.recentEvents),
    "memory facts:",
    ...renderMemoryFacts(facts),
  ].join("\n");
}

export function renderStateSnapshot(input: StateSnapshotRenderInput): string {
  switch (input.vendor) {
    case "claude":
      return renderClaudeSnapshot(input);
    case "antigravity":
    case "codex":
    case "cursor":
    case "gemini":
    case "grok":
    case "qwen":
      return renderClaudeSnapshot(input);
  }
}
