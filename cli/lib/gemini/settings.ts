/**
 * Recommended Gemini CLI settings managed by oh-my-agent.
 * Applies to project-local `.gemini/settings.json`.
 */

export const RECOMMENDED_GEMINI_GENERAL = {
  enableNotifications: true,
} as const;

export const RECOMMENDED_GEMINI_EXPERIMENTAL = {
  enableAgents: true,
} as const;

export const RECOMMENDED_GEMINI_MCP = {
  serena: {
    url: "http://localhost:12341/mcp",
  },
} as const;

type JsonRecord = Record<string, unknown>;

interface GeminiMcpServer {
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
  extension?: Record<string, string | boolean | number>;
  oauth?: Record<string, unknown>;
  authProviderType?: string;
  targetAudience?: string;
  targetServiceAccount?: string;
  [key: string]: unknown;
}

export interface GeminiSettings {
  general?: JsonRecord;
  experimental?: JsonRecord;
  mcpServers?: Record<string, GeminiMcpServer>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const GEMINI_ALLOWED_MCP_SERVER_KEYS = new Set([
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
  "extension",
  "oauth",
  "authProviderType",
  "targetAudience",
  "targetServiceAccount",
]);

function sanitizeGeminiMcpServer(
  server: GeminiMcpServer,
): GeminiMcpServer {
  const nextServer: GeminiMcpServer = {};

  for (const [key, value] of Object.entries(server)) {
    if (value === undefined || value === null) continue;
    if (!GEMINI_ALLOWED_MCP_SERVER_KEYS.has(key)) continue;
    nextServer[key] = value;
  }

  const legacyAvailableTools = server.available_tools;
  if (
    Array.isArray(legacyAvailableTools) &&
    nextServer.includeTools === undefined
  ) {
    nextServer.includeTools = legacyAvailableTools
      .map((tool) => String(tool).trim())
      .filter(Boolean);
  }

  return nextServer;
}

function hasGeminiMcpTransport(server: GeminiMcpServer | undefined): boolean {
  if (!server) return false;

  return (
    typeof server.command === "string" ||
    typeof server.url === "string" ||
    typeof server.httpUrl === "string" ||
    typeof server.tcp === "string"
  );
}

export function sanitizeGeminiSettings(rawSettings: unknown): GeminiSettings {
  const geminiSettings = normalizeGeminiSettings(rawSettings);

  if (geminiSettings.mcpServers) {
    geminiSettings.mcpServers = Object.fromEntries(
      Object.entries(geminiSettings.mcpServers).map(([name, server]) => [
        name,
        sanitizeGeminiMcpServer(server),
      ]),
    );
  }

  return geminiSettings;
}

function normalizeGeminiSettings(input: unknown): GeminiSettings {
  if (!isRecord(input)) return {};

  const general = isRecord(input.general) ? input.general : undefined;
  const experimental = isRecord(input.experimental)
    ? input.experimental
    : undefined;
  const mcpServers = isRecord(input.mcpServers)
    ? (input.mcpServers as Record<string, GeminiMcpServer>)
    : undefined;

  return {
    ...input,
    general,
    experimental,
    mcpServers,
  };
}

export function needsGeminiSettingsUpdate(rawSettings: unknown): boolean {
  const normalizedSettings = normalizeGeminiSettings(rawSettings);
  const geminiSettings = sanitizeGeminiSettings(rawSettings);

  if (JSON.stringify(normalizedSettings) !== JSON.stringify(geminiSettings)) {
    return true;
  }

  const general = geminiSettings.general;
  if (!general) return true;

  for (const [key, expected] of Object.entries(RECOMMENDED_GEMINI_GENERAL)) {
    if (general[key] !== expected) return true;
  }

  const experimental = geminiSettings.experimental;
  if (!experimental) return true;

  for (const [key, expected] of Object.entries(
    RECOMMENDED_GEMINI_EXPERIMENTAL,
  )) {
    if (experimental[key] !== expected) return true;
  }

  const serenaServer = geminiSettings.mcpServers?.serena;
  if (!hasGeminiMcpTransport(serenaServer)) return true;

  return false;
}

export function applyRecommendedGeminiSettings(
  rawSettings: unknown,
): GeminiSettings {
  const geminiSettings = sanitizeGeminiSettings(rawSettings);
  const currentSerena = geminiSettings.mcpServers?.serena;
  const nextSerena = hasGeminiMcpTransport(currentSerena)
    ? currentSerena
    : {
        ...(currentSerena || {}),
        ...RECOMMENDED_GEMINI_MCP.serena,
      };

  geminiSettings.general = {
    ...(geminiSettings.general || {}),
    ...RECOMMENDED_GEMINI_GENERAL,
  };

  geminiSettings.experimental = {
    ...(geminiSettings.experimental || {}),
    ...RECOMMENDED_GEMINI_EXPERIMENTAL,
  };

  geminiSettings.mcpServers = {
    ...(geminiSettings.mcpServers || {}),
    serena: nextSerena,
  };

  return geminiSettings;
}
