/**
 * editor/server.ts — T17: oma slide edit visual bbox editor server
 *
 * runSlideEdit({ dir, port? }):
 *   - Uses Node's built-in `node:http` (zero dependency — no express).
 *   - Resolves the slide workspace via resolveWorkspace().
 *   - Binds to 127.0.0.1 ONLY (never 0.0.0.0).
 *   - Port-probes from DEFAULT_PORT (3737) if port=0 or omitted.
 *   - Serves a dependency-free vanilla-JS bbox editor UI.
 *   - Provides the editorApi contract endpoints.
 *   - Serializes edits per slide file via a per-file lock Map.
 *   - Clean shutdown on SIGINT/SIGTERM and server close (orphan prevention).
 *
 * Endpoints:
 *   GET  /                — serves editor.html
 *   GET  /slides          — returns slide list + meta
 *   GET  /slide-file/<f>  — serves a raw slide HTML file (for iframe preview)
 *   POST /screenshot      — renders slide + annotates bbox, returns PNG dataUrl
 *   POST /edit            — accepts { slideFile, bbox, prompt }, dispatches to agent, streams via SSE
 *   GET  /events          — SSE progress stream for the most recent edit
 *   POST /save            — persists the edited slide (ack; agent writes directly)
 *
 * Security (POST /edit spawns an agent with auto-approval, so the server is
 * an execution surface, not just a viewer):
 *   - Binds 127.0.0.1 only.
 *   - Every request: Host must be this loopback server, and a present Origin
 *     must be too (DNS rebinding and cross-site requests are refused).
 *   - Every route except GET / requires the per-run token; the token is only
 *     injected into the editor page, which other origins cannot read.
 *   - POST bodies must be `application/json` (no CORS-simple text/plain).
 *   - Slide previews are served with a CSP sandbox (opaque origin), so slide
 *     scripts cannot read the editor token or call the API same-origin.
 *   - slideFile inputs validated (no path traversal) before any FS access.
 *   - JSON request bodies are size-capped.
 *   - Per-slide write lock prevents concurrent-write races.
 */

import { existsSync, readFileSync } from "node:fs";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import color from "picocolors";
import { injectWindowToken } from "../../../utils/loopback-http.js";
import { isLocalUrl } from "../font-hosts.js";
import { awaitFontsReady } from "../validate/puppeteer.js";
import { resolveWorkspace, type SlideMeta } from "../workspace.js";
import type { BBox } from "./dispatch.js";
import { assertSafeSlideFile, dispatchEdit } from "./dispatch.js";
import { readJsonBody, sendJson, sendText } from "./server/http-helpers.js";
import { withSlideLock } from "./server/locks.js";
import { BIND_HOST, DEFAULT_PORT, probeFreePort } from "./server/ports.js";
import { findChrome, loadPuppeteer } from "./server/puppeteer.js";
import {
  checkEditorRequest,
  createEditorToken,
  EDITOR_TOKEN_GLOBAL,
} from "./server/security.js";
import {
  broadcastSse,
  escapeSseData,
  handleEvents,
  sseClients,
} from "./server/sse.js";
import { isValidBbox } from "./server/validate.js";

export { withSlideLock } from "./server/locks.js";
export { isPortFree, probeFreePort } from "./server/ports.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAME_W = 1920;
const FRAME_H = 1080;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunSlideEditOptions {
  dir: string;
  port?: number;
}

export interface SlideEditServerOptions {
  /** Absolute slide workspace directory (already validated). */
  workDir: string;
  meta: SlideMeta;
  /** Port to bind on 127.0.0.1; 0 lets the OS pick one. */
  port: number;
  /** Editor UI override (tests). */
  editorHtmlPath?: string;
}

export interface SlideEditServerHandle {
  port: number;
  /** Per-run secret required by every route except the editor page. */
  token: string;
  url: string;
  server: Server;
  close: () => Promise<void>;
}

/** Response headers for the token-bearing editor page: never framed by others. */
const EDITOR_PAGE_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
};

