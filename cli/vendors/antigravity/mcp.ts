import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { safeReadJson } from "../../utils/safe-json.js";
import { safeWriteJson } from "../../utils/safe-write.js";
import { withSerenaDashboardOpenDisabled } from "../serena.js";

/**
 * Antigravity CLI (agy) reads MCP server config from a dedicated
 * `mcp_config.json` file — separate from legacy Gemini CLI's
 * `~/.gemini/settings.json` mcpServers key.
 *
 * Locations (per Antigravity migration guide, May 2026):
 *   - Workspace: `<installRoot>/.agents/mcp_config.json`
 *   - Global:    `~/.gemini/antigravity-cli/mcp_config.json`
 *
 * Source: https://antigravity.google/docs/gcli-migration
 *
 * Remote MCP servers use `serverUrl` (not `url`). Local stdio servers
 * (`command` + `args`) keep the same shape as legacy Gemini.
 */

type McpServerEntry = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** Antigravity field name (renamed from legacy `url`). */
  serverUrl?: string;
};

type McpConfig = {
  mcpServers?: Record<string, McpServerEntry>;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Resolve where agy reads its MCP config.
 *
 * @param installRoot — project root (project mode) or homedir() (global mode)
 * @param mode — "project" places it under `<installRoot>/.agents/`; "global"
 *               always uses `~/.gemini/antigravity-cli/mcp_config.json`
 *               regardless of installRoot.
 */
export function antigravityMcpConfigPath(
  installRoot: string,
  mode: "project" | "global",
): string {
  if (mode === "global") {
    return join(homedir(), ".gemini", "antigravity-cli", "mcp_config.json");
  }
  return join(installRoot, ".agents", "mcp_config.json");
}

/**
 * Transform a legacy MCP server entry to Antigravity shape.
 * Renames `url` → `serverUrl`; passes through other fields.
 */
function transformForAgy(entry: Record<string, unknown>): McpServerEntry {
  const out: McpServerEntry = {};
  if (typeof entry.command === "string") out.command = entry.command;
  if (Array.isArray(entry.args)) out.args = entry.args as string[];
  if (entry.env && typeof entry.env === "object") {
    out.env = entry.env as Record<string, string>;
  }
  if (typeof entry.serverUrl === "string") {
    out.serverUrl = entry.serverUrl;
  } else if (typeof entry.url === "string") {
    out.serverUrl = entry.url;
  }
  return withSerenaDashboardOpenDisabled(out);
}

/**
 * Read oma's SSOT MCP catalog (`<installRoot>/.agents/mcp.json`) and write
 * an Antigravity-compatible `mcp_config.json` so the `agy` CLI picks up the
 * same servers without manual configuration.
 *
 * Idempotent: skipped when the SSOT mcp.json is missing or unparseable, or
 * when the agy mcp_config.json already contains the same entries.
 *
 * @returns the path written (or null when skipped).
 */
export function applyAntigravityMcpConfig(
  installRoot: string,
  mode: "project" | "global",
): string | null {
  const ssotPath = join(installRoot, ".agents", "mcp.json");
  const ssot = safeReadJson<McpConfig>(ssotPath);
  if (!ssot?.mcpServers) return null;

  const transformed: Record<string, McpServerEntry> = {};
  for (const [name, entry] of Object.entries(ssot.mcpServers)) {
    transformed[name] = transformForAgy(entry as Record<string, unknown>);
  }

  const targetPath = antigravityMcpConfigPath(installRoot, mode);
  const targetDir = dirname(targetPath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Merge with any existing user-added servers under the same file
  const existing = safeReadJson<McpConfig>(targetPath) ?? {};
  const mergedServers = {
    ...(existing.mcpServers ?? {}),
    ...transformed,
  };
  const next: McpConfig = {
    ...existing,
    mcpServers: mergedServers,
  };

  if (stableJson(existing) === stableJson(next)) return null;

  safeWriteJson(targetPath, next);
  return targetPath;
}
