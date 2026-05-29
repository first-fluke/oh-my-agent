import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import type { MemoryRawTurn } from "../../../../types/memory.js";

// Utility functions for recap history parsers. Each vendor parser reads a
// different on-disk shape, but they converge on the same primitives: read
// JSONL, window-filter by timestamp, name a project from a path, and pair a
// user prompt with the following assistant response.

/** Max characters kept from an assistant response preview. */
export const RESPONSE_PREVIEW = 200;

/** Truncate text to a preview length (default {@link RESPONSE_PREVIEW}). */
export function preview(text: string, max = RESPONSE_PREVIEW): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Last non-empty path segment as a project name (ignores trailing slashes). */
export function pathToProjectName(path?: string): string | undefined {
  if (!path) return undefined;
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || undefined;
}

/** True when ts is a finite number inside the half-open range [start, end). */
export function inWindow(ts: number, start: number, end: number): boolean {
  return Number.isFinite(ts) && ts >= start && ts < end;
}

export function stableShortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function rawTurnIdempotencyKey(args: {
  vendor: string;
  sessionId: string;
  timestamp: number;
  role: string;
  sourcePath: string;
  text: string;
}): string {
  return [
    args.vendor,
    args.sessionId,
    args.timestamp,
    args.role,
    stableShortHash(`${args.sourcePath}\n${args.text}`),
  ].join(":");
}

export function parseTimestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function createRawTurn(
  args: Omit<MemoryRawTurn, "idempotencyKey">,
): MemoryRawTurn {
  return {
    ...args,
    idempotencyKey: rawTurnIdempotencyKey({
      vendor: args.vendor,
      sessionId: args.vendorSessionId ?? args.sourcePath ?? "no-session",
      timestamp: args.timestamp,
      role: args.role,
      sourcePath: args.sourcePath ?? "",
      text: args.text,
    }),
  };
}

export function sortRawTurns(turns: MemoryRawTurn[]): MemoryRawTurn[] {
  return turns.sort((a, b) => a.timestamp - b.timestamp);
}

/** Parse a JSONL file synchronously, skipping blank and malformed lines. */
export function readJsonlSync<T = unknown>(path: string): T[] {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return [];
  }
  const rows: T[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as T);
    } catch {
      // skip malformed line
    }
  }
  return rows;
}

/**
 * Stream a JSONL file line by line, skipping blank and malformed lines.
 * Callers should ensure the file exists; a missing file rejects like the
 * underlying read stream.
 */
export async function* streamJsonl<T = unknown>(
  path: string,
): AsyncGenerator<T> {
  const rl = createInterface({
    input: createReadStream(path),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line) as T;
    } catch {
      // skip malformed line
    }
  }
}

/** Normalized message shape used for user→assistant response pairing. */
export interface PairMessage {
  role: "user" | "assistant" | "other";
  text: string;
}

/**
 * Find the assistant response tied to the user message at `userIdx`.
 * - `immediate`: only the message directly after the user turn
 * - `first`: first non-empty assistant before the next user turn
 * - `last`: last non-empty assistant before the next user turn
 *
 * Returns the raw (untruncated) text, or undefined when none is found.
 * Apply {@link preview} at the call site to bound the length.
 */
export function findResponse(
  msgs: PairMessage[],
  userIdx: number,
  mode: "immediate" | "first" | "last" = "first",
): string | undefined {
  if (mode === "immediate") {
    const next = msgs[userIdx + 1];
    return next?.role === "assistant" && next.text ? next.text : undefined;
  }

  let result: string | undefined;
  for (let j = userIdx + 1; j < msgs.length; j++) {
    const next = msgs[j];
    if (!next) continue;
    if (next.role === "user") break;
    if (next.role === "assistant" && next.text.trim()) {
      if (mode === "first") return next.text;
      result = next.text; // "last": keep overwriting until the next user turn
    }
  }
  return result;
}
