import { describe, expect, it } from "vitest";
import {
  getCachedStylePath,
  parsePresetsFromMd,
  slugToName,
} from "./styles.js";

describe("slugToName", () => {
  it("title-cases a hyphenated slug", () => {
    expect(slugToName("8-bit-orbit")).toBe("8 Bit Orbit");
    expect(slugToName("night-signal")).toBe("Night Signal");
  });

  it("handles a single-word slug", () => {
    expect(slugToName("vellum")).toBe("Vellum");
  });
});

describe("parsePresetsFromMd", () => {
  const md = [
    "# Style Presets",
    "",
    "### `night-signal`",
    "",
    "**Mood**: bold, confident",
    "**Scheme**: dark",
    "",
    "### `paper-ink`",
    "",
    "**Mood**: calm",
    "**Scheme**: light",
    "",
  ].join("\n");

  it("parses every preset heading (including the last, via end-of-string anchor)", () => {
    const presets = parsePresetsFromMd(md);
    expect(presets.map((p) => p.slug)).toEqual(["night-signal", "paper-ink"]);
  });

  it("extracts mood + scheme metadata and derives the name", () => {
    const presets = parsePresetsFromMd(md);
    expect(presets[0]).toMatchObject({
      slug: "night-signal",
      name: "Night Signal",
      mood: "bold, confident",
      scheme: "dark",
    });
    // Regression guard: the LAST preset must parse (the old `\Z` regex bug
    // silently dropped or mis-bounded it).
    expect(presets[1]).toMatchObject({ slug: "paper-ink", scheme: "light" });
  });

  it("returns empty array when no preset headings exist", () => {
    expect(parsePresetsFromMd("# nothing here")).toEqual([]);
  });
});

describe("getCachedStylePath", () => {
  it("places the cached design.md under the oma-slide styles cache", () => {
    const p = getCachedStylePath("8-bit-orbit");
    expect(p).toMatch(
      /[/\\]\.cache[/\\]oma-slide[/\\]styles[/\\]8-bit-orbit\.md$/,
    );
  });
});
