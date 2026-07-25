import { serenaTransportMode } from "../../utils/config.js";
import { isRecord } from "../../utils/type-guards.js";
import {
  RECOMMENDED_CHROME_DEVTOOLS_MCP,
  type SerenaMcpEntry,
  serenaMcpEntry,
} from "../serena.js";
import {
  applyPrivacyTelemetry,
  applyRecommendedMcpServers,
  filterMcpServerKeys,
  type McpServerEntry,
  needsPrivacyTelemetryUpdate,
  needsRecommendedMcpUpdate,
} from "../settings-shared.js";

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
  "chrome-devtools": RECOMMENDED_CHROME_DEVTOOLS_MCP,
  get serena(): SerenaMcpEntry {
    return serenaMcpEntry("ide", serenaTransportMode());
  },
};

interface QwenMcpServer extends McpServerEntry {
  env?: Record<string, string>;
  cwd?: string;
  headers?: Record<string, string>;
  type?: string;
  timeout?: number;
  trust?: boolean;
  description?: string;
  includeTools?: string[];
  excludeTools?: string[];
}

export interface QwenSettings {
  mcpServers?: Record<string, QwenMcpServer>;
  [key: string]: unknown;
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

export function sanitizeQwenSettings(rawSettings: unknown): QwenSettings {
  const qwenSettings = normalizeQwenSettings(rawSettings);
  if (qwenSettings.mcpServers) {
    qwenSettings.mcpServers = Object.fromEntries(
      Object.entries(qwenSettings.mcpServers).map(([name, server]) => [
        name,
        filterMcpServerKeys(server, QWEN_ALLOWED_MCP_SERVER_KEYS),
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

  if (needsRecommendedMcpUpdate(sanitized.mcpServers)) return true;

  return needsPrivacyTelemetryUpdate(sanitized, options.telemetry);
}

export function applyQwenSettings(
  rawSettings: unknown,
  options: QwenSettingsOptions = {},
): QwenSettings {
  const qwenSettings = sanitizeQwenSettings(rawSettings);

  qwenSettings.mcpServers = applyRecommendedMcpServers(
    qwenSettings.mcpServers,
    RECOMMENDED_QWEN_MCP,
  );

  applyPrivacyTelemetry(qwenSettings, options.telemetry);

  return qwenSettings;
}
