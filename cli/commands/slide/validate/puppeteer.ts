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

/**
 * Await document.fonts.ready with a timeout guard. Returns true when fonts
 * loaded, false on timeout (callers proceed with fallback-font metrics).
 *
 * page.evaluate("document.fonts.ready") returns the FontFaceSet promise and
 * puppeteer awaits it (page.waitForFunction would NOT — a promise is always
 * truthy). The race timer is cleared in `finally`: an uncleared setTimeout
 * keeps the event loop alive after the last page closes, so the CLI would
 * hang up to the timeout after printing its final output.
 */
export async function awaitFontsReady(
  page: Pick<PuppeteerPage, "evaluate">,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      page.evaluate("document.fonts.ready"),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("fonts.ready timeout")),
          timeoutMs,
        );
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
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
