/**
 * editor/server/puppeteer.ts — minimal puppeteer-core types and loaders.
 */

/**
 * Puppeteer minimal types (mirrors png.ts pattern).
 */
export interface PuppeteerModule {
  launch(options: {
    executablePath: string;
    headless: boolean | "new";
    args?: string[];
  }): Promise<PuppeteerBrowser>;
}

export interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}

export interface PuppeteerPage {
  setViewport(opts: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  }): Promise<void>;
  setRequestInterception(enabled: boolean): Promise<void>;
  on(
    event: "request",
    cb: (req: {
      url(): string;
      abort(): Promise<void>;
      continue(): Promise<void>;
    }) => void,
  ): void;
  goto(
    url: string,
    opts: { waitUntil: string; timeout: number },
  ): Promise<unknown>;
  evaluate<T>(fn: (() => T | Promise<T>) | string): Promise<T>;
  screenshot(opts: {
    type?: "png";
    clip?: { x: number; y: number; width: number; height: number };
    encoding?: "base64";
  }): Promise<string>;
  close(): Promise<void>;
}

export async function loadPuppeteer(): Promise<PuppeteerModule | null> {
  try {
    const mod = (await import("puppeteer-core")) as unknown as {
      default?: PuppeteerModule;
    } & PuppeteerModule;
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export async function findChrome(): Promise<string | null> {
  try {
    const { findChromeExecutable } = await import(
      "../../../search/strategies/browser.js"
    );
    return findChromeExecutable();
  } catch {
    return null;
  }
}
