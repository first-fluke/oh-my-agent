import {
  createEventId,
  emitEvent,
  type OmaEvent,
} from "../../.agents/hooks/core/state-core.ts";
import type { MemoryProvider } from "../types/memory.js";
import {
  deliverPreparedMemory,
  prepareMemoryDelivery,
} from "./memory-delivery.js";

export * from "../../.agents/hooks/core/state-core.ts";
export { retryObservePath } from "./memory-retry-queue.js";

/** Append the L1 event between the delivery intent and optional remote delivery. */
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
  const prepared = prepareMemoryDelivery(projectDir, normalized, provider);
  const committed = emitEvent(projectDir, sid, normalized);
  if (prepared) await deliverPreparedMemory(projectDir, prepared);
  return committed;
}
