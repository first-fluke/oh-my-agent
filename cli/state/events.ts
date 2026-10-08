import {
  createEventId,
  emitEvent,
  type OmaEvent,
  SEMANTIC_EVENT_KINDS,
} from "../../.agents/hooks/core/state-core.ts";
import type { MemoryDeliveryTarget, MemoryProvider } from "../types/memory.js";
import { loadProviders } from "../utils/providers.js";
import {
  createMemoryDeliveryTarget,
  memoryDeliveryTargetMatches,
  sameMemoryDeliveryTarget,
} from "./memory-delivery-target.js";
import {
  reconcileMemoryDeliveryOutbox,
  writeMemoryDeliveryIntent,
} from "./memory-outbox.js";
import {
  acknowledgeMemoryRetryLine,
  acquireMemoryRetryDrainLock,
  type MemoryRetryLine,
  memoryRetryTarget,
  parseMemoryRetryLine,
  readMemoryRetryQueue,
} from "./memory-retry-queue.js";
import { createMemoryProvider } from "./semantic-memory.js";

export * from "../../.agents/hooks/core/state-core.ts";
export { reconcileMemoryDeliveryOutbox } from "./memory-outbox.js";
export { retryObservePath } from "./memory-retry-queue.js";

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
  const target = memoryRetryTarget(entry);
  if (!target || !memoryDeliveryTargetMatches(projectDir, target, provider))
    return false;
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
        projectDir: target.projectDir,
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
  if (!SEMANTIC_EVENT_KINDS.has(event.kind)) return event;
  let prepared: { target: MemoryDeliveryTarget } | undefined;
  try {
    provider = resolveEventMemoryProvider(projectDir, provider);
    prepared = prepareEventMemory(projectDir, event, provider);
  } catch (error) {
    console.warn(`[state] Memory provider unavailable: ${String(error)}`);
    return event;
  }
  if (!prepared) return event;

  let release: (() => void) | undefined;
  try {
    // The durable intent precedes the await. Recovery never appends another L1 event.
    release = await acquireMemoryRetryDrainLock(projectDir, 1000);
    reconcileMemoryDeliveryOutbox(projectDir);
    const entry = readMemoryRetryQueue(projectDir).find((candidate) => {
      const record = parseMemoryRetryLine(candidate.line);
      const target = memoryRetryTarget(candidate);
      return (
        record?.event.eventId === event.eventId &&
        record.event.sid === event.sid &&
        target !== undefined &&
        sameMemoryDeliveryTarget(target, prepared.target)
      );
    });
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
  return event;
}

function resolveEventMemoryProvider(
  projectDir: string,
  provider?: MemoryProvider,
): MemoryProvider {
  if (provider) return provider;
  try {
    return createMemoryProvider({ projectDir });
  } catch (error) {
    console.warn(`[state] Memory provider unavailable: ${String(error)}`);
    const selected = loadProviders(projectDir).semantic_memory;
    // Retain intent with an unresolved destination; never guess after config repair.
    return {
      name: selected,
      enabled: selected !== "none",
      observeEvents: selected === "agentmemory",
      deliveryIdentity: { endpoint: null },
      status: async () => ({ provider: selected, reachable: false }),
      observe: async () => false,
      remember: async () => false,
    };
  }
}

function prepareEventMemory(
  projectDir: string,
  event: OmaEvent,
  provider: MemoryProvider,
): { target: MemoryDeliveryTarget } | undefined {
  if (!SEMANTIC_EVENT_KINDS.has(event.kind) || provider.enabled === false)
    return undefined;
  const delivery = {
    observe: provider.name !== "none" && provider.observeEvents !== false,
    remember:
      rememberContentForEvent(event) !== null &&
      canRememberEvent(event, provider),
  };
  if (!delivery.observe && !delivery.remember) return undefined;
  const target = createMemoryDeliveryTarget(projectDir, provider);
  try {
    writeMemoryDeliveryIntent(projectDir, event, delivery, target);
  } catch (error) {
    // L1 remains authoritative when optional delivery storage is unavailable.
    console.warn(
      `[state] Memory delivery intent write failed: ${String(error)}`,
    );
    return undefined;
  }
  return { target };
}

export async function emitEventWithMemory(
  projectDir: string,
  sid: string,
  event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
  provider?: MemoryProvider,
): Promise<OmaEvent> {
  const normalized: OmaEvent = {
    eventId: event.eventId ?? createEventId(),
    ts: event.ts ?? new Date().toISOString(),
    sid,
    kind: event.kind,
    writerPid: event.writerPid ?? process.pid,
    vendor: event.vendor,
    vendorSid: event.vendorSid,
    parentEventId: event.parentEventId,
    causalityKey: event.causalityKey,
    payload: event.payload,
  };
  if (SEMANTIC_EVENT_KINDS.has(normalized.kind)) {
    try {
      provider = resolveEventMemoryProvider(projectDir, provider);
      prepareEventMemory(projectDir, normalized, provider);
    } catch (error) {
      console.warn(`[state] Memory intent unavailable: ${String(error)}`);
    }
  }
  return deliverEventMemory(
    projectDir,
    emitEvent(projectDir, sid, normalized),
    provider,
  );
}
