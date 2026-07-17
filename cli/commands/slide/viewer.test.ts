import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  escapeInlineScript,
  extractLinkStylesheets,
  extractSlides,
  extractStyles,
  runSlideViewer,
} from "./viewer.js";

const ASSETS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".agents",
  "skills",
  "oma-slide",
  "resources",
  "assets",
);

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

  it("keeps the full slide when it contains nested sections", () => {
    // Regression: the lazy regex stopped at the FIRST </section>, truncating
    // slides that use <section> for internal layout columns.
    const html =
      `<section class="slide" id="slide-01">` +
      `<section class="col">A</section>` +
      `<section class="col">B</section>` +
      `</section>`;
    const slides = extractSlides(html);
    expect(slides).toHaveLength(1);
    expect(slides[0]).toContain(">A<");
    expect(slides[0]).toContain(">B<");
    expect(slides[0]).toBe(html);
  });

  it("extracts multiple slides even when each nests sections", () => {
    const html =
      `<section class="slide"><section class="inner">1</section></section>` +
      `<section class="slide"><section class="inner">2</section></section>`;
    const slides = extractSlides(html);
    expect(slides).toHaveLength(2);
    expect(slides[0]).toContain(">1<");
    expect(slides[1]).toContain(">2<");
  });

  it("skips a slide with unbalanced section markup instead of corrupting output", () => {
    const html = `<section class="slide"><section class="col">A</section>`;
    expect(extractSlides(html)).toEqual([]);
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

describe("runSlideViewer — print pagination reset placement", () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `oma-viewer-test-${Date.now()}-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    // Copy the real shared assets so the cascade we assert on is the shipped one.
    writeFileSync(
      join(dir, "viewport-base.css"),
      readFileSync(join(ASSETS_DIR, "viewport-base.css"), "utf8"),
    );
    writeFileSync(
      join(dir, "deck-stage.js"),
      readFileSync(join(ASSETS_DIR, "deck-stage.js"), "utf8"),
    );
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ title: "t", order: ["slide-01.html", "slide-02.html"] }),
    );
    // Each slide carries the protocol-mandated `.slide { position: absolute }`,
    // which the viewer scopes to `#slide-NN` (id specificity 1,0,0).
    for (const id of ["slide-01", "slide-02"]) {
      writeFileSync(
        join(dir, `${id}.html`),
        `<section class="slide" id="${id}"><style>.slide{position:absolute;outline:2px solid ${id}}</style><h1>${id}</h1></section>`,
      );
    }
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("emits an id-scoped print reset AFTER the scoped author styles, with no !important", async () => {
    const code = await runSlideViewer({ dir });
    expect(code).toBe(0);

    const html = readFileSync(join(dir, "viewer.html"), "utf8");

    // The reset targets every slide id at #id specificity.
    expect(html).toContain("@media print");
    expect(html).toContain("#slide-01");
    expect(html).toContain("#slide-02");

    // The scoped author rule (outline:...slide-01) must come BEFORE the reset's
    // `position: relative` — equal #id specificity means source order decides,
    // so the reset can override author `position: absolute` without !important.
    const authorIdx = html.indexOf("solid slide-01");
    const resetIdx = html.lastIndexOf("position: relative");
    expect(authorIdx).toBeGreaterThan(-1);
    expect(resetIdx).toBeGreaterThan(authorIdx);

    // The whole pagination path is now !important-free except the a11y reset.
    expect(html).not.toContain("position: relative !important");
    expect(html).not.toContain("transform: none !important");
  });
});
