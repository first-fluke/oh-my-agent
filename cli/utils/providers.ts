import { z } from "zod";
import { loadOmaConfig } from "./config.js";

export const SearchProviderIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{0,63}$/);

/** The fixed capability selectors under `providers:` (string values). */
export const CAPABILITY_PROVIDER_KEYS = [
  "docs",
  "web",
  "code_intelligence",
  "code_intelligence_guard",
  "semantic_memory",
] as const;

export const LlmTransportSchema = z.enum([
  "chat_completions",
  "responses",
  "anthropic_messages",
  "multi",
]);

/**
 * A named LLM endpoint under `providers:` (every key that is not a capability
 * selector). The key never holds a secret: `api_key_env` names the
 * environment variable. See utils/free-provider.ts for how a child CLI is
 * routed through it.
 */
export const LlmProviderSchema = z
  .object({
    base_url: z.string().min(1),
    api_key_env: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .optional(),
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

// Any other key is an LLM provider object (Hermes-style `providers.<name>`).
export const ProvidersSchema =
  CapabilityProvidersSchema.catchall(LlmProviderSchema);

/** The LLM provider objects under `providers:`, without the capability keys. */
export function llmProviderEntries(
  providers: unknown,
): Record<string, LlmProviderConfig> {
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    return {};
  const entries: Record<string, LlmProviderConfig> = {};
  for (const [name, value] of Object.entries(
    providers as Record<string, unknown>,
  )) {
    if ((CAPABILITY_PROVIDER_KEYS as readonly string[]).includes(name))
      continue;
    if (value && typeof value === "object" && !Array.isArray(value))
      entries[name] = value as LlmProviderConfig;
  }
  return entries;
}

export const BraveConfigSchema = z
  .object({
    api_key_env: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .optional(),
    api_key_vault: z
      .string()
      .regex(/^[A-Za-z0-9._-]{1,64}$/)
      .optional(),
  })
  .strict();

export function loadBraveConfig(
  cwd?: string,
): z.infer<typeof BraveConfigSchema> {
  return BraveConfigSchema.parse(loadOmaConfig(cwd)?.brave ?? {});
}

export type BraveConfig = z.infer<typeof BraveConfigSchema>;

export const ExaConfigSchema = BraveConfigSchema;

export type ExaConfig = z.infer<typeof ExaConfigSchema>;

export function loadExaConfig(cwd?: string): ExaConfig {
  return ExaConfigSchema.parse(loadOmaConfig(cwd)?.exa ?? {});
}

export const HonchoConfigSchema = z
  .object({
    base_url: z.url().optional(),
    workspace_id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,128}$/)
      .optional(),
    project_id: z.string().trim().min(1).max(128).optional(),
    api_key_env: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .optional(),
    api_key_vault: z
      .string()
      .regex(/^[A-Za-z0-9._-]{1,64}$/)
      .optional(),
    timeout_ms: z.number().int().min(100).max(30000).optional(),
    max_results: z.number().int().min(1).max(50).optional(),
    max_tokens: z.number().int().min(128).max(16000).optional(),
    recall_mode: z.enum(["hybrid", "messages"]).optional(),
  })
  .strict();

/**
 * The `providers:` block: capability selectors (strings) plus any number of
 * named LLM provider objects. Spelled out rather than inferred from the
 * catchall so a literal mixing both kinds type-checks.
 */
export type ProvidersConfig = z.infer<typeof CapabilityProvidersSchema> &
  Record<string, LlmProviderConfig | string | undefined>;
/** The capability selectors only (no LLM provider objects). */
export type CapabilityProviders = Required<
  z.infer<typeof CapabilityProvidersSchema>
>;
export type HonchoConfig = z.infer<typeof HonchoConfigSchema>;
export type SemanticMemoryProviderName = "agentmemory" | "honcho" | "none";

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

export function loadHonchoConfig(cwd?: string): HonchoConfig {
  return HonchoConfigSchema.parse(loadOmaConfig(cwd)?.honcho ?? {});
}
