/**
 * export/pdf.ts — oma slide pdf --dir --out [--mode capture|print]
 *
 * Exports a slide deck to PDF via puppeteer-core.
 *
 * Modes:
 *   capture (default): navigate viewer.html (or per-slide files) at 1920×1080 and
 *     use page.pdf() with A4 landscape / custom 1920×1080 pt page size, one page per slide.
 *   print: use deck-stage.js @media print path — print all slides in a single PDF call
 *     from viewer.html (CSS print rules make each .slide break to its own page).
 *
 * Lazy-loads puppeteer-core exactly like validate.ts (graceful "not installed" fallback).
 * Exit codes: 0 ok · 1 error · 4 invalid-input · 6 timeout
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import color from "picocolors";
import { findChromeExecutable } from "../../search/strategies/browser.js";
import { runSlideViewer } from "../viewer.js";
import { resolveWorkspace } from "../workspace.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAME_W_PX = 1920;
const FRAME_H_PX = 1080;
const PAGE_LOAD_TIMEOUT_MS = 30_000;
const FONTS_READY_TIMEOUT_MS = 10_000;

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
  setViewport(opts: { width: number; height: number }): Promise<void>;
  setRequestInterception(enabled: boolean): Promise<void>;
  on(event: "request", cb: (req: RequestInterception) => void): void;
  goto(
    url: string,
    opts: { waitUntil: string; timeout: number },
  ): Promise<unknown>;
  evaluate<T>(fn: (() => T | Promise<T>) | string): Promise<T>;
  pdf(opts: {
    path?: string;
    printBackground: boolean;
    landscape: boolean;
    width?: string | number;
    height?: string | number;
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
    pageRanges?: string;
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
    // Timeout — proceed with available fonts
  }
}

// ─── capture mode: screenshot-to-PDF ─────────────────────────────────────────

/**
 * In capture mode: builds viewer.html, then navigates to it and extracts
 * individual slide PDFs one-per-page by building a multi-page PDF.
 *
 * Strategy:
 *   1. Build viewer.html (ensure fresh).
 *   2. For each slide file, navigate the per-slide html at 1920×1080 and
 *      call page.pdf() with the design dimensions.
 *   3. Concatenate PDFs via simple Buffer concat (puppeteer returns one PDF
 *      per navigate — for a proper multi-page merge, we use the print mode
 *      via viewer.html when combining is needed, but for capture mode we
 *      produce a single page per slide file then join them into one PDF).
 *
 * Note: puppeteer's page.pdf() on a single navigate already produces a PDF.
 * For multi-slide PDF in capture mode we navigate each slide and produce
 * individual PDFs; then for the final output, we use viewer.html with all
 * slides and use page.pdf() once — viewer.html puts all slides in the DOM,
 * and our @media print rules make them break per page.
 *
 * Simpler approach (adopted here): use viewer.html with the print CSS path
 * even in capture mode, but emit with printBackground:true. The @media print
 * CSS in viewport-base.css makes each .slide break to its own page.
 */
async function captureMode(
  page: PuppeteerPage,
  viewerPath: string,
  outPath: string,
): Promise<void> {
  const fileUrl = `file://${viewerPath.replace(/\\/g, "/")}`;

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

  // Page size = exact design size (1920×1080 px). Do NOT set `landscape` here:
  // when width/height are given explicitly, `landscape: true` ROTATES them to
  // 1080×1920 (portrait), shrinking each slide to the top of an over-tall page.
  const pdfBuffer = await page.pdf({
    printBackground: true,
    landscape: false,
    width: `${FRAME_W_PX}px`,
    height: `${FRAME_H_PX}px`,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  writeFileSync(outPath, pdfBuffer);
}

// ─── print mode ───────────────────────────────────────────────────────────────

/**
 * In print mode: use deck-stage.js's @media print rules — navigate viewer.html
 * and trigger Puppeteer's built-in print emulation. The CSS in viewport-base.css
 * shows all slides and uses break-after:page, giving one slide per PDF page.
 */
async function printMode(
  page: PuppeteerPage,
  viewerPath: string,
  outPath: string,
): Promise<void> {
  const fileUrl = `file://${viewerPath.replace(/\\/g, "/")}`;

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

  // Print mode uses @media print CSS — slides break per page at design size.
  // `landscape: false` because width/height already define the landscape page;
  // setting landscape:true would rotate them to portrait (see captureMode).
  const pdfBuffer = await page.pdf({
    printBackground: true,
    landscape: false,
    width: `${FRAME_W_PX}px`,
    height: `${FRAME_H_PX}px`,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  writeFileSync(outPath, pdfBuffer);
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export interface PdfOptions {
  dir: string;
  out?: string;
  mode?: "capture" | "print";
}

export async function runSlidePdf(opts: PdfOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4;
  }

  const { dir } = ws;
  const mode = opts.mode ?? "capture";

  if (mode !== "capture" && mode !== "print") {
    console.error(
      color.red(`Invalid --mode "${mode}". Use "capture" or "print".`),
    );
    return 4;
  }

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
    outPath = join(outDir, "deck.pdf");
  }

  // Build viewer.html (always rebuild for freshness)
  console.log(color.dim("  Building viewer.html…"));
  const viewerCode = await runSlideViewer({ dir: opts.dir });
  if (viewerCode !== 0) {
    console.error(color.red("Failed to build viewer.html for PDF export."));
    return viewerCode;
  }

  const viewerPath = join(dir, "viewer.html");
  if (!existsSync(viewerPath)) {
    console.error(color.red(`viewer.html not found at "${viewerPath}".`));
    return 1;
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

  console.log(
    color.bold(
      `Exporting PDF (mode: ${mode}) — ${ws.meta.order.length} slide(s) → ${outPath}`,
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

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: FRAME_W_PX, height: FRAME_H_PX });

    if (mode === "print") {
      await printMode(page, viewerPath, outPath);
    } else {
      await captureMode(page, viewerPath, outPath);
    }

    await page.close();
  } finally {
    await browser.close();
  }

  const sizeKb = Math.round(readFileSync(outPath).length / 1024);
  console.log(color.green(`PDF written: ${outPath} (${sizeKb} KB)`));
  return 0;
}
