import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export type UserPreferences = {
  default_cli?: string;
  agent_cli_mapping?: Record<string, string>;
};

export type VendorConfig = {
  command?: string;
  subcommand?: string;
  prompt_flag?: string;
  auto_approve_flag?: string;
  output_format_flag?: string;
  output_format?: string;
  model_flag?: string;
  default_model?: string;
  isolation_env?: string;
  isolation_flags?: string;
};

export type CliConfig = {
  active_vendor?: string;
  vendors: Record<string, VendorConfig>;
};

const AGENT_CONFIG_ALIASES: Record<string, string[]> = {
  "backend-engineer": ["backend"],
  "frontend-engineer": ["frontend"],
  "db-engineer": ["db"],
  "mobile-engineer": ["mobile"],
  "pm-planner": ["pm"],
  "qa-reviewer": ["qa"],
  "debug-investigator": ["debug"],
  "architecture-reviewer": ["architecture", "architect"],
  "tf-infra-engineer": ["tf-infra", "infra", "terraform"],
};

const UserPreferencesSchema = z
  .object({
    default_cli: z.string().optional(),
    agent_cli_mapping: z.record(z.string(), z.string()).optional(),
  })
  .passthrough()
  .transform((value) => ({
    default_cli: value.default_cli,
    agent_cli_mapping: value.agent_cli_mapping ?? {},
  }));

const VendorConfigSchema = z
  .object({
    command: z.string().optional(),
    subcommand: z.string().optional(),
    prompt_flag: z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        const normalized = value.trim().toLowerCase();
        if (
          normalized === "" ||
          normalized === "none" ||
          normalized === "null"
        ) {
          return null;
        }
        return value;
      }),
    auto_approve_flag: z.string().optional(),
    output_format_flag: z.string().optional(),
    output_format: z.string().optional(),
    model_flag: z.string().optional(),
    default_model: z.string().optional(),
    isolation_env: z.string().optional(),
    isolation_flags: z.string().optional(),
  })
  .passthrough()
  .transform((value) => ({
    ...value,
    prompt_flag: value.prompt_flag ?? undefined,
  }));

const CliConfigSchema = z
  .object({
    active_vendor: z.string().optional(),
    vendors: z.record(z.string(), VendorConfigSchema).optional(),
  })
  .passthrough()
  .transform((value) => ({
    active_vendor: value.active_vendor,
    vendors: value.vendors ?? {},
  }));

function parseYamlValue(content: string): unknown {
  try {
    return parseYaml(content);
  } catch {
    return null;
  }
}

function parseUserPreferences(content: string): UserPreferences {
  const parsed = parseYamlValue(content);
  const result = UserPreferencesSchema.safeParse(parsed);
  if (!result.success) return {};
  return result.data;
}

function parseCliConfig(content: string): CliConfig {
  const parsed = parseYamlValue(content);
  const result = CliConfigSchema.safeParse(parsed);
  if (!result.success) return { vendors: {} };

  return {
    active_vendor: result.data.active_vendor,
    vendors: result.data.vendors as Record<string, VendorConfig>,
  };
}

function findConfigFileUp(startDir: string, relativePath: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const configPath = path.join(current, relativePath);
    if (fs.existsSync(configPath)) return configPath;
    current = path.dirname(current);
  }
  return null;
}

function readUserPreferences(cwd: string): UserPreferences | null {
  const configPaths = [
    findConfigFileUp(cwd, path.join(".agents", "config", "user-preferences.yaml")),
    findConfigFileUp(cwd, path.join(".agents", "oma-config.yaml")),
  ].filter((configPath): configPath is string => Boolean(configPath));

  if (configPaths.length === 0) return null;

  let merged: UserPreferences = {};

  for (const configPath of configPaths) {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      const parsed = parseUserPreferences(content);
      merged = {
        ...merged,
        ...parsed,
        agent_cli_mapping: {
          ...(merged.agent_cli_mapping ?? {}),
          ...(parsed.agent_cli_mapping ?? {}),
        },
      };
    } catch {
      // Ignore malformed config and keep best-effort merge.
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

function readCliConfig(cwd: string): CliConfig | null {
  const configPath = findConfigFileUp(
    cwd,
    path.join(
      ".agents",
      "skills",
      "oma-orchestrator",
      "config",
      "cli-config.yaml",
    ),
  );
  if (!configPath) return null;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return parseCliConfig(content);
  } catch {
    return null;
  }
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

export function resolveVendor(
  agentId: string,
  vendorOverride?: string,
): { vendor: string; config: CliConfig | null } {
  const cwd = process.cwd();
  const userPrefs = readUserPreferences(cwd);
  const cliConfig = readCliConfig(cwd);

  const normalizedAgentId = agentId.replace(/-agent$/i, "");
  const configKeys = [
    agentId,
    normalizedAgentId,
    ...(AGENT_CONFIG_ALIASES[agentId] ?? []),
    ...(AGENT_CONFIG_ALIASES[normalizedAgentId] ?? []),
  ];
  const matchedConfigKey = configKeys.find(
    (key) => key && userPrefs?.agent_cli_mapping?.[key],
  );
  const mappedVendor = matchedConfigKey
    ? userPrefs?.agent_cli_mapping?.[matchedConfigKey]
    : undefined;
  const vendor =
    vendorOverride ||
    mappedVendor ||
    userPrefs?.default_cli ||
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
  };

  return Object.prototype.hasOwnProperty.call(defaults, vendor)
    ? defaults[vendor]!
    : "-p";
}

export function resolvePromptContent(prompt: string): string {
  const resolved = path.resolve(prompt);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return fs.readFileSync(resolved, "utf-8");
  }
  return prompt;
}

export function loadExecutionProtocol(vendor: string, cwd: string): string {
  const protocolPath = findConfigFileUp(
    cwd,
    path.join(
      ".agents",
      "skills",
      "_shared",
      "runtime",
      "execution-protocols",
      `${vendor}.md`,
    ),
  );
  if (!protocolPath) return "";
  try {
    return fs.readFileSync(protocolPath, "utf-8");
  } catch {
    return "";
  }
}
