import { createHash } from "node:crypto";
import { z } from "zod";
import { validateEventEnvelope } from "../../.agents/hooks/core/event-contract.ts";
import { deliverEventMemory, emitEvent, readEvents } from "./events.js";

const text = z.string().trim().min(1);

export const RequiredDecisionSchema = z.object({
  subject: text,
  description: text,
});
export type RequiredDecision = z.infer<typeof RequiredDecisionSchema>;
export const AgentDecisionSchema = z.object({
  subject: text,
  decision: text,
  rationale: text,
  alternatives: z.array(text).optional(),
  evidence: z.array(text).optional(),
});
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export interface AgentDecisionScope {
  artifactRoot: string;
  sessionId: string;
  agentId: string;
  taskId: string;
  runId: string;
  vendor?: string;
}

function scopedDecisionEvents(scope: AgentDecisionScope) {
  const events = readEvents(scope.artifactRoot, scope.sessionId);
  const counts = new Map<string, number>();
  for (const event of events)
    counts.set(event.eventId, (counts.get(event.eventId) ?? 0) + 1);
  return events.filter(
    (event) =>
      event.kind === "decision.made" &&
      event.sid === scope.sessionId &&
      counts.get(event.eventId) === 1 &&
      validateEventEnvelope(event).length === 0 &&
      AgentDecisionSchema.safeParse(event.payload).success &&
      event.payload?.agentId === scope.agentId &&
      event.payload?.taskId === scope.taskId &&
      event.payload?.runId === scope.runId &&
      event.payload?.instanceId === scope.runId,
  );
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}

/** Persist the parent's parsed claim with the run's actual identity. */
export function recordAgentDecisions(
  scope: AgentDecisionScope,
  decisions: AgentDecision[],
): string[] {
  const parsed = z.array(AgentDecisionSchema).parse(decisions);
  if (
    new Set(parsed.map((decision) => decision.subject)).size !== parsed.length
  )
    throw new Error("Agent decision subjects must be unique within a run");
  if (parsed.length === 0) return [];
  const existing = scopedDecisionEvents(scope);
  return parsed.map((decision) => {
    const eventId = `agent-decision-${scope.runId}-${createHash("sha256")
      .update(decision.subject)
      .digest("hex")}`;
    const previous = existing.find((event) => event.eventId === eventId);
    if (previous) {
      const content = AgentDecisionSchema.parse(previous.payload);
      if (JSON.stringify(content) !== JSON.stringify(decision))
        throw new Error(
          `Agent decision changed during finalization: ${decision.subject}`,
        );
      return previous.eventId;
    }
    return emitEvent(scope.artifactRoot, scope.sessionId, {
      eventId,
      kind: "decision.made",
      vendor: scope.vendor,
      payload: {
        ...decision,
        agentId: scope.agentId,
        taskId: scope.taskId,
        runId: scope.runId,
        instanceId: scope.runId,
      },
    }).eventId;
  });
}

/** A decision from another agent, task, attempt, or session is not evidence. */
export function verifyAgentDecisions(
  scope: AgentDecisionScope,
  required: z.infer<typeof RequiredDecisionSchema>[],
  decisionEventIds?: string[],
  expectedHashes?: Record<string, string>,
): {
  ok: boolean;
  missing: z.infer<typeof RequiredDecisionSchema>[];
  eventIds: string[];
  eventHashes: Record<string, string>;
} {
  if (required.length === 0 && decisionEventIds?.length === 0)
    return {
      ok: !expectedHashes || Object.keys(expectedHashes).length === 0,
      missing: [],
      eventIds: [],
      eventHashes: {},
    };
  const selected = decisionEventIds ? new Set(decisionEventIds) : undefined;
  const events = scopedDecisionEvents(scope).filter(
    (event) => !selected || selected.has(event.eventId),
  );
  const subjects = new Set(events.map((event) => event.payload?.subject));
  const missing = required.filter(
    (decision) => !subjects.has(decision.subject),
  );
  const eventIds = events.map((event) => event.eventId);
  const eventHashes = Object.fromEntries(
    events.map((event) => [
      event.eventId,
      createHash("sha256")
        .update(JSON.stringify(canonical(event)))
        .digest("hex"),
    ]),
  );
  return {
    ok:
      missing.length === 0 &&
      (!selected ||
        (selected.size === decisionEventIds?.length &&
          selected.size === eventIds.length)) &&
      (!expectedHashes ||
        (Object.keys(expectedHashes).length === eventIds.length &&
          eventIds.every((id) => expectedHashes[id] === eventHashes[id]))),
    missing,
    eventIds,
    eventHashes,
  };
}

/** Delivery queues before its first await; interrupted CLI exits leave retries. */
export function deliverAgentDecisionMemory(scope: AgentDecisionScope): void {
  try {
    for (const event of readEvents(scope.artifactRoot, scope.sessionId)) {
      if (
        (event.kind === "decision.made" || event.kind === "decision.missing") &&
        event.sid === scope.sessionId &&
        validateEventEnvelope(event).length === 0 &&
        event.payload?.agentId === scope.agentId &&
        event.payload?.taskId === scope.taskId &&
        event.payload?.runId === scope.runId &&
        event.payload?.instanceId === scope.runId
      ) {
        void deliverEventMemory(scope.artifactRoot, event).catch((error) => {
          console.warn(
            `[state] Agent decision memory delivery deferred: ${String(error)}`,
          );
        });
      }
    }
  } catch (error) {
    console.warn(
      `[state] Agent decision memory delivery deferred: ${String(error)}`,
    );
  }
}
