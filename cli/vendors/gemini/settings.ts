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
    command: "serena",
    args: ["start-mcp-server", "--context", "ide", "--project", "."],
    env: {
      SERENA_LOG_LEVEL: "info",
    },
  },
};

/**
 * Legacy bridge URL that oma previously wrote for Gemini. We detect it on
 * upgrade and replace with the stdio recommendation above. Custom user URLs
 * (anything else) are left alone so power users keep their own bridge setup.
 */
export const LEGACY_GEMINI_BRIDGE_URL = "http://localhost:12341/mcp";

// `privacy.usageStatisticsEnabled` (default true) controls anonymized usage
// stats sent to Google. Gated on the `telemetry` flag from oma-config.yaml
// (default off → flag set to false).
export interface GeminiSettingsOptions {
  /** When true, omit `privacy.usageStatisticsEnabled` opt-out so usage stats flow normally. */
  telemetry?: boolean;
}

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

function sanitizeGeminiMcpServer(server: GeminiMcpServer): GeminiMcpServer {
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

function hasGeminiMcpTransport(
  server: GeminiMcpServer | undefined,
): server is GeminiMcpServer {
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

export function needsGeminiSettingsUpdate(
  rawSettings: unknown,
  options: GeminiSettingsOptions = {},
): boolean {
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

  const privacy = isRecord(geminiSettings.privacy)
    ? geminiSettings.privacy
    : undefined;
  if (options.telemetry === true) {
    if (privacy && "usageStatisticsEnabled" in privacy) return true;
  } else {
    if (privacy?.usageStatisticsEnabled !== false) return true;
  }

  return false;
}

export function applyGeminiSettings(
  rawSettings: unknown,
  options: GeminiSettingsOptions = {},
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

  const currentPrivacy = isRecord(geminiSettings.privacy)
    ? { ...geminiSettings.privacy }
    : {};
  if (options.telemetry === true) {
    delete currentPrivacy.usageStatisticsEnabled;
  } else {
    currentPrivacy.usageStatisticsEnabled = false;
  }
  if (Object.keys(currentPrivacy).length > 0) {
    geminiSettings.privacy = currentPrivacy;
  } else if ("privacy" in geminiSettings) {
    delete geminiSettings.privacy;
  }

  return geminiSettings;
}
