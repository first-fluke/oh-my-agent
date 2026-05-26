import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSafeSlideFile,
  isOverflowing,
  isOverlapping,
  pxToPt,
  type Rect,
} from "./validate.js";

// ─── pxToPt ──────────────────────────────────────────────────────────────────

describe("pxToPt", () => {
  it("converts 1920px → 1440pt", () => {
    expect(pxToPt(1920)).toBe(1440);
  });

  it("converts 1080px → 810pt", () => {
    expect(pxToPt(1080)).toBe(810);
  });

  it("converts 0 → 0", () => {
    expect(pxToPt(0)).toBe(0);
  });

  it("converts fractional pixels", () => {
    expect(pxToPt(4)).toBeCloseTo(3);
  });
});

// ─── isOverflowing ────────────────────────────────────────────────────────────

describe("isOverflowing", () => {
  const frame: Rect = { x: 0, y: 0, width: 1920, height: 1080 };

  it("returns false for a rect fully inside the frame", () => {
    const rect: Rect = { x: 100, y: 100, width: 200, height: 100 };
    expect(isOverflowing(rect)).toBe(false);
  });

  it("returns false for a rect filling the frame exactly", () => {
    expect(isOverflowing(frame)).toBe(false);
  });

  it("returns true when right edge overflows", () => {
    const rect: Rect = { x: 1800, y: 100, width: 200, height: 100 };
    expect(isOverflowing(rect)).toBe(true);
  });

  it("returns true when bottom edge overflows", () => {
    const rect: Rect = { x: 100, y: 1000, width: 200, height: 200 };
    expect(isOverflowing(rect)).toBe(true);
  });

  it("returns true when x is negative beyond tolerance", () => {
    const rect: Rect = { x: -2, y: 0, width: 100, height: 100 };
    expect(isOverflowing(rect)).toBe(true);
  });

  it("returns true when y is negative beyond tolerance", () => {
    const rect: Rect = { x: 0, y: -2, width: 100, height: 100 };
    expect(isOverflowing(rect)).toBe(true);
  });

  it("returns false when overflow is within tolerance (0.5px)", () => {
    // right edge = 1920.3px — within 0.5px tolerance
    const rect: Rect = { x: 0, y: 0, width: 1920.3, height: 100 };
    expect(isOverflowing(rect)).toBe(false);
  });

  it("returns true when overflow is beyond tolerance", () => {
    // right edge = 1921px
    const rect: Rect = { x: 0, y: 0, width: 1921, height: 100 };
    expect(isOverflowing(rect)).toBe(true);
  });
});

// ─── isOverlapping ────────────────────────────────────────────────────────────

describe("isOverlapping", () => {
  it("returns true for overlapping rects", () => {
    const a: Rect = { x: 0, y: 0, width: 200, height: 100 };
    const b: Rect = { x: 100, y: 50, width: 200, height: 100 };
    expect(isOverlapping(a, b)).toBe(true);
  });

  it("returns false for rects side-by-side (no overlap)", () => {
    const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
    const b: Rect = { x: 200, y: 0, width: 100, height: 100 };
    expect(isOverlapping(a, b)).toBe(false);
  });

  it("returns false for rects stacked vertically (no overlap)", () => {
    const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
    const b: Rect = { x: 0, y: 200, width: 100, height: 100 };
    expect(isOverlapping(a, b)).toBe(false);
  });

  it("returns false for adjacent rects (touching edge, within tolerance)", () => {
    // a right edge = 100, b left edge = 100 — touching, not overlapping
    const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
    const b: Rect = { x: 100, y: 0, width: 100, height: 100 };
    expect(isOverlapping(a, b)).toBe(false);
  });

  it("returns true when overlap is beyond tolerance", () => {
    // a right edge = 101, b left = 100 → overlap of 1px
    const a: Rect = { x: 0, y: 0, width: 101, height: 100 };
    const b: Rect = { x: 100, y: 0, width: 100, height: 100 };
    expect(isOverlapping(a, b)).toBe(true);
  });

  it("returns false when overlap is within sub-pixel tolerance", () => {
    // a right edge = 100.3, b left = 100 → 0.3px overlap, within 0.5px tolerance
    const a: Rect = { x: 0, y: 0, width: 100.3, height: 100 };
    const b: Rect = { x: 100, y: 0, width: 100, height: 100 };
    expect(isOverlapping(a, b)).toBe(false);
  });

  it("handles one rect contained within another", () => {
    const outer: Rect = { x: 0, y: 0, width: 500, height: 300 };
    const inner: Rect = { x: 100, y: 50, width: 200, height: 100 };
    expect(isOverlapping(outer, inner)).toBe(true);
  });

  it("is symmetric", () => {
    const a: Rect = { x: 0, y: 0, width: 200, height: 100 };
    const b: Rect = { x: 150, y: 50, width: 200, height: 100 };
    expect(isOverlapping(a, b)).toBe(isOverlapping(b, a));
  });
});

// ─── assertSafeSlideFile (M1 path traversal guard) ───────────────────────────

describe("assertSafeSlideFile", () => {
  const workDir = join(tmpdir(), "oma-slide-test-workdir");

  it("accepts a bare filename", () => {
    expect(() => assertSafeSlideFile("slide-01.html", workDir)).not.toThrow();
  });

  it("accepts a filename with dots in the name (not traversal)", () => {
    expect(() => assertSafeSlideFile("my.slide.html", workDir)).not.toThrow();
  });

  it("rejects entries containing forward slash", () => {
    expect(() => assertSafeSlideFile("subdir/slide-01.html", workDir)).toThrow(
      "path traversal",
    );
  });

  it("rejects entries containing backslash", () => {
    expect(() => assertSafeSlideFile("subdir\\slide-01.html", workDir)).toThrow(
      "path traversal",
    );
  });

  it("rejects .. traversal in the entry", () => {
    expect(() => assertSafeSlideFile("../../../etc/passwd", workDir)).toThrow(
      "path traversal",
    );
  });

  it("rejects .. embedded in a name", () => {
    expect(() => assertSafeSlideFile("slide..html", workDir)).toThrow(
      "path traversal",
    );
  });
});
