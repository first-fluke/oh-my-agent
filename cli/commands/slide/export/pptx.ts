/**
 * export/pptx.ts — oma slide pptx --dir --out
 *
 * [EXPERIMENTAL] Exports a slide deck to PPTX via pptxgenjs.
 *
 * Strategy: raster-backed (visual fidelity over text-fidelity).
 *   For each slide, render via puppeteer-core at 1920×1080 and screenshot to
 *   PNG, then place each PNG full-bleed on a 13.333in × 7.5in (LAYOUT_WIDE)
 *   pptxgenjs slide via addImage. This guarantees gradients, custom fonts, and
 *   all CSS visual effects are preserved as raster images.
 *
 * px → PPTX layout notes:
 *   - PPTX LAYOUT_WIDE = 13.333in × 7.5in
 *   - Stage canvas = 1920×1080px (design space)
 *   - Image is placed full-bleed: x:0, y:0, w:"100%", h:"100%"
 *   - No attempt to map individual text elements to OOXML (text-mapping is out
 *     of scope for v1 per design doc 015-oma-slide.md)
 *
 * Dependencies:
 *   - pptxgenjs    (optional) — bun add --optional pptxgenjs
 *   - puppeteer-core (required by validate/png, always in deps)
 *   - sharp        (optional) — used only if resolution scaling needed (not in
 *                  this code path; screenshots are taken at 1920×1080)
 *
 * Exit codes: 0 ok · 1 error · 4 invalid-input · 6 timeout
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import color from "picocolors";
import { findChromeExecutable } from "../../search/strategies/browser.js";
import { resolveWorkspace } from "../workspace.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAME_W_PX = 1920;
const FRAME_H_PX = 1080;
const PAGE_LOAD_TIMEOUT_MS = 30_000;
const FONTS_READY_TIMEOUT_MS = 10_000;

/**
 * PPTX layout dimensions matching LAYOUT_WIDE (16:9).
 * pptxgenjs expects inches for addImage coordinates when w/h are strings ("100%")
 * or numeric inches. Full-bleed placement uses x:0, y:0, w:"100%", h:"100%".
 */
const PPTX_LAYOUT_W_IN = 13.333;
const PPTX_LAYOUT_H_IN = 7.5;

// ─── px → pt helpers (exported for unit tests) ────────────────────────────────

/**
 * Convert 1920×1080px canvas dimensions to PPTX points at 72pt/in.
 *
 * 1920px / 96dpi = 20in → 20 × 72 = 1440pt
 * 1080px / 96dpi = 11.25in → 11.25 × 72 = 810pt
 *
 * Note: the PPTX slide is 13.333in × 7.5in (LAYOUT_WIDE). We do NOT try to
 * match 1440×810pt 1:1; instead we place the raster full-bleed on the
 * 13.333×7.5in canvas so aspect ratio is preserved.
 */
export function pxToInch(px: number, dpi = 96): number {
  return px / dpi;
}

/**
 * Convert pixel dimensions to PPTX layout inches (scaled to fit LAYOUT_WIDE).
 * Returns the scale factor so callers can validate the layout mapping.
 */
export function pptxLayoutScale(
  canvasW = FRAME_W_PX,
  canvasH = FRAME_H_PX,
  layoutW = PPTX_LAYOUT_W_IN,
  layoutH = PPTX_LAYOUT_H_IN,
): { scaleX: number; scaleY: number } {
  const canvasWIn = pxToInch(canvasW);
  const canvasHIn = pxToInch(canvasH);
  return {
    scaleX: layoutW / canvasWIn,
    scaleY: layoutH / canvasHIn,
  };
}

// ─── pptxgenjs minimal interface ─────────────────────────────────────────────

interface PptxGenJs {
  new (): PptxInstance;
}

interface PptxInstance {
  defineLayout(opts: { name: string; width: number; height: number }): void;
  layout: string;
  addSlide(): PptxSlide;
  writeFile(opts: { fileName: string }): Promise<void>;
}

interface PptxSlide {
  addImage(opts: {
    data?: string;
    path?: string;
    x: number | string;
    y: number | string;
    w: number | string;
    h: number | string;
  }): void;
}

let _pptxCache: PptxGenJs | null | undefined;

async function loadPptxGenJs(): Promise<PptxGenJs | null> {
  if (_pptxCache !== undefined) return _pptxCache;
  try {
    const mod = (await import("pptxgenjs")) as unknown as {
      default?: PptxGenJs;
    } & PptxGenJs;
    _pptxCache = mod.default ?? mod;
    return _pptxCache;
  } catch {
    _pptxCache = null;
    return null;
  }
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
  abort(): Promise<void>;
  continue(): Promise<void>;
};

interface PuppeteerPage {
  setViewport(opts: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  }): Promise<void>;
  setRequestInterception(enabled: boolean): Promise<void>;
  on(event: "request", cb: (req: RequestInterception) => void): void;
  goto(
    url: string,
    opts: { waitUntil: string; timeout: number },
  ): Promise<unknown>;
  evaluate<T>(fn: (() => T | Promise<T>) | string): Promise<T>;
  screenshot(opts: {
    type?: "png" | "jpeg";
    clip?: { x: number; y: number; width: number; height: number };
    encoding?: "base64" | "binary";
  }): Promise<string | Buffer>;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLocalUrl(url: string): boolean {
  if (url.startsWith("file://")) return true;
  if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost"))
    return true;
  if (url.startsWith("data:")) return true;
  return false;
}

