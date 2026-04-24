import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

// ---------------------------------------------------------------------------
// AgentSpec — dual-format agent_cli_mapping schemas
// ---------------------------------------------------------------------------

const ModelSlugSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*\/[a-z0-9][a-z0-9.-]+$/,
    "Model slug must be in owner/model format (e.g. openai/gpt-5.4)",
  );

const EffortLevelSchema = z.enum(["none", "low", "medium", "high", "xhigh"]);

const MemoryTierSchema = z.enum(["user", "project", "local"]);

const AgentSpecSchema = z.object({
  model: ModelSlugSchema,
  effort: EffortLevelSchema.optional(),
  thinking: z.boolean().optional(),
  memory: MemoryTierSchema.optional(),
});

export type AgentSpec = z.infer<typeof AgentSpecSchema>;

export const AgentMappingValueSchema = z.union([
  z.string().min(1),
  AgentSpecSchema,
]);

export const AgentCliMappingSchema = z.record(
  z.string().min(1),
  AgentMappingValueSchema,
);

export type AgentCliMapping = z.infer<typeof AgentCliMappingSchema>;

// ---------------------------------------------------------------------------

export type UserPreferences = {
  default_cli?: string;
  agent_cli_mapping?: Record<string, string | AgentSpec>;
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
    agent_cli_mapping: AgentCliMappingSchema.optional(),
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

function findConfigFileUp(
  startDir: string,
  relativePath: string,
): string | null {
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
    findConfigFileUp(
      cwd,
      path.join(".agents", "config", "user-preferences.yaml"),
    ),
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

/**
 * Maps an OpenRouter-style model slug owner to a CLI vendor name.
 * Used to derive vendor when agent_cli_mapping value is an AgentSpec object.
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
  const rawMappedValue = matchedConfigKey
    ? userPrefs?.agent_cli_mapping?.[matchedConfigKey]
    : undefined;

  // Discriminate between legacy string and AgentSpec object.
  // AgentSpec carries a model slug; derive the vendor from its owner prefix.
  const mappedVendor =
    rawMappedValue === undefined
      ? undefined
      : typeof rawMappedValue === "string"
        ? rawMappedValue
        : resolveVendorFromModelSlug(rawMappedValue.model);

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

  if (Object.hasOwn(defaults, vendor)) return defaults[vendor] as string | null;
  return "-p";
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
