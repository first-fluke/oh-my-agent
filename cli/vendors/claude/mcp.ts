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
    args: ["start-mcp-server", "--context", "claude-code", "--project", "."],
    env: {
      SERENA_LOG_LEVEL: "info",
    },
  },
};

type JsonRecord = Record<string, unknown>;

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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasClaudeMcpTransport(
  server: ClaudeMcpServer | undefined,
): server is ClaudeMcpServer {
  if (!server) return false;
  return typeof server.command === "string" || typeof server.url === "string";
}

function isLegacyUvxSerena(server: ClaudeMcpServer | undefined): boolean {
  if (!server || server.command !== "uvx") return false;
  if (!Array.isArray(server.args)) return false;
  return server.args.some(
    (arg) =>
      typeof arg === "string" &&
      arg.includes("git+https://github.com/oraios/serena"),
  );
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
