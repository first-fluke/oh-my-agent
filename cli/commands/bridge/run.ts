import { spawn } from "node:child_process";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import {
  daemonKey,
  detachClient,
  ensureSerenaDaemon,
  resolveProjectRoot,
  STARTUP_PROBE_TIMEOUT_MS,
} from "../../io/serena-daemon.js";
import { serenaStartMcpArgs } from "../../vendors/serena.js";
import { validateSerenaConfigs } from "./serena-config.js";
import { parseSSEStream } from "./sse.js";

export { validateSerenaConfigs };

type BridgeRuntimeListeners = {
  stdinData?: (chunk: string | Buffer) => void;
  /** Also registered for stdin `end`/`close` — see cleanup wiring. */
  stdinGone?: () => void;
  sigint?: () => void;
  sigterm?: () => void;
};

let activeBridgeListeners: BridgeRuntimeListeners = {};

function clearBridgeRuntimeListeners(): void {
  if (activeBridgeListeners.stdinData) {
    process.stdin.off("data", activeBridgeListeners.stdinData);
  }
  if (activeBridgeListeners.stdinGone) {
    process.stdin.off("end", activeBridgeListeners.stdinGone);
    process.stdin.off("close", activeBridgeListeners.stdinGone);
  }
  if (activeBridgeListeners.sigint) {
    process.off("SIGINT", activeBridgeListeners.sigint);
  }
  if (activeBridgeListeners.sigterm) {
    process.off("SIGTERM", activeBridgeListeners.sigterm);
  }
  activeBridgeListeners = {};
}

export interface BridgeOptions {
  /**
   * Serena context for the daemon, which decides its tool set and prompts.
   * Daemons are keyed by it, so vendors asking for different contexts do not
   * have to share one.
   */
  context?: string;
  /** Working directory the project root is resolved from. */
  cwd?: string;
}

/**
 * Run serena over stdio in this process, exactly as an unbridged MCP config
 * would. The fallback for every path where a shared daemon cannot be reached:
 * losing code intelligence entirely is a far worse outcome than losing the
 * memory savings, and the failure would be invisible to the user mid-session.
 */
async function runStdioFallback(context: string): Promise<void> {
  console.error("[Bridge] Falling back to a session-local serena (stdio).");

  await new Promise<void>((done) => {
    const child = spawn("serena", serenaStartMcpArgs(context), {
      stdio: "inherit",
    });
    child.on("error", (err: Error) => {
      console.error(`[Bridge] serena is not runnable: ${err.message}`);
      done();
    });
    child.on("exit", () => done());
  });
}

