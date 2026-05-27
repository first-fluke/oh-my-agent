/**
 * bundle.ts — oma slide bundle --dir --out [--inline-fonts]
 *
 * Produces a SINGLE self-contained .html (default <dir>/out/deck.html):
 *   - Merges all slide sections (same extraction as viewer.ts).
 *   - Inlines viewport-base.css and deck-stage.js.
 *   - Carries per-slide <style>/<head> styles.
 *   - Embeds speaker notes as <script type="application/json" id="speaker-notes">.
 *   - --inline-fonts: best-effort inline @font-face data URIs (CDN <link> by default).
 *   - If any slide references a local video (./assets/*.mp4 etc.), warns that the
 *     bundle is no longer fully self-contained (videos cannot inline) and keeps
 *     the ./assets/<file> ref.
 *
 * DOM contract mirrors viewer.ts (deck-stage.js canonical structure).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import color from "picocolors";
import { firstSlideId, scopeStyleBlocks } from "./scope-css.js";
import {
  escapeInlineScript,
  extractLinkStylesheets,
  extractSlides,
  extractStyles,
} from "./viewer.js";
import { resolveWorkspace } from "./workspace.js";

// ─── Video detection ──────────────────────────────────────────────────────────

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".ogv",
  ".ogg",
  ".mov",
  ".avi",
  ".mkv",
];

/**
 * Returns true when the HTML string contains a local video asset reference
 * (./assets/something.mp4 etc.) — cannot be inlined into a single file.
 */
export function hasLocalVideoRef(html: string): boolean {
  const srcRe = /(?:src|href)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(srcRe)) {
    const url = (m[1] ?? "").toLowerCase();
    if (url.startsWith("http://") || url.startsWith("https://")) continue;
    if (VIDEO_EXTENSIONS.some((ext) => url.endsWith(ext))) return true;
  }
  // Also check CSS url() in style attributes or <style> blocks
  const cssUrlRe = /url\(["']?([^"')]+)["']?\)/gi;
  for (const cm of html.matchAll(cssUrlRe)) {
    const url = (cm[1] ?? "").toLowerCase();
    if (url.startsWith("http://") || url.startsWith("https://")) continue;
    if (VIDEO_EXTENSIONS.some((ext) => url.endsWith(ext))) return true;
  }
  return false;
}

// ─── Font CDN link extraction ─────────────────────────────────────────────────

/**
 * Extract remote CDN <link rel="stylesheet"> tags (fonts, preconnect etc.)
 * that should be preserved by default (or inlined when --inline-fonts).
 */
