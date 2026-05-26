/**
 * viewer.ts — oma slide viewer --dir
 *
 * Builds <dir>/viewer.html: a single page that:
 *   1. Extracts the <section class="slide"> elements from each slide-NN.html
 *      (in meta.json.order[]) and merges them into ONE:
 *        <deck-stage>
 *          <div class="deck-viewport">
 *            <div class="deck-stage">[all slides]</div>
 *          </div>
 *        </deck-stage>
 *   2. Inlines viewport-base.css and deck-stage.js from the working dir.
 *   3. Embeds per-slide <style>/<head> styles from each source file.
 *   4. Adds a presenter view: reads meta.json.speakerNotes and embeds as
 *        <script type="application/json" id="speaker-notes">
 *      which deck-stage.js reads on connectedCallback.
 *   5. Keeps ./assets/ refs intact (viewer lives in the same dir).
 *   6. Injects accessible nav controls + slide counter.
 *
 * DOM contract (must match deck-stage.js exactly):
 *   <deck-stage>
 *     <div class="deck-viewport">
 *       <div class="deck-stage">
 *         <section class="slide" id="slide-01">…</section>
 *         <section class="slide" id="slide-02">…</section>
 *       </div>
 *     </div>
 *   </deck-stage>
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import color from "picocolors";
import { firstSlideId, scopeStyleBlocks } from "./scope-css.js";
import { resolveWorkspace } from "./workspace.js";

// ─── HTML extraction helpers ──────────────────────────────────────────────────

/**
 * Extract all <section class="slide"...>…</section> blocks from a slide HTML file.
 * Returns the raw outer HTML of each matching section element.
 */
export function extractSlides(html: string): string[] {
  // Match <section> tags that have class containing "slide"
  // Handles: class="slide", class="slide foo", class="foo slide bar"
  const sectionRe =
    /<section([^>]*)class="([^"]*\bslide\b[^"]*)"([^>]*)>([\s\S]*?)<\/section>/gi;
  return [...html.matchAll(sectionRe)].map((m) => m[0]);
}

/**
 * Extract all <style>…</style> blocks from a slide HTML file.
 * Used to carry per-slide styles into the merged viewer.
 */
export function extractStyles(html: string): string[] {
  const styleRe = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  return [...html.matchAll(styleRe)].map((m) => m[0]);
}

/**
 * Escape content destined for an inline <script>…</script> block.
 *
 * The HTML parser ends a <script> at the first literal `</script` it sees —
 * even inside a JS comment or string. deck-stage.js documents the speaker-notes
 * usage with a literal `</script>` in a JSDoc comment, which silently truncated
 * the inlined controller in viewer.html / the bundle (leaving the deck blank).
 * Replacing `</` with `<\/` is inert in JS (in a string `<\/` === `</`; in a
 * comment it is just text) but stops the parser from closing the tag early.
 */
export function escapeInlineScript(js: string): string {
  return js.replace(/<\/(script)/gi, "<\\/$1");
}

/**
 * Extract <link rel="stylesheet" href="..."> elements from a slide's <head>.
 * Keeps only relative (local) hrefs so we don't re-fetch remote CDN fonts.
 */
