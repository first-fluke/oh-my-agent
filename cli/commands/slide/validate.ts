import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import color from "picocolors";
import { findChromeExecutable } from "../search/strategies/browser.js";
import { resolveWorkspace } from "./workspace.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAME_W_PX = 1920;
const FRAME_H_PX = 1080;
/** Sub-pixel tolerance for overflow / overlap detection. */
const TOLERANCE_PX = 0.5;
/**
 * Point conversion: 1pt = 1/72 inch; at 96dpi → 1px = 0.75pt.
 * Authoring is px at 1920×1080; PPTX export converts at ÷2.667 → 720×405pt.
 */
const PX_TO_PT = 0.75;

/** Minimum readable font size relative to 1080h (≈ 18px on 1080p). */
const MIN_FONT_SIZE_PX = 18;
/** Timeout for document.fonts.ready await inside page.evaluate (ms). */
const FONTS_READY_TIMEOUT_MS = 10_000;
/** Timeout for page navigation (ms). */
const PAGE_LOAD_TIMEOUT_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type IssueCode =
  | "no_overflowing_text"
  | "no_overlapping_text"
  | "slide_sized_text"
  | "remote_asset_ref";

export interface ValidateIssue {
  code: IssueCode;
  /** Human-readable description. */
  message: string;
  /** Slide filename (e.g. "slide-01.html"). */
  slide: string;
  /** CSS selector of the offending element, when applicable. */
  selector?: string;
  /** Bounding rect of the element in px (design-space coords). */
  rect?: { x: number; y: number; width: number; height: number };
}

export interface SlideResult {
  file: string;
  status: "pass" | "fail";
  issues: ValidateIssue[];
}

export interface ValidateReport {
  generatedAt: string;
  frame: {
    widthPt: number;
    heightPt: number;
    widthPx: number;
    heightPx: number;
  };
  summary: {
    totalSlides: number;
    passedSlides: number;
    failedSlides: number;
    criticalIssues: number;
    warnings: number;
  };
  slides: SlideResult[];
}

// ─── Puppeteer minimal interface ──────────────────────────────────────────────

interface PuppeteerModule {
  launch(options: {
    executablePath: string;
    headless: boolean | "new";
    args?: string[];
  }): Promise<PuppeteerBrowser>;
}

interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}

type RequestInterception = {
  url(): string;
  resourceType(): string;
  abort(): Promise<void>;
  continue(): Promise<void>;
};

interface PuppeteerPage {
  setViewport(opts: { width: number; height: number }): Promise<void>;
  setRequestInterception(enabled: boolean): Promise<void>;
  on(event: "request", cb: (req: RequestInterception) => void): void;
  goto(
    url: string,
    opts: { waitUntil: string; timeout: number },
  ): Promise<unknown>;
  evaluate<T>(fn: (() => T | Promise<T>) | string): Promise<T>;
  close(): Promise<void>;
}

