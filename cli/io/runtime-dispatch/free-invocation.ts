import {
  FREE_PROVIDER_NAME,
  type LlmProvider,
  providerApiKey,
} from "../../utils/free-provider.js";
import { assertFreeSettings } from "./free-settings.js";
import type { Invocation } from "./types.js";

export interface ProviderInvocationRequest {
  invocation: Invocation;
  vendor: string;
  provider: LlmProvider;
  env: NodeJS.ProcessEnv;
  workspace?: string;
  /**
   * True when `model_preset` selected the provider for every role. Only then
   * does the child inherit `OMA_MODEL_PRESET`, so its own nested spawns keep
   * the route; a single `agents.<id>` pin must not re-route the child's whole
   * tree.
   */
  fromPreset?: boolean;
}
/** @deprecated Use {@link ProviderInvocationRequest}. */
export type FreeInvocationRequest = ProviderInvocationRequest;

/** Environment variable name that carries a provider's key to a codex child. */
export function providerKeyEnvForCodex(provider: LlmProvider): string {
  return provider.name === FREE_PROVIDER_NAME
    ? "OMA_FREELLM_API_KEY"
    : `OMA_${provider.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
}

/** Codex `model_providers.<id>` key for a provider. */
export function codexProviderId(provider: LlmProvider): string {
  return `oma_${provider.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

/** Configure only this child; never write credentials or change the parent env. */
export function applyLlmProvider({
  invocation,
  vendor,
  provider,
  env,
  workspace,
  fromPreset = provider.name === FREE_PROVIDER_NAME,
}: ProviderInvocationRequest): void {
  const key = providerApiKey(provider, env);
  invocation.env = { ...invocation.env, ...env };
  // Preserve the route across nested OMA spawns and Git-ignored worktree config.
  if (fromPreset) invocation.env.OMA_MODEL_PRESET = provider.name;
  invocation.env.OMA_RUNTIME_VENDOR = vendor;
  if (provider.name === FREE_PROVIDER_NAME) {
    invocation.env.FREELLM_BASE_URL = provider.baseUrl;
    invocation.env.FREELLM_MODEL = provider.model;
    invocation.env.FREELLM_API_KEY = key;
  }
  if (vendor === "codex") {
    const envKey = providerKeyEnvForCodex(provider);
    const id = codexProviderId(provider);
    invocation.env[envKey] = key;
    const wireApi =
      provider.transport === "chat_completions" ? "chat" : "responses";
    const display =
      provider.name === FREE_PROVIDER_NAME ? "FreeLLMAPI" : provider.name;
    // One complete provider value prevents inherited auth/header overrides.
    invocation.args.push(
      "-c",
      `model_provider=${JSON.stringify(id)}`,
      "-c",
      `model_providers.${id}={name=${JSON.stringify(display)},base_url=${JSON.stringify(provider.baseUrl)},env_key=${JSON.stringify(envKey)},wire_api=${JSON.stringify(wireApi)},requires_openai_auth=false,supports_websockets=false}`,
    );
  } else if (vendor === "claude") {
    delete invocation.env.ANTHROPIC_API_KEY;
    delete invocation.env.CLAUDE_CODE_OAUTH_TOKEN;
    delete invocation.env.CLAUDE_CODE_USE_BEDROCK;
    delete invocation.env.CLAUDE_CODE_USE_VERTEX;
    delete invocation.env.CLAUDE_CODE_USE_FOUNDRY;
    delete invocation.env.CLAUDE_CODE_USE_MANTLE;
    invocation.env.ANTHROPIC_BASE_URL = provider.baseUrl.slice(0, -3);
    invocation.env.ANTHROPIC_AUTH_TOKEN = key;
    invocation.env.ANTHROPIC_DEFAULT_OPUS_MODEL = provider.model;
    invocation.env.ANTHROPIC_DEFAULT_SONNET_MODEL = provider.model;
    invocation.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = provider.model;
    invocation.env.CLAUDE_CODE_SUBAGENT_MODEL = provider.model;
  } else if (vendor === "qwen") {
    invocation.env.OPENAI_API_KEY = key;
    invocation.env.OPENAI_BASE_URL = provider.baseUrl;
    invocation.env.OPENAI_MODEL = provider.model;
    invocation.args.push(
      "--auth-type",
      "openai",
      "--openai-base-url",
      provider.baseUrl,
    );
  }
  assertFreeSettings({ vendor, provider, env: invocation.env, workspace });
}
/** @deprecated Use {@link applyLlmProvider}. */
export const applyFreeProvider = applyLlmProvider;
