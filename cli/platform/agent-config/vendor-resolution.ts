import fs from "node:fs";
import path from "node:path";
import {
  BUILT_IN_PRESET_ALIASES,
  BUILT_IN_PRESETS,
} from "../built-in-presets.js";
import { AGENT_CONFIG_ALIASES, AGENT_IDS } from "./agent-ids.js";
import {
  findConfigFileUp,
  parseOmaConfig,
  readCliConfig,
} from "./config-io.js";
import type { AgentSpec } from "./schemas.js";
import type {
  AgentId,
  BuiltInPresetKey,
  CliConfig,
  ModelPreset,
  OmaConfig,
} from "./types.js";

/**
 * Maps an OpenRouter-style model slug owner to a CLI vendor name.
 * Used to derive vendor from an AgentSpec object's model slug.
 * Falls back to the raw owner prefix if no mapping exists.
 */
function resolveVendorFromModelSlug(modelSlug: string): string {
  const owner = modelSlug.split("/")[0] ?? modelSlug;
  const OWNER_TO_VENDOR: Record<string, string> = {
    anthropic: "claude",
    openai: "codex",
    google: "gemini",
    qwen: "qwen",
  };
  return OWNER_TO_VENDOR[owner] ?? owner;
}

export function splitArgs(value: string): string[] {
  const args: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null = regex.exec(value);
  while (match !== null) {
    if (match[1] !== undefined) args.push(match[1]);
    else if (match[2] !== undefined) args.push(match[2]);
    else if (match[0]) args.push(match[0]);
    match = regex.exec(value);
  }
  return args;
}

function resolvePresetAgentSpec(
  config: OmaConfig,
  agentId: AgentId,
): AgentSpec | undefined {
  const presetKey =
    BUILT_IN_PRESET_ALIASES[config.model_preset] ?? config.model_preset;
  const builtIn = BUILT_IN_PRESETS[presetKey as BuiltInPresetKey];
  const custom = config.custom_presets?.[presetKey];

  let preset: ModelPreset | undefined;
  if (builtIn) {
    preset = builtIn;
  } else if (custom) {
    if (custom.extends) {
      const baseKey = BUILT_IN_PRESET_ALIASES[custom.extends] ?? custom.extends;
      const base =
        BUILT_IN_PRESETS[baseKey as BuiltInPresetKey] ??
        config.custom_presets?.[baseKey];
      preset = base
        ? {
            ...base,
            agent_defaults: {
              ...base.agent_defaults,
              ...custom.agent_defaults,
            },
          }
        : custom;
    } else {
      preset = custom;
    }
  }

  return preset?.agent_defaults[agentId] ?? preset?.agent_defaults.orchestrator;
}

export function resolveVendor(
  agentId: string,
  vendorOverride?: string,
): { vendor: string; config: CliConfig | null } {
  const cwd = process.cwd();
  const cliConfig = readCliConfig(cwd);

  // Attempt to load oma-config.yaml for agents map override + model_preset
  const configPath = findConfigFileUp(
    cwd,
    path.join(".agents", "oma-config.yaml"),
  );
  let parsedConfig: OmaConfig | null = null;
  let agentsOverride: Partial<Record<AgentId, AgentSpec>> | undefined;
  let defaultCli: string | undefined;
  if (configPath) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      parsedConfig = parseOmaConfig(raw, configPath);
      agentsOverride = parsedConfig?.agents;
      defaultCli = parsedConfig?.default_cli;
    } catch {
      // ignore
    }
  }

  const normalizedAgentId = agentId.replace(/-agent$/i, "");
  const configKeys = [
    agentId,
    normalizedAgentId,
    ...(AGENT_CONFIG_ALIASES[agentId] ?? []),
    ...(AGENT_CONFIG_ALIASES[normalizedAgentId] ?? []),
  ];

  const matchedKey = configKeys.find(
    (key) => key && agentsOverride?.[key as AgentId],
  ) as AgentId | undefined;
  let agentSpec: AgentSpec | undefined = matchedKey
    ? agentsOverride?.[matchedKey]
    : undefined;

  // Fallback: resolve via model_preset when no per-agent override is set.
  if (!agentSpec && parsedConfig) {
    const presetAgentId = (configKeys.find((k) =>
      AGENT_IDS.has(k as AgentId),
    ) ?? normalizedAgentId) as AgentId;
    agentSpec = resolvePresetAgentSpec(parsedConfig, presetAgentId);
  }

  const mappedVendor = agentSpec
    ? resolveVendorFromModelSlug(agentSpec.model)
    : undefined;

  const vendor =
    vendorOverride ||
    mappedVendor ||
    defaultCli ||
    cliConfig?.active_vendor ||
    "gemini";

  return { vendor: vendor.toLowerCase(), config: cliConfig };
}

export function resolvePromptFlag(
  vendor: string,
  promptFlag?: string | null,
): string | null {
  if (promptFlag !== undefined) {
    return promptFlag;
  }

  const defaults: Record<string, string | null> = {
    gemini: "-p",
    claude: "-p",
    qwen: "-p",
    codex: null,
    cursor: null,
  };

  if (Object.hasOwn(defaults, vendor)) return defaults[vendor] as string | null;
  return "-p";
}