export function extractLinkStylesheets(html: string): string[] {
  const results: string[] = [];
  const linkRe = /<link([^>]*?)>/gi;
  for (const m of html.matchAll(linkRe)) {
    const tag = m[0];
    // Must be rel="stylesheet"
    if (!/rel=["']stylesheet["']/i.test(tag)) continue;
    // Extract href
    const hrefMatch = /href=["']([^"']+)["']/i.exec(tag);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    // Skip the shared stage assets — we inline those separately
    if (href === "./viewport-base.css" || href === "viewport-base.css") {
      continue;
    }
    results.push(tag);
  }
  return results;
}

// ─── Build viewer ─────────────────────────────────────────────────────────────

export interface ViewerOptions {
  dir: string;
}

export async function runSlideViewer(opts: ViewerOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4; // invalid-input
  }

  const { dir, meta } = ws;

  // Read shared assets (inline into viewer)
  const cssPath = join(dir, "viewport-base.css");
  const jsPath = join(dir, "deck-stage.js");

  if (!existsSync(cssPath)) {
    console.error(
      color.red(
        `viewport-base.css not found in "${dir}". Run "oma slide new --dir ${opts.dir}" first.`,
      ),
    );
    return 4;
  }
  if (!existsSync(jsPath)) {
    console.error(
      color.red(
        `deck-stage.js not found in "${dir}". Run "oma slide new --dir ${opts.dir}" first.`,
      ),
    );
    return 4;
  }

  const viewportCss = readFileSync(cssPath, "utf8");
  const deckStageJs = readFileSync(jsPath, "utf8");

  // Process each slide
  const allSlides: string[] = [];
  const allStyles: string[] = [];
  const allLinkStylesheets: string[] = [];

  for (const slideFile of meta.order) {
    const slidePath = join(dir, slideFile);
    if (!existsSync(slidePath)) {
      console.error(color.red(`Slide file not found: "${slidePath}"`));
      return 4;
    }

    const slideHtml = readFileSync(slidePath, "utf8");

    // Extract <section class="slide"> elements
    const sections = extractSlides(slideHtml);
    if (sections.length === 0) {
      console.warn(
        color.yellow(
          `  Warning: no <section class="slide"> found in "${slideFile}" — skipping.`,
        ),
      );
      continue;
    }
    allSlides.push(...sections);

    // Extract per-slide <style> blocks and scope them to this slide's id so
    // generic selectors (.slide, .title, h1 …) don't bleed across slides once
    // every file is merged into one document. Falls back to unscoped styles
    // only when the section has no id to anchor on.
    const styles = extractStyles(slideHtml);
    const slideId = firstSlideId(slideHtml);
    allStyles.push(...(slideId ? scopeStyleBlocks(styles, slideId) : styles));

    // Extract local link stylesheets
    const links = extractLinkStylesheets(slideHtml);
    for (const link of links) {
      if (!allLinkStylesheets.includes(link)) {
        allLinkStylesheets.push(link);
      }
    }
  }

  if (allSlides.length === 0) {
    console.error(
      color.red(
        'No <section class="slide"> elements found in any slide file. Check that slides follow the canonical DOM contract.',
      ),
    );
    return 1;
  }

  // Build speaker notes JSON (0-based index keyed)
  const notesJson = JSON.stringify(meta.speakerNotes ?? {});

  // Build the viewer HTML
  const viewerHtml = buildViewerHtml({
    title: meta.title,
    viewportCss,
    deckStageJs,
    slides: allSlides,
    styles: allStyles,
    linkStylesheets: allLinkStylesheets,
    speakerNotesJson: notesJson,
    slideCount: allSlides.length,
  });

  // Write viewer.html
  const outPath = join(dir, "viewer.html");
  writeFileSync(outPath, viewerHtml, "utf8");

  console.log(color.green(`Viewer built: ${outPath}`));
  console.log(
    color.dim(
      `  Slides merged: ${allSlides.length} (from ${meta.order.length} file(s))`,
    ),
  );
  console.log(color.dim(`  Open in browser: file://${outPath}`));

  return 0;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

interface BuildViewerHtmlOpts {
  title: string;
  viewportCss: string;
  deckStageJs: string;
  slides: string[];
  styles: string[];
  linkStylesheets: string[];
  speakerNotesJson: string;
  slideCount: number;
}

function buildViewerHtml(opts: BuildViewerHtmlOpts): string {
  const {
    title,
    viewportCss,
    deckStageJs,
    slides,
    styles,
    linkStylesheets,
    speakerNotesJson,
    slideCount,
  } = opts;

  const slidesHtml = slides.join("\n    ");
  const stylesHtml = styles.join("\n  ");
  const linkStylesheetsHtml = linkStylesheets.join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — oma-slide viewer</title>
  ${linkStylesheetsHtml}
  <style>
${viewportCss}
  </style>
  ${stylesHtml}
  <style>
    /* ── Viewer chrome ── */
    body {
      margin: 0;
      padding: 0;
      background: #000;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <deck-stage>
    <div class="deck-viewport">
      <div class="deck-stage">
    ${slidesHtml}
      </div>
    </div>
  </deck-stage>

  <!-- Nav controls (deck-stage.js wires these up via .deck-nav / .deck-counter) -->
  <nav class="deck-nav" aria-label="Slide navigation">
    <button id="btn-prev" aria-label="Previous slide" onclick="document.querySelector('deck-stage')?.prev()">&#8592;</button>
    <span class="deck-counter" role="status" aria-live="polite">1 / ${slideCount}</span>
    <button id="btn-next" aria-label="Next slide" onclick="document.querySelector('deck-stage')?.next()">&#8594;</button>
  </nav>

  <!-- Speaker notes (read by deck-stage.js parseSpeakerNotes()) -->
  <script type="application/json" id="speaker-notes">
${escapeInlineScript(speakerNotesJson)}
  </script>

  <script>
${escapeInlineScript(deckStageJs)}
  </script>
</body>
</html>`;
}

// ─── HTML escape utility ──────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
