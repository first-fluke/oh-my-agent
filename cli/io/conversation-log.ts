import { readFileSync } from "node:fs";

/**
 * Primitives for reading vendor conversation logs, shared by `oma recap`,
 * `oma memory import` and `oma state trajectory`.
 */

export function parseTimestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

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

/** The user's prompt inside a Cursor message, or null for injected context. */
export function extractUserPrompt(content: string): string | null {
  const match = content.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  const raw = (match?.[1] ?? content).trim();
  if (!raw || raw.startsWith("<user_info>")) return null;
  return raw;
}