async function loadPuppeteer(): Promise<PuppeteerModule | null> {
  try {
    const mod = (await import("puppeteer-core")) as unknown as {
      default?: PuppeteerModule;
    } & PuppeteerModule;
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

// ─── Geometry helpers (pure, vitest-testable) ─────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Returns true when rect extends past the 1920×1080 frame (with tolerance). */
export function isOverflowing(rect: Rect): boolean {
  return (
    rect.x + rect.width > FRAME_W_PX + TOLERANCE_PX ||
    rect.y + rect.height > FRAME_H_PX + TOLERANCE_PX ||
    rect.x < -TOLERANCE_PX ||
    rect.y < -TOLERANCE_PX
  );
}

/** Returns true when two rects overlap (with tolerance). */
export function isOverlapping(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width - TOLERANCE_PX &&
    a.x + a.width > b.x + TOLERANCE_PX &&
    a.y < b.y + b.height - TOLERANCE_PX &&
    a.y + a.height > b.y + TOLERANCE_PX
  );
}

/** Convert px to pt (px × 0.75). */
export function pxToPt(px: number): number {
  return px * PX_TO_PT;
}

// ─── Per-slide checks (run inside page.evaluate) ──────────────────────────────

interface InPageTextElement {
  selector: string;
  rect: Rect;
  fontSize: number;
  text: string;
}

/** Serializable result from page.evaluate. */
interface InPageCheckResult {
  textElements: InPageTextElement[];
  remoteRefs: Array<{ selector: string; url: string }>;
}

/**
 * In-page check function string.
 *
 * H2 fix: iterates each `.slide` element inside `.deck-stage` (canonical DOM contract
 * from deck-stage.js: `<deck-stage><div class="deck-viewport"><div class="deck-stage">
 * <section class="slide">…`). Each `.slide` element's bounding rect is used as the
 * frame origin so overflow geometry is in design-space coordinates (0,0 to 1920×1080).
 * Falls back to `document.body` when `.deck-stage` is absent (legacy / custom layouts).
 *
 * M2 fix: also collects remote refs from `<script src>`, `<iframe src>`, `srcset`
 * attributes, and inline CSS `url()` in style attributes and `<style>` blocks.
 */
const IN_PAGE_CHECK_FN = `(function() {
  var REMOTE_RE = /^https?:\\/\\//i;

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    var tag = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string' && el.className.trim()) {
      var cls = el.className.trim().split(/\\s+/).slice(0, 2).join('.');
      tag = tag + '.' + cls;
    }
    if (!el.parentElement || el.parentElement.tagName === 'BODY') return tag;
    var siblings = Array.from(el.parentElement.children);
    var idx = siblings.indexOf(el);
    return getSelector(el.parentElement) + ' > ' + tag + ':nth-child(' + (idx + 1) + ')';
  }

  // ── Locate slide frames (canonical: .deck-stage > .slide) ──────────────────
  var deckStage = document.querySelector('.deck-stage');
  var slideEls = deckStage
    ? Array.from(deckStage.querySelectorAll('.slide'))
    : [];
  // Fallback: treat entire body as a single frame when no canonical structure
  var frames = slideEls.length > 0 ? slideEls : [document.body];

  var textElements = [];

  for (var fi = 0; fi < frames.length; fi++) {
    var frame = frames[fi];
    var frameRect = frame.getBoundingClientRect();

    var all = Array.from(frame.querySelectorAll('*'));
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var children = el.childNodes;
      var hasText = false;
      for (var j = 0; j < children.length; j++) {
        if (children[j].nodeType === 3 && children[j].textContent.trim()) {
          hasText = true;
          break;
        }
      }
      if (!hasText) continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      var style = window.getComputedStyle(el);
      var fontSize = parseFloat(style.fontSize) || 0;
      textElements.push({
        selector: getSelector(el),
        rect: {
          x: r.left - frameRect.left,
          y: r.top - frameRect.top,
          width: r.width,
          height: r.height
        },
        fontSize: fontSize,
        text: el.textContent ? el.textContent.trim().slice(0, 60) : ''
      });
    }
  }

  // ── Remote asset references (M2: comprehensive) ────────────────────────────
  var remoteRefs = [];

  // img / source / video / audio — src attribute
  var mediaSrcEls = Array.from(document.querySelectorAll(
    'img[src], source[src], video[src], audio[src]'
  ));
  for (var k = 0; k < mediaSrcEls.length; k++) {
    var src = mediaSrcEls[k].getAttribute('src') || '';
    if (REMOTE_RE.test(src)) {
      remoteRefs.push({ selector: getSelector(mediaSrcEls[k]), url: src });
    }
  }

  // img / source — srcset attribute
  var srcsetEls = Array.from(document.querySelectorAll('[srcset]'));
  for (var si = 0; si < srcsetEls.length; si++) {
    var srcset = srcsetEls[si].getAttribute('srcset') || '';
    var parts = srcset.split(',');
    for (var pi = 0; pi < parts.length; pi++) {
      var url = parts[pi].trim().split(/\\s+/)[0] || '';
      if (REMOTE_RE.test(url)) {
        remoteRefs.push({ selector: getSelector(srcsetEls[si]), url: url });
        break; // one hit per element is enough
      }
    }
  }

  // link[href] — stylesheets, preload, etc.
  var links = Array.from(document.querySelectorAll('link[href]'));
  for (var l = 0; l < links.length; l++) {
    var href = links[l].getAttribute('href') || '';
    if (REMOTE_RE.test(href)) {
      remoteRefs.push({ selector: getSelector(links[l]), url: href });
    }
  }

  // script[src]
  var scripts = Array.from(document.querySelectorAll('script[src]'));
  for (var sc = 0; sc < scripts.length; sc++) {
    var ssrc = scripts[sc].getAttribute('src') || '';
    if (REMOTE_RE.test(ssrc)) {
      remoteRefs.push({ selector: getSelector(scripts[sc]), url: ssrc });
    }
  }

  // iframe[src]
  var iframes = Array.from(document.querySelectorAll('iframe[src]'));
  for (var ic = 0; ic < iframes.length; ic++) {
    var isrc = iframes[ic].getAttribute('src') || '';
    if (REMOTE_RE.test(isrc)) {
      remoteRefs.push({ selector: getSelector(iframes[ic]), url: isrc });
    }
  }

  // Inline style attributes: background-image / src url()
  var CSS_URL_RE = /url\\(["']?(https?:[^"')]+)["']?\\)/gi;
  var styledEls = Array.from(document.querySelectorAll('[style]'));
  for (var se = 0; se < styledEls.length; se++) {
    var styleAttr = styledEls[se].getAttribute('style') || '';
    var m;
    CSS_URL_RE.lastIndex = 0;
    while ((m = CSS_URL_RE.exec(styleAttr)) !== null) {
      remoteRefs.push({ selector: getSelector(styledEls[se]), url: m[1] });
    }
  }

  // <style> blocks: url() inside stylesheets
  var styleBlocks = Array.from(document.querySelectorAll('style'));
  for (var sb = 0; sb < styleBlocks.length; sb++) {
    var cssText = styleBlocks[sb].textContent || '';
    CSS_URL_RE.lastIndex = 0;
    var urlMatch;
    while ((urlMatch = CSS_URL_RE.exec(cssText)) !== null) {
      remoteRefs.push({ selector: getSelector(styleBlocks[sb]), url: urlMatch[1] });
    }
  }

  return { textElements: textElements, remoteRefs: remoteRefs };
})()`;

// ─── Core validation logic ─────────────────────────────────────────────────────

async function validateSlide(
  page: PuppeteerPage,
  slideFile: string,
  slideUrl: string,
): Promise<SlideResult> {
  const issues: ValidateIssue[] = [];

  await page.goto(slideUrl, {
    waitUntil: "networkidle0",
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });

  // H1 fix: await document.fonts.ready via page.evaluate (which awaits a returned
  // thenable). `page.waitForFunction("document.fonts.ready")` is a NO-OP because
  // waitForFunction polls the expression for truthiness — a Promise is always
  // truthy so it resolves immediately without awaiting font load.
  // page.evaluate(() => document.fonts.ready) returns the FontFaceSet Promise
  // and puppeteer-core awaits it before resolving, so we actually block until
  // all fonts are loaded (or the timeout guard fires).
  try {
    await Promise.race([
      page.evaluate("document.fonts.ready"),
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error("fonts.ready timeout")),
          FONTS_READY_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch {
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
  for (let i = 0; i < textElements.length; i++) {
    for (let j = i + 1; j < textElements.length; j++) {
      const a = textElements[i];
      const b = textElements[j];
      if (!a || !b) continue;
      if (isOverlapping(a.rect, b.rect)) {
        issues.push({
          code: "no_overlapping_text",
          message: `Text elements overlap: "${a.text}" ↔ "${b.text}"`,
          slide: slideFile,
          selector: `${a.selector} ↔ ${b.selector}`,
          rect: a.rect,
        });
      }
    }
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

// ─── Request interception — offline context ───────────────────────────────────

function isLocalUrl(url: string, workDir: string): boolean {
  if (url.startsWith("file://")) return true;
  if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost"))
    return true;
  if (url.startsWith("data:")) return true;
  const encodedDir = encodeURI(workDir.replace(/\\/g, "/"));
  if (url.startsWith(`file://${encodedDir}`)) return true;
  return false;
}

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

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface ValidateOptions {
  dir: string;
  format?: "json" | "concise";
  slide?: string;
  outFile?: string;
}

export async function runSlideValidate(opts: ValidateOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4; // invalid-input
  }

  // Load puppeteer
  const puppeteer = await loadPuppeteer();
  if (!puppeteer) {
    console.error(
      color.red("puppeteer-core not installed. Run: bun add puppeteer-core"),
    );
    return 1;
  }

  // Resolve Chrome
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    console.error(
      color.red(
        "Chrome/Chromium not found. Install a Chromium-based browser or set OMA_CHROME_PATH.",
      ),
    );
    return 1;
  }

  // Determine which slides to validate
  const allSlides = ws.meta.order;
  const slidesToValidate = opts.slide
    ? allSlides.filter((s) => s === opts.slide)
    : allSlides;

  if (slidesToValidate.length === 0) {
    console.error(
      color.red(
        opts.slide
          ? `Slide "${opts.slide}" not found in meta.json order[]`
          : "No slides to validate",
      ),
    );
    return 4;
  }

  // M1: validate all slide paths before launching the browser
  for (const slideFile of slidesToValidate) {
    try {
      assertSafeSlideFile(slideFile, ws.dir);
    } catch (err) {
      console.error(color.red((err as Error).message));
      return 4;
    }
  }

  const format = opts.format ?? "concise";
  if (format === "concise") {
    console.log(
      color.bold(
        `Validating ${slidesToValidate.length} slide(s) in "${ws.dir}" …`,
      ),
    );
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const slideResults: SlideResult[] = [];

  try {
    for (const slideFile of slidesToValidate) {
      // assertSafeSlideFile already validated — use direct join here
      const slidePath = join(ws.dir, slideFile);
      if (!existsSync(slidePath)) {
        console.error(color.red(`  Slide not found: ${slidePath}`));
        slideResults.push({
          file: slideFile,
          status: "fail",
          issues: [
            {
              code: "no_overflowing_text",
              message: `Slide file not found on disk: ${slideFile}`,
              slide: slideFile,
            },
          ],
        });
        continue;
      }

      const page = await browser.newPage();
      await page.setViewport({ width: FRAME_W_PX, height: FRAME_H_PX });

      // Intercept requests — block non-local network (offline render context)
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const url = req.url();
        if (isLocalUrl(url, ws.dir)) {
          req.continue().catch(() => {});
        } else {
          req.abort().catch(() => {});
        }
      });

      const fileUrl = `file://${slidePath.replace(/\\/g, "/")}`;

      try {
        const result = await validateSlide(page, slideFile, fileUrl);
        slideResults.push(result);
        if (format === "concise") {
          const icon =
            result.status === "pass" ? color.green("✓") : color.red("✗");
          const issueCount = result.issues.length;
          console.log(
            `  ${icon} ${slideFile}${issueCount > 0 ? color.dim(` (${issueCount} issue(s))`) : ""}`,
          );
          for (const issue of result.issues) {
            const isWarning = issue.code === "remote_asset_ref";
            const bullet = isWarning ? color.yellow("  ⚠") : color.red("  ✗");
            console.log(`${bullet} [${issue.code}] ${issue.message}`);
            if (issue.selector) {
              console.log(color.dim(`      selector: ${issue.selector}`));
            }
          }
        }
      } catch (err) {
        console.error(
          color.red(
            `  Error validating ${slideFile}: ${(err as Error).message}`,
          ),
        );
        slideResults.push({
          file: slideFile,
          status: "fail",
          issues: [
            {
              code: "no_overflowing_text",
              message: `Validation error: ${(err as Error).message}`,
              slide: slideFile,
            },
          ],
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  // Build report
  const criticalCodes: IssueCode[] = [
    "no_overflowing_text",
    "no_overlapping_text",
    "slide_sized_text",
  ];
  const allIssues = slideResults.flatMap((s) => s.issues);
  const criticalIssues = allIssues.filter((i) =>
    criticalCodes.includes(i.code),
  ).length;
  const warnings = allIssues.filter(
    (i) => i.code === "remote_asset_ref",
  ).length;
  const failedSlides = slideResults.filter((s) => s.status === "fail").length;

  const report: ValidateReport = {
    generatedAt: new Date().toISOString(),
    frame: {
      widthPt: pxToPt(FRAME_W_PX),
      heightPt: pxToPt(FRAME_H_PX),
      widthPx: FRAME_W_PX,
      heightPx: FRAME_H_PX,
    },
    summary: {
      totalSlides: slideResults.length,
      passedSlides: slideResults.length - failedSlides,
      failedSlides,
      criticalIssues,
      warnings,
    },
    slides: slideResults,
  };

  if (format === "json") {
    const json = JSON.stringify(report, null, 2);
    if (opts.outFile) {
      mkdirSync(join(ws.dir, "out"), { recursive: true });
      const outPath = opts.outFile.startsWith("/")
        ? opts.outFile
        : join(ws.dir, "out", opts.outFile);
      writeFileSync(outPath, json, "utf8");
      console.log(color.dim(`Validation report written to: ${outPath}`));
    } else {
      console.log(json);
    }
  } else {
    console.log();
    if (criticalIssues === 0 && warnings === 0) {
      console.log(
        color.green(`All ${slideResults.length} slide(s) passed validation.`),
      );
    } else {
      if (criticalIssues > 0) {
        console.log(
          color.red(
            `${failedSlides}/${slideResults.length} slide(s) failed — ${criticalIssues} critical issue(s).`,
          ),
        );
      }
      if (warnings > 0) {
        console.log(
          color.yellow(
            `${warnings} warning(s) — remote asset reference(s) found.`,
          ),
        );
      }
    }
  }

  // Exit non-zero when criticalIssues > 0 — gates CI / auto-fix loop
  return criticalIssues > 0 ? 1 : 0;
}
