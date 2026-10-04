import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, test } from "vitest";

const source = readFileSync(
  new URL(
    "../../../skills/oma-slide/resources/assets/deck-stage.js",
    import.meta.url,
  ),
  "utf8",
);

function fixture(autoWrap = true, slideCount = 3) {
  const documentListeners = new Map<string, Set<(event: unknown) => void>>();
  const windowListeners = new Map<string, Set<(event: unknown) => void>>();
  const definitions = new Map<string, typeof Element>();

  class Element {
    children: Element[] = [];
    parentNode: Element | null = null;
    isConnected = false;
    tagName = "DIV";
    dataset: Record<string, string> = {};
    style: Record<string, string> = {};
    classes = new Set<string>();
    classList = {
      add: (name: string) => this.classes.add(name),
      remove: (name: string) => this.classes.delete(name),
      contains: (name: string) => this.classes.has(name),
    };
    get nextSibling(): Element | null {
      const siblings = this.parentNode?.children ?? [];
      return siblings[siblings.indexOf(this) + 1] ?? null;
    }
    connectedCallback?(): void;
    querySelector(selector: string): Element | null {
      return this.querySelectorAll(selector)[0] ?? null;
    }
    querySelectorAll(selector: string): Element[] {
      return this.children.flatMap((child) => [
        ...((
          selector.startsWith(".")
            ? child.classes.has(selector.slice(1))
            : child.tagName.toLowerCase() === selector
        )
          ? [child]
          : []),
        ...child.querySelectorAll(selector),
      ]);
    }
    appendChild(child: Element) {
      return this.insertBefore(child, null);
    }
    insertBefore(child: Element, reference: Element | null) {
      if (reference !== null && !this.children.includes(reference)) {
        throw new Error("Reference node must be a child of the parent");
      }
      if (child.parentNode) {
        const siblings = child.parentNode.children;
        siblings.splice(siblings.indexOf(child), 1);
      }
      const index =
        reference === null
          ? this.children.length
          : this.children.indexOf(reference);
      this.children.splice(index, 0, child);
      child.parentNode = this;
      child.isConnected = this.isConnected;
      if (child.isConnected) child.connectedCallback?.();
      return child;
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  }

  function add(
    map: Map<string, Set<(event: unknown) => void>>,
    name: string,
    callback: (event: unknown) => void,
  ) {
    if (!map.has(name)) map.set(name, new Set());
    map.get(name)?.add(callback);
  }
  const body = new Element();
  body.isConnected = true;
  const document = {
    readyState: "interactive",
    documentElement: body,
    activeElement: null,
    getElementById: () => null,
    querySelector: (selector: string) => body.querySelector(selector),
    createElement: (tag: string) => {
      const Type = definitions.get(tag) ?? Element;
      const element = new Type();
      element.tagName = tag.toUpperCase();
      return element;
    },
    addEventListener: (name: string, callback: (event: unknown) => void) =>
      add(documentListeners, name, callback),
    removeEventListener: (name: string, callback: (event: unknown) => void) =>
      documentListeners.get(name)?.delete(callback),
  };
  const window = {
    innerWidth: 1920,
    innerHeight: 1080,
    parent: null as unknown,
    matchMedia: () => ({ matches: false }),
    addEventListener: (name: string, callback: (event: unknown) => void) =>
      add(windowListeners, name, callback),
    removeEventListener: (name: string, callback: (event: unknown) => void) =>
      windowListeners.get(name)?.delete(callback),
  };
  window.parent = window;
  vm.runInNewContext(source, {
    HTMLElement: Element,
    document,
    window,
    customElements: {
      define: (name: string, Type: typeof Element) =>
        definitions.set(name, Type),
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    CustomEvent: class {},
    console: { warn() {} },
    setTimeout: () => 0,
    clearTimeout() {},
  });

  const viewport = new Element();
  viewport.classes.add("deck-viewport");
  const stage = new Element();
  stage.classes.add("deck-stage");
  viewport.appendChild(stage);
  const slides = Array.from({ length: slideCount }, () => {
    const slide = new Element();
    slide.classes.add("slide");
    stage.appendChild(slide);
    return slide;
  });
  const sentinel = new Element();
  if (autoWrap) {
    body.appendChild(viewport);
    body.appendChild(sentinel);
    for (const listener of documentListeners.get("DOMContentLoaded") ?? [])
      listener({});
  } else {
    const wrapper = document.createElement("deck-stage");
    wrapper.appendChild(viewport);
    body.appendChild(wrapper);
  }
  const deck = document.querySelector("deck-stage") as Element & {
    total: number;
    currentIndex: number;
    goTo(index: unknown): void;
  };
  return {
    deck,
    slides,
    body,
    sentinel,
    message: (index: unknown) => {
      for (const listener of windowListeners.get("message") ?? []) {
        listener({ data: { type: "navigateTo", index } });
      }
    },
  };
}

describe("vendored deck-stage", () => {
  test("auto-wrap initializes children and preserves the viewport's position", () => {
    const { deck, slides, body, sentinel } = fixture();
    expect(deck.total).toBe(3);
    expect(slides.filter((slide) => slide.classes.has("active"))).toEqual([
      slides[0],
    ]);
    expect(body.children).toEqual([deck, sentinel]);
  });

  test("invalid public and message indexes preserve the current slide", () => {
    const { deck, slides, message } = fixture(false);
    deck.goTo(1);
    for (const invalid of [
      0.5,
      Number.NaN,
      Infinity,
      null,
      undefined,
      "1",
      "invalid",
    ]) {
      expect(() => deck.goTo(invalid)).not.toThrow();
      expect(() => message(invalid)).not.toThrow();
      expect(deck.currentIndex).toBe(1);
      expect(slides.filter((slide) => slide.classes.has("active"))).toEqual([
        slides[1],
      ]);
    }
    message(2);
    expect(deck.currentIndex).toBe(2);
    deck.goTo(99);
    expect(deck.currentIndex).toBe(2);
  });

  test("navigation before slides exist is harmless", () => {
    const { deck } = fixture(false, 0);
    expect(() => deck.goTo(0)).not.toThrow();
    expect(deck.total).toBe(0);
  });
});
