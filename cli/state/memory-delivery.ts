import {
  type OmaEvent,
  SEMANTIC_EVENT_KINDS,
} from "../../.agents/hooks/core/state-core.ts";
import type {
  MemoryDeliveryTarget,
  MemoryProvider,
  MemoryRetryDrainResult,
} from "../types/memory.js";
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
  readMemoryRetryEntries,
  readMemoryRetryQueue,
  retryObservePath,
} from "./memory-retry-queue.js";
import { createMemoryProvider } from "./semantic-memory.js";

/** A durable intent bound to one event, destination, and provider instance. */
export interface PreparedMemoryDelivery {
  readonly event: OmaEvent;
  readonly target: MemoryDeliveryTarget;
  readonly provider: MemoryProvider;
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
async function deliverMemoryRetryEntry(
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
        profile: target.profile,
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
        projectDir: target.projectDir,
        profile: target.profile,
        ...memo,
      }),
    );
    if (remembered) acknowledgeMemoryRetryLine(projectDir, entry, "remember");
  }
  return observed && remembered;
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

/** Persist intent synchronously so the caller can append L1 before delivery. */
export function prepareMemoryDelivery(
  projectDir: string,
  event: OmaEvent,
  provider?: MemoryProvider,
): PreparedMemoryDelivery | undefined {
  if (!SEMANTIC_EVENT_KINDS.has(event.kind)) return undefined;
  try {
    provider = resolveEventMemoryProvider(projectDir, provider);
    if (provider.enabled === false) return undefined;
    const delivery = {
      observe: provider.name !== "none" && provider.observeEvents !== false,
      remember:
        rememberContentForEvent(event) !== null &&
        canRememberEvent(event, provider),
    };
    if (!delivery.observe && !delivery.remember) return undefined;
    const target = createMemoryDeliveryTarget(projectDir, provider);
    writeMemoryDeliveryIntent(projectDir, event, delivery, target);
    return { event, target, provider };
  } catch (error) {
    // Optional delivery storage or provider failure must not cancel L1.
    console.warn(
      `[state] Memory delivery intent unavailable: ${String(error)}`,
    );
    return undefined;
  }
}

/**
 * Owns the complete delivery transition: lease, recovery, selection, provider
 * operations, per-operation ACKs, and lease release. No L1 writes occur here.
 */
async function processMemoryDeliveries(args: {
  projectDir: string;
  provider: MemoryProvider;
  dryRun?: boolean;
  prepared?: PreparedMemoryDelivery;
}): Promise<MemoryRetryDrainResult> {
  const { projectDir, provider, prepared } = args;
  const shouldDeliver =
    !args.dryRun && provider.name !== "none" && provider.enabled !== false;
  const release = shouldDeliver
    ? await acquireMemoryRetryDrainLock(projectDir, prepared ? 1000 : 30_000)
    : undefined;
  try {
    if (shouldDeliver) reconcileMemoryDeliveryOutbox(projectDir);
    const pending = readMemoryRetryQueue(projectDir);
    const selected = prepared
      ? pending.find((entry) => {
          const record = parseMemoryRetryLine(entry.line);
          const target = memoryRetryTarget(entry);
          return (
            record?.event.eventId === prepared.event.eventId &&
            record.event.sid === prepared.event.sid &&
            target !== undefined &&
            sameMemoryDeliveryTarget(target, prepared.target)
          );
        })
      : undefined;
    const lines = prepared ? (selected ? [selected] : []) : pending;
    let drained = 0;
    let invalid = 0;
    const seenDeliveryIds = new Set<string>();
    for (const entry of lines) {
      if (!parseMemoryRetryLine(entry.line)) {
        invalid += 1;
        continue;
      }
      if (!shouldDeliver) continue;
      if (entry.deliveryId && seenDeliveryIds.has(entry.deliveryId)) {
        const updated = readMemoryRetryEntries(projectDir).find(
          (candidate) =>
            candidate.deliveryId === entry.deliveryId &&
            candidate.delivered?.length,
        );
        if (updated) entry.delivered = updated.delivered;
      }
      if (await deliverMemoryRetryEntry(projectDir, entry, provider))
        drained += 1;
      if (entry.deliveryId) seenDeliveryIds.add(entry.deliveryId);
    }
    return {
      retryPath: retryObservePath(projectDir),
      total: lines.length,
      drained,
      retained: lines.length - drained,
      invalid,
      dryRun: args.dryRun === true,
    };
  } finally {
    release?.();
  }
}

/** Complete a prepared delivery after its event has been appended to L1. */
export async function deliverPreparedMemory(
  projectDir: string,
  prepared: PreparedMemoryDelivery,
): Promise<void> {
  try {
    await processMemoryDeliveries({
      projectDir,
      provider: prepared.provider,
      prepared,
    });
  } catch (error) {
    console.warn(`[state] Memory delivery deferred: ${String(error)}`);
  }
}

/** Deliver an existing L1 event without appending it again or draining other events. */
export async function deliverEventMemory(
  projectDir: string,
  event: OmaEvent,
  provider?: MemoryProvider,
): Promise<OmaEvent> {
  const prepared = prepareMemoryDelivery(projectDir, event, provider);
  if (prepared) await deliverPreparedMemory(projectDir, prepared);
  return event;
}

/** Drain pending deliveries, or inspect them without recovery or writes. */
export async function drainMemoryDeliveries(args: {
  projectDir: string;
  provider?: MemoryProvider;
  dryRun?: boolean;
}): Promise<MemoryRetryDrainResult> {
  return processMemoryDeliveries({
    projectDir: args.projectDir,
    provider:
      args.provider ?? createMemoryProvider({ projectDir: args.projectDir }),
    dryRun: args.dryRun,
  });
}
