import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Regression contract for the shipped viewport-base.css asset.
 *
 * The deck's print stylesheet used to win every cascade fight with `!important`.
 * Two of those were removed by fixing the SOURCE of the conflict instead:
 *   - the inline scale transform is cleared on `beforeprint` (export/pdf.ts),
 *     so `.deck-stage { transform }` no longer needs `!important`;
 *   - per-slide pagination is re-established by an id-scoped reset the bundler
 *     emits after the author styles (buildPrintPaginationReset), so the generic
 *     `.slide` print rule no longer needs `!important`.
 *
 * The shared stylesheet no longer needs any `!important` declarations.
 *
 * These assertions lock the intent in: the asset is copied-verbatim CSS (not
 * importable) and CI has no browser to exercise the print cascade.
 */
describe("viewport-base.css asset — no !important declarations", () => {
  const assetPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    ".agents",
    "skills",
    "oma-slide",
    "resources",
    "assets",
    "viewport-base.css",
  );
  const css = readFileSync(assetPath, "utf8");

  it("does not use !important for print pagination or stage transform", () => {
    expect(css).not.toContain("position: relative !important");
    expect(css).not.toContain("inset: auto !important");
    expect(css).not.toContain("visibility: visible !important");
    expect(css).not.toContain("opacity: 1 !important");
    expect(css).not.toContain("transition: none !important");
    expect(css).not.toContain("transform: none !important");
    expect(css).not.toContain("display: none !important");
  });

  it("does not use !important declarations", () => {
    expect(css).not.toMatch(/!important\s*(?:;|})/);
  });

  it("carries no biome suppression directives (the conflict is fixed, not hidden)", () => {
    expect(css).not.toContain("biome-ignore");
  });
});
