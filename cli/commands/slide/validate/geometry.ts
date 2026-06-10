import { FRAME_H_PX, FRAME_W_PX, PX_TO_PT, TOLERANCE_PX } from "./constants.js";

// ─── Geometry helpers (pure, vitest-testable) ─────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Returns true when rect extends past the 1920×1080 frame (with tolerance). */
export function isOverflowing(rect: Rect): boolean {
  return (
    rect.x + rect.width > FRAME_W_PX + TOLERANCE_PX ||
    rect.y + rect.height > FRAME_H_PX + TOLERANCE_PX ||
    rect.x < -TOLERANCE_PX ||
    rect.y < -TOLERANCE_PX
  );
}

/** Returns true when two rects overlap (with tolerance). */
export function isOverlapping(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width - TOLERANCE_PX &&
    a.x + a.width > b.x + TOLERANCE_PX &&
    a.y < b.y + b.height - TOLERANCE_PX &&
    a.y + a.height > b.y + TOLERANCE_PX
  );
}

/** Convert px to pt (px × 0.75). */
export function pxToPt(px: number): number {
  return px * PX_TO_PT;
}
