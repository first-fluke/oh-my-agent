import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { basename } from "node:path";
import { watch } from "chokidar";
import * as pc from "picocolors";
import { WebSocket, WebSocketServer } from "ws";
import { buildGraphData } from "./commands/recap/internal/graph.js";
import { collectRecap } from "./commands/recap/internal/index.js";
import { collectState, isValidSid } from "./commands/state/sessions.js";
import { buildTrajectory } from "./commands/state/trajectory/build.js";
import { buildFullState, resolveMemoriesDir } from "./dashboard/state.js";
import { DASHBOARD_HTML, RECAP_HTML } from "./dashboard/templates.js";
import { TRAJECTORY_HTML } from "./dashboard/trajectory-template.js";
import { resolveProjectRoot } from "./utils/fs-utils.js";
import {
  injectWindowToken,
  isLoopbackHost,
  isLoopbackOrigin,
  tokensMatch,
} from "./utils/loopback-http.js";

export const DASHBOARD_HOST = "127.0.0.1";
export const DEFAULT_DASHBOARD_PORT = 9847;
const DASHBOARD_AUTH_HEADER = "x-oma-dashboard-token";

export interface DashboardHandle {
  host: string;
  port: number;
  token: string;
  url: string;
  memoriesDir: string;
  /**
   * Settles once the server is accepting connections. Rejects if binding
   * fails with anything but EADDRINUSE (which prints and exits); callers must
   * handle that rejection. `port` and `url` hold the bound port from then on,
   * which matters when `options.port` is 0.
   */
  ready: Promise<void>;
  close: () => Promise<void>;
}