export async function bridge(mcpUrlArg?: string, opts: BridgeOptions = {}) {
  clearBridgeRuntimeListeners();

  const context = opts.context ?? "ide";
  const cwd = opts.cwd ?? process.cwd();
  const root = resolveProjectRoot(cwd);
  /** Set once this proxy is counted as a client, so exit knows to detach. */
  let attachedKey: string | null = null;

  validateSerenaConfigs(root);

  // An explicit URL (argument or env) means the caller manages the server;
  // otherwise oma resolves the project's shared daemon and starts it on demand.
  const explicitUrl = mcpUrlArg || process.env.OMA_BRIDGE_URL;
  let MCP_URL: string;

  if (explicitUrl) {
    MCP_URL = explicitUrl;
  } else {
    const daemon = await ensureSerenaDaemon({ root, context });
    if (!daemon) {
      await runStdioFallback(context);
      return;
    }
    console.error(
      daemon.started
        ? `[Bridge] Started shared serena for ${root} on port ${daemon.port}`
        : `[Bridge] Reusing shared serena for ${root} on port ${daemon.port}`,
    );
    MCP_URL = daemon.url;
    attachedKey = daemonKey(root, context);
  }

  const url = new URL(MCP_URL);
  if (!url.hostname) {
    throw new Error(
      "MCP URL must include a non-empty hostname (e.g. http://localhost:12341/mcp)",
    );
  }
  const isHttps = url.protocol === "https:";
  const httpModule = isHttps ? https : http;

  let isShuttingDown = false;
  let sessionId: string | null = null;
  let serverStreamActive = false;

  async function checkServer(): Promise<boolean> {
    const probeTargets =
      url.hostname === "localhost"
        ? [MCP_URL, MCP_URL.replace("localhost", "127.0.0.1")]
        : [MCP_URL];

    for (const target of probeTargets) {
      const isReachable = await new Promise<boolean>((resolve) => {
        const req = httpModule.get(target, (_res) => {
          resolve(true);
          req.destroy();
        });

        req.setTimeout(STARTUP_PROBE_TIMEOUT_MS, () => {
          req.destroy();
          resolve(false);
        });

        req.on("error", () => {
          resolve(false);
        });

        req.end();
      });

      if (isReachable) {
        return true;
      }
    }

    return false;
  }

  function postToServer(
    body: string,
    callback: (res: IncomingMessage) => void,
  ): void {
    const mcpUrl = new URL(MCP_URL);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Content-Length": String(Buffer.byteLength(body)),
    };

    if (sessionId) {
      headers["Mcp-Session-Id"] = sessionId;
    }

    const options = {
      hostname: mcpUrl.hostname,
      port: mcpUrl.port,
      path: mcpUrl.pathname,
      method: "POST",
      headers,
    };

    const req = httpModule.request(options, callback);

    req.on("error", (err: Error) => {
      console.error("POST error:", err.message);
    });

    req.write(body);
    req.end();
  }

  function connectServerStream(): void {
    if (!sessionId || serverStreamActive) {
      return;
    }
    serverStreamActive = true;

    const mcpUrl = new URL(MCP_URL);

    const options = {
      hostname: mcpUrl.hostname,
      port: mcpUrl.port,
      path: mcpUrl.pathname,
      method: "GET",
      headers: {
        Accept: "application/json, text/event-stream",
        "Cache-Control": "no-cache",
        "Mcp-Session-Id": sessionId,
      },
    };

    const req = httpModule.request(options, (res: IncomingMessage) => {
      if (res.statusCode === 405) {
        res.resume();
        serverStreamActive = false;
        return;
      }

      if (res.statusCode === 409) {
        console.error("GET stream already open for this session (409)");
        res.resume();
        return;
      }

      if (res.statusCode !== 200) {
        console.error(`Server stream connection failed: ${res.statusCode}`);
        res.resume();
        serverStreamActive = false;
        if (!isShuttingDown) {
          setTimeout(connectServerStream, 1000);
        }
        return;
      }

      parseSSEStream(res, (data) => {
        process.stdout.write(`${data}\n`);
      });

      res.on("end", () => {
        serverStreamActive = false;
        if (!isShuttingDown) {
          console.error("Server stream closed, reconnecting...");
          setTimeout(connectServerStream, 1000);
        }
      });

      res.on("error", (err: Error) => {
        serverStreamActive = false;
        console.error("Server stream error:", err.message);
        if (!isShuttingDown) {
          setTimeout(connectServerStream, 1000);
        }
      });
    });

    req.on("error", (err: Error) => {
      serverStreamActive = false;
      console.error("Server stream connection error:", err.message);
      if (!isShuttingDown) {
        setTimeout(connectServerStream, 1000);
      }
    });

    req.end();
  }

  if (explicitUrl) {
    // Caller-managed endpoint: connect, but never leave the session without
    // serena if nothing is listening there.
    if (!(await checkServer())) {
      console.error(`[Bridge] No MCP server reachable at ${MCP_URL}.`);
      await runStdioFallback(context);
      return;
    }
    console.error(`Connected to existing Serena server at ${MCP_URL}`);
  }

  let stdinBuffer = "";
  let initializePending = false;
  const pendingMessages: string[] = [];

  process.stdin.setEncoding("utf8");
  const handleStdinData = (chunk: string | Buffer) => {
    stdinBuffer += chunk.toString();

    const lines = stdinBuffer.split("\n");
    stdinBuffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        enqueueMessage(line.trim());
      }
    }
  };
  process.stdin.on("data", handleStdinData);

  function enqueueMessage(message: string) {
    if (initializePending) {
      pendingMessages.push(message);
      return;
    }
    handleIDEMessage(message);
  }

  function flushPendingMessages() {
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      if (msg) {
        handleIDEMessage(msg);
      }
    }
  }

  function handleIDEMessage(message: string) {
    try {
      const parsed = JSON.parse(message);
      const isInitialize = parsed.method === "initialize";

      if (isInitialize) {
        initializePending = true;
      }

      const postData = JSON.stringify(parsed);

      postToServer(postData, (res: IncomingMessage) => {
        const newSessionId = res.headers["mcp-session-id"] as
          | string
          | undefined;
        if (newSessionId) {
          sessionId = newSessionId;
        }

        if (res.statusCode === 202) {
          res.resume();
          if (isInitialize) {
            initializePending = false;
            flushPendingMessages();
          }
          return;
        }

        const contentType = res.headers["content-type"] || "";

        if (contentType.includes("text/event-stream")) {
          parseSSEStream(res, (data) => {
            process.stdout.write(`${data}\n`);
          });

          res.on("end", () => {
            if (isInitialize) {
              initializePending = false;
              if (sessionId) {
                connectServerStream();
              }
              flushPendingMessages();
            }
          });
        } else {
          let responseData = "";

          res.on("data", (chunk: string | Buffer) => {
            responseData += chunk.toString();
          });

          res.on("end", () => {
            if (responseData.trim()) {
              process.stdout.write(`${responseData}\n`);
            }
            if (isInitialize) {
              initializePending = false;
              if (sessionId) {
                connectServerStream();
              }
              flushPendingMessages();
            }
          });
        }
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to parse IDE message:", errorMessage);
    }
  }

  process.stdin.resume();

  const cleanup = () => {
    // Detach, never kill: the daemon is shared, so tearing it down here would
    // take serena out from under every other session on the project. Dropping
    // to zero clients only starts the grace period — a session restarting
    // moments later re-attaches to a still-warm daemon, and one that is truly
    // abandoned is reclaimed by the next bridge to start.
    isShuttingDown = true;
    if (attachedKey) detachClient(attachedKey);
    clearBridgeRuntimeListeners();
    process.exit(0);
  };

  activeBridgeListeners = {
    stdinData: handleStdinData,
    stdinGone: cleanup,
    sigint: cleanup,
    sigterm: cleanup,
  };

  // stdin closing is the normal way an MCP client goes away — it usually
  // arrives without a signal, so detaching only on SIGINT/SIGTERM would leak
  // this client into the registry until its pid was reused.
  process.stdin.on("end", cleanup);
  process.stdin.on("close", cleanup);

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
