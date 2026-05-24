/**
 * Recommended Codex CLI settings managed by oh-my-agent.
 * Applies to project-local `.codex/config.toml`.
 *
 * Codex CLI reads `mcp_servers.<name>` TOML tables to register MCP servers
 * via stdio. Serena is registered with `--context codex`.
 */

import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import type { EffortLevel } from "../../platform/model-registry.js";

export const RECOMMENDED_CODEX_MCP = {
  serena: {
    command: "serena",
    args: ["start-mcp-server", "--context", "codex", "--project", "."],
    env: {
      SERENA_LOG_LEVEL: "info",
    },
  },
};

// Codex CLI experimental feature flags that default to false but oh-my-agent
// always enables (Codex 0.124.0, 2026-05). `multi_agent` is omitted because it
// already defaults to true upstream.
export const RECOMMENDED_CODEX_FEATURES = {
  goals: true,
  child_agents_md: true,
} as const;

// Codex CLI feature flags that have been renamed/removed upstream and should
// be stripped from the user's `[features]` table on install/update.
// - `codex_hooks` → `hooks` (Codex 0.124+, 2026-05): the variant now writes
//   `hooks = true`; we drop the old key so Codex stops emitting deprecation
//   warnings.
export const DEPRECATED_CODEX_FEATURES = ["codex_hooks"] as const;

// `analytics.enabled` (default true) sends anonymized usage data to OpenAI.
// `feedback.enabled` (default true) controls user feedback submission.
// Both are gated on the `telemetry` flag from oma-config.yaml.
export interface CodexSettingsOptions {
  /** When true, omit analytics/feedback opt-outs so Codex telemetry flows normally. */
  telemetry?: boolean;
}

type JsonRecord = Record<string, unknown>;

interface CodexMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  startup_timeout_sec?: number;
  [key: string]: unknown;
}

export interface CodexSettings {
  mcp_servers?: Record<string, CodexMcpServer>;
  features?: Record<string, unknown>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasCodexMcpTransport(
  server: CodexMcpServer | undefined,
): server is CodexMcpServer {
  return Boolean(server && typeof server.command === "string");
}

export function parseCodexConfig(rawText: string): CodexSettings {
  if (!rawText.trim()) return {};
  try {
    const parsed = parseToml(rawText);
    return isRecord(parsed) ? (parsed as CodexSettings) : {};
  } catch {
    return {};
  }
}

export function serializeCodexConfig(settings: CodexSettings): string {
  return stringifyToml(settings as Record<string, unknown>);
}

function privacyKeysMatch(
  table: Record<string, unknown> | undefined,
  key: string,
  telemetryEnabled: boolean,
): boolean {
  if (telemetryEnabled) {
    return !(table && key in table);
  }
  return table?.[key] === false;
}

export function needsCodexSettingsUpdate(
  settings: unknown,
  options: CodexSettingsOptions = {},
): boolean {
  if (!isRecord(settings)) return true;
  const typed = settings as CodexSettings;
  const mcp = typed.mcp_servers;
  const serena = isRecord(mcp) ? (mcp.serena as CodexMcpServer) : undefined;
  if (!hasCodexMcpTransport(serena)) return true;

  const features = isRecord(typed.features) ? typed.features : undefined;
  for (const [key, value] of Object.entries(RECOMMENDED_CODEX_FEATURES)) {
    if (features?.[key] !== value) return true;
  }
  for (const key of DEPRECATED_CODEX_FEATURES) {
    if (features && key in features) return true;
  }

  const telemetryEnabled = options.telemetry === true;
  const analytics = isRecord(typed.analytics) ? typed.analytics : undefined;
  if (!privacyKeysMatch(analytics, "enabled", telemetryEnabled)) return true;
  const feedback = isRecord(typed.feedback) ? typed.feedback : undefined;
  if (!privacyKeysMatch(feedback, "enabled", telemetryEnabled)) return true;

  return false;
}

function applyPrivacyTable(
  base: CodexSettings,
  tableKey: "analytics" | "feedback",
  optOut: boolean,
): void {
  const current = isRecord(base[tableKey])
    ? { ...(base[tableKey] as Record<string, unknown>) }
    : {};
  if (optOut) {
    current.enabled = false;
  } else {
    delete current.enabled;
  }
  if (Object.keys(current).length > 0) {
    base[tableKey] = current;
  } else if (tableKey in base) {
    delete base[tableKey];
  }
}

export function applyCodexSettings(
  settings: unknown,
  options: CodexSettingsOptions = {},
): CodexSettings {
  const base: CodexSettings = isRecord(settings)
    ? (settings as CodexSettings)
    : {};
  const currentMcp = isRecord(base.mcp_servers) ? base.mcp_servers : {};
  const currentSerena = currentMcp.serena as CodexMcpServer | undefined;

  const nextSerena = hasCodexMcpTransport(currentSerena)
    ? currentSerena
    : { ...(currentSerena || {}), ...RECOMMENDED_CODEX_MCP.serena };

  base.mcp_servers = {
    ...currentMcp,
    serena: nextSerena,
  };

  const currentFeatures = isRecord(base.features) ? base.features : {};
  const nextFeatures: Record<string, unknown> = {
    ...currentFeatures,
    ...RECOMMENDED_CODEX_FEATURES,
  };
  for (const key of DEPRECATED_CODEX_FEATURES) {
    delete nextFeatures[key];
  }
  base.features = nextFeatures;

  const optOut = options.telemetry !== true;
  applyPrivacyTable(base, "analytics", optOut);
  applyPrivacyTable(base, "feedback", optOut);

  return base;
}

/**
 * Set or clear `model_reasoning_effort` in a CodexSettings object.
 * Idempotent: calling with the same effort value produces the same result.
 * Pass undefined to remove the field.
 *
 * Codex effort levels: none | low | medium | high | xhigh
 * Maps to: model_reasoning_effort = "{effort}" in project-local .codex/config.toml
 */
export function setCodexReasoningEffort(
  settings: CodexSettings,
  effort: EffortLevel | undefined,
): CodexSettings {
  const next = { ...settings };
  if (effort === undefined) {
    delete next.model_reasoning_effort;
  } else {
    next.model_reasoning_effort = effort;
  }
  return next;
}
