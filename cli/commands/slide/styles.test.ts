import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  extractPresetSection,
  FALLBACK_PRESET_SLUG,
  getCachedStylePath,
  parsePresetsFromMd,
  slugToName,
  VENDORED_PRESET_SLUGS,
} from "./styles.js";

const STYLE_PRESETS_MD = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    ".agents",
    "skills",
    "oma-slide",
    "resources",
    "style-presets.md",
  ),
  "utf8",
);

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

describe("vendored preset fallbacks stay in sync with style-presets.md", () => {
  it("VENDORED_PRESET_SLUGS matches the real preset headings", () => {
    // Regression: the old hardcoded fallback listed 12 slugs (default,
    // dark-pro, …) that never existed in style-presets.md.
    const actual = parsePresetsFromMd(STYLE_PRESETS_MD).map((p) => p.slug);
    expect(actual).toEqual([...VENDORED_PRESET_SLUGS]);
  });

  it("FALLBACK_PRESET_SLUG resolves to a real section", () => {
    // Regression: `styles get` fell back to a nonexistent "default" preset,
    // turning the documented graceful degradation into a hard exit 1.
    expect(VENDORED_PRESET_SLUGS).toContain(FALLBACK_PRESET_SLUG);
    const section = extractPresetSection(
      STYLE_PRESETS_MD,
      FALLBACK_PRESET_SLUG,
    );
    expect(section).not.toBeNull();
    expect(section).toContain(`### \`${FALLBACK_PRESET_SLUG}\``);
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
