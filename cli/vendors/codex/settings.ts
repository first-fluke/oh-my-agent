/**
 * Recommended Codex CLI settings managed by oh-my-agent.
 * Applies to project-local `.codex/config.toml`.
 *
 * Codex CLI reads `mcp_servers.<name>` TOML tables to register MCP servers
 * via stdio. Serena is registered with `--context codex`.
 */

import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

export const RECOMMENDED_CODEX_MCP = {
  serena: {
    command: "uvx",
    args: [
      "--from",
      "git+https://github.com/oraios/serena",
      "serena",
      "start-mcp-server",
      "--context",
      "codex",
      "--project",
      ".",
    ],
    env: {
      SERENA_LOG_LEVEL: "info",
    },
  },
} as const;

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

export function needsCodexSettingsUpdate(settings: unknown): boolean {
  if (!isRecord(settings)) return true;
  const mcp = (settings as CodexSettings).mcp_servers;
  const serena = isRecord(mcp) ? (mcp.serena as CodexMcpServer) : undefined;
  return !hasCodexMcpTransport(serena);
}

export function applyRecommendedCodexSettings(
  settings: unknown,
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
  effort: string | undefined,
): CodexSettings {
  const next = { ...settings };
  if (effort === undefined) {
    delete next.model_reasoning_effort;
  } else {
    next.model_reasoning_effort = effort;
  }
  return next;
}
