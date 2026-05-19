import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { basename } from "node:path";
import { watch } from "chokidar";
import * as pc from "picocolors";
import { WebSocket, WebSocketServer } from "ws";
import { buildGraphData } from "./commands/recap/internal/graph.js";
import { collectRecap } from "./commands/recap/internal/index.js";
import { buildFullState, resolveMemoriesDir } from "./dashboard/state.js";
import { DASHBOARD_HTML, RECAP_HTML } from "./dashboard/templates.js";

export const DASHBOARD_HOST = "127.0.0.1";
export const DEFAULT_DASHBOARD_PORT = 9847;
const DASHBOARD_AUTH_HEADER = "x-oma-dashboard-token";

export interface DashboardHandle {
  host: string;
  port: number;
  token: string;
  url: string;
  close: () => Promise<void>;
}

export function resolveDashboardPort(
  rawPort = process.env.DASHBOARD_PORT,
): number {
  if (!rawPort) return DEFAULT_DASHBOARD_PORT;

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid DASHBOARD_PORT: ${JSON.stringify(rawPort)}. Expected an integer from 1 to 65535.`,
    );
  }
  return port;
}

function isAuthorized(token: string, reqToken: string | null): boolean {
  if (!reqToken) return false;

  const expected = Buffer.from(token);
  const actual = Buffer.from(reqToken);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isApiAuthorized(
  token: string,
  req: IncomingMessage,
  url: URL,
): boolean {
  const header = req.headers[DASHBOARD_AUTH_HEADER];
  const headerToken = Array.isArray(header) ? header[0] : header;
  return isAuthorized(token, headerToken ?? url.searchParams.get("token"));
}

function isLoopbackOrigin(origin: string | undefined, port: number): boolean {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      parsed.port === String(port) &&
      ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function withDashboardToken(html: string, token: string): string {
  const script = `<script>window.__OMA_DASHBOARD_TOKEN__=${JSON.stringify(token)};</script>`;
  return html.replace("</head>", `${script}\n</head>`);
}

export function startDashboard(
  options: { route?: string } = {},
): DashboardHandle {
  const port = resolveDashboardPort();
  const route = options.route ?? "/";
  const token = randomBytes(32).toString("base64url");
  const url = `http://${DASHBOARD_HOST}:${port}${route}`;
  const memoriesDir = resolveMemoriesDir();
  if (!existsSync(memoriesDir)) mkdirSync(memoriesDir, { recursive: true });

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(
      req.url || "/",
      `http://${req.headers.host ?? `${DASHBOARD_HOST}:${port}`}`,
    );

    if (requestUrl.pathname.startsWith("/api/")) {
      if (!isApiAuthorized(token, req, requestUrl)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
    }

    if (requestUrl.pathname === "/api/state") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildFullState(memoriesDir)));
    } else if (requestUrl.pathname === "/api/recap") {
      try {
        const window = requestUrl.searchParams.get("window") || "7d";
        const tool = requestUrl.searchParams.get("tool") || undefined;
        const top = requestUrl.searchParams.get("top")
          ? Number.parseInt(requestUrl.searchParams.get("top") as string, 10)
          : undefined;
        const output = await collectRecap({ window, tool, top });
        const graph = buildGraphData(output.entries, top);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...output, graph }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (requestUrl.pathname === "/recap") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Referrer-Policy": "no-referrer",
      });
      res.end(withDashboardToken(RECAP_HTML, token));
    } else {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Referrer-Policy": "no-referrer",
      });
      res.end(withDashboardToken(DASHBOARD_HTML, token));
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function broadcast(event?: string, file?: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const msg = JSON.stringify({
        type: "update",
        event,
        file,
        data: buildFullState(memoriesDir),
      });
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) c.send(msg);
      });
    }, 100);
  }

  const watcher = watch(memoriesDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  watcher.on("all", (event, filePath) => broadcast(event, basename(filePath)));

  server.on("upgrade", (req, socket, head) => {
    const requestUrl = new URL(
      req.url || "/",
      `http://${req.headers.host ?? `${DASHBOARD_HOST}:${port}`}`,
    );
    if (
      !isLoopbackOrigin(req.headers.origin, port) ||
      !isAuthorized(token, requestUrl.searchParams.get("token"))
    ) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.send(
      JSON.stringify({ type: "full", data: buildFullState(memoriesDir) }),
    );
    ws.on("error", () => ws.terminate());
  });

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher.close().catch(() => undefined);
      wss.clients.forEach((c) => {
        c.terminate();
      });
      wss.close((wssErr) => {
        if (wssErr) {
          reject(wssErr);
          return;
        }
        server.close((serverErr) => {
          if (serverErr) reject(serverErr);
          else resolve();
        });
      });
    });

  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    void close().then(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000).unref();
  });
  process.on("SIGTERM", () => process.emit("SIGINT"));

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        pc.red(
          `\n  Dashboard failed: port ${port} is already in use. Set DASHBOARD_PORT to another value.\n`,
        ),
      );
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, DASHBOARD_HOST, () => {
    console.log(pc.magenta(`\n  🛸 Serena Memory Dashboard`));
    console.log(pc.white(`     ${url}`));
    console.log(pc.dim(`     Watching: ${memoriesDir}\n`));
  });

  return { host: DASHBOARD_HOST, port, token, url, close };
}
