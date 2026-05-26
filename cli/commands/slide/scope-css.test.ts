import { describe, expect, it } from "vitest";
import { firstSlideId, scopeSlideCss, scopeStyleBlocks } from "./scope-css.js";

describe("scopeSlideCss", () => {
  it("rewrites the slide-root class to the slide id", () => {
    const out = scopeSlideCss(".slide { background: #0d1117; }", "slide-01");
    expect(out).toContain("#slide-01 {");
    expect(out).not.toMatch(/(^|\s)\.slide\s*\{/);
  });

  it("prefixes descendant selectors with the slide id", () => {
    const out = scopeSlideCss(".title { color: white; }", "slide-02");
    expect(out).toContain("#slide-02 .title {");
  });

  it("scopes bare element selectors", () => {
    const out = scopeSlideCss("h1 { font-size: 80px; }", "slide-03");
    expect(out).toContain("#slide-03 h1 {");
  });

  it("keeps a descendant of the root anchored once", () => {
    const out = scopeSlideCss(".slide .kicker { opacity: 0.6; }", "slide-01");
    expect(out).toContain("#slide-01 .kicker {");
    // Must not double-prefix into "#slide-01 #slide-01 …"
    expect(out).not.toContain("#slide-01 #slide-01");
  });

  it("scopes every selector in a comma list", () => {
    const out = scopeSlideCss("h1, h2, .lead { margin: 0; }", "slide-01");
    expect(out).toContain("#slide-01 h1");
    expect(out).toContain("#slide-01 h2");
    expect(out).toContain("#slide-01 .lead");
  });

  it("does not split commas inside :is()/:not()", () => {
    const out = scopeSlideCss(":is(h1, h2) { color: red; }", "slide-01");
    // One scoped selector, not two fragments.
    expect(out).toContain("#slide-01 :is(h1, h2)");
    expect((out.match(/#slide-01/g) ?? []).length).toBe(1);
  });

  it("does not touch class names that merely start with 'slide'", () => {
    const out = scopeSlideCss(".slide-up { top: 0; }", "slide-01");
    expect(out).toContain("#slide-01 .slide-up {");
    expect(out).not.toContain("#slide-01-up");
  });

  it("recurses into @media and scopes inner rules", () => {
    const out = scopeSlideCss(
      "@media (min-width: 100px) { .slide { background: red; } .x { top: 0; } }",
      "slide-01",
    );
    expect(out).toContain("@media (min-width: 100px) {");
    expect(out).toContain("#slide-01 {");
    expect(out).toContain("#slide-01 .x {");
  });

  it("leaves @keyframes names untouched", () => {
    const out = scopeSlideCss(
      "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }",
      "slide-01",
    );
    expect(out).toContain("@keyframes fadeIn {");
    expect(out).not.toContain("#slide-01 from");
  });

  it("passes through bodyless at-rules like @import", () => {
    const out = scopeSlideCss(
      "@import url('x.css'); .a { top: 0; }",
      "slide-01",
    );
    expect(out).toContain("@import url('x.css');");
    expect(out).toContain("#slide-01 .a {");
  });

  it("scopes section.slide to section#id", () => {
    const out = scopeSlideCss(
      "section.slide { overflow: hidden; }",
      "slide-07",
    );
    expect(out).toContain("section#slide-07 {");
  });
});

describe("firstSlideId", () => {
  it("reads the id when class precedes id", () => {
    expect(
      firstSlideId('<section class="slide t" id="slide-04">x</section>'),
    ).toBe("slide-04");
  });

  it("reads the id when id precedes class", () => {
    expect(
      firstSlideId('<section id="slide-05" class="slide">x</section>'),
    ).toBe("slide-05");
  });

  it("returns null when the section has no id", () => {
    expect(firstSlideId('<section class="slide">x</section>')).toBeNull();
  });
});

describe("scopeStyleBlocks", () => {
  it("scopes CSS inside a <style> block and preserves tag attrs", () => {
    const [out] = scopeStyleBlocks(
      ['<style data-x="1">.slide { color: red; } .y { top: 0; }</style>'],
      "slide-01",
    );
    expect(out).toContain('<style data-x="1">');
    expect(out).toContain("#slide-01 {");
    expect(out).toContain("#slide-01 .y {");
  });

  it("returns the block unchanged when it is not a <style> element", () => {
    const [out] = scopeStyleBlocks(["not a style block"], "slide-01");
    expect(out).toBe("not a style block");
  });
});
