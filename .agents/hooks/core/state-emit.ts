import { appendFileSync } from "node:fs";
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
  deriveMeta,
  eventsPath,
  metaPath,
  type OmaEvent,
  readEvents,
  refreshMeta,
  type SessionMeta,
  sortEvents,
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
      ensureParent(path);
      appendFileSync(path, `${JSON.stringify(enriched)}\n`, "utf-8");
    }
  }
  return enriched;
}
