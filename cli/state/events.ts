import {
  emitEvent,
  type OmaEvent,
  SEMANTIC_EVENT_KINDS,
} from "../../.agents/hooks/core/state-core.ts";
import type { MemoryProvider } from "../types/memory.js";
import { loadProviders } from "../utils/providers.js";
import {
  acknowledgeMemoryRetryLine,
  acquireMemoryRetryDrainLock,
  enqueueMemoryRetry,
  type MemoryRetryLine,
  parseMemoryRetryLine,
  readMemoryRetryQueue,
} from "./memory-retry-queue.js";
import { createMemoryProvider } from "./semantic-memory.js";

export * from "../../.agents/hooks/core/state-core.ts";

/**
 * Build a human-readable narrative for events worth recalling across vendor /
 * session boundaries. `observe` keeps the raw JSON envelope (which AgentMemory
 * never enriches), so decisions and blockers are additionally `remember`ed as
 * durable facts so `/search` can surface them with a meaningful score.
 *
 * Returns null for events that should not become durable facts.
 */
export function rememberContentForEvent(
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

function supportsRememberKind(
  kind: string,
  provider: MemoryProvider["name"],
): boolean {
  return (
    provider !== "none" &&
    (provider !== "honcho" ||
      [
        "decision.made",
        "blocker.raised",
        "skill.pattern.consolidated",
      ].includes(kind))
  );
}

function canRememberEvent(event: OmaEvent, provider: MemoryProvider): boolean {
  return (
    provider.enabled !== false &&
    typeof provider.remember === "function" &&
    supportsRememberKind(event.kind, provider.name)
  );
}

async function tryMemoryDelivery(
  deliver: () => Promise<boolean>,
): Promise<boolean> {
  try {
    return await deliver();
  } catch {
    return false;
  }
}

/** Resume memory delivery without appending another L1 event. Caller holds the drain lease. */
export async function deliverMemoryRetryEntry(
  projectDir: string,
  entry: MemoryRetryLine,
  provider: MemoryProvider,
): Promise<boolean> {
  const record = parseMemoryRetryLine(entry.line);
  if (!record || provider.enabled === false) return false;
  const { event, delivery } = record;
  let observed =
    !delivery.observe || entry.delivered?.includes("observe") === true;
  let remembered =
    !delivery.remember || entry.delivered?.includes("remember") === true;
  if (!observed && provider.observeEvents !== false) {
    observed = await tryMemoryDelivery(() =>
      provider.observe({
        sessionId: event.sid,
        content: `${JSON.stringify(event)}\n`,
        source: "oma-workflow",
      }),
    );
    if (observed) acknowledgeMemoryRetryLine(projectDir, entry, "observe");
  }
  const memo = rememberContentForEvent(event);
  const remember = provider.remember;
  if (!remembered && memo && remember && canRememberEvent(event, provider)) {
    remembered = await tryMemoryDelivery(() =>
      remember.call(provider, {
        sessionId: event.sid,
        ...memo,
      }),
    );
    if (remembered) acknowledgeMemoryRetryLine(projectDir, entry, "remember");
  }
  return observed && remembered;
}

/** Deliver an already appended L1 event without changing its identity or appending again. */
export async function deliverEventMemory(
  projectDir: string,
  event: OmaEvent,
  provider?: MemoryProvider,
): Promise<OmaEvent> {
  const enriched = event;
  if (!SEMANTIC_EVENT_KINDS.has(enriched.kind)) return enriched;
  const memo = rememberContentForEvent(enriched);

  try {
    provider ??= createMemoryProvider({ projectDir });
  } catch (error) {
    console.warn(`[state] Memory provider unavailable: ${String(error)}`);
    try {
      const selected = loadProviders(projectDir).semantic_memory;
      const delivery = {
        observe: selected === "agentmemory",
        remember:
          memo !== null && supportsRememberKind(enriched.kind, selected),
      };
      if (delivery.observe || delivery.remember) {
        enqueueMemoryRetry(projectDir, enriched, delivery);
      }
    } catch (queueError) {
      console.warn(
        `[state] Memory retry enqueue failed: ${String(queueError)}`,
      );
    }
    return enriched;
  }
  if (provider.enabled === false) return enriched;

  const delivery = {
    observe: provider.name !== "none" && provider.observeEvents !== false,
    remember: memo !== null && canRememberEvent(enriched, provider),
  };
  if (!delivery.observe && !delivery.remember) return enriched;

  let release: (() => void) | undefined;
  try {
    // Queue before awaiting the lease or provider, so interruption leaves durable work.
    const line = enqueueMemoryRetry(projectDir, enriched, delivery);
    release = await acquireMemoryRetryDrainLock(projectDir, 1000);
    // A drain may have completed this row while we waited for its lease.
    const entry = readMemoryRetryQueue(projectDir).find(
      (candidate) => candidate.line === line,
    );
    if (entry) await deliverMemoryRetryEntry(projectDir, entry, provider);
  } catch (error) {
    console.warn(`[state] Memory delivery deferred: ${String(error)}`);
  } finally {
    try {
      release?.();
    } catch (error) {
      console.warn(
        `[state] Memory delivery lease cleanup failed: ${String(error)}`,
      );
    }
  }
  return enriched;
}

export async function emitEventWithMemory(
  projectDir: string,
  sid: string,
  event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
  provider?: MemoryProvider,
): Promise<OmaEvent> {
  return deliverEventMemory(
    projectDir,
    emitEvent(projectDir, sid, event),
    provider,
  );
}
