/**
 * editor/server/validate.ts — request payload validation helpers.
 */

import type { BBox } from "../dispatch.js";

// ─── Request validation helpers ───────────────────────────────────────────────

export function isValidBbox(b: unknown): b is BBox {
  if (typeof b !== "object" || b === null) return false;
  const bb = b as Record<string, unknown>;
  return (
    typeof bb.x === "number" &&
    typeof bb.y === "number" &&
    typeof bb.width === "number" &&
    typeof bb.height === "number" &&
    bb.width > 0 &&
    bb.height > 0
  );
}