/**
 * Slide previews run workspace HTML. The CSP sandbox gives the document an
 * opaque origin, so its scripts cannot read the parent's token or make
 * same-origin API calls (their Origin is `null`, which the gate rejects).
 */
const SLIDE_PREVIEW_HEADERS = {
  "Content-Security-Policy": "sandbox allow-scripts; frame-ancestors 'self'",
};

// ─── Screenshot with bbox annotation ─────────────────────────────────────────

/**
 * Render a slide via puppeteer-core, draw a red bbox annotation, and return
 * a base64-encoded PNG data URL.
 */
export async function captureAnnotatedScreenshot(
  slidePath: string,
  bbox: BBox,
): Promise<string> {
  const puppeteer = await loadPuppeteer();
  if (!puppeteer) {
    throw new Error(
      "puppeteer-core not available. Run: bun add puppeteer-core",
    );
  }
  const chromePath = await findChrome();
  if (!chromePath) {
    throw new Error("Chrome not found. Install Chrome or set OMA_CHROME_PATH.");
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

  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: FRAME_W,
      height: FRAME_H,
      deviceScaleFactor: 1,
    });

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (isLocalUrl(url)) {
        req.continue().catch(() => {});
      } else {
        req.abort().catch(() => {});
      }
    });

    const fileUrl = `file://${slidePath.replace(/\\/g, "/")}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 30_000 });

    // Wait for fonts
    await awaitFontsReady(page, 10_000);

    // Annotate bbox by injecting a red overlay rectangle via DOM.
    // Built as an interpolated string so the cli tsconfig (no "dom" lib)
    // doesn't need DOM types for the in-page callback.
    const b = JSON.stringify({
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    });
    await page.evaluate(`(function () {
      var b = ${b};
      var div = document.createElement('div');
      div.style.cssText = [
        'position:fixed',
        'left:' + b.x + 'px',
        'top:' + b.y + 'px',
        'width:' + b.width + 'px',
        'height:' + b.height + 'px',
        'border:3px solid #f85149',
        'background:rgba(248,81,73,0.15)',
        'z-index:999999',
        'pointer-events:none',
        'box-sizing:border-box'
      ].join(';');
      document.body.appendChild(div);
    })()`);

    // Use puppeteer's native base64 encoding. Do NOT take the default
    // Uint8Array result and call .toString("base64") on it — a Uint8Array's
    // toString ignores the arg and yields a comma-separated DECIMAL list
    // ("137,80,78,71,…"), producing a corrupt dataUrl (matches pptx.ts).
    const base64 = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: FRAME_W, height: FRAME_H },
      encoding: "base64",
    });

    return `data:image/png;base64,${base64}`;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

// ─── Server ───────────────────────────────────────────────────────────────────

function defaultEditorHtmlPath(): string {
  const uiDir = (() => {
    try {
      return join(fileURLToPath(new URL(".", import.meta.url)), "ui");
    } catch {
      return join(process.cwd(), "cli", "commands", "slide", "editor", "ui");
    }
  })();
  return join(uiDir, "editor.html");
}

/**
 * Start the editor HTTP server on 127.0.0.1 and resolve once it is
 * listening. Signal handling and console output belong to runSlideEdit.
 */
export function startSlideEditServer(
  opts: SlideEditServerOptions,
): Promise<SlideEditServerHandle> {
  const { workDir, meta } = opts;
  const editorHtmlPath = opts.editorHtmlPath ?? defaultEditorHtmlPath();
  const token = createEditorToken();
  // Replaced by the OS-assigned port once listening (opts.port may be 0).
  let port = opts.port;

  // ── Route handlers ───────────────────────────────────────────────────────

  const handleSlides = (res: ServerResponse): void => {
    const slides = meta.order.map((file, index) => ({
      file,
      index,
      path: join(workDir, file),
      exists: existsSync(join(workDir, file)),
    }));
    sendJson(res, 200, {
      title: meta.title,
      slideCount: slides.length,
      slides,
    });
  };

  const handleSlideFile = (res: ServerResponse, file: string): void => {
    try {
      assertSafeSlideFile(file);
    } catch (err) {
      sendText(res, 400, "text/plain", (err as Error).message);
      return;
    }
    const slidePath = join(workDir, file);
    if (!existsSync(slidePath)) {
      sendText(res, 404, "text/plain", `Slide not found: ${file}`);
      return;
    }
    sendText(
      res,
      200,
      "text/html; charset=utf-8",
      readFileSync(slidePath, "utf8"),
      SLIDE_PREVIEW_HEADERS,
    );
  };

  const handleScreenshot = async (
    res: ServerResponse,
    body: Record<string, unknown>,
  ): Promise<void> => {
    const slideFile = body.slideFile;
    const bboxInput = body.bbox;
    if (typeof slideFile !== "string") {
      sendJson(res, 400, { error: "slideFile must be a string" });
      return;
    }
    try {
      assertSafeSlideFile(slideFile);
    } catch (err) {
      sendJson(res, 400, { error: (err as Error).message });
      return;
    }
    if (!isValidBbox(bboxInput)) {
      sendJson(res, 400, {
        error: "bbox must be { x, y, width, height } with positive dimensions",
      });
      return;
    }
    const slidePath = join(workDir, slideFile);
    if (!existsSync(slidePath)) {
      sendJson(res, 404, { error: `Slide not found: ${slideFile}` });
      return;
    }
    try {
      const dataUrl = await captureAnnotatedScreenshot(slidePath, bboxInput);
      sendJson(res, 200, { dataUrl });
    } catch (err) {
      sendJson(res, 500, { error: (err as Error).message });
    }
  };

  const handleEdit = (
    res: ServerResponse,
    body: Record<string, unknown>,
  ): void => {
    const slideFile = body.slideFile;
    const bboxInput = body.bbox;
    const promptText = body.prompt;

    if (typeof slideFile !== "string") {
      sendJson(res, 400, { error: "slideFile must be a string" });
      return;
    }
    try {
      assertSafeSlideFile(slideFile);
    } catch (err) {
      sendJson(res, 400, { error: (err as Error).message });
      return;
    }
    if (!isValidBbox(bboxInput)) {
      sendJson(res, 400, {
        error: "bbox must be { x, y, width, height } with positive dimensions",
      });
      return;
    }
    if (typeof promptText !== "string" || promptText.trim().length === 0) {
      sendJson(res, 400, { error: "prompt must be a non-empty string" });
      return;
    }
    const slidePath = join(workDir, slideFile);
    if (!existsSync(slidePath)) {
      sendJson(res, 404, { error: `Slide not found: ${slideFile}` });
      return;
    }

    const editId = `edit-${Date.now()}`;
    // Acknowledge immediately; dispatch runs async under the per-slide lock.
    sendJson(res, 200, { editId, status: "dispatched" });

    withSlideLock(
      slideFile,
      () =>
        new Promise<void>((resolve) => {
          dispatchEdit({
            workDir,
            slideFile,
            bbox: bboxInput,
            prompt: promptText.trim(),
            onProgress: (chunk) => {
              broadcastSse("progress", escapeSseData(chunk));
            },
            onDone: (exitCode) => {
              broadcastSse("done", String(exitCode));
              resolve();
            },
            onError: (err) => {
              broadcastSse("progress", `[error] ${err.message}`);
              broadcastSse("done", "1");
              resolve();
            },
          });
        }),
    ).catch((err) => {
      broadcastSse("progress", `[lock error] ${(err as Error).message}`);
      broadcastSse("done", "1");
    });
  };

  const handleSave = (
    res: ServerResponse,
    body: Record<string, unknown>,
  ): void => {
    const slideFile = body.slideFile;
    if (typeof slideFile !== "string") {
      sendJson(res, 400, { error: "slideFile must be a string" });
      return;
    }
    try {
      assertSafeSlideFile(slideFile);
    } catch (err) {
      sendJson(res, 400, { error: (err as Error).message });
      return;
    }
    const slidePath = join(workDir, slideFile);
    if (!existsSync(slidePath)) {
      sendJson(res, 404, { error: `Slide not found: ${slideFile}` });
      return;
    }
    sendJson(res, 200, { ok: true, file: slideFile, path: slidePath });
  };

  // ── Router ───────────────────────────────────────────────────────────────

  const router = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", `http://${BIND_HOST}:${port}`);
    const path = url.pathname;

    // Gate before routing or reading any body (see header comment).
    const denial = checkEditorRequest(req, url, { port, token });
    if (denial) {
      sendJson(res, denial.status, { error: denial.error });
      return;
    }

    if (method === "GET" && path === "/") {
      if (existsSync(editorHtmlPath)) {
        sendText(
          res,
          200,
          "text/html; charset=utf-8",
          injectWindowToken(
            readFileSync(editorHtmlPath, "utf8"),
            EDITOR_TOKEN_GLOBAL,
            token,
          ),
          EDITOR_PAGE_HEADERS,
        );
      } else {
        sendText(res, 500, "text/plain", "Editor UI not found");
      }
      return;
    }
    if (method === "GET" && path === "/slides") {
      handleSlides(res);
      return;
    }
    if (method === "GET" && path.startsWith("/slide-file/")) {
      handleSlideFile(
        res,
        decodeURIComponent(path.slice("/slide-file/".length)),
      );
      return;
    }
    if (method === "GET" && path === "/events") {
      handleEvents(req, res);
      return;
    }
    if (method === "POST" && path === "/screenshot") {
      await handleScreenshot(
        res,
        (await readJsonBody(req)) as Record<string, unknown>,
      );
      return;
    }
    if (method === "POST" && path === "/edit") {
      handleEdit(res, (await readJsonBody(req)) as Record<string, unknown>);
      return;
    }
    if (method === "POST" && path === "/save") {
      handleSave(res, (await readJsonBody(req)) as Record<string, unknown>);
      return;
    }
    sendText(res, 404, "text/plain", "Not found");
  };

  // ─── Start server ──────────────────────────────────────────────────────────
  const server = createHttpServer((req, res) => {
    router(req, res).catch((err) => {
      try {
        sendJson(res, 500, { error: (err as Error).message });
      } catch {
        // headers already sent — nothing to do
      }
    });
  });

  const close = (): Promise<void> =>
    new Promise((done) => {
      for (const client of sseClients) {
        try {
          client.res.end();
        } catch {
          // ignore
        }
      }
      sseClients.clear();
      server.close(() => done());
      server.closeAllConnections();
    });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port, BIND_HOST, () => {
      server.removeListener("error", reject);
      const address = server.address();
      if (address && typeof address === "object") port = address.port;
      resolve({
        port,
        token,
        url: `http://${BIND_HOST}:${port}`,
        server,
        close,
      });
    });
  });
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runSlideEdit(opts: RunSlideEditOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4;
  }

  // Resolve port
  const requestedPort = opts.port ?? 0;
  const startPort = requestedPort > 0 ? requestedPort : DEFAULT_PORT;
  let port: number;
  try {
    port = await probeFreePort(startPort);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 1;
  }

  let handle: SlideEditServerHandle;
  try {
    handle = await startSlideEditServer({
      workDir: ws.dir,
      meta: ws.meta,
      port,
    });
  } catch (err) {
    console.error(color.red(`Server error: ${(err as Error).message}`));
    return 1;
  }

  console.log(color.bold("\noma slide editor"));
  console.log(color.green(`  Listening: ${handle.url}`));
  console.log(color.dim(`  Workspace: ${ws.dir}`));
  console.log(color.dim(`  Slides:    ${ws.meta.order.length}`));
  console.log(color.dim("  Press Ctrl+C to stop.\n"));
  console.log(`  Open: ${color.cyan(handle.url)}`);

  return new Promise((resolve) => {
    // Orphan prevention: clean shutdown on SIGINT / SIGTERM
    const shutdown = () => {
      console.log(color.dim("\nShutting down editor server…"));
      void handle.close().then(() => resolve(0));
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);

    handle.server.on("error", (err) => {
      console.error(color.red(`Server error: ${(err as Error).message}`));
      process.removeListener("SIGINT", shutdown);
      process.removeListener("SIGTERM", shutdown);
      resolve(1);
    });
  });
}
