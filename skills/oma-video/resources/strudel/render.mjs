#!/usr/bin/env node
// Strudel BGM renderer — boundary-safe subprocess entrypoint.
//
// oma-video NEVER imports Strudel. @strudel/* is AGPL-3.0-or-later while the
// oma CLI is MIT, so the TypeScript provider (`providers/music-strudel.ts` +
// `internal/strudel-project.ts`) only ever LOCATES this project on disk and
// spawns *this* script. Same boundary the Remotion / Playwright projects use.
//
// MECHANISM: `@strudel/webaudio.renderPatternAudio()` renders a pattern through
// an OfflineAudioContext — faster than realtime, no audio device, no autoplay
// gesture. A 30s bed renders in well under a second. The bundle only runs in a
// browser, so we drive a headless Chrome over raw CDP (Node's global WebSocket;
// zero npm deps here beyond @strudel/web itself) and serve the bundle from a
// loopback-only HTTP server.
//
// DETERMINISM: oscillator sounds (sine/triangle/square/sawtooth) render
// byte-identically across runs. Noise-based sounds (white/pink/brown) do NOT —
// superdough fills those buffers from Math.random(). Patterns that must be
// reproducible should stay oscillator-only.
//
// Contract — flags in, ONE JSON result line out (stdout's LAST line):
//   IN  --pattern-file <path>  file holding the strudel pattern code (required)
//       --out <abs wav path>   output wav, inside a run dir (required)
//       --chrome <path>        Chrome/Chromium executable (required)
//       --seconds <float>      bed length in seconds (required)
//       --cps <float>          cycles per second (default 0.5)
//       --sample-rate <int>    default 44100
//       --timeout <ms>         hard ceiling for the whole render (default 120000)
//   OUT {"ok":true,"output":"<abs wav>","seconds":<f>,"bytes":<n>,"sha256":"<hex>"}
//    |  {"ok":false,"error":"<message>","code":"<reason>"}
//
// Exit code is 0 on success, 1 on failure; the JSON result line is authoritative.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, "node_modules", "@strudel", "web", "dist");

const MIME = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".html": "text/html",
  ".json": "application/json",
  ".wasm": "application/wasm",
};

let server;
let chrome;
let userDataDir;
let hardTimer;

function fail(message, code = "render_failed") {
  process.stdout.write(`${JSON.stringify({ ok: false, error: message, code })}\n`);
  cleanup().finally(() => process.exit(1));
}

async function cleanup() {
  if (hardTimer) clearTimeout(hardTimer);
  try {
    chrome?.kill("SIGTERM");
  } catch {}
  try {
    server?.close();
  } catch {}
  if (userDataDir) {
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const eq = token.indexOf("=");
    if (eq !== -1) {
      out[token.slice(2, eq)] = token.slice(eq + 1);
    } else {
      out[token.slice(2)] = argv[i + 1]?.startsWith("--") ? "" : argv[++i];
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const patternFile = args["pattern-file"];
const outPath = args.out;
const chromePath = args.chrome;
const seconds = Number(args.seconds);
const cps = Number(args.cps ?? 0.5);
const sampleRate = Number(args["sample-rate"] ?? 44100);
const timeoutMs = Number(args.timeout ?? 120000);

if (!patternFile || !outPath || !chromePath) {
  fail("missing required flag: --pattern-file / --out / --chrome", "bad_args");
} else if (!Number.isFinite(seconds) || seconds <= 0) {
  fail(`--seconds must be a positive number (got ${args.seconds})`, "bad_args");
} else if (!existsSync(DIST)) {
  fail(
    `@strudel/web is not installed in ${HERE} — run \`oma video doctor --install-strudel\``,
    "not_installed",
  );
} else if (!existsSync(chromePath)) {
  fail(`chrome executable not found: ${chromePath}`, "no_chrome");
} else {
  main().catch((err) => fail(err?.message ?? String(err)));
}

async function main() {
  hardTimer = setTimeout(
    () => fail(`render exceeded ${timeoutMs}ms`, "timeout"),
    timeoutMs,
  );
  hardTimer.unref?.();

  const code = await readFile(patternFile, "utf8");

  // 1. Loopback-only static server for the page + the strudel bundle. Paths are
  //    confined to this dir and the resolved dist (no traversal).
  server = createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    let file;
    if (pathname === "/" || pathname === "/page.html") {
      file = path.join(HERE, "page.html");
    } else if (pathname === "/strudel.js") {
      file = path.join(DIST, "index.js");
    } else {
      const resolved = path.resolve(DIST, `.${pathname}`);
      file = resolved.startsWith(DIST) ? resolved : null;
    }
    if (!file) {
      res.writeHead(403).end("forbidden");
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-embedder-policy": "require-corp",
        "cross-origin-resource-policy": "cross-origin",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const httpPort = server.address().port;

  // 2. Headless Chrome. No audio device is needed — OfflineAudioContext renders
  //    into a buffer, so this works on a bare CI box.
  userDataDir = await mkdtemp(path.join(tmpdir(), "oma-strudel-"));
  chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  chrome.on("error", (err) => fail(`chrome failed to start: ${err.message}`, "no_chrome"));

  const devtoolsPort = await waitForDevtoolsPort(
    path.join(userDataDir, "DevToolsActivePort"),
  );

  // 3. Drive it over raw CDP.
  const targets = await (
    await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`)
  ).json();
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("chrome exposed no page target");

  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Page.navigate", {
    url: `http://127.0.0.1:${httpPort}/page.html`,
  });
  await cdp.waitForLoad();

  const base64Length = await cdp.evaluate(
    `window.__omaRender(${JSON.stringify(code)}, ${seconds}, ${cps}, ${sampleRate})`,
  );
  if (!base64Length || base64Length <= 0) {
    throw new Error("strudel produced an empty buffer");
  }

  // 4. Pull the wav back in slices so no single CDP message gets huge.
  const CHUNK = 4 * 1024 * 1024;
  let b64 = "";
  for (let offset = 0; offset < base64Length; offset += CHUNK) {
    b64 += await cdp.evaluate(
      `window.__omaWav.slice(${offset}, ${offset + CHUNK})`,
    );
  }
  const wav = Buffer.from(b64, "base64");
  await writeFile(outPath, wav);

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      output: outPath,
      seconds,
      bytes: wav.length,
      sha256: createHash("sha256").update(wav).digest("hex"),
    })}\n`,
  );
  await cleanup();
  process.exit(0);
}

/** Chrome writes its chosen debugger port here once it is listening. */
async function waitForDevtoolsPort(portFile) {
  for (let i = 0; i < 200; i++) {
    if (existsSync(portFile)) {
      const [line] = readFileSync(portFile, "utf8").split("\n");
      const port = Number(line);
      if (Number.isFinite(port) && port > 0) return port;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("chrome never reported a devtools port");
}

/** Minimal CDP client over Node's global WebSocket. */
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("cdp websocket failed to open"));
  });

  let nextId = 0;
  const pending = new Map();
  let loaded = false;
  const loadWaiters = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method === "Page.loadEventFired") {
      loaded = true;
      while (loadWaiters.length) loadWaiters.shift()();
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  return {
    send,
    waitForLoad: () =>
      loaded ? Promise.resolve() : new Promise((resolve) => loadWaiters.push(resolve)),
    async evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (res.exceptionDetails) {
        const detail =
          res.exceptionDetails.exception?.description ??
          res.exceptionDetails.text ??
          "unknown page error";
        throw new Error(detail.split("\n")[0]);
      }
      return res.result.value;
    },
  };
}
