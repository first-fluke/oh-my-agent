import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  hasSerenaDashboardOpenDisabled,
  RECOMMENDED_CHROME_DEVTOOLS_MCP,
  serenaStartMcpArgs,
  withSerenaDashboardOpenDisabled,
} from "../serena.js";

export const KIRO_PROJECT_SETTINGS_PATH = ".kiro/settings/cli.json";
export const KIRO_PROJECT_OMA_HOOKS_AGENT_PATH = ".kiro/agents/oma-hooks.json";
export const KIRO_GLOBAL_SETTINGS_PATH = join(
  homedir(),
  ".kiro",
  "settings",
  "cli.json",
);

export const RECOMMENDED_KIRO_MCP = {
  "chrome-devtools": RECOMMENDED_CHROME_DEVTOOLS_MCP,
  serena: {
    command: "serena",
    args: serenaStartMcpArgs("ide"),
  },
};

export const OMA_KIRO_HOOKS_AGENT_NAME = "oma-hooks";

const OMA_KIRO_HOOKS_AGENT = {
  name: OMA_KIRO_HOOKS_AGENT_NAME,
  description: "Default Kiro CLI agent with oh-my-agent hook context enabled.",
  prompt:
    "You are Kiro CLI running in an oh-my-agent workspace. Follow project instructions and use hook-provided context when present.",
  includeMcpJson: true,
  // Hooks route through oma-hook.sh → `oma hook` (design 019): handler .ts
  // files are no longer materialized in .kiro/hooks/, so per-script `bun`
  // commands would point at missing files. One wrapper call runs the whole
  // in-process chain for the event.
  hooks: {
    userPromptSubmit: [
      {
        command:
          "bash .kiro/hooks/oma-hook.sh --vendor kiro --event userPromptSubmit",
      },
    ],
    preToolUse: [
      {
        matcher: "execute_bash",
        command:
          "bash .kiro/hooks/oma-hook.sh --vendor kiro --event preToolUse --matcher shell",
      },
    ],
    stop: [
      { command: "bash .kiro/hooks/oma-hook.sh --vendor kiro --event stop" },
    ],
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
  const chromeDevtools = isRecord(mcp["chrome-devtools"])
    ? mcp["chrome-devtools"]
    : {};
  const serena = isRecord(mcp.serena) ? mcp.serena : {};
  if (
    !(
      typeof chromeDevtools.command === "string" ||
      typeof chromeDevtools.url === "string"
    )
  ) {
    return true;
  }
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
      "chrome-devtools":
        currentMcp["chrome-devtools"] ??
        RECOMMENDED_KIRO_MCP["chrome-devtools"],
      serena: withSerenaDashboardOpenDisabled({
        ...currentSerena,
        ...RECOMMENDED_KIRO_MCP.serena,
      }),
    },
  };

  writeJson(path, updated);
}

export function needsKiroOmaHooksAgentUpdate(cwd: string): boolean {
  const agentPath = join(cwd, KIRO_PROJECT_OMA_HOOKS_AGENT_PATH);
  const agent = readJson(agentPath);
  return (
    JSON.stringify(agent.hooks) !== JSON.stringify(OMA_KIRO_HOOKS_AGENT.hooks)
  );
}

/**
 * Kiro CLI reads hooks from agent configuration files, not from
 * `.kiro/settings/cli.json`. Install a local default agent so ordinary
 * `kiro-cli chat` runs the OMA prompt/boundary/injection chain.
 */
export function applyKiroOmaHooksAgent(cwd: string): void {
  const agentPath = join(cwd, KIRO_PROJECT_OMA_HOOKS_AGENT_PATH);
  if (needsKiroOmaHooksAgentUpdate(cwd)) {
    writeJson(agentPath, OMA_KIRO_HOOKS_AGENT);
  }

  const settingsPath = join(cwd, KIRO_PROJECT_SETTINGS_PATH);
  const settings = readJson(settingsPath);
  let changed = false;

  if (
    typeof settings["chat.defaultAgent"] !== "string" ||
    settings["chat.defaultAgent"].length === 0
  ) {
    settings["chat.defaultAgent"] = OMA_KIRO_HOOKS_AGENT_NAME;
    changed = true;
  }

  const chat = isRecord(settings.chat) ? settings.chat : null;
  if (chat?.defaultAgent === OMA_KIRO_HOOKS_AGENT_NAME) {
    delete chat.defaultAgent;
    if (Object.keys(chat).length === 0) {
      delete settings.chat;
    }
    changed = true;
  }

  if (changed) {
    writeJson(settingsPath, settings);
  }
}
