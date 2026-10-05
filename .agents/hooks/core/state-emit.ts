import { closeSync, fsyncSync, openSync, writeFileSync } from "node:fs";
import { observeWithTimeout } from "./agentmemory-client.ts";
import {
  emitEvent as appendEvent,
  ensureParent,
  type OmaEvent,
  retryObservePath,
  SEMANTIC_EVENT_KINDS,
} from "./state-core.ts";

export {
  createEventId,
  createSessionId,
  deriveMeta,
  eventsPath,
  metaPath,
  type OmaEvent,
  readEvents,
  refreshMeta,
  type SessionMeta,
  sortEvents,
  vendorHomePayload,
} from "./state-core.ts";

export async function emitEvent(
  projectDir: string,
  sid: string,
  event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
): Promise<OmaEvent> {
  const enriched = appendEvent(projectDir, sid, event);
  if (SEMANTIC_EVENT_KINDS.has(enriched.kind)) {
    const observed = await observeWithTimeout({
      sessionId: sid,
      content: `${JSON.stringify(enriched)}\n`,
      source: "oma-workflow",
      projectDir,
    });
    if (!observed) {
      const path = retryObservePath(projectDir);
      try {
        ensureParent(path);
        const fd = openSync(path, "a", 0o600);
        try {
          // Separate a prior interrupted row without replacing the append-only
          // log or invalidating an already-open writer. Legacy rows retry observe.
          writeFileSync(fd, `\n${JSON.stringify(enriched)}\n`, "utf-8");
          fsyncSync(fd);
        } finally {
          closeSync(fd);
        }
      } catch (error) {
        // L1 is already authoritative; an optional retry-log failure must not
        // make callers repeat the event or restore completed workflow state.
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(
          `[oma] observation retry write failed: ${message}\n`,
        );
        process.stderr.write(`[oma]   path=${path}\n`);
      }
    }
  }
  return enriched;
}
