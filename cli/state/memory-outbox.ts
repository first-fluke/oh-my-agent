import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { validateEventEnvelope } from "../../.agents/hooks/core/event-contract.ts";
import { projectIdentity } from "../../.agents/hooks/core/session-storage.ts";
import {
  type OmaEvent,
  readEvents,
} from "../../.agents/hooks/core/state-core.ts";
import type { MemoryDeliveryTarget } from "../types/memory.js";
import {
  isMemoryDeliveryTarget,
  memoryDeliveryTargetKey,
} from "./memory-delivery-target.js";
import {
  enqueueMemoryRetry,
  hasMemoryRetryEvent,
  type MemoryRetryDelivery,
} from "./memory-retry-queue.js";
import { runtimeStateDir } from "./project-runtime.js";

interface MemoryDeliveryIntent {
  version: 1;
  event: OmaEvent;
  delivery: MemoryRetryDelivery;
  target: MemoryDeliveryTarget;
}

export function memoryOutboxDir(projectDir: string): string {
  return join(runtimeStateDir(projectDir, "retry"), "outbox");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function ownsTarget(projectDir: string, target: MemoryDeliveryTarget): boolean {
  const identity = projectIdentity(projectDir);
  return (
    target.profile === identity.profile &&
    target.projectId === identity.projectId &&
    target.projectDir === identity.projectDir
  );
}

/** Persist the destination before L1 append; replay requires the exact L1 event. */
export function writeMemoryDeliveryIntent(
  projectDir: string,
  event: OmaEvent,
  delivery: MemoryRetryDelivery,
  target: MemoryDeliveryTarget,
): string {
  if (validateEventEnvelope(event).length || !ownsTarget(projectDir, target))
    throw new Error("Invalid memory delivery intent ownership or event");
  const directory = memoryOutboxDir(projectDir);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const key = createHash("sha256")
    .update(
      `${event.sid}\0${event.eventId}\0${memoryDeliveryTargetKey(target)}`,
    )
    .digest("hex");
  const path = join(directory, `${key}.json`);
  const record: MemoryDeliveryIntent = { version: 1, event, delivery, target };
  if (existsSync(path)) {
    if (canonical(JSON.parse(readFileSync(path, "utf8"))) !== canonical(record))
      throw new Error("Conflicting memory delivery intent for the same event");
    return path;
  }
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd: number | undefined;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeFileSync(fd, `${JSON.stringify(record)}\n`, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    try {
      linkSync(temporary, path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (
        canonical(JSON.parse(readFileSync(path, "utf8"))) !== canonical(record)
      )
        throw new Error(
          "Conflicting memory delivery intent for the same event",
        );
    }
    // Ensure a process exit after L1 append cannot lose the preceding intent.
    const directoryFd = openSync(directory, "r");
    try {
      try {
        fsyncSync(directoryFd);
      } catch (error) {
        if (
          !["EINVAL", "EPERM", "EISDIR"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        )
          throw error;
      }
    } finally {
      closeSync(directoryFd);
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  return path;
}

/** Caller holds the retry drain lease. No network calls and no L1 writes. */
export function reconcileMemoryDeliveryOutbox(projectDir: string): void {
  const directory = memoryOutboxDir(projectDir);
  if (!existsSync(directory)) return;
  const events = new Map<string, OmaEvent[]>();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^[a-f0-9]{64}\.json$/.test(entry.name)) continue;
    const path = join(directory, entry.name);
    try {
      const record = JSON.parse(
        readFileSync(path, "utf8"),
      ) as MemoryDeliveryIntent;
      if (
        record.version !== 1 ||
        !isMemoryDeliveryTarget(record.target) ||
        !ownsTarget(projectDir, record.target) ||
        validateEventEnvelope(record.event).length ||
        typeof record.delivery?.observe !== "boolean" ||
        typeof record.delivery?.remember !== "boolean"
      )
        throw new Error("Invalid memory delivery intent");
      const { event, target, delivery } = record;
      let sessionEvents = events.get(event.sid);
      if (!sessionEvents) {
        sessionEvents = readEvents(projectDir, event.sid);
        events.set(event.sid, sessionEvents);
      }
      if (
        !sessionEvents.some(
          (candidate) => canonical(candidate) === canonical(event),
        )
      )
        continue;
      if (!hasMemoryRetryEvent(projectDir, event, target))
        enqueueMemoryRetry(projectDir, event, delivery, target);
      // Queue append was fsynced, including already ACKed records after a crash.
      unlinkSync(path);
    } catch (error) {
      console.warn(`[state] Memory outbox recovery deferred: ${String(error)}`);
    }
  }
}
