// ─── Puppeteer minimal interface ──────────────────────────────────────────────

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

export type RequestInterception = {
  url(): string;
  resourceType(): string;
  abort(): Promise<void>;
  continue(): Promise<void>;
};

export interface PuppeteerPage {
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
