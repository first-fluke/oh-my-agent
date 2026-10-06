import http, { type ClientRequest, type IncomingMessage } from "node:http";
import https from "node:https";
import { StringDecoder } from "node:string_decoder";
import {
  SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS,
  SERENA_MAX_TOOL_ANSWER_CHARS_FLOOR,
} from "../../io/serena.js";
import { validateSerenaConfigs } from "../../io/serena-config.js";
import {
  daemonKey,
  detachClient,
  ensureSerenaDaemon,
  isUnservableProjectRoot,
  resolveProjectRoot,
  STARTUP_PROBE_TIMEOUT_MS,
} from "../../io/serena-daemon.js";
import { prepareSerenaRuntime } from "../../io/serena-managed-runtime.js";
import { omaSerenaContext } from "../../vendors/serena.js";
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
  /** Deadline for an MCP initialize response. */
  initializeTimeoutMs?: number;
}

export async function bridge(mcpUrlArg?: string, opts: BridgeOptions = {}) {
  clearBridgeRuntimeListeners();

  // The registry key must match the context passed to the actual server.
  const context = omaSerenaContext(opts.context ?? "ide");
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
    if (isUnservableProjectRoot(root)) {
      throw new Error(
        `Shared Serena needs a project directory, but ${root} is outside any project. ` +
          "Start the session inside a repository (a directory with .git or .serena/project.yml).",
      );
    }
    const runtime = context === "oma" ? prepareSerenaRuntime(root) : undefined;
    const daemon = await ensureSerenaDaemon({
      root,
      context,
      runtimeRevision: runtime?.runtimeRevision,
    });
    if (!daemon) {
      detachClient(daemonKey(root, context));
      throw new Error(
        `Shared Serena is unavailable for ${root}. Check 'oma doctor' and retry the MCP connection. ` +
          "Automatic stdio fallback is disabled because it duplicates the language-server stack under memory pressure. " +
          "Use serena.mode: stdio only when a dedicated server is intended.",
      );
    }
    console.error(
      daemon.started
        ? `[Bridge] Started shared serena for ${root} on port ${daemon.port}`
        : `[Bridge] Reusing shared serena for ${root} on port ${daemon.port}`,
    );
    MCP_URL = daemon.url;
    attachedKey = daemonKey(root, context);

    // The shared server survives this bridge. Keep its idle cleanup scheduled
    // even when every bridge process has exited.
    try {
      const { ensureSerenaDaemonGcService } = await import(
        "../../platform/serena-daemon-gc-service.js"
      );
      if (!ensureSerenaDaemonGcService()) {
        console.error("[Bridge] Serena daemon cleanup timer is unavailable.");
      }
    } catch (err) {
      console.error(
        `[Bridge] Serena daemon cleanup timer failed: ${err instanceof Error ? err.message : err}`,
      );
    }
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
    onError: (error: Error) => void,
  ): ClientRequest {
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
      path: mcpUrl.pathname + mcpUrl.search,
      method: "POST",
      headers,
    };

    const req = httpModule.request(options, callback);

    req.on("error", onError);

    req.write(body);
    req.end();
    return req;
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
      path: mcpUrl.pathname + mcpUrl.search,
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
    // A failed caller-managed endpoint must not silently launch a local stack.
    if (!(await checkServer())) {
      throw new Error(
        `No MCP server reachable at ${MCP_URL}. Retry the MCP connection when the server is available.`,
      );
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
    while (!initializePending && pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      if (msg) {
        handleIDEMessage(msg);
      }
    }
  }

  function sendRequestError(request: { id?: unknown }, message: string) {
    if (request.id === undefined) return;
    process.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32000, message } })}\n`,
    );
  }

  function rejectPendingMessages(message: string) {
    for (const pending of pendingMessages.splice(0)) {
      try {
        sendRequestError(JSON.parse(pending), message);
      } catch {
        console.error("Failed to parse queued IDE message");
      }
    }
  }

  function handleIDEMessage(message: string) {
    try {
      const parsed = JSON.parse(message);
      const maxAnswerChars = parsed.params?.arguments?.max_answer_chars;
      // Per-call caps override Serena's global setting, including on a warm daemon.
      if (
        parsed.method === "tools/call" &&
        parsed.params?.name === "search_for_pattern" &&
        typeof maxAnswerChars === "number" &&
        maxAnswerChars >= 0 &&
        maxAnswerChars < SERENA_MAX_TOOL_ANSWER_CHARS_FLOOR
      ) {
        parsed.params.arguments.max_answer_chars =
          SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS;
      }
      const isInitialize = parsed.method === "initialize";
      let settled = false;
      let failed = false;
      let request: ClientRequest | undefined;
      let initializeTimer: ReturnType<typeof setTimeout> | undefined;

      const finishInitialize = () => {
        if (settled) return;
        settled = true;
        clearTimeout(initializeTimer);
        if (isInitialize) {
          initializePending = false;
          if (sessionId) connectServerStream();
          flushPendingMessages();
        }
      };

      const failRequest = (error: Error) => {
        if (settled) return;
        settled = true;
        failed = true;
        clearTimeout(initializeTimer);
        console.error("POST error:", error.message);
        sendRequestError(parsed, `MCP request failed: ${error.message}`);
        if (isInitialize) {
          initializePending = false;
          sessionId = null;
          rejectPendingMessages(
            "MCP initialization failed; retry initialization",
          );
        }
      };

      const forwardResponse = (data: string) => {
        if (failed) return;
        process.stdout.write(`${data}\n`);
        try {
          const response = JSON.parse(data);
          if (
            !settled &&
            parsed.id !== undefined &&
            response.id === parsed.id &&
            ("result" in response || "error" in response)
          ) {
            if (isInitialize && "error" in response) {
              settled = true;
              failed = true;
              clearTimeout(initializeTimer);
              initializePending = false;
              sessionId = null;
              rejectPendingMessages(
                "MCP initialization failed; retry initialization",
              );
            } else {
              finishInitialize();
            }
          }
        } catch {
          // The client handles malformed protocol responses.
        }
      };

      if (isInitialize) {
        initializePending = true;
        initializeTimer = setTimeout(() => {
          failRequest(new Error("MCP initialization timed out"));
          request?.destroy();
        }, opts.initializeTimeoutMs ?? 30_000);
        initializeTimer.unref();
      }

      const postData = JSON.stringify(parsed);

      request = postToServer(
        postData,
        (res: IncomingMessage) => {
          res.on("error", failRequest);
          res.on("aborted", () =>
            failRequest(new Error("MCP response aborted")),
          );
          if (res.statusCode && res.statusCode >= 400) {
            failRequest(
              new Error(`MCP server returned HTTP ${res.statusCode}`),
            );
            res.resume();
            return;
          }
          const newSessionId = res.headers["mcp-session-id"] as
            | string
            | undefined;
          if (newSessionId) {
            sessionId = newSessionId;
          }

          if (res.statusCode === 202) {
            res.resume();
            if (isInitialize) {
              failRequest(
                new Error("MCP initialization ended without a response"),
              );
            } else {
              finishInitialize();
            }
            return;
          }

          const contentType = res.headers["content-type"] || "";

          if (contentType.includes("text/event-stream")) {
            parseSSEStream(res, forwardResponse);

            res.on("end", () => {
              if (isInitialize && !settled) {
                failRequest(
                  new Error("MCP initialization ended without a response"),
                );
              } else {
                finishInitialize();
              }
            });
          } else {
            let responseData = "";
            const decoder = new StringDecoder("utf8");

            res.on("data", (chunk: string | Buffer) => {
              responseData +=
                typeof chunk === "string" ? chunk : decoder.write(chunk);
            });

            res.on("end", () => {
              if (settled) return;
              responseData += decoder.end();
              if (responseData.trim()) {
                forwardResponse(responseData);
              }
              if (isInitialize && !settled) {
                failRequest(
                  new Error("MCP initialization ended without a response"),
                );
              } else {
                finishInitialize();
              }
            });
          }
        },
        failRequest,
      );
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
    // abandoned is reclaimed by the periodic timer or the next bridge.
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
