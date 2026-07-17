import { afterEach, describe, expect, it, vi } from "vitest";
import type { InPageTextElement } from "./in-page-check.js";
import { awaitFontsReady } from "./puppeteer.js";
import { findOverlappingTextPairs } from "./slide-checks.js";

function el(
  overrides: Partial<InPageTextElement> & { rect: InPageTextElement["rect"] },
): InPageTextElement {
  return {
    selector: "div",
    fontSize: 24,
    text: "",
    ancestorIndices: [],
    ...overrides,
  };
}

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
