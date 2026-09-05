import { appendFileSync } from "node:fs";
import {
  emitEvent,
  ensureParent,
  type OmaEvent,
  retryObservePath,
  SEMANTIC_EVENT_KINDS,
} from "../../.agents/hooks/core/state-core.ts";
import type { MemoryProvider } from "../types/memory.js";
import { createAgentMemoryProvider } from "./memory-provider.js";

export * from "../../.agents/hooks/core/state-core.ts";

function enqueueObserveRetry(projectDir: string, event: OmaEvent): void {
  const path = retryObservePath(projectDir);
  ensureParent(path);
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf-8");
}

/**
 * Build a human-readable narrative for events worth recalling across vendor /
 * session boundaries. `observe` keeps the raw JSON envelope (which AgentMemory
 * never enriches), so decisions and blockers are additionally `remember`ed as
 * durable facts so `/search` can surface them with a meaningful score.
 *
 * Returns null for events that should not become durable facts.
 */
function rememberContentForEvent(
  event: OmaEvent,
): { content: string; importance: number } | null {
  const payload = event.payload ?? {};
  const str = (key: string): string => {
    const value = payload[key];
    return typeof value === "string" && value.trim() ? value.trim() : "";
  };

  if (event.kind === "decision.made") {
    const subject = str("subject");
    // scm.* decisions (commit splits, merges, pushes) are durably recorded in
    // git history already; remembering each one as a fact crowds real
    // cross-session decisions out of the bounded boundary recall window. They
    // still reach `observe`, so the session timeline keeps the full record.
    if (subject.startsWith("scm.")) return null;
    const decision = str("decision");
    const rationale = str("rationale");
    if (!subject && !decision) return null;
    const content = [
      subject ? `Decision [${subject}]:` : "Decision:",
      decision,
      rationale ? `Rationale: ${rationale}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { content, importance: 8 };
  }

  if (event.kind === "blocker.raised") {
    const summary = str("summary");
    if (!summary) return null;
    const severity = str("severity");
    const remediation = str("remediation");
    const content = [
      `Blocker: ${summary}`,
      severity ? `(severity: ${severity})` : "",
      remediation ? `Remediation: ${remediation}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { content, importance: 7 };
  }

  if (event.kind === "skill.pattern.consolidated") {
    const skillId = str("skillId");
    const suiteHash = str("suiteHash");
    const summary = str("summary");
    if (!skillId || !suiteHash || !summary) return null;
    const scope = [
      skillId,
      suiteHash,
      str("sourceRuntime"),
      str("targetRuntime"),
      str("environmentHash"),
    ]
      .filter(Boolean)
      .join(":");
    const content = [
      `[skill-evolution:${scope}]`,
      "Pattern:",
      summary,
      str("evidenceIds") ? `Evidence: ${str("evidenceIds")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { content, importance: 7 };
  }

  if (event.kind === "skill.proposal.gated") {
    const skillId = str("skillId");
    const suiteHash = str("suiteHash");
    const edit = payload.edit;
    const outcome = str("outcome");
    if (!skillId || !suiteHash || !outcome || !edit) return null;
    const scope = [
      skillId,
      suiteHash,
      str("sourceRuntime"),
      str("targetRuntime"),
      str("environmentHash"),
    ]
      .filter(Boolean)
      .join(":");
    const delta = payload.deltaLift;
    const reason = str("reason");
    const content = [
      `[skill-evolution:${scope}]`,
      `Proposal ${outcome}:`,
      JSON.stringify(edit),
      typeof delta === "number" ? `deltaLift=${delta}` : "",
      reason ? `Reason: ${reason}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { content, importance: outcome === "accepted" ? 8 : 6 };
  }

  return null;
}
export async function emitEventWithMemory(
  projectDir: string,
  sid: string,
  event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
  provider: MemoryProvider = createAgentMemoryProvider(),
): Promise<OmaEvent> {
  const enriched = emitEvent(projectDir, sid, event);
  if (!SEMANTIC_EVENT_KINDS.has(enriched.kind)) return enriched;

  const observed = await provider.observe({
    sessionId: sid,
    content: `${JSON.stringify(enriched)}\n`,
    source: "oma-workflow",
  });
  if (!observed) enqueueObserveRetry(projectDir, enriched);

  // Durable, recallable fact for cross-boundary rehydration (best-effort: a
  // failure here never affects L1 or the observe retry queue). Feature-detected
  // so provider stubs without `remember` stay valid.
  const memo = rememberContentForEvent(enriched);
  if (memo && typeof provider.remember === "function") {
    try {
      await provider.remember({
        sessionId: sid,
        content: memo.content,
        importance: memo.importance,
      });
    } catch {
      // Non-fatal: recall is an enhancement, not an L1 correctness guarantee.
    }
  }
  return enriched;
}