const PAUSE_VIDEOS_FN = `(function() {
  var videos = Array.from(document.querySelectorAll('video'));
  for (var i = 0; i < videos.length; i++) {
    try { videos[i].pause(); if (videos[i].currentTime === 0) videos[i].load(); } catch(e) {}
  }
})()`;

/**
 * Screenshot a single slide at 1920×1080, returning a base64 PNG data URI
 * suitable for pptxgenjs addImage({ data: ... }).
 */
async function screenshotSlideToBase64(
  page: PuppeteerPage,
  slidePath: string,
): Promise<string> {
  const fileUrl = `file://${slidePath.replace(/\\/g, "/")}`;

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (isLocalUrl(req.url())) {
      req.continue().catch(() => {});
    } else {
      req.abort().catch(() => {});
    }
  });

  await page.goto(fileUrl, {
    waitUntil: "networkidle0",
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });

  // Await fonts.ready — same approach as validate.ts (H1 fix)
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
    // Timeout — proceed with available fonts
  }

  // Pause video elements so we capture a stable poster frame
  await page.evaluate(PAUSE_VIDEOS_FN);

  const base64 = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: FRAME_W_PX, height: FRAME_H_PX },
    encoding: "base64",
  });

  return `data:image/png;base64,${base64 as string}`;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export interface PptxOptions {
  dir: string;
  out?: string;
}

export async function runSlidePptx(opts: PptxOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4;
  }

  const { dir, meta } = ws;

  // Resolve output path
  const outDir = join(dir, "out");
  mkdirSync(outDir, { recursive: true });

  let outPath: string;
  if (opts.out) {
    outPath = opts.out.startsWith("/")
      ? opts.out
      : resolve(process.cwd(), opts.out);
    mkdirSync(join(outPath, ".."), { recursive: true });
  } else {
    outPath = join(outDir, "deck.pptx");
  }

  // Load pptxgenjs (optional dep)
  const PptxGenJs = await loadPptxGenJs();
  if (!PptxGenJs) {
    console.error(
      color.red("pptxgenjs not installed. Run: bun add --optional pptxgenjs"),
    );
    console.error(
      color.dim(
        "  pptxgenjs is an optional dependency required only for PPTX export.",
      ),
    );
    return 1;
  }

  // Load puppeteer (required for raster screenshots)
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

  console.log(
    color.bold(
      `[EXPERIMENTAL] Exporting PPTX (raster-backed) — ${meta.order.length} slide(s) → ${outPath}`,
    ),
  );
  console.log(
    color.dim(
      "  Strategy: each slide is rasterized to PNG at 1920×1080 and placed full-bleed.",
    ),
  );
  console.log(
    color.dim(
      "  Text is embedded as raster (no text-layer OOXML); gradients and fonts preserved.",
    ),
  );

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const pptx = new PptxGenJs();

  // Set slide layout to LAYOUT_WIDE (13.333in × 7.5in = 16:9)
  pptx.defineLayout({
    name: "LAYOUT_WIDE",
    width: PPTX_LAYOUT_W_IN,
    height: PPTX_LAYOUT_H_IN,
  });
  pptx.layout = "LAYOUT_WIDE";

  const results: { file: string; ok: boolean }[] = [];

  try {
    for (let i = 0; i < meta.order.length; i++) {
      const slideFile = meta.order[i];
      if (!slideFile) continue;
      const slidePath = join(dir, slideFile);

      if (!existsSync(slidePath)) {
        console.error(color.red(`  Slide not found: ${slidePath}`));
        results.push({ file: slideFile, ok: false });
        continue;
      }

      const page = await browser.newPage();
      await page.setViewport({
        width: FRAME_W_PX,
        height: FRAME_H_PX,
        deviceScaleFactor: 1,
      });

      try {
        const imgData = await screenshotSlideToBase64(page, slidePath);

        const slide = pptx.addSlide();
        // Place the raster PNG full-bleed on the LAYOUT_WIDE canvas
        slide.addImage({
          data: imgData,
          x: 0,
          y: 0,
          w: "100%",
          h: "100%",
        });

        console.log(color.green(`  ✓ ${slideFile} → rasterized`));
        results.push({ file: slideFile, ok: true });
      } catch (err) {
        console.error(color.red(`  ✗ ${slideFile}: ${(err as Error).message}`));
        results.push({ file: slideFile, ok: false });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok).length;
  const succeeded = results.filter((r) => r.ok).length;

  if (succeeded === 0) {
    console.error(
      color.red("No slides were rasterized — aborting PPTX write."),
    );
    return 1;
  }

  // Write PPTX file
  try {
    await pptx.writeFile({ fileName: outPath });
  } catch (err) {
    console.error(color.red(`Failed to write PPTX: ${(err as Error).message}`));
    return 1;
  }

  const sizeKb = existsSync(outPath)
    ? Math.round(readFileSync(outPath).length / 1024)
    : 0;

  if (failed > 0) {
    console.log(
      color.yellow(
        `\n${failed}/${results.length} slide(s) failed — partial PPTX written.`,
      ),
    );
  }

  console.log(
    color.green(
      `\n[EXPERIMENTAL] PPTX written: ${outPath} (${sizeKb} KB, ${succeeded} slide(s))`,
    ),
  );
  console.log(
    color.dim(
      "  Note: This is an experimental export. Text is raster-only (not selectable in PowerPoint).",
    ),
  );

  return failed > 0 ? 1 : 0;
}
