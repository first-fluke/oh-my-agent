import { describe, expect, it } from "vitest";
import {
  escapeInlineScript,
  extractLinkStylesheets,
  extractSlides,
  extractStyles,
} from "./viewer.js";

describe("escapeInlineScript", () => {
  it("breaks a literal </script> so it cannot close the inline tag", () => {
    // deck-stage.js documents speaker-notes usage with a literal </script>
    // inside a JSDoc comment; unescaped it truncated the inlined controller.
    const js = "/* see <script id=notes>…</script> */\nconst x = 1;";
    const out = escapeInlineScript(js);
    expect(out).not.toContain("</script");
    expect(out).toContain("<\\/script");
  });

  it("is case-insensitive", () => {
    expect(escapeInlineScript("a</SCRIPT>b")).toBe("a<\\/SCRIPT>b");
  });

  it("leaves JS without a closing-script sequence untouched", () => {
    const js = "const a = b < c;\nconst d = '</style>';";
    expect(escapeInlineScript(js)).toBe(js);
  });
});

describe("extractSlides", () => {
  it("extracts a single slide section", () => {
    const html = `<body><section class="slide"><h1>One</h1></section></body>`;
    const slides = extractSlides(html);
    expect(slides).toHaveLength(1);
    expect(slides[0]).toContain("<h1>One</h1>");
  });

  it("extracts multiple slide sections in order", () => {
    const html = `
      <section class="slide"><h1>A</h1></section>
      <section class="slide"><h1>B</h1></section>`;
    const slides = extractSlides(html);
    expect(slides).toHaveLength(2);
    expect(slides[0]).toContain("A");
    expect(slides[1]).toContain("B");
  });

  it("matches slide class among multiple classes (word boundary)", () => {
    const html = `<section class="foo slide bar"><p>x</p></section>`;
    expect(extractSlides(html)).toHaveLength(1);
  });

  it("does not match a non-slide section", () => {
    const html = `<section class="sidebar"><p>x</p></section>`;
    expect(extractSlides(html)).toHaveLength(0);
  });

  it("returns empty array when no sections present", () => {
    expect(extractSlides("<div>nothing</div>")).toEqual([]);
  });
});

describe("extractStyles", () => {
  it("extracts <style> blocks", () => {
    const html = `<style>.a{color:red}</style><style>.b{}</style>`;
    expect(extractStyles(html)).toHaveLength(2);
  });

  it("returns empty when no style blocks", () => {
    expect(extractStyles("<p>x</p>")).toEqual([]);
  });
});

describe("extractLinkStylesheets", () => {
  it("keeps a remote font stylesheet link", () => {
    const html = `<link rel="stylesheet" href="https://fonts.example/x.css">`;
    expect(extractLinkStylesheets(html)).toHaveLength(1);
  });

  it("skips the shared viewport-base.css (inlined separately)", () => {
    const html = `<link rel="stylesheet" href="./viewport-base.css">`;
    expect(extractLinkStylesheets(html)).toEqual([]);
  });

  it("ignores non-stylesheet links", () => {
    const html = `<link rel="icon" href="/favicon.ico">`;
    expect(extractLinkStylesheets(html)).toEqual([]);
  });
});
