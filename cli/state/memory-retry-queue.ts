import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { setTimeout } from "node:timers/promises";
import {
  ensureParent,
  type OmaEvent,
} from "../../.agents/hooks/core/state-core.ts";
import type { MemoryDeliveryTarget } from "../types/memory.js";
import {
  isMemoryDeliveryTarget,
  memoryDeliveryTargetKey,
  sameMemoryDeliveryTarget,
} from "./memory-delivery-target.js";
import { runtimeStateDir } from "./project-runtime.js";

export type MemoryRetryDimension = "observe" | "remember";
export interface MemoryRetryDelivery {
  observe: boolean;
  remember: boolean;
}

export function retryObservePath(projectDir: string): string {
  return join(runtimeStateDir(projectDir, "retry"), "observe.jsonl");
}

export function parseMemoryRetryLine(line: string): {
  event: OmaEvent;
  delivery: MemoryRetryDelivery;
  target: MemoryDeliveryTarget;
} | null {
  try {
    const parsed = JSON.parse(line);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.sid !== "string" ||
      typeof parsed.kind !== "string" ||
      typeof parsed.eventId !== "string" ||
      typeof parsed.ts !== "string"
    )
      return null;
    const { memoryDelivery, memoryTarget, ...event } = parsed;
    if (!isMemoryDeliveryTarget(memoryTarget)) return null;
    const delivery = memoryDelivery;
    if (
      !delivery ||
      typeof delivery !== "object" ||
      typeof delivery.observe !== "boolean" ||
      typeof delivery.remember !== "boolean"
    )
      return null;
    return {
      event,
      delivery,
      target: memoryTarget,
    };
  } catch {
    return null;
  }
}

export function enqueueMemoryRetry(
  projectDir: string,
  event: OmaEvent,
  delivery: MemoryRetryDelivery,
  target: MemoryDeliveryTarget,
): string {
  if (!isMemoryDeliveryTarget(target))
    throw new Error("Invalid memory delivery target");
  const path = retryObservePath(projectDir);
  ensureParent(path);
  const line = JSON.stringify({
    ...event,
    memoryDelivery: delivery,
    memoryTarget: target,
  });
  appendDurable(path, line);
  return line;
}

