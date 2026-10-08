import {
  deliverMemoryRetryEntry,
  reconcileMemoryDeliveryOutbox,
} from "../../state/events.js";
import {
  acquireMemoryRetryDrainLock,
  parseMemoryRetryLine,
  readMemoryRetryEntries,
  readMemoryRetryQueue,
  retryObservePath,
} from "../../state/memory-retry-queue.js";
import { createMemoryProvider } from "../../state/semantic-memory.js";
import type {
  MemoryProvider,
  MemoryRetryDrainResult,
} from "../../types/memory.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

export async function drainMemoryRetryQueue(
  args: {
    projectDir?: string;
    provider?: MemoryProvider;
    dryRun?: boolean;
  } = {},
): Promise<MemoryRetryDrainResult> {
  const projectDir = args.projectDir ?? resolveProjectRoot();
  const provider = args.provider ?? createMemoryProvider({ projectDir });
  const retryPath = retryObservePath(projectDir);
  const shouldDeliver =
    !args.dryRun && provider.name !== "none" && provider.enabled !== false;
  const release = shouldDeliver
    ? await acquireMemoryRetryDrainLock(projectDir)
    : undefined;

  try {
    if (shouldDeliver) reconcileMemoryDeliveryOutbox(projectDir);
    const lines = readMemoryRetryQueue(projectDir);
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
      if (await deliverMemoryRetryEntry(projectDir, entry, provider)) {
        drained += 1;
      }
      if (entry.deliveryId) seenDeliveryIds.add(entry.deliveryId);
    }

    return {
      retryPath,
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
