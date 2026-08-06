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
  model?: {
    generationConfig?: {
      timeout?: number;
    };
    [key: string]: unknown;
  };
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

/**
 * Request timeout (ms) oma pins for Qwen model generation. Qwen Code's stock
 * default is short enough that long agent turns abort mid-stream, so oma
 * writes an explicit 5-minute ceiling.
 *
 * Where it lands depends on the settings shape: newer configs carry a
 * `modelProviders` map (per-provider entry lists) and the timeout belongs on
 * each provider entry; older configs have none, and the single top-level
 * `model.generationConfig` is the only slot. The two are mutually exclusive —
 * when `modelProviders` is present the top-level copy is removed so there is
 * exactly one source of truth.
 */
export const QWEN_REQUEST_TIMEOUT_MS = 300_000;

function updateModelProvidersTimeout(
  modelProviders: unknown,
  timeout: number,
): void {
  if (!isRecord(modelProviders)) return;
  for (const key of Object.keys(modelProviders)) {
    const list = modelProviders[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!isRecord(item)) continue;
      const genConfig = isRecord(item.generationConfig)
        ? item.generationConfig
        : {};
      item.generationConfig = { ...genConfig, timeout };
    }
  }
}

function hasModelProvidersTimeoutMismatch(
  modelProviders: unknown,
  targetTimeout: number,
): boolean {
  if (!isRecord(modelProviders)) return false;
  for (const key of Object.keys(modelProviders)) {
    const list = modelProviders[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!isRecord(item)) continue;
      const genConfig = isRecord(item.generationConfig)
        ? item.generationConfig
        : {};
      if (genConfig.timeout !== targetTimeout) return true;
    }
  }
  return false;
}

export function needsQwenSettingsUpdate(
  rawSettings: unknown,
  options: QwenSettingsOptions = {},
): boolean {
  const normalized = normalizeQwenSettings(rawSettings);
  const sanitized = sanitizeQwenSettings(rawSettings);
  if (JSON.stringify(normalized) !== JSON.stringify(sanitized)) return true;

  if (needsRecommendedMcpUpdate(sanitized.mcpServers)) return true;

  // applyQwenSettings drops `contentGenerator`, and every call site gates that
  // apply behind this function — without reporting the leftover key here the
  // removal is unreachable for a config that is otherwise already current.
  if ("contentGenerator" in sanitized) return true;

  if (isRecord(sanitized.modelProviders)) {
    if (
      hasModelProvidersTimeoutMismatch(
        sanitized.modelProviders,
        QWEN_REQUEST_TIMEOUT_MS,
      )
    ) {
      return true;
    }
    // A leftover top-level copy must be cleared once modelProviders owns it.
    if (
      sanitized.model?.generationConfig &&
      "timeout" in sanitized.model.generationConfig
    ) {
      return true;
    }
  } else if (
    sanitized.model?.generationConfig?.timeout !== QWEN_REQUEST_TIMEOUT_MS
  ) {
    return true;
  }

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

  delete qwenSettings.contentGenerator;

  if (isRecord(qwenSettings.modelProviders)) {
    updateModelProvidersTimeout(
      qwenSettings.modelProviders,
      QWEN_REQUEST_TIMEOUT_MS,
    );
    if (
      isRecord(qwenSettings.model) &&
      isRecord(qwenSettings.model.generationConfig)
    ) {
      delete qwenSettings.model.generationConfig.timeout;
    }
  } else {
    const existingModel = isRecord(qwenSettings.model)
      ? qwenSettings.model
      : {};
    const existingGenConfig = isRecord(existingModel.generationConfig)
      ? existingModel.generationConfig
      : {};

    qwenSettings.model = {
      ...existingModel,
      generationConfig: {
        ...existingGenConfig,
        timeout: QWEN_REQUEST_TIMEOUT_MS,
      },
    };
  }

  applyPrivacyTelemetry(qwenSettings, options.telemetry);

  return qwenSettings;
}
