/**
 * export/png.ts — oma slide png --dir --out-dir [--resolution 720p|1080p|1440p|2160p|4k]
 *
 * Exports each slide as a PNG via puppeteer-core screenshot.
 * - Resolution is achieved natively via the viewport `deviceScaleFactor`
 *   (the browser re-rasterizes text/vectors at the target DPI — crisper than
 *   a post-hoc bitmap resize, and zero extra dependencies).
 * - For slides containing local video, exports a poster frame
 *   (first frame / current frame) rather than the video element.
 *
 * Resolution presets (viewport CSS px × deviceScaleFactor → output px):
 *   720p  → 1280×720  @1x    → 1280×720
 *   1080p → 1920×1080 @1x    → 1920×1080  (base)
 *   1440p → 1920×1080 @1.333 → 2560×1440
 *   2160p → 1920×1080 @2x    → 3840×2160
 *   4k    → alias for 2160p
 *
 * Exit codes: 0 ok · 1 error · 4 invalid-input · 6 timeout
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import color from "picocolors";
import { findChromeExecutable } from "../../search/strategies/browser.js";
import { resolveWorkspace } from "../workspace.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_LOAD_TIMEOUT_MS = 30_000;
const FONTS_READY_TIMEOUT_MS = 10_000;

// ─── Resolution presets ───────────────────────────────────────────────────────

export type ResolutionPreset = "720p" | "1080p" | "1440p" | "2160p" | "4k";

export interface Resolution {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

const RESOLUTION_MAP: Record<ResolutionPreset, Resolution> = {
  "720p": { width: 1280, height: 720, deviceScaleFactor: 1 },
  "1080p": { width: 1920, height: 1080, deviceScaleFactor: 1 },
  "1440p": { width: 1920, height: 1080, deviceScaleFactor: 4 / 3 },
  "2160p": { width: 1920, height: 1080, deviceScaleFactor: 2 },
  "4k": { width: 1920, height: 1080, deviceScaleFactor: 2 },
};

export function parseResolution(res: string): Resolution | null {
  const lower = res.toLowerCase() as ResolutionPreset;
  return RESOLUTION_MAP[lower] ?? null;
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
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  }): Promise<Buffer>;
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

async function awaitFontsReady(page: PuppeteerPage): Promise<void> {
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
    // Timeout — proceed
  }
}

/**
 * Pause video elements on the page so we capture a stable poster frame.
 * Also calls load() to trigger the poster attribute if not already loaded.
 */
const PAUSE_VIDEOS_FN = `(function() {
  var videos = Array.from(document.querySelectorAll('video'));
  for (var i = 0; i < videos.length; i++) {
    try {
      videos[i].pause();
      if (videos[i].currentTime === 0) {
        // Trigger load so poster frame is visible
        videos[i].load();
      }
    } catch(e) {}
  }
})()`;

/**
 * Navigate a single per-slide HTML file and screenshot the full viewport.
 * The viewport (set by the caller per resolution) determines output size:
 * the deck-stage scales the 1920×1080 stage to fit, and deviceScaleFactor
 * multiplies the captured pixels. Pauses videos first for a poster frame.
 */
async function screenshotSlide(
  page: PuppeteerPage,
  slidePath: string,
  res: Resolution,
): Promise<Buffer> {
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

  await awaitFontsReady(page);

  // Pause any video elements (poster frame capture)
  await page.evaluate(PAUSE_VIDEOS_FN);

  // Clip to the CSS viewport; output is auto-multiplied by deviceScaleFactor.
  return page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: res.width, height: res.height },
  });
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export interface PngOptions {
  dir: string;
  outDir?: string;
  resolution?: string;
}

export async function runSlidePng(opts: PngOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4;
  }

  const { dir, meta } = ws;

  // Resolve resolution
  const resStr = opts.resolution ?? "1080p";
  const resolution = parseResolution(resStr);
  if (!resolution) {
    console.error(
      color.red(
        `Invalid --resolution "${resStr}". Valid values: 720p, 1080p, 1440p, 2160p, 4k.`,
      ),
    );
    return 4;
  }

  // Resolve output directory
  const defaultOutDir = join(dir, "out", "png");
  let outDir: string;
  if (opts.outDir) {
    outDir = opts.outDir.startsWith("/")
      ? opts.outDir
      : resolve(process.cwd(), opts.outDir);
  } else {
    outDir = defaultOutDir;
  }
  mkdirSync(outDir, { recursive: true });

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

  const outW = Math.round(resolution.width * resolution.deviceScaleFactor);
  const outH = Math.round(resolution.height * resolution.deviceScaleFactor);
  console.log(
    color.bold(
      `Exporting PNG (${resStr}, ${outW}×${outH}) — ${meta.order.length} slide(s) → ${outDir}`,
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

  const results: { file: string; ok: boolean }[] = [];

  try {
    for (let i = 0; i < meta.order.length; i++) {
      const slideFile = meta.order[i];
      if (slideFile === undefined) continue;
      const slidePath = join(dir, slideFile);

      if (!existsSync(slidePath)) {
        console.error(color.red(`  Slide not found: ${slidePath}`));
        results.push({ file: slideFile, ok: false });
        continue;
      }

      // Determine output filename: slide-01.html → slide-01.png
      const pngName = slideFile.replace(/\.html?$/i, ".png");
      const outPath = join(outDir, pngName);

      const page = await browser.newPage();
      await page.setViewport({
        width: resolution.width,
        height: resolution.height,
        deviceScaleFactor: resolution.deviceScaleFactor,
      });

      try {
        const buf = await screenshotSlide(page, slidePath, resolution);
        writeFileSync(outPath, buf);
        console.log(color.green(`  ✓ ${slideFile} → ${pngName}`));
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

  if (failed > 0) {
    console.log(
      color.red(`\n${failed}/${results.length} slide(s) failed to export.`),
    );
    return 1;
  }

  console.log(color.green(`\n${succeeded} PNG(s) written to: ${outDir}`));
  return 0;
}
