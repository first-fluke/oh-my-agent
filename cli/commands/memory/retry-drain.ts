import { existsSync } from "node:fs";
import {
  deliverMemoryRetryEntry,
  retryObservePath,
} from "../../state/events.js";
import {
  acquireMemoryRetryDrainLock,
  parseMemoryRetryLine,
  readMemoryRetryQueue,
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
  if (!existsSync(retryPath)) {
    return {
      retryPath,
      total: 0,
      drained: 0,
      retained: 0,
      invalid: 0,
      dryRun: args.dryRun === true,
    };
  }
  const shouldDeliver =
    !args.dryRun && provider.name !== "none" && provider.enabled !== false;
  const release = shouldDeliver
    ? await acquireMemoryRetryDrainLock(projectDir)
    : undefined;

  try {
    const lines = readMemoryRetryQueue(projectDir);
    let drained = 0;
    let invalid = 0;

    for (const entry of lines) {
      if (!parseMemoryRetryLine(entry.line)) {
        invalid += 1;
        continue;
      }
      if (!shouldDeliver) continue;
      if (await deliverMemoryRetryEntry(projectDir, entry, provider)) {
        drained += 1;
      }
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
