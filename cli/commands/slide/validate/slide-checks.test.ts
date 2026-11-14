import { afterEach, describe, expect, it, vi } from "vitest";
import type { InPageRemoteRef, InPageTextElement } from "./in-page-check.js";
import { awaitFontsReady } from "./puppeteer.js";
import {
  findOverlappingTextPairs,
  findPolicyRemoteRefs,
} from "./slide-checks.js";

function el(
  overrides: Partial<InPageTextElement> & { rect: InPageTextElement["rect"] },
): InPageTextElement {
  return {
    selector: "div",
    fontSize: 24,
    text: "",
    ancestorIndices: [],
    lineRects: [],
    ...overrides,
  };
}

// Regression: the documented way to load a typeface (a stylesheet link to an
// allowlisted font CDN) was reported as a local-asset policy violation.
describe("findPolicyRemoteRefs", () => {
  const ref = (
    kind: InPageRemoteRef["kind"],
    url: string,
  ): InPageRemoteRef => ({
    selector: "x",
    url,
    kind,
  });

  it("does not report a typeface loaded from an allowlisted font CDN", () => {
    expect(
      findPolicyRemoteRefs([
        ref("link", "https://fonts.googleapis.com/css2?family=Inter"),
        ref(
          "link",
          "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css",
        ),
        ref("stylesheet", "https://fonts.gstatic.com/s/inter/v13/a.woff2"),
      ]),
    ).toEqual([]);
  });

  it("still reports non-font content on an allowlisted host", () => {
    const refs = [
      ref("media", "https://cdn.jsdelivr.net/npm/pkg/photo.png"),
      ref("script", "https://cdn.jsdelivr.net/npm/pkg/index.js"),
      ref("frame", "https://fonts.googleapis.com/embed"),
      ref("inline-style", "https://cdn.jsdelivr.net/npm/pkg/bg.jpg"),
    ];

    expect(findPolicyRemoteRefs(refs)).toEqual(refs);
  });

  it("still reports a stylesheet from any other host or over http", () => {
    const refs = [
      ref("link", "https://example.com/theme.css"),
      ref("link", "http://fonts.googleapis.com/css2?family=Inter"),
      ref("stylesheet", "https://evil.example.com/font.woff2"),
    ];

    expect(findPolicyRemoteRefs(refs)).toEqual(refs);
  });
});

describe("findOverlappingTextPairs", () => {
  it("skips ancestor-descendant pairs (inline child inside a text parent)", () => {
    // <p>Add your <strong>content</strong> here</p> — strong's rect is fully
    // contained in p's rect; that is nesting, not a layout collision.
    const p = el({
      selector: "p",
      rect: { x: 100, y: 100, width: 400, height: 50 },
    });
    const strong = el({
      selector: "p > strong",
      rect: { x: 220, y: 105, width: 90, height: 40 },
      ancestorIndices: [0],
    });
    expect(findOverlappingTextPairs([p, strong])).toEqual([]);
  });

  it("skips deeper nesting via multiple ancestor indices", () => {
    const outer = el({ rect: { x: 0, y: 0, width: 600, height: 200 } });
    const mid = el({
      rect: { x: 10, y: 10, width: 500, height: 150 },
      ancestorIndices: [0],
    });
    const inner = el({
      rect: { x: 20, y: 20, width: 100, height: 40 },
      ancestorIndices: [0, 1],
    });
    expect(findOverlappingTextPairs([outer, mid, inner])).toEqual([]);
  });

  it("still reports genuinely colliding siblings", () => {
    const a = el({
      selector: "h1",
      rect: { x: 100, y: 100, width: 300, height: 60 },
    });
    const b = el({
      selector: "p.caption",
      rect: { x: 250, y: 120, width: 300, height: 60 },
    });
    const pairs = findOverlappingTextPairs([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.[0].selector).toBe("h1");
    expect(pairs[0]?.[1].selector).toBe("p.caption");
  });

  it("does not pair adjacent non-overlapping siblings", () => {
    const a = el({ rect: { x: 0, y: 0, width: 100, height: 40 } });
    const b = el({ rect: { x: 100, y: 0, width: 100, height: 40 } });
    expect(findOverlappingTextPairs([a, b])).toEqual([]);
  });

  it("compares per-line rects, not the union box, for wrapped inline siblings", () => {
    // <em> wraps line 1 → line 2; its union bounding box spans both lines and
    // geometrically contains the following <strong> on line 2, but its actual
    // line boxes end before the strong starts.
    const em = el({
      selector: "em",
      rect: { x: 0, y: 0, width: 500, height: 100 }, // union of both lines
      lineRects: [
        { x: 200, y: 0, width: 300, height: 50 }, // line 1 tail
        { x: 0, y: 50, width: 120, height: 50 }, // line 2 head
      ],
    });
    const strong = el({
      selector: "strong",
      rect: { x: 130, y: 50, width: 100, height: 50 }, // inside em's union box
      lineRects: [{ x: 130, y: 50, width: 100, height: 50 }],
    });
    expect(findOverlappingTextPairs([em, strong])).toEqual([]);
  });

  it("still detects collisions that touch an actual line box", () => {
    const em = el({
      selector: "em",
      rect: { x: 0, y: 0, width: 500, height: 100 },
      lineRects: [
        { x: 200, y: 0, width: 300, height: 50 },
        { x: 0, y: 50, width: 120, height: 50 },
      ],
    });
    const overlapping = el({
      selector: "p.badge",
      rect: { x: 100, y: 60, width: 100, height: 30 }, // hits line 2 head
      lineRects: [{ x: 100, y: 60, width: 100, height: 30 }],
    });
    expect(findOverlappingTextPairs([em, overlapping])).toHaveLength(1);
  });
});

describe("awaitFontsReady", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true and leaves no pending timer when fonts resolve", async () => {
    vi.useFakeTimers();
    const page = { evaluate: <T>() => Promise.resolve(undefined as T) };
    await expect(awaitFontsReady(page, 10_000)).resolves.toBe(true);
    // Regression: an uncleared race timer kept the event loop alive, hanging
    // the CLI up to the timeout after its final output.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns false on timeout and clears the timer", async () => {
    vi.useFakeTimers();
    const page = { evaluate: <T>() => new Promise<T>(() => {}) };
    const result = awaitFontsReady(page, 10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
