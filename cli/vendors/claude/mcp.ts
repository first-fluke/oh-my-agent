import { isRecord } from "../../utils/type-guards.js";
import {
  hasSerenaDashboardOpenDisabled,
  isLegacyUvxSerena,
  serenaStartMcpArgs,
} from "../serena.js";

/**
 * Recommended Claude Code project-level MCP settings managed by oh-my-agent.
 * Applies to project-local `.mcp.json` (read by Claude Code at session start
 * once the project is trusted via the on-first-launch prompt).
 *
 * Claude Code supports three MCP scopes — project (`.mcp.json`), user-global
 * (`~/.claude.json` top-level `mcpServers`), and per-project user override
 * (`~/.claude.json` `projects.<path>.mcpServers`). oh-my-agent writes the
 * project scope so the team can commit it and serena's `--context` value
 * can be Claude-Code-optimized without leaking into other vendors that share
 * the SSOT `.agents/mcp.json` template.
 */

export const RECOMMENDED_CLAUDE_MCP = {
  serena: {
    command: "serena",
    args: serenaStartMcpArgs("claude-code"),
    env: {
      SERENA_LOG_LEVEL: "info",
    },
  },
};

interface ClaudeMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
}

export interface ClaudeMcpConfig {
  mcpServers?: Record<string, ClaudeMcpServer>;
  [key: string]: unknown;
}

function hasClaudeMcpTransport(
  server: ClaudeMcpServer | undefined,
): server is ClaudeMcpServer {
  if (!server) return false;
  return typeof server.command === "string" || typeof server.url === "string";
}

function hasStaleContext(server: ClaudeMcpServer | undefined): boolean {
  if (!server || server.command !== "serena") return false;
  if (!Array.isArray(server.args)) return false;
  const idx = server.args.indexOf("--context");
  if (idx === -1) return true;
  return server.args[idx + 1] !== "claude-code";
}

export function needsClaudeMcpUpdate(raw: unknown): boolean {
  if (!isRecord(raw)) return true;
  const mcp = raw.mcpServers;
  if (!isRecord(mcp)) return true;
  const serena = mcp.serena as ClaudeMcpServer | undefined;
  if (!hasClaudeMcpTransport(serena)) return true;
  if (isLegacyUvxSerena(serena)) return true;
  if (hasStaleContext(serena)) return true;
  if (!hasSerenaDashboardOpenDisabled(serena)) return true;
  return false;
}

export function applyClaudeMcp(raw: unknown): ClaudeMcpConfig {
  const base: ClaudeMcpConfig = isRecord(raw) ? (raw as ClaudeMcpConfig) : {};
  const currentMcp = isRecord(base.mcpServers) ? base.mcpServers : {};
  base.mcpServers = {
    ...currentMcp,
    serena: { ...RECOMMENDED_CLAUDE_MCP.serena },
  };
  return base;
}