export interface DashboardOptions {
  route?: string;
  /** Project whose `.agents/state/memories` is watched (default: cwd). */
  projectDir?: string;
  /**
   * Port to bind instead of DASHBOARD_PORT. 0 asks the OS for a free port, so
   * callers that cannot own a fixed port (tests) never collide with another
   * listener; read the bound port from the handle after `ready`.
   */
  port?: number;
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

function isApiAuthorized(
  token: string,
  req: IncomingMessage,
  url: URL,
): boolean {
  const header = req.headers[DASHBOARD_AUTH_HEADER];
  const headerToken = Array.isArray(header) ? header[0] : header;
  return tokensMatch(token, headerToken ?? url.searchParams.get("token"));
}

function withDashboardToken(html: string, token: string): string {
  return injectWindowToken(html, "__OMA_DASHBOARD_TOKEN__", token);
}

/**
 * Refuse requests that are not addressed to this loopback server (DNS
 * rebinding) or that come from a foreign page. Runs before any route so the
 * token-bearing HTML is never served to another origin.
 */
function rejectForeignRequest(
  req: IncomingMessage,
  port: number,
): { status: number; message: string } | null {
  if (!isLoopbackHost(req.headers.host, port)) {
    return { status: 421, message: "Misdirected request" };
  }
  if (!isLoopbackOrigin(req.headers.origin, port)) {
    return { status: 403, message: "Cross-origin request rejected" };
  }
  return null;
}

export function startDashboard(
  options: DashboardOptions = {},
): DashboardHandle {
  // Reassigned to the bound port on "listening", before any request arrives.
  let port = options.port ?? resolveDashboardPort();
  const route = options.route ?? "/";
  const token = randomBytes(32).toString("base64url");
  let url = `http://${DASHBOARD_HOST}:${port}${route}`;
  const memoriesDir = resolveMemoriesDir(options.projectDir);
  const projectDir = resolveProjectRoot(options.projectDir);
  if (!existsSync(memoriesDir)) mkdirSync(memoriesDir, { recursive: true });

  const server = createServer(async (req, res) => {
    const rejection = rejectForeignRequest(req, port);
    if (rejection) {
      res.writeHead(rejection.status, { "Content-Type": "text/plain" });
      res.end(rejection.message);
      return;
    }

    // Host is validated above; build URLs from the bound address instead.
    const requestUrl = new URL(
      req.url || "/",
      `http://${DASHBOARD_HOST}:${port}`,
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
        const topRaw = requestUrl.searchParams.get("top");
        let top: number | undefined;
        if (topRaw !== null) {
          const parsed = Number.parseInt(topRaw, 10);
          if (!Number.isFinite(parsed)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "top must be a finite integer" }));
            return;
          }
          top = Math.min(200, Math.max(1, parsed));
        }
        const output = await collectRecap({ window, tool, top });
        const graph = buildGraphData(output.entries, top);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...output, graph }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (requestUrl.pathname === "/api/trajectory/sessions") {
      try {
        const state = collectState(projectDir);
        const body = JSON.stringify({
          active: state.index.active.main ?? null,
          sessions: state.sessions.map((session) => ({
            sid: session.sid,
            workflow: session.workflow,
            status: session.status,
            createdAt: session.createdAt,
          })),
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(body);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (requestUrl.pathname === "/api/trajectory") {
      const sid = requestUrl.searchParams.get("sid") ?? "";
      if (!isValidSid(sid)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "sid must be a valid session id" }));
        return;
      }
      try {
        const body = JSON.stringify(buildTrajectory(sid, { projectDir }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(body);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (requestUrl.pathname === "/trajectory") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      res.end(withDashboardToken(TRAJECTORY_HTML, token));
    } else if (requestUrl.pathname === "/recap") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:* ws://localhost:*; style-src 'self' 'unsafe-inline';",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      res.end(withDashboardToken(RECAP_HTML, token));
    } else {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:* ws://localhost:*; style-src 'self' 'unsafe-inline';",
        "X-Content-Type-Options": "nosniff",
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
    const rejection = rejectForeignRequest(req, port);
    if (rejection) {
      socket.write(`HTTP/1.1 ${rejection.status} ${rejection.message}\r\n\r\n`);
      socket.destroy();
      return;
    }
    const requestUrl = new URL(
      req.url || "/",
      `http://${DASHBOARD_HOST}:${port}`,
    );
    if (!tokensMatch(token, requestUrl.searchParams.get("token"))) {
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

  const onSigint = () => {
    console.log("\nShutting down...");
    void close().then(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000).unref();
  };
  const onSigterm = () => process.emit("SIGINT");

  // Drops everything besides the server that keeps the process alive.
  const release = (): void => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    if (debounceTimer) clearTimeout(debounceTimer);
    watcher.close().catch(() => undefined);
  };

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      release();
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

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  let markReady: () => void = () => undefined;
  let failReady: (err: Error) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve;
    failReady = reject;
  });
  let listening = false;

  server.on("error", (err: NodeJS.ErrnoException) => {
    // `ready` has already resolved; nothing can observe this error anymore.
    if (listening) throw err;
    failReady(err);
    if (err.code === "EADDRINUSE") {
      console.error(
        pc.red(
          `\n  Dashboard failed: port ${port} is already in use. Set DASHBOARD_PORT to another value.\n`,
        ),
      );
      process.exit(1);
    }
    // Any other bind failure (e.g. EACCES) is reported through `ready`, so the
    // caller prints its own message and sets the exit code. Rethrowing here
    // would crash with a stack trace before that handler runs. A caller that
    // ignores `ready` still sees the failure as an unhandled rejection.
    release();
  });

  const handle: DashboardHandle = {
    host: DASHBOARD_HOST,
    port,
    token,
    url,
    memoriesDir,
    ready,
    close,
  };

  server.listen(port, DASHBOARD_HOST, () => {
    const address = server.address();
    if (address && typeof address === "object") port = address.port;
    url = `http://${DASHBOARD_HOST}:${port}${route}`;
    handle.port = port;
    handle.url = url;
    listening = true;
    markReady();
    console.log(pc.magenta(`\n  🛸 OMA Memory Dashboard`));
    console.log(pc.white(`     ${url}`));
    console.log(pc.dim(`     Watching: ${memoriesDir}\n`));
  });

  return handle;
}
