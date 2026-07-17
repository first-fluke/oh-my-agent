import { resolve } from "node:path";
import color from "picocolors";
import {
  FONTS_READY_TIMEOUT_MS,
  MIN_FONT_SIZE_PX,
  PAGE_LOAD_TIMEOUT_MS,
} from "./constants.js";
import { isOverflowing, isOverlapping } from "./geometry.js";
import {
  IN_PAGE_CHECK_FN,
  type InPageCheckResult,
  type InPageTextElement,
} from "./in-page-check.js";
import { awaitFontsReady, type PuppeteerPage } from "./puppeteer.js";
import type { IssueCode, SlideResult, ValidateIssue } from "./types.js";

// ─── Core validation logic ─────────────────────────────────────────────────────

export async function validateSlide(
  page: PuppeteerPage,
  slideFile: string,
  slideUrl: string,
): Promise<SlideResult> {
  const issues: ValidateIssue[] = [];

  await page.goto(slideUrl, {
    waitUntil: "networkidle0",
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });

  // H1 fix: await document.fonts.ready with a cleared-timer race — see
  // awaitFontsReady in puppeteer.ts for the waitForFunction NO-OP rationale.
  const fontsLoaded = await awaitFontsReady(page, FONTS_READY_TIMEOUT_MS);
  if (!fontsLoaded) {
    // Fonts didn't resolve in time — proceed with available metrics.
    // This may produce false-negatives on slow CDN fonts.
    console.warn(
      color.yellow(
        `  Warning: fonts.ready timed out for ${slideFile} — results may be inaccurate`,
      ),
    );
  }

  const result = await page.evaluate<InPageCheckResult>(IN_PAGE_CHECK_FN);

  const { textElements, remoteRefs } = result;

  // (a) no_overflowing_text — text element extends past the 1920×1080 frame
  for (const el of textElements) {
    if (isOverflowing(el.rect)) {
      issues.push({
        code: "no_overflowing_text",
        message: `Text element overflows the 1920×1080 frame: "${el.text}"`,
        slide: slideFile,
        selector: el.selector,
        rect: el.rect,
      });
    }
  }

  // (b) no_overlapping_text — two text boxes overlap
  for (const [a, b] of findOverlappingTextPairs(textElements)) {
    issues.push({
      code: "no_overlapping_text",
      message: `Text elements overlap: "${a.text}" ↔ "${b.text}"`,
      slide: slideFile,
      selector: `${a.selector} ↔ ${b.selector}`,
      rect: a.rect,
    });
  }

  // (c) slide_sized_text — font-size below readable floor relative to 1080h
  for (const el of textElements) {
    if (el.fontSize > 0 && el.fontSize < MIN_FONT_SIZE_PX) {
      issues.push({
        code: "slide_sized_text",
        message: `Font size ${el.fontSize}px is below readable floor (${MIN_FONT_SIZE_PX}px at 1080p): "${el.text}"`,
        slide: slideFile,
        selector: el.selector,
        rect: el.rect,
      });
    }
  }

  // Remote asset references — warning (not critical, but flagged for policy)
  for (const ref of remoteRefs) {
    issues.push({
      code: "remote_asset_ref",
      message: `Remote asset reference found (local-asset policy violation): ${ref.url}`,
      slide: slideFile,
      selector: ref.selector,
    });
  }

  const criticalCodes: IssueCode[] = [
    "no_overflowing_text",
    "no_overlapping_text",
    "slide_sized_text",
  ];
  const hasCritical = issues.some((i) => criticalCodes.includes(i.code));

  return {
    file: slideFile,
    status: hasCritical ? "fail" : "pass",
    issues,
  };
}

// ─── Overlap pairing (pure, vitest-testable) ──────────────────────────────────

/**
 * Return all genuinely overlapping text-element pairs, skipping
 * ancestor-descendant pairs: a parent with a direct text node always encloses
 * the rects of its inline children (`<p>text <strong>bold</strong></p>`), so
 * pairing them geometrically would flag every inline-formatted paragraph as a
 * critical collision. `ancestorIndices` is collected in-page (DOM containment).
 */
export function findOverlappingTextPairs(
  textElements: InPageTextElement[],
): Array<[InPageTextElement, InPageTextElement]> {
  const pairs: Array<[InPageTextElement, InPageTextElement]> = [];
  for (let i = 0; i < textElements.length; i++) {
    for (let j = i + 1; j < textElements.length; j++) {
      const a = textElements[i];
      const b = textElements[j];
      if (!a || !b) continue;
      // Document order puts ancestors first, so only b can descend from a.
      if (b.ancestorIndices?.includes(i)) continue;
      if (isOverlapping(a.rect, b.rect)) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

// ─── Request interception — offline context ───────────────────────────────────

export { isLocalUrl } from "../font-hosts.js";

// ─── Path traversal guard (M1) ────────────────────────────────────────────────

/**
 * Reject any order[] entry that contains path traversal sequences or
 * absolute path separators, and assert the resolved path stays within workDir.
 * Throws with a descriptive message on violation.
 */
export function assertSafeSlideFile(
  slideFile: string,
  workDir: string,
): string {
  // Reject entries containing directory separators or traversal sequences
  if (
    slideFile.includes("/") ||
    slideFile.includes("\\") ||
    slideFile.includes("..")
  ) {
    throw new Error(
      `meta.json order[] entry "${slideFile}" contains path traversal characters — must be a bare filename.`,
    );
  }
  const resolved = resolve(workDir, slideFile);
  // Assert resolved path is inside workDir (defense in depth)
  const normalizedDir = resolve(workDir);
  if (!resolved.startsWith(`${normalizedDir}/`) && resolved !== normalizedDir) {
    throw new Error(
      `meta.json order[] entry "${slideFile}" resolves outside workspace directory — rejected.`,
    );
  }
  return resolved;
}
