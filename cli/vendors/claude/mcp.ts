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

export interface ClaudeMcpServer {
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

/**
 * Names of SSOT servers absent from the current `.mcp.json`. serena is
 * excluded — it is managed via {@link RECOMMENDED_CLAUDE_MCP} with the
 * claude-code context rather than copied verbatim from the SSOT.
 */
function missingServerNames(
  currentMcp: Record<string, unknown>,
  ssotServers: Record<string, ClaudeMcpServer> | undefined,
): string[] {
  if (!ssotServers) return [];
  return Object.keys(ssotServers).filter(
    (name) => name !== "serena" && !(name in currentMcp),
  );
}

/**
 * Whether `.mcp.json` needs a rewrite. Beyond the serena transport/context/
 * dashboard checks, an update is also required when the SSOT (`.agents/mcp.json`)
 * has gained servers (chrome-devtools, context7, …) that the existing
 * `.mcp.json` does not yet expose — the create-only seeding path never
 * back-fills those into an already-present file.
 */
export function needsClaudeMcpUpdate(
  raw: unknown,
  ssotServers?: Record<string, ClaudeMcpServer>,
): boolean {
  if (!isRecord(raw)) return true;
  const mcp = raw.mcpServers;
  if (!isRecord(mcp)) return true;
  const serena = mcp.serena as ClaudeMcpServer | undefined;
  if (!hasClaudeMcpTransport(serena)) return true;
  if (isLegacyUvxSerena(serena)) return true;
  if (hasStaleContext(serena)) return true;
  if (!hasSerenaDashboardOpenDisabled(serena)) return true;
  if (missingServerNames(mcp, ssotServers).length > 0) return true;
  return false;
}

/**
 * Merge the managed serena entry and any missing SSOT servers into `.mcp.json`.
 * Existing user customizations are preserved: a server already present in
 * `.mcp.json` is never overwritten (only genuinely missing SSOT servers are
 * added). serena is always reset to the claude-code recommended value.
 */
export function applyClaudeMcp(
  raw: unknown,
  ssotServers?: Record<string, ClaudeMcpServer>,
): ClaudeMcpConfig {
  const base: ClaudeMcpConfig = isRecord(raw) ? (raw as ClaudeMcpConfig) : {};
  const currentMcp = isRecord(base.mcpServers) ? base.mcpServers : {};
  const merged: Record<string, ClaudeMcpServer> = { ...currentMcp };
  const missing = new Set(missingServerNames(currentMcp, ssotServers));
  for (const [name, def] of Object.entries(ssotServers ?? {})) {
    if (missing.has(name)) merged[name] = def;
  }
  merged.serena = { ...RECOMMENDED_CLAUDE_MCP.serena };
  base.mcpServers = merged;
  return base;
}
