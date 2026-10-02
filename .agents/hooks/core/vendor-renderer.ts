#!/usr/bin/env bun
import { stripVTControlCharacters } from "node:util";
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
  /** Harness changes promoted since the last session that showed them. */
  evolution?: string[];
}

const MAX_SNAPSHOT_CHARS = 12_000;
const MAX_RECENT_EVENTS = 12;
const EVENT_FIELDS: Record<string, string[]> = {
  "decision.made": ["subject", "decision", "rationale", "instanceId"],
  "decision.missing": [
    "workflow",
    "checkpoint",
    "missing",
    "remediation",
    "instanceId",
  ],
  "workflow.phase": ["phase", "workflow", "summary"],
  "gate.passed": ["gate", "by", "workflow", "reviewer", "summary", "reason"],
  "gate.failed": ["gate", "workflow", "summary", "reason", "timedOut"],
  "blocker.raised": [
    "summary",
    "code",
    "severity",
    "remediation",
    "reason",
    "phase",
    "instanceId",
  ],
  "session.ended": ["status", "reason", "summary"],
};

export function snapshotText(value: unknown, limit = 160): string {
  if (
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return String(value);
  if (typeof value !== "string") return "";
  return stripVTControlCharacters(value.slice(0, 4096))
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, limit);
}

export function renderEventPayload(event: OmaEvent): string {
  return (EVENT_FIELDS[event.kind] ?? ["summary"])
    .map((field) => {
      const value =
        field === "missing"
          ? renderMissingSubjects(event.payload?.[field])
          : snapshotText(
              event.payload?.[field],
              field === "code" ? 64 : field === "severity" ? 32 : 160,
            );
      return value ? `${field}: ${JSON.stringify(value)}` : "";
    })
    .filter(Boolean)
    .join(" | ")
    .slice(0, 520);
}

function renderMissingSubjects(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const subjects: string[] = [];
  for (const record of value.slice(0, 20)) {
    if (!record || typeof record !== "object" || Array.isArray(record))
      continue;
    const raw = (record as Record<string, unknown>).subject;
    if (typeof raw !== "string") continue;
    const subject = snapshotText(raw, 64);
    if (!subject || subjects.includes(subject)) continue;
    subjects.push(subject);
    if (subjects.length === 3) break;
  }
  return subjects.join(", ");
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
    .slice(-MAX_RECENT_EVENTS)
    .map((event) => {
      if (event.kind === "boundary") return "- boundary";
      const details = renderEventPayload(event);
      return [
        `- ${snapshotText(event.ts, 32)} ${snapshotText(event.kind, 72)}`,
        ...(details ? [details] : []),
      ]
        .join(" | ")
        .slice(0, 640);
    });
}

function renderMemoryFacts(facts: MemoryFact[]): string[] {
  if (facts.length === 0) return ["- none"];
  return facts.slice(0, 6).map((fact) => {
    const sourceText = snapshotText(fact.source, 80);
    const source = sourceText ? ` (${sourceText})` : "";
    return `- ${snapshotText(fact.text, 240)}${source}`;
  });
}

function renderClaudeSnapshot(input: StateSnapshotRenderInput): string {
  const facts = input.facts ?? [];
  const events = renderRecentEvents(input.recentEvents);
  return [
    "[OMA STATE SNAPSHOT]",
    `sid: ${snapshotText(input.sid, 160)}`,
    `reason: ${snapshotText(input.reason, 240)}`,
    ...(events.length ? ["recent events:", ...events] : []),
    ...(facts.length ? ["memory facts:", ...renderMemoryFacts(facts)] : []),
    ...(input.evolution?.length
      ? [
          "harness evolved since your last session (oma skill promotions --all):",
          ...input.evolution.slice(0, 6).map((line) => snapshotText(line, 200)),
        ]
      : []),
  ]
    .join("\n")
    .slice(0, MAX_SNAPSHOT_CHARS);
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
