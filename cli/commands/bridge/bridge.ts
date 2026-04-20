import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_MCP_URL = "http://localhost:12341/mcp";
const STARTUP_CHECK_INTERVAL_MS = 1000;
const STARTUP_PROBE_TIMEOUT_MS = Number.parseInt(
  process.env.OH_MY_AG_BRIDGE_PROBE_TIMEOUT_MS ?? "2000",
  10,
);
const STARTUP_TIMEOUT_MS = Number.parseInt(
  process.env.OH_MY_AG_BRIDGE_STARTUP_TIMEOUT_MS ?? "120000",
  10,
);

type BridgeRuntimeListeners = {
  stdinData?: (chunk: string | Buffer) => void;
  sigint?: () => void;
  sigterm?: () => void;
};

let activeBridgeListeners: BridgeRuntimeListeners = {};

function clearBridgeRuntimeListeners(): void {
  if (activeBridgeListeners.stdinData) {
    process.stdin.off("data", activeBridgeListeners.stdinData);
  }
  if (activeBridgeListeners.sigint) {
    process.off("SIGINT", activeBridgeListeners.sigint);
  }
  if (activeBridgeListeners.sigterm) {
    process.off("SIGTERM", activeBridgeListeners.sigterm);
  }
  activeBridgeListeners = {};
}

export function validateSerenaConfigs(): void {
  const globalConfigPath = join(homedir(), ".serena", "serena_config.yml");

  if (!existsSync(globalConfigPath)) {
    return;
  }

  try {
    const globalContent = readFileSync(globalConfigPath, "utf8");

    const projectsMatch = globalContent.match(
      /^projects:\s*\n((?:\s*-\s*.+\n?)*)/m,
    );
    if (!projectsMatch) {
      return;
    }

    const projectLines =
      (projectsMatch[1] ?? "").match(/^\s*-\s*(.+)$/gm) || [];
    const projects = projectLines.map((line) =>
      line.replace(/^\s*-\s*/, "").trim(),
    );

    for (const projectPath of projects) {
      const projectConfigPath = join(projectPath, ".serena", "project.yml");

      if (!existsSync(projectConfigPath)) {
        continue;
      }

      const content = readFileSync(projectConfigPath, "utf8");

      if (!/^languages:/m.test(content)) {
        console.error(
          `[Bridge] Missing 'languages' key in ${projectConfigPath}, adding default...`,
        );

        const insertIndex = content.search(/\n(?=\w)/);
        if (insertIndex !== -1) {
          const newContent = `${content.slice(0, insertIndex)}\n\nlanguages:\n  - python\n  - typescript\n  - dart\n  - terraform${content.slice(insertIndex)}`;
          writeFileSync(projectConfigPath, newContent);
          console.error(`[Bridge] Fixed ${projectConfigPath}`);
        }
      }
    }
  } catch (err) {
    console.error(
      `[Bridge] Warning: Failed to validate Serena configs: ${err instanceof Error ? err.message : err}`,
    );
  }
}

export async function bridge(mcpUrlArg?: string) {
  clearBridgeRuntimeListeners();

  const MCP_URL = mcpUrlArg || DEFAULT_MCP_URL;

  const url = new URL(MCP_URL);
  const isHttps = url.protocol === "https:";
  const httpModule = isHttps ? https : http;

  let serenaProcess: ReturnType<typeof spawn> | null = null;
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

  async function startServer(): Promise<void> {
    const port = url.port || "12341";
    const host = url.hostname || "0.0.0.0";

    console.error(`Starting Serena server on ${host}:${port}...`);

    const args = [
      "--from",
      "git+https://github.com/oraios/serena",
      "serena",
      "start-mcp-server",
      "--transport",
      "streamable-http",
      "--host",
      host,
      "--port",
      port,
      "--context",
      "ide",
      "--open-web-dashboard",
      "false",
    ];

    serenaProcess = spawn("uvx", args, {
      stdio: "pipe",
      detached: false,
    });
    const serenaProcessEvents = serenaProcess as typeof serenaProcess & {
      on: (
        event: "error" | "exit",
        listener: (...args: unknown[]) => void,
      ) => void;
    };

    if (serenaProcess.stderr) {
      serenaProcess.stderr.on("data", (data) => {
        process.stderr.write(`[Serena] ${data}`);
      });
    }

    if (serenaProcess.stdout) {
      serenaProcess.stdout.on("data", () => {});
    }

    serenaProcessEvents.on("error", (err) => {
      console.error("Failed to start Serena server:", err);
      process.exit(1);
    });

    serenaProcessEvents.on("exit", (code, signal) => {
      console.error(
        `Serena server exited with code ${String(code)} signal ${String(signal)}`,
      );
      if (!isShuttingDown) {
        process.exit(typeof code === "number" ? code : 1);
      }
    });

    console.error("Waiting for Serena to be ready...");
    const maxAttempts = Math.max(
      1,
      Math.ceil(STARTUP_TIMEOUT_MS / STARTUP_CHECK_INTERVAL_MS),
    );
    for (let i = 0; i < maxAttempts; i++) {
      if (await checkServer()) {
        console.error("Serena server is ready!");
        return;
      }
      await new Promise((r) => setTimeout(r, STARTUP_CHECK_INTERVAL_MS));
    }

    console.error("Timed out waiting for Serena server to start.");
    process.exit(1);
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

  function parseSSEStream(
    res: IncomingMessage,
    onMessage: (data: string) => void,
  ): void {
    let buffer = "";

    res.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();
      buffer = buffer.replace(/\r\n/g, "\n");

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const lines = part.split("\n");
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            eventData += line.slice(5).trim();
          }
        }

        if (eventData) {
          onMessage(eventData);
        }
      }
    });
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

  validateSerenaConfigs();

  const isRunning = await checkServer();
  if (!isRunning) {
    await startServer();
  } else {
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
    isShuttingDown = true;
    clearBridgeRuntimeListeners();
    if (serenaProcess) {
      console.error("Stopping Serena server...");
      serenaProcess.kill("SIGTERM");
    }
    process.exit(0);
  };

  activeBridgeListeners = {
    stdinData: handleStdinData,
    sigint: cleanup,
    sigterm: cleanup,
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
