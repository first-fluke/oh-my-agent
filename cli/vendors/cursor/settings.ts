import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  hasSerenaDashboardOpenDisabled,
  isLegacyUvxSerena,
  RECOMMENDED_CHROME_DEVTOOLS_MCP,
  serenaStartMcpArgs,
} from "../serena.js";

/** Global cursor-agent CLI config (`~/.cursor/cli-config.json`). */
function cursorCliConfigPath(): string {
  return join(homedir(), ".cursor", "cli-config.json");
}

/**
 * Turn off cursor-agent commit/PR attribution so commits and PRs it creates are
 * not stamped with `Co-authored-by: Cursor`. Mutates only the `attribution`
 * block of the global `~/.cursor/cli-config.json`; every other key is preserved.
 *
 * No-op when the file is absent (cursor-agent not installed) or already
 * disabled. Returns true only when a write occurred.
 */
export function disableCursorAgentAttribution(
  configPath: string = cursorCliConfigPath(),
): boolean {
  if (!existsSync(configPath)) return false;

  let config: Record<string, unknown>;
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return false;
    }
    config = parsed as Record<string, unknown>;
  } catch {
    return false;
  }

  const current =
    config.attribution &&
    typeof config.attribution === "object" &&
    !Array.isArray(config.attribution)
      ? (config.attribution as Record<string, unknown>)
      : {};

  if (
    current.attributeCommitsToAgent === false &&
    current.attributePRsToAgent === false
  ) {
    return false; // already disabled — keep the write idempotent
  }

  config.attribution = {
    ...current,
    attributeCommitsToAgent: false,
    attributePRsToAgent: false,
  };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return true;
}

/**
 * Recommended Cursor settings managed by oh-my-agent.
 * Applies to project-local `.cursor/mcp.json`.
 *
 * Cursor reads `.cursor/mcp.json` (top-level `mcpServers`). Until 2026-05
 * oh-my-agent symlinked this to `.agents/mcp.json`, but the serena upstream
 * docs now recommend `--context=ide` for Cursor and `--context=claude-code`
 * for Claude Code — those values can't share the same file. So Cursor gets
 * its own generated MCP config that mirrors `.agents/mcp.json` but overrides
 * the serena entry with the Cursor-appropriate context.
 */

export const RECOMMENDED_CURSOR_MCP = {
  "chrome-devtools": RECOMMENDED_CHROME_DEVTOOLS_MCP,
  serena: {
    command: "serena",
    args: serenaStartMcpArgs("ide"),
    env: {
      SERENA_LOG_LEVEL: "info",
    },
  },
};

type JsonRecord = Record<string, unknown>;

interface CursorMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
}

export interface CursorSettings {
  mcpServers?: Record<string, CursorMcpServer>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasCursorMcpTransport(
  server: CursorMcpServer | undefined,
): server is CursorMcpServer {
  if (!server) return false;
  return typeof server.command === "string" || typeof server.url === "string";
}

function isWrongContextSerena(server: CursorMcpServer | undefined): boolean {
  if (!server || server.command !== "serena") return false;
  if (!Array.isArray(server.args)) return false;
  const contextIdx = server.args.indexOf("--context");
  if (contextIdx === -1) return false;
  const value = server.args[contextIdx + 1];
  return value !== "ide";
}

export function needsCursorSettingsUpdate(rawSettings: unknown): boolean {
  if (!isRecord(rawSettings)) return true;
  const mcp = rawSettings.mcpServers;
  if (!isRecord(mcp)) return true;
  const chromeDevtools = mcp["chrome-devtools"] as CursorMcpServer | undefined;
  if (!hasCursorMcpTransport(chromeDevtools)) return true;
  const serena = mcp.serena as CursorMcpServer | undefined;
  if (!hasCursorMcpTransport(serena)) return true;
  if (isLegacyUvxSerena(serena)) return true;
  if (isWrongContextSerena(serena)) return true;
  if (!hasSerenaDashboardOpenDisabled(serena)) return true;
  return false;
}

/**
 * Build the recommended Cursor MCP config. Other MCP servers (chrome-devtools,
 * context7, etc.) are preserved from existing settings; serena is rewritten
 * to use `--context=ide`.
 */
export function applyRecommendedCursorSettings(
  rawSettings: unknown,
): CursorSettings {
  const base: CursorSettings = isRecord(rawSettings)
    ? (rawSettings as CursorSettings)
    : {};
  const currentMcp = isRecord(base.mcpServers) ? base.mcpServers : {};

  base.mcpServers = {
    ...currentMcp,
    "chrome-devtools":
      currentMcp["chrome-devtools"] ??
      RECOMMENDED_CURSOR_MCP["chrome-devtools"],
    serena: { ...RECOMMENDED_CURSOR_MCP.serena },
  };

  return base;
}
