import { existsSync } from "node:fs";
import { type OmaEvent, retryObservePath } from "../../state/events.js";
import {
  acknowledgeMemoryRetryLine,
  acquireMemoryRetryDrainLock,
  readMemoryRetryQueue,
} from "../../state/memory-retry-queue.js";
import { createMemoryProvider } from "../../state/semantic-memory.js";
import type {
  MemoryProvider,
  MemoryRetryDrainResult,
} from "../../types/memory.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

function parseRetryLine(line: string): OmaEvent | null {
  try {
    const parsed = JSON.parse(line) as Partial<OmaEvent>;
    if (
      typeof parsed.sid === "string" &&
      typeof parsed.kind === "string" &&
      typeof parsed.eventId === "string" &&
      typeof parsed.ts === "string"
    ) {
      return parsed as OmaEvent;
    }
    return null;
  } catch {
    return null;
  }
}

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
  const shouldObserve = !args.dryRun && provider.observeEvents !== false;
  const release = shouldObserve
    ? await acquireMemoryRetryDrainLock(projectDir)
    : undefined;

  try {
    const lines = readMemoryRetryQueue(projectDir);
    let drained = 0;
    let invalid = 0;

    for (const entry of lines) {
      const event = parseRetryLine(entry.line);
      if (!event) {
        invalid += 1;
        continue;
      }
      if (!shouldObserve) continue;

      const observed = await provider.observe({
        sessionId: event.sid,
        content: `${JSON.stringify(event)}\n`,
        source: "oma-workflow",
      });
      if (observed) {
        acknowledgeMemoryRetryLine(projectDir, entry);
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
