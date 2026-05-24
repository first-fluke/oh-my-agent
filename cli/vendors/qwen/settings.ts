/**
 * Recommended Qwen Code settings managed by oh-my-agent.
 * Applies to project-local `.qwen/settings.json`.
 *
 * Qwen Code is a fork of Gemini CLI and shares the `mcpServers` schema.
 * Serena is registered via direct stdio with --context=ide; switching to
 * bridge mode is an opt-in via oma-config `serena.mode: bridge` (handled
 * in `oma link`).
 */

// `privacy.usageStatisticsEnabled` (default true) controls anonymized usage
// stats sent to Alibaba. Gated on the `telemetry` flag from oma-config.yaml
// (default off → flag set to false). Qwen Code shares this schema with
// Gemini CLI (upstream fork).
export interface QwenSettingsOptions {
  /** When true, omit `privacy.usageStatisticsEnabled` opt-out. */
  telemetry?: boolean;
}

export const RECOMMENDED_QWEN_MCP = {
  serena: {
    command: "serena",
    args: ["start-mcp-server", "--context", "ide", "--project", "."],
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

export function needsQwenSettingsUpdate(
  rawSettings: unknown,
  options: QwenSettingsOptions = {},
): boolean {
  const normalized = normalizeQwenSettings(rawSettings);
  const sanitized = sanitizeQwenSettings(rawSettings);
  if (JSON.stringify(normalized) !== JSON.stringify(sanitized)) return true;

  const serenaServer = sanitized.mcpServers?.serena;
  if (!hasQwenMcpTransport(serenaServer)) return true;

  const privacy = isRecord(sanitized.privacy) ? sanitized.privacy : undefined;
  if (options.telemetry === true) {
    if (privacy && "usageStatisticsEnabled" in privacy) return true;
  } else {
    if (privacy?.usageStatisticsEnabled !== false) return true;
  }

  return false;
}

export function applyQwenSettings(
  rawSettings: unknown,
  options: QwenSettingsOptions = {},
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

  const currentPrivacy = isRecord(qwenSettings.privacy)
    ? { ...qwenSettings.privacy }
    : {};
  if (options.telemetry === true) {
    delete currentPrivacy.usageStatisticsEnabled;
  } else {
    currentPrivacy.usageStatisticsEnabled = false;
  }
  if (Object.keys(currentPrivacy).length > 0) {
    qwenSettings.privacy = currentPrivacy;
  } else if ("privacy" in qwenSettings) {
    delete qwenSettings.privacy;
  }

  return qwenSettings;
}
