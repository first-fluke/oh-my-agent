import { existsSync } from "node:fs";
import { platform } from "node:os";
import { detectSignals, hasBlockingSignals } from "../signals.js";
import type { FetchContext, FetchResult, SignalHit } from "../types.js";
import { errorResult } from "./api/helpers.js";

/**
 * Browser strategy — uses puppeteer-core + system Chrome via CDP.
 * Loaded dynamically so the CLI works without puppeteer when the
 * browser strategy is not invoked.
 */

const CHROME_CANDIDATES: Record<string, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/usr/bin/brave-browser",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  ],
};

export function findChromeExecutable(): string | null {
  if (process.env.OMA_CHROME_PATH && existsSync(process.env.OMA_CHROME_PATH)) {
    return process.env.OMA_CHROME_PATH;
  }
  const candidates = CHROME_CANDIDATES[platform()] ?? [];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

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

interface PuppeteerRequest {
  url(): string;
  resourceType(): string;
  method(): string;
  headers(): Record<string, string>;
}

interface PuppeteerResponse {
  url(): string;
  status(): number;
  headers(): Record<string, string>;
}

interface PuppeteerPage {
  setUserAgent(ua: string): Promise<void>;
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
  setViewport(opts: { width: number; height: number }): Promise<void>;
  goto(
    url: string,
    opts: { waitUntil: string; timeout: number },
  ): Promise<PuppeteerResponse | null>;
  content(): Promise<string>;
  title(): Promise<string>;
  on(event: "request", cb: (req: PuppeteerRequest) => void): void;
  on(event: "response", cb: (resp: PuppeteerResponse) => void): void;
  waitForFunction(
    fn: string | ((...args: unknown[]) => unknown),
    opts?: { timeout?: number },
  ): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
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

export interface HiddenApiCall {
  url: string;
  status: number;
  method: string;
  contentType?: string;
}

export interface BrowserFetchOptions {
  captureNetwork?: boolean;
  waitSelector?: string;
  waitMs?: number;
}

export async function browserStrategy(
  url: URL,
  ctx: FetchContext,
  options: BrowserFetchOptions = {},
): Promise<FetchResult & { hiddenApis?: HiddenApiCall[] }> {
  const puppeteer = await loadPuppeteer();
  if (!puppeteer) {
    return errorResult({
      url: url.toString(),
      strategy: "browser",
      error: new Error(
        "puppeteer-core not installed. Run: bun add puppeteer-core",
      ),
    });
  }
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    return errorResult({
      url: url.toString(),
      strategy: "browser",
      error: new Error(
        "Chrome/Chromium not found. Install a Chromium-based browser or set OMA_CHROME_PATH.",
      ),
    });
  }

  const started = performance.now();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--no-sandbox",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": ctx.locale,
    });
    if (ctx.userAgent) await page.setUserAgent(ctx.userAgent);

    const hiddenApis: HiddenApiCall[] = [];
    if (options.captureNetwork) {
      page.on("response", (resp) => {
        const u = resp.url();
        const headers = resp.headers();
        const ct = headers["content-type"] ?? "";
        if (!u.startsWith(url.origin)) return;
        if (!ct.includes("json") && !ct.includes("xml")) return;
        const method =
          (headers["access-control-request-method"] as string | undefined) ??
          "GET";
        hiddenApis.push({
          url: u,
          status: resp.status(),
          method,
          contentType: ct,
        });
      });
    }

    const navResp = await page.goto(url.toString(), {
      waitUntil: "networkidle2",
      timeout: ctx.timeoutMs,
    });
    if (options.waitSelector) {
      await page.waitForFunction(
        `document.querySelector(${JSON.stringify(options.waitSelector)}) !== null`,
        { timeout: ctx.timeoutMs },
      );
    } else if (options.waitMs && options.waitMs > 0) {
      await new Promise((r) => setTimeout(r, options.waitMs));
    }

    const html = await page.content();
    const httpStatus = navResp?.status() ?? 0;
    const headers = new Headers();
    if (navResp) {
      for (const [k, v] of Object.entries(navResp.headers())) {
        try {
          headers.set(k, v);
        } catch {
          // skip invalid headers
        }
      }
    }
    const synthetic = {
      ok: httpStatus >= 200 && httpStatus < 400,
      status: httpStatus,
      headers,
      url: url.toString(),
      text: html,
      elapsedMs: Math.round(performance.now() - started),
      redirected: false,
    };
    const signals: SignalHit[] = detectSignals(synthetic);
    const elapsedMs = Math.round(performance.now() - started);
    return {
      url: url.toString(),
      status: hasBlockingSignals(signals)
        ? "blocked"
        : html.length < 200
          ? "error"
          : "ok",
      strategy: "browser",
      httpStatus,
      content: html,
      contentType: headers.get("content-type") ?? "text/html",
      elapsedMs,
      signals,
      hiddenApis: options.captureNetwork ? hiddenApis : undefined,
    };
  } catch (err) {
    const elapsedMs = Math.round(performance.now() - started);
    return {
      ...errorResult({
        url: url.toString(),
        strategy: "browser",
        error: err,
      }),
      elapsedMs,
    };
  } finally {
    await browser.close();
  }
}
