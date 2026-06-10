// ─── Constants ────────────────────────────────────────────────────────────────

export const FRAME_W_PX = 1920;
export const FRAME_H_PX = 1080;
/** Sub-pixel tolerance for overflow / overlap detection. */
export const TOLERANCE_PX = 0.5;
/**
 * Point conversion: 1pt = 1/72 inch; at 96dpi → 1px = 0.75pt.
 * Authoring is px at 1920×1080; PPTX export converts at ÷2.667 → 720×405pt.
 */
export const PX_TO_PT = 0.75;

/** Minimum readable font size relative to 1080h (≈ 18px on 1080p). */
export const MIN_FONT_SIZE_PX = 18;
/** Timeout for document.fonts.ready await inside page.evaluate (ms). */
export const FONTS_READY_TIMEOUT_MS = 10_000;
/** Timeout for page navigation (ms). */
export const PAGE_LOAD_TIMEOUT_MS = 30_000;
