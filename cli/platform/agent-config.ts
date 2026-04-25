import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import {
  BUILT_IN_PRESET_ALIASES,
  BUILT_IN_PRESETS,
} from "./built-in-presets.js";

// ---------------------------------------------------------------------------
// AgentId — canonical set of agent role identifiers (11 values)
// ---------------------------------------------------------------------------

export type AgentId =
  | "orchestrator"
  | "architecture"
  | "qa"
  | "pm"
  | "backend"
  | "frontend"
  | "mobile"
  | "db"
  | "debug"
  | "tf-infra"
  | "retrieval";

// ---------------------------------------------------------------------------
// BuiltInPresetKey — the 5 shipped presets
// ---------------------------------------------------------------------------

export type BuiltInPresetKey =
  | "claude-only"
  | "codex-only"
  | "gemini-only"
  | "qwen-only"
  | "antigravity";

// ---------------------------------------------------------------------------
// AgentSpec — object only (no string shorthand)
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

// ---------------------------------------------------------------------------
// ModelPreset — built-in or user-defined preset definition
// ---------------------------------------------------------------------------

export interface ModelPreset {
  description: string;
  /** Only valid on custom_presets entries. Built-in presets do not extend. */
  extends?: string;
  /** All 11 agent roles required when no extends. Partial when extends is set. */
  agent_defaults: Partial<Record<AgentId, AgentSpec>>;
}

// ---------------------------------------------------------------------------
// UserModelSpec — inline user-defined model (formerly models.yaml)
// ---------------------------------------------------------------------------

export type UserModelSpec = {
  cli: string;
  cli_model: string;
  supports?: {
    native_dispatch_from?: string[];
    thinking?: boolean;
    effort?: unknown;
    apply_patch?: boolean;
    task_budget?: boolean;
    prompt_cache?: boolean;
    computer_use?: boolean;
    api_only?: boolean;
  };
  pricing_note?: string;
  auth_hint?: string;
  subscription_tier?: string;
};

// ---------------------------------------------------------------------------
// VendorConfig
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// OmaConfig — single-file unified configuration schema
// ---------------------------------------------------------------------------

export interface OmaConfig {
  language: string;
  /** Built-in preset key or custom_presets key */
  model_preset: string;
  date_format?: "ISO" | "US" | "EU";
  timezone?: string;
  auto_update_cli?: boolean;
  /** Per-agent overrides applied as shallow merge on top of preset */
  agents?: Partial<Record<AgentId, AgentSpec>>;
  /** Inline user-defined model slugs (formerly models.yaml) */
  models?: Record<string, UserModelSpec>;
  /** User-defined presets; may extend a built-in */
  custom_presets?: Record<string, ModelPreset>;
  vendors?: Record<string, VendorConfig>;
  session?: { quota_cap?: Record<string, unknown> };
  // Legacy fields for backward-compat during migration grace window
  default_cli?: string;
}

// ---------------------------------------------------------------------------
// Zod schemas for runtime validation
// ---------------------------------------------------------------------------

const AgentIdValues = [
  "orchestrator",
  "architecture",
  "qa",
  "pm",
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "tf-infra",
  "retrieval",
] as const;

const _AgentIdSchema = z.enum(AgentIdValues);

// Partial record — zod v4 makes z.record exhaustive over enum keys. Use a
// plain object with all 11 entries optional so users can override subsets.
const AgentsMapSchema = z
  .object({
    orchestrator: AgentSpecSchema.optional(),
    architecture: AgentSpecSchema.optional(),
    qa: AgentSpecSchema.optional(),
    pm: AgentSpecSchema.optional(),
    backend: AgentSpecSchema.optional(),
    frontend: AgentSpecSchema.optional(),
    mobile: AgentSpecSchema.optional(),
    db: AgentSpecSchema.optional(),
    debug: AgentSpecSchema.optional(),
    "tf-infra": AgentSpecSchema.optional(),
    retrieval: AgentSpecSchema.optional(),
  })
  .strict();

const OmaConfigSchema = z
  .object({
    language: z.string().default("en"),
    model_preset: z.string().min(1),
    date_format: z.enum(["ISO", "US", "EU"]).optional(),
    timezone: z.string().optional(),
    auto_update_cli: z.boolean().optional(),
    agents: AgentsMapSchema.optional(),
    models: z.record(z.string(), z.unknown()).optional(),
    custom_presets: z.record(z.string(), z.unknown()).optional(),
    vendors: z.record(z.string(), z.unknown()).optional(),
    session: z.unknown().optional(),
    default_cli: z.string().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Zod schemas for VendorConfig and CliConfig
// ---------------------------------------------------------------------------

export type CliConfig = {
  active_vendor?: string;
  vendors: Record<string, VendorConfig>;
};

const AGENT_IDS: ReadonlySet<AgentId> = new Set([
  "orchestrator",
  "architecture",
  "qa",
  "pm",
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "tf-infra",
  "retrieval",
]);

/**
 * Normalize a free-form agent identifier (e.g. "backend-engineer", "qa-agent",
 * "architecture") to its canonical AgentId. Returns undefined when no mapping
 * is found.
 */
export function normalizeAgentId(input: string): AgentId | undefined {
  if (AGENT_IDS.has(input as AgentId)) return input as AgentId;
  const stripped = input.replace(/-agent$/i, "");
  if (AGENT_IDS.has(stripped as AgentId)) return stripped as AgentId;
  const alias = AGENT_CONFIG_ALIASES[input] ?? AGENT_CONFIG_ALIASES[stripped];
  if (alias) {
    const match = alias.find((a) => AGENT_IDS.has(a as AgentId));
    if (match) return match as AgentId;
  }
  return undefined;
}

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

/**
 * Extract a human-readable "line:col" string from a yaml library parse error.
 * Returns undefined if position information is not available on the error.
 */
function yamlErrorPosition(
  err: unknown,
): { line: number; col: number } | undefined {
  if (
    err &&
    typeof err === "object" &&
    "linePos" in err &&
    Array.isArray((err as { linePos: unknown[] }).linePos) &&
    (err as { linePos: unknown[] }).linePos.length > 0
  ) {
    const first = (err as { linePos: Array<{ line: number; col: number }> })
      .linePos[0];
    if (
      first &&
      typeof first.line === "number" &&
      typeof first.col === "number"
    ) {
      return first;
    }
  }
  return undefined;
}

function parseYamlValue(content: string, filePath?: string): unknown {
  try {
    return parseYaml(content);
  } catch (err) {
    const pos = yamlErrorPosition(err);
    const location = filePath
      ? pos
        ? `${filePath}:${pos.line}:${pos.col}`
        : filePath
      : pos
        ? `<input>:${pos.line}:${pos.col}`
        : "<input>";
    console.warn(
      `[agent-config] YAML parse error at ${location}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * Parse oma-config.yaml content into OmaConfig.
 * Returns null on parse failure or missing required fields.
 */
export function parseOmaConfig(
  content: string,
  filePath?: string,
): OmaConfig | null {
  const parsed = parseYamlValue(content, filePath);
  const result = OmaConfigSchema.safeParse(parsed);
  if (!result.success) return null;
  return result.data as OmaConfig;
}

function parseCliConfig(content: string, filePath?: string): CliConfig {
  const parsed = parseYamlValue(content, filePath);
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
    return parseCliConfig(content, configPath);
  } catch {
    return null;
  }
}

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
