/**
 * Shared type guards. Single source of truth for the plain-object check
 * that was previously re-defined per module.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Alias kept for call sites that read better with "plain object" naming. */
export const isPlainObject = isRecord;
