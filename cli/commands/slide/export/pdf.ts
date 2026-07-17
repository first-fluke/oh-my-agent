/**
 * export/pdf.ts — oma slide pdf --dir --out [--mode capture|print]
 *
 * Exports a slide deck to PDF via puppeteer-core.
 *
 * Modes:
 *   Both --mode values currently share ONE pipeline: navigate viewer.html and
 *   emit a single page.pdf() at the 1920×1080 design size, with the @media
 *   print CSS breaking each .slide to its own page. `capture` was originally
 *   specced as a screenshot-per-slide path but converged on the print-CSS
 *   pipeline (see captureMode docstring); the flag is kept for CLI
 *   compatibility until the modes actually diverge.
 *
 * Lazy-loads puppeteer-core exactly like validate.ts (graceful "not installed" fallback).
 * Exit codes: 0 ok · 1 error (incl. timeouts) · 4 invalid-input
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import color from "picocolors";
import { findChromeExecutable } from "../../../io/chrome.js";
import { isAllowedFontUrl, isLocalUrl } from "../font-hosts.js";
import { awaitFontsReady } from "../validate/puppeteer.js";
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

/**
 * Match the interactive "Save as PDF" path before calling page.pdf().
 *
 * deck-stage.js scales .deck-stage with an INLINE transform: scale(); inline
 * styles outrank any stylesheet selector, so only its own `beforeprint` handler
 * (which clears the inline transform/left/top/position) can undo it for print.
 * Headless page.pdf() emulates print media but does NOT dispatch `beforeprint`,
 * so we fire it explicitly — otherwise the inline scale survives and every page
 * crops. This is what lets viewport-base.css print rules drop `!important`.
 */
async function clearInlineStageTransform(page: PuppeteerPage): Promise<void> {
  await page.evaluate("window.dispatchEvent(new Event('beforeprint'))");
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

  // Block non-local requests, except allowlisted font CDNs (fonts must load
  // so the export renders with the chosen typeface, not a fallback).
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (isLocalUrl(url) || isAllowedFontUrl(url)) {
      req.continue().catch(() => {});
    } else {
      req.abort().catch(() => {});
    }
  });

  await page.goto(fileUrl, {
    waitUntil: "networkidle0",
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });

  await awaitFontsReady(page, FONTS_READY_TIMEOUT_MS);
  await clearInlineStageTransform(page);

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

  // Block non-local requests, except allowlisted font CDNs (fonts must load
  // so the export renders with the chosen typeface, not a fallback).
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (isLocalUrl(url) || isAllowedFontUrl(url)) {
      req.continue().catch(() => {});
    } else {
      req.abort().catch(() => {});
    }
  });

  await page.goto(fileUrl, {
    waitUntil: "networkidle0",
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });

  await awaitFontsReady(page, FONTS_READY_TIMEOUT_MS);
  await clearInlineStageTransform(page);

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