export function extractRemoteLinkStylesheets(html: string): string[] {
  const results: string[] = [];
  const linkRe = /<link([^>]*?)>/gi;
  for (const m of html.matchAll(linkRe)) {
    const tag = m[0];
    const hrefMatch = /href=["']([^"']+)["']/i.exec(tag);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    if (href === undefined) continue;
    // Only remote links
    if (!href.startsWith("http://") && !href.startsWith("https://")) continue;
    if (!results.includes(tag)) {
      results.push(tag);
    }
  }
  return results;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export interface BundleOptions {
  dir: string;
  out?: string;
  inlineFonts?: boolean;
}

export async function runSlideBundle(opts: BundleOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4; // invalid-input
  }

  const { dir, meta } = ws;

  // Resolve output path
  const defaultOutPath = join(dir, "out", "deck.html");
  let outPath: string;
  if (opts.out) {
    outPath = opts.out.startsWith("/")
      ? opts.out
      : resolve(process.cwd(), opts.out);
  } else {
    outPath = defaultOutPath;
  }

  // Ensure output directory exists
  mkdirSync(dirname(outPath), { recursive: true });

  // Read shared assets
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
  const allLocalLinks: string[] = [];
  const allRemoteLinks: string[] = [];
  let hasVideo = false;
  const videoSlides: string[] = [];

  for (const slideFile of meta.order) {
    const slidePath = join(dir, slideFile);
    if (!existsSync(slidePath)) {
      console.error(color.red(`Slide file not found: "${slidePath}"`));
      return 4;
    }

    const slideHtml = readFileSync(slidePath, "utf8");

    // Check for video references
    if (hasLocalVideoRef(slideHtml)) {
      hasVideo = true;
      videoSlides.push(slideFile);
    }

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

    // Extract per-slide <style> blocks, scoped to this slide's id so generic
    // selectors don't collide once every file is merged into one document.
    const slideStyles = extractStyles(slideHtml);
    const slideId = firstSlideId(slideHtml);
    allStyles.push(
      ...(slideId ? scopeStyleBlocks(slideStyles, slideId) : slideStyles),
    );

    // Gather local (non-stage) link stylesheets
    const localLinks = extractLinkStylesheets(slideHtml);
    for (const link of localLinks) {
      if (!allLocalLinks.includes(link)) {
        allLocalLinks.push(link);
      }
    }

    // Gather remote links (CDN fonts, preconnect, etc.)
    const remoteLinks = extractRemoteLinkStylesheets(slideHtml);
    for (const link of remoteLinks) {
      if (!allRemoteLinks.includes(link)) {
        allRemoteLinks.push(link);
      }
    }
  }

  if (allSlides.length === 0) {
    console.error(
      color.red(
        'No <section class="slide"> elements found. Check that slides follow the canonical DOM contract.',
      ),
    );
    return 1;
  }

  // Warn about video references
  if (hasVideo) {
    console.warn(
      color.yellow(
        `  Warning: ${videoSlides.length} slide(s) reference local video file(s) (${videoSlides.join(", ")}).`,
      ),
    );
    console.warn(
      color.yellow(
        "  The bundle is no longer fully self-contained — video assets cannot be inlined.",
      ),
    );
    console.warn(
      color.yellow(
        "  Keep the ./assets/ directory alongside out/deck.html to preserve video playback.",
      ),
    );
  }

  // Font link handling
  let fontLinksHtml = "";
  if (opts.inlineFonts) {
    // Best-effort: try to fetch and inline remote @font-face CSS
    const inlinedResult = await tryInlineFonts(allRemoteLinks);
    if (inlinedResult.succeeded.length > 0) {
      // Inline as <style> blocks (they contain @import or @font-face)
      allStyles.unshift(
        ...inlinedResult.succeeded.map((r) => `<style>\n${r}\n</style>`),
      );
    }
    // Keep any that failed as regular <link> tags
    fontLinksHtml = inlinedResult.failed.join("\n  ");
    if (inlinedResult.failed.length > 0) {
      console.warn(
        color.yellow(
          `  Warning: ${inlinedResult.failed.length} CDN font link(s) could not be inlined — kept as <link> tags.`,
        ),
      );
    }
  } else {
    // Default: keep CDN links as-is
    fontLinksHtml = allRemoteLinks.join("\n  ");
  }

  // Build speaker notes JSON
  const notesJson = JSON.stringify(meta.speakerNotes ?? {});

  // Build bundle HTML
  const bundleHtml = buildBundleHtml({
    title: meta.title,
    viewportCss,
    deckStageJs,
    slides: allSlides,
    styles: allStyles,
    localLinkStylesheets: allLocalLinks,
    fontLinksHtml,
    speakerNotesJson: notesJson,
    slideCount: allSlides.length,
  });

  writeFileSync(outPath, bundleHtml, "utf8");

  const sizeKb = Math.round(Buffer.byteLength(bundleHtml, "utf8") / 1024);
  console.log(color.green(`Bundle written: ${outPath}`));
  console.log(
    color.dim(
      `  Slides: ${allSlides.length} | Size: ${sizeKb} KB${opts.inlineFonts ? " | --inline-fonts: on" : ""}`,
    ),
  );
  if (hasVideo) {
    console.log(
      color.yellow(
        `  Note: bundle references video files in ./assets/ — keep assets/ alongside deck.html.`,
      ),
    );
  }

  return 0;
}

// ─── Font inlining (best-effort) ──────────────────────────────────────────────

interface FontInlineResult {
  succeeded: string[];
  failed: string[];
}

async function tryInlineFonts(
  remoteLinks: string[],
): Promise<FontInlineResult> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const linkTag of remoteLinks) {
    const hrefMatch = /href=["']([^"']+)["']/i.exec(linkTag);
    if (!hrefMatch) {
      failed.push(linkTag);
      continue;
    }
    const href = hrefMatch[1];
    if (href === undefined) {
      failed.push(linkTag);
      continue;
    }
    try {
      const res = await fetch(href, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const css = await res.text();
      succeeded.push(css);
    } catch {
      failed.push(linkTag);
    }
  }

  return { succeeded, failed };
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

interface BuildBundleHtmlOpts {
  title: string;
  viewportCss: string;
  deckStageJs: string;
  slides: string[];
  styles: string[];
  localLinkStylesheets: string[];
  fontLinksHtml: string;
  speakerNotesJson: string;
  slideCount: number;
}

function buildBundleHtml(opts: BuildBundleHtmlOpts): string {
  const {
    title,
    viewportCss,
    deckStageJs,
    slides,
    styles,
    localLinkStylesheets,
    fontLinksHtml,
    speakerNotesJson,
    slideCount,
  } = opts;

  const slidesHtml = slides.join("\n    ");
  const stylesHtml = styles.join("\n  ");
  const localLinksHtml = localLinkStylesheets.join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  ${fontLinksHtml}
  ${localLinksHtml}
  <style>
${viewportCss}
  </style>
  ${stylesHtml}
  <style>
    /* ── Bundle base ── */
    body {
      margin: 0;
      padding: 0;
      background: #000;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    @media print {
      body {
        background: transparent;
        overflow: visible;
      }
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

  <!-- Nav controls -->
  <nav class="deck-nav" aria-label="Slide navigation">
    <button id="btn-prev" aria-label="Previous slide" onclick="document.querySelector('deck-stage')?.prev()">&#8592;</button>
    <span class="deck-counter" role="status" aria-live="polite">1 / ${slideCount}</span>
    <button id="btn-next" aria-label="Next slide" onclick="document.querySelector('deck-stage')?.next()">&#8594;</button>
  </nav>

  <!-- Speaker notes (read by deck-stage.js) -->
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