function appendDurable(path: string, line: string): void {
  ensureParent(path);
  const fd = openSync(path, "a", 0o600);
  try {
    writeFileSync(fd, `\n${line}\n`, "utf-8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

export interface MemoryRetryLine {
  line: string;
  delivered?: MemoryRetryDimension[];
  target?: MemoryDeliveryTarget;
  deliveryId?: string;
}

function deliveryId(event: OmaEvent, target: MemoryDeliveryTarget): string {
  return `${memoryDeliveryTargetKey(target)}:${event.sid}:${event.eventId}`;
}

function readAcknowledgements(
  path: string,
): Map<string, Set<MemoryRetryDimension>> {
  const acknowledged = new Map<string, Set<MemoryRetryDimension>>();
  if (!existsSync(path)) return acknowledged;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    try {
      const entry = JSON.parse(line);
      if (
        !entry ||
        typeof entry.deliveryId !== "string" ||
        (entry.dimension !== "observe" && entry.dimension !== "remember")
      )
        continue;
      const delivered =
        acknowledged.get(entry.deliveryId) ?? new Set<MemoryRetryDimension>();
      delivered.add(entry.dimension);
      acknowledged.set(entry.deliveryId, delivered);
    } catch {
      /* Interrupted checkpoints leave work retryable. */
    }
  }
  return acknowledged;
}

/** Includes completed rows so L1 outbox recovery can avoid duplicate enqueue. */
export function readMemoryRetryEntries(projectDir: string): MemoryRetryLine[] {
  const path = retryObservePath(projectDir);
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const acknowledged = readAcknowledgements(`${path}.ack.jsonl`);
  const entries: MemoryRetryLine[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    // A valid historical event without the delivery contract is unsupported.
    // Keep malformed records visible to diagnostics, without delivering them.
    try {
      const value = JSON.parse(line);
      if (
        value &&
        typeof value === "object" &&
        typeof value.sid === "string" &&
        typeof value.kind === "string" &&
        typeof value.eventId === "string" &&
        typeof value.ts === "string" &&
        (value.memoryTarget === undefined || value.memoryDelivery === undefined)
      )
        continue;
    } catch {
      /* Report malformed rows below. */
    }
    const entry: MemoryRetryLine = { line };
    const record = parseMemoryRetryLine(line);
    if (record) {
      entry.target = record.target;
      entry.deliveryId = deliveryId(record.event, record.target);
      const dimensions = [...(acknowledged.get(entry.deliveryId) ?? [])];
      if (dimensions.length) entry.delivered = dimensions;
    }
    entries.push(entry);
  }
  return entries;
}

export function readMemoryRetryQueue(projectDir: string): MemoryRetryLine[] {
  return readMemoryRetryEntries(projectDir).filter((entry) => {
    if (
      entry.delivered?.includes("observe") &&
      entry.delivered.includes("remember")
    )
      return false;
    const record = parseMemoryRetryLine(entry.line);
    return (
      !record ||
      (record.delivery.observe && !entry.delivered?.includes("observe")) ||
      (record.delivery.remember && !entry.delivered?.includes("remember"))
    );
  });
}

export function memoryRetryTarget(
  entry: MemoryRetryLine,
): MemoryDeliveryTarget | undefined {
  return entry.target ?? parseMemoryRetryLine(entry.line)?.target;
}

export function hasMemoryRetryEvent(
  projectDir: string,
  event: OmaEvent,
  target: MemoryDeliveryTarget,
): boolean {
  return readMemoryRetryEntries(projectDir).some((entry) => {
    const parsed = parseMemoryRetryLine(entry.line);
    const queuedTarget = memoryRetryTarget(entry);
    return (
      parsed?.event.eventId === event.eventId &&
      parsed.event.sid === event.sid &&
      queuedTarget !== undefined &&
      sameMemoryDeliveryTarget(queuedTarget, target)
    );
  });
}

export function acknowledgeMemoryRetryLine(
  projectDir: string,
  entry: MemoryRetryLine,
  dimension: MemoryRetryDimension,
): void {
  if (!entry.deliveryId)
    throw new Error("Cannot acknowledge an invalid delivery record");
  appendDurable(
    `${retryObservePath(projectDir)}.ack.jsonl`,
    JSON.stringify({ deliveryId: entry.deliveryId, dimension }),
  );
}

interface DrainLockDatabase {
  exec(statement: string): unknown;
  close(): void;
}

async function acquireQueueLock(
  retryPath: string,
  timeoutMs: number,
): Promise<() => void> {
  mkdirSync(dirname(retryPath), { recursive: true, mode: 0o700 });
  const require = createRequire(import.meta.url);
  const Database = (
    typeof process.versions.bun === "string"
      ? require("bun:sqlite").Database
      : require("better-sqlite3")
  ) as new (
    path: string,
  ) => DrainLockDatabase;
  const database = new Database(`${retryPath}.drain-lock.sqlite`);
  try {
    database.exec("PRAGMA busy_timeout = 0");
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        database.exec("BEGIN IMMEDIATE");
        return () => {
          try {
            database.exec("ROLLBACK");
          } finally {
            database.close();
          }
        };
      } catch (error) {
        if (
          (error as { code?: string }).code !== "SQLITE_BUSY" ||
          Date.now() >= deadline
        )
          throw error;
        await setTimeout(25);
      }
    }
  } catch (error) {
    database.close();
    throw error;
  }
}

export async function acquireMemoryRetryDrainLock(
  projectDir: string,
  timeoutMs = 30_000,
): Promise<() => void> {
  return acquireQueueLock(retryObservePath(projectDir), timeoutMs);
}
