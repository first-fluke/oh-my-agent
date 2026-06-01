import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  hasSerenaDashboardOpenDisabled,
  serenaStartMcpArgs,
  withSerenaDashboardOpenDisabled,
} from "../serena.js";

export const KIRO_PROJECT_SETTINGS_PATH = ".kiro/settings/cli.json";
export const KIRO_GLOBAL_SETTINGS_PATH = join(
  homedir(),
  ".kiro",
  "settings",
  "cli.json",
);

export const RECOMMENDED_KIRO_MCP = {
  serena: {
    command: "serena",
    args: serenaStartMcpArgs("ide"),
  },
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path: string): JsonRecord {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeJson(path: string, data: JsonRecord): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Returns true if the project Kiro settings need the Serena MCP entry added.
 */
export function needsKiroMcpUpdate(cwd: string): boolean {
  const path = join(cwd, KIRO_PROJECT_SETTINGS_PATH);
  const settings = readJson(path);
  const mcp = isRecord(settings.mcpServers) ? settings.mcpServers : {};
  const serena = isRecord(mcp.serena) ? mcp.serena : {};
  return !(
    (typeof serena.command === "string" || typeof serena.url === "string") &&
    hasSerenaDashboardOpenDisabled(serena)
  );
}

/**
 * Writes the Serena MCP entry into the project `.kiro/settings/cli.json`.
 */
export function applyKiroProjectMcp(cwd: string): void {
  if (!needsKiroMcpUpdate(cwd)) return;

  const path = join(cwd, KIRO_PROJECT_SETTINGS_PATH);
  const settings = readJson(path);
  const currentMcp = isRecord(settings.mcpServers) ? settings.mcpServers : {};
  const currentSerena = isRecord(currentMcp.serena) ? currentMcp.serena : {};

  const updated: JsonRecord = {
    ...settings,
    mcpServers: {
      ...currentMcp,
      serena: withSerenaDashboardOpenDisabled({
        ...currentSerena,
        ...RECOMMENDED_KIRO_MCP.serena,
      }),
    },
  };

  writeJson(path, updated);
}
