import { z } from "zod";
import { loadOmaConfig } from "./config.js";

export const SearchProviderIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{0,63}$/);

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const VAULT_KEY = /^[A-Za-z0-9._-]{1,64}$/;

/** The fixed capability selectors under `providers:` (string values). */
export const CAPABILITY_PROVIDER_KEYS = [
  "docs",
  "web",
  "code_intelligence",
  "code_intelligence_guard",
  "semantic_memory",
] as const;

/**
 * Credential / connection sections that live under `providers:` beside the
 * selectors that pick them (`providers.web: brave` + `providers.brave`,
 * `providers.semantic_memory: honcho` + `providers.honcho`). A top-level
 * `brave:` / `exa:` / `honcho:` block is the legacy spelling and is still read.
 */
export const CREDENTIAL_PROVIDER_KEYS = ["brave", "exa", "honcho"] as const;

/** Every `providers:` key that is not a user-named LLM provider. */
export const RESERVED_PROVIDER_KEYS: readonly string[] = [
  ...CAPABILITY_PROVIDER_KEYS,
  ...CREDENTIAL_PROVIDER_KEYS,
];

export const BraveConfigSchema = z
  .object({
    api_key_env: z.string().regex(ENV_NAME).optional(),
    api_key_vault: z.string().regex(VAULT_KEY).optional(),
  })
  .strict();

export type BraveConfig = z.infer<typeof BraveConfigSchema>;

export const ExaConfigSchema = BraveConfigSchema;

export type ExaConfig = z.infer<typeof ExaConfigSchema>;

export const HonchoConfigSchema = z
  .object({
    base_url: z.url().optional(),
    workspace_id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,128}$/)
      .optional(),
    project_id: z.string().trim().min(1).max(128).optional(),
    api_key_env: z.string().regex(ENV_NAME).optional(),
    api_key_vault: z.string().regex(VAULT_KEY).optional(),
    timeout_ms: z.number().int().min(100).max(30000).optional(),
    max_results: z.number().int().min(1).max(50).optional(),
    max_tokens: z.number().int().min(128).max(16000).optional(),
    recall_mode: z.enum(["hybrid", "messages"]).optional(),
  })
  .strict();

export type HonchoConfig = z.infer<typeof HonchoConfigSchema>;

export const LlmTransportSchema = z.enum([
  "chat_completions",
  "responses",
  "anthropic_messages",
  "multi",
]);

/**
 * A named LLM endpoint under `providers:` (every key that is not reserved).
 * The entry never holds a secret: `api_key_env` names the environment
 * variable. `base_url` is optional only for the built-in `free` gateway, which
 * has a default; see utils/free-provider.ts for how a child CLI is routed.
 */
export const LlmProviderSchema = z
  .object({
    base_url: z.string().min(1).optional(),
    api_key_env: z.string().regex(ENV_NAME).optional(),
    /** Wire protocol the endpoint speaks; `multi` for gateways serving all. */
    transport: LlmTransportSchema.optional(),
    /** Model every role uses when `model_preset` names this provider. */
    default_model: z.string().min(1).optional(),
  })
  .strict();

export type LlmProviderConfig = z.infer<typeof LlmProviderSchema>;

const CapabilityProvidersSchema = z
  .object({
    docs: z.literal("context7").optional(),
    web: SearchProviderIdSchema.optional(),
    code_intelligence: z.enum(["serena", "gortex"]).optional(),
    /**
     * PreToolUse guard (`code-intelligence-guard` hook) that denies native
     * Grep/Glob/recursive shell search while a code-intelligence provider is
     * configured. `off` keeps the advisory primer only.
     */
    code_intelligence_guard: z.enum(["block", "off"]).optional(),
    semantic_memory: z.enum(["agentmemory", "honcho", "none"]).optional(),
  })
  .strict();

/**
 * The whole `providers:` block: capability selectors, the credential sections
 * they point at, and any other key as an LLM provider object (Hermes-style
 * `providers.<name>`).
 */
export const ProvidersSchema = CapabilityProvidersSchema.extend({
  brave: BraveConfigSchema.optional(),
  exa: ExaConfigSchema.optional(),
  honcho: HonchoConfigSchema.optional(),
}).catchall(LlmProviderSchema);

/**
 * Spelled out rather than inferred from the catchall so a literal mixing
 * selectors, credential sections and LLM providers type-checks.
 */
export type ProvidersConfig = z.infer<typeof CapabilityProvidersSchema> & {
  brave?: BraveConfig;
  exa?: ExaConfig;
  honcho?: HonchoConfig;
} & Record<
    string,
    LlmProviderConfig | BraveConfig | HonchoConfig | string | undefined
  >;
/** The capability selectors only. */
export type CapabilityProviders = Required<
  z.infer<typeof CapabilityProvidersSchema>
>;
export type SemanticMemoryProviderName = "agentmemory" | "honcho" | "none";

/** The LLM provider objects under `providers:`, without the reserved keys. */
export function llmProviderEntries(
  providers: unknown,
): Record<string, LlmProviderConfig> {
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    return {};
  const entries: Record<string, LlmProviderConfig> = {};
  for (const [name, value] of Object.entries(
    providers as Record<string, unknown>,
  )) {
    if (RESERVED_PROVIDER_KEYS.includes(name)) continue;
    if (value && typeof value === "object" && !Array.isArray(value))
      entries[name] = value as LlmProviderConfig;
  }
  return entries;
}

/** Apply shared defaults, rejecting an invalid explicit provider selection. */
export function resolveProviders(value: unknown = {}): CapabilityProviders {
  const raw = ProvidersSchema.parse(value);
  return {
    docs: raw.docs ?? "context7",
    web: raw.web ?? "native",
    code_intelligence: raw.code_intelligence ?? "serena",
    code_intelligence_guard: raw.code_intelligence_guard ?? "block",
    semantic_memory: raw.semantic_memory ?? "agentmemory",
  };
}

/** Reject an invalid explicit choice instead of silently enabling another provider. */
export function loadProviders(cwd?: string): CapabilityProviders {
  return resolveProviders(loadOmaConfig(cwd)?.providers ?? {});
}

/**
 * A credential section: `providers.<name>` first, then the legacy top-level
 * `<name>:` block, then nothing.
 */
function credentialSection(
  config: Record<string, unknown> | null | undefined,
  name: (typeof CREDENTIAL_PROVIDER_KEYS)[number],
): unknown {
  const providers = config?.providers;
  const nested =
    providers && typeof providers === "object" && !Array.isArray(providers)
      ? (providers as Record<string, unknown>)[name]
      : undefined;
  return nested ?? config?.[name] ?? {};
}

export function loadBraveConfig(cwd?: string): BraveConfig {
  return BraveConfigSchema.parse(
    credentialSection(
      loadOmaConfig(cwd) as Record<string, unknown> | null,
      "brave",
    ),
  );
}

export function loadExaConfig(cwd?: string): ExaConfig {
  return ExaConfigSchema.parse(
    credentialSection(
      loadOmaConfig(cwd) as Record<string, unknown> | null,
      "exa",
    ),
  );
}

export function loadHonchoConfig(cwd?: string): HonchoConfig {
  return HonchoConfigSchema.parse(
    credentialSection(
      loadOmaConfig(cwd) as Record<string, unknown> | null,
      "honcho",
    ),
  );
}
