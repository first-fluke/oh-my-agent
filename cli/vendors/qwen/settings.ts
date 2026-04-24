/**
 * Recommended Qwen Code settings managed by oh-my-agent.
 * Applies to project-local `.qwen/settings.json`.
 *
 * Qwen Code is a fork of Gemini CLI and shares the `mcpServers` schema,
 * but we register serena via stdio (uvx) rather than the HTTP bridge used
 * by Gemini for subagent fan-out.
 */

export const RECOMMENDED_QWEN_MCP = {
  serena: {
    command: "uvx",
    args: [
      "--from",
      "git+https://github.com/oraios/serena",
      "serena",
      "start-mcp-server",
      "--context",
      "agent",
      "--project",
      ".",
    ],
    env: {
      SERENA_LOG_LEVEL: "info",
    },
  },
};

type JsonRecord = Record<string, unknown>;

interface QwenMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  httpUrl?: string;
  headers?: Record<string, string>;
  tcp?: string;
  type?: string;
  timeout?: number;
  trust?: boolean;
  description?: string;
  includeTools?: string[];
  excludeTools?: string[];
  [key: string]: unknown;
}

export interface QwenSettings {
  mcpServers?: Record<string, QwenMcpServer>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const QWEN_ALLOWED_MCP_SERVER_KEYS = new Set([
  "command",
  "args",
  "env",
  "cwd",
  "url",
  "httpUrl",
  "headers",
  "tcp",
  "type",
  "timeout",
  "trust",
  "description",
  "includeTools",
  "excludeTools",
]);

function sanitizeQwenMcpServer(server: QwenMcpServer): QwenMcpServer {
  const nextServer: QwenMcpServer = {};
  for (const [key, value] of Object.entries(server)) {
    if (value === undefined || value === null) continue;
    if (!QWEN_ALLOWED_MCP_SERVER_KEYS.has(key)) continue;
    nextServer[key] = value;
  }
  return nextServer;
}

function hasQwenMcpTransport(
  server: QwenMcpServer | undefined,
): server is QwenMcpServer {
  if (!server) return false;
  return (
    typeof server.command === "string" ||
    typeof server.url === "string" ||
    typeof server.httpUrl === "string" ||
    typeof server.tcp === "string"
  );
}

export function sanitizeQwenSettings(rawSettings: unknown): QwenSettings {
  const qwenSettings = normalizeQwenSettings(rawSettings);
  if (qwenSettings.mcpServers) {
    qwenSettings.mcpServers = Object.fromEntries(
      Object.entries(qwenSettings.mcpServers).map(([name, server]) => [
        name,
        sanitizeQwenMcpServer(server),
      ]),
    );
  }
  return qwenSettings;
}

function normalizeQwenSettings(input: unknown): QwenSettings {
  if (!isRecord(input)) return {};
  const mcpServers = isRecord(input.mcpServers)
    ? (input.mcpServers as Record<string, QwenMcpServer>)
    : undefined;
  return { ...input, mcpServers };
}

export function needsQwenSettingsUpdate(rawSettings: unknown): boolean {
  const normalized = normalizeQwenSettings(rawSettings);
  const sanitized = sanitizeQwenSettings(rawSettings);
  if (JSON.stringify(normalized) !== JSON.stringify(sanitized)) return true;

  const serenaServer = sanitized.mcpServers?.serena;
  if (!hasQwenMcpTransport(serenaServer)) return true;

  return false;
}

export function applyRecommendedQwenSettings(
  rawSettings: unknown,
): QwenSettings {
  const qwenSettings = sanitizeQwenSettings(rawSettings);
  const currentSerena = qwenSettings.mcpServers?.serena;
  const nextSerena = hasQwenMcpTransport(currentSerena)
    ? currentSerena
    : {
        ...(currentSerena || {}),
        ...RECOMMENDED_QWEN_MCP.serena,
      };

  qwenSettings.mcpServers = {
    ...(qwenSettings.mcpServers || {}),
    serena: nextSerena,
  };

  return qwenSettings;
}
