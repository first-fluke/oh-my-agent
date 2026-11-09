/**
 * OpenAI/Anthropic-compatible LLM providers declared in `.agents/oma-config.yaml`.
 *
 * A provider is a named endpoint oma routes a spawned agent through instead
 * of the vendor CLI's own subscription:
 *
 *   providers:
 *     exaone:
 *       base_url: https://api.exaone.ai/v1
 *       api_key_env: EXAONE_API_KEY
 *       transport: chat_completions      # chat_completions | responses | anthropic_messages | multi
 *       default_model: k-exaone_v2.5
 *
 * Two ways to use one: `model_preset: <provider>` sends every role to
 * `default_model`, and `agents.<id>.model: <provider>/<model-id>` pins one
 * role. Either way the child CLI (codex, claude or qwen, chosen by the
 * provider's transport) receives the endpoint and the key from the named
 * environment variable; the parent environment and the vendor settings files
 * are never modified.
 *
 * `free` is the built-in provider for a local FreeLLMAPI gateway: it keeps its
 * defaults (`http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, model `auto`), the
 * `FREELLM_BASE_URL` / `FREELLM_MODEL` environment overrides, the upstream
 * `FREELLMAPI_API_KEY` alias and the legacy top-level `free:` block, which is
 * read as `providers.free`.
 */

import { detectRuntimeVendor } from "../io/runtime-dispatch/detect.js";
import type { OmaConfig } from "../platform/agent-config/types.js";
import { llmProviderEntries } from "./providers.js";
import { isRecord } from "./type-guards.js";

export type LlmTransport =
  | "chat_completions"
  | "responses"
  | "anthropic_messages"
  | "multi";

/** CLIs that can carry a provider route (chosen by the provider's transport). */
export type ProviderVendor = "codex" | "claude" | "qwen";
/** @deprecated Use {@link ProviderVendor}. */
export type FreeVendor = ProviderVendor;

export interface LlmProvider {
  /** Key under `providers:` (`free` for the built-in FreeLLMAPI gateway). */
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  /** `default_model` (or the FreeLLMAPI model); empty when the provider declares none. */
  model: string;
  transport: LlmTransport;
}
/** @deprecated Use {@link LlmProvider}. */
export type FreeProvider = LlmProvider;

export const FREE_PROVIDER_NAME = "free";
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TRANSPORTS: readonly LlmTransport[] = [
  "chat_completions",
  "responses",
  "anthropic_messages",
  "multi",
];

/** These errors must never fall back to subscription/vendor defaults. */
export class FreeProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreeProviderError";
  }
}

/** Human label used in diagnostics. */
export function providerLabel(name: string): string {
  return name === FREE_PROVIDER_NAME ? "FreeLLMAPI" : `provider "${name}"`;
}

/** The provider names a config declares, with the built-in `free` first. */
export function llmProviderNames(config: Partial<OmaConfig>): string[] {
  const names = new Set<string>([FREE_PROVIDER_NAME]);
  for (const name of Object.keys(llmProviderEntries(config.providers)))
    names.add(name);
  return [...names];
}

/** True when `name` is `free` or a provider object under `providers:`. */
export function isLlmProviderName(
  name: string | undefined,
  config: Partial<OmaConfig>,
): name is string {
  if (!name) return false;
  if (name === FREE_PROVIDER_NAME) return true;
  return Object.hasOwn(llmProviderEntries(config.providers), name);
}

/** Child CLIs a provider can be routed through, by transport. */
export function providerVendors(provider: LlmProvider): ProviderVendor[] {
  switch (provider.transport) {
    case "multi":
      return ["codex", "claude", "qwen"];
    case "chat_completions":
      return ["codex", "qwen"];
    case "responses":
      return ["codex"];
    case "anthropic_messages":
      return ["claude"];
  }
}

function parseBaseUrl(base: string, label: string): string {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new FreeProviderError(
      `${label} base_url must be an absolute HTTP(S) URL.`,
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new FreeProviderError(
      `${label} base_url must be HTTP(S), without credentials, query parameters or fragments.`,
    );
  }
  const baseUrl = url.href.replace(/\/+$/, "");
  return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
}

function assertModelId(model: string, label: string): void {
  if (!model.trim() || /[\r\n\0]/.test(model))
    throw new FreeProviderError(`${label} model must be a non-empty model ID.`);
}

function resolveFreeGateway(
  config: Partial<OmaConfig>,
  env: NodeJS.ProcessEnv,
): LlmProvider {
  // `providers.free` is the current spelling; the top-level `free:` block is
  // the legacy one. Both carry the same three keys.
  const declared = llmProviderEntries(config.providers).free;
  if (config.free !== undefined && !isRecord(config.free))
    throw new FreeProviderError("free must be a configuration object.");
  const raw: Record<string, unknown> = declared
    ? {
        base_url: declared.base_url,
        api_key_env: declared.api_key_env,
        model: declared.default_model,
      }
    : (config.free ?? {});
  if (
    !declared &&
    Object.keys(raw).some(
      (key) => !["base_url", "api_key_env", "model"].includes(key),
    )
  ) {
    throw new FreeProviderError(
      "Unknown free setting. Use base_url, api_key_env and model; keep API keys in environment variables.",
    );
  }
  for (const value of Object.values(raw)) {
    if (value === undefined) continue;
    if (typeof value !== "string" || !value.trim())
      throw new FreeProviderError(
        "FreeLLMAPI settings must be non-empty strings.",
      );
  }
  const baseUrl = parseBaseUrl(
    env.FREELLM_BASE_URL ??
      (raw.base_url as string | undefined) ??
      "http://127.0.0.1:31415/v1",
    "FreeLLMAPI",
  );
  const apiKeyEnv =
    (raw.api_key_env as string | undefined) ?? "FREELLM_API_KEY";
  if (!ENV_NAME.test(apiKeyEnv))
    throw new FreeProviderError(
      "free.api_key_env must be an environment variable name.",
    );
  const model =
    env.FREELLM_MODEL ?? (raw.model as string | undefined) ?? "auto";
  assertModelId(model, "FreeLLMAPI");
  return {
    name: FREE_PROVIDER_NAME,
    baseUrl,
    apiKeyEnv,
    model,
    transport: declared?.transport ?? "multi",
  };
}

/**
 * Resolve a named provider from the effective config. `free` keeps its
 * FreeLLMAPI defaults and environment overrides; every other name must be an
 * object under `providers:` with at least `base_url` and `api_key_env`.
 */
export function resolveLlmProvider(
  name: string,
  config: Partial<OmaConfig>,
  env: NodeJS.ProcessEnv = process.env,
): LlmProvider {
  if (name === FREE_PROVIDER_NAME) return resolveFreeGateway(config, env);
  const entry = llmProviderEntries(config.providers)[name];
  if (!entry) {
    throw new FreeProviderError(
      `Unknown provider "${name}". Declare it as an object under providers: in .agents/oma-config.yaml (base_url, api_key_env, transport, default_model).`,
    );
  }
  const label = providerLabel(name);
  if (typeof entry.base_url !== "string" || !entry.base_url.trim())
    throw new FreeProviderError(`${label} requires base_url.`);
  const baseUrl = parseBaseUrl(entry.base_url, label);
  const apiKeyEnv = entry.api_key_env;
  if (typeof apiKeyEnv !== "string" || !ENV_NAME.test(apiKeyEnv))
    throw new FreeProviderError(
      `${label} requires api_key_env, the name of the environment variable holding its key (never the key itself).`,
    );
  const transport = entry.transport ?? "chat_completions";
  if (!TRANSPORTS.includes(transport))
    throw new FreeProviderError(
      `${label} transport must be one of ${TRANSPORTS.join(", ")}.`,
    );
  const model = entry.default_model ?? "";
  if (model) assertModelId(model, label);
  return { name, baseUrl, apiKeyEnv, model, transport };
}

/** The built-in FreeLLMAPI gateway (`model_preset: free`). */
export function resolveFreeProvider(
  config: Partial<OmaConfig>,
  env: NodeJS.ProcessEnv = process.env,
): LlmProvider {
  return resolveLlmProvider(FREE_PROVIDER_NAME, config, env);
}

/**
 * The child CLI for a provider route: `--vendor`, then `OMA_RUNTIME_VENDOR`,
 * then the detected runtime when the provider's transport allows it, then
 * `default_cli`, then the first vendor the transport allows.
 */
export function resolveProviderVendor(
  provider: LlmProvider,
  config: Partial<OmaConfig>,
  override?: string,
  env: NodeJS.ProcessEnv = process.env,
): ProviderVendor {
  const allowed = providerVendors(provider);
  const runtime = detectRuntimeVendor(env);
  const vendor =
    override ??
    env.OMA_RUNTIME_VENDOR ??
    (allowed.includes(runtime as ProviderVendor)
      ? runtime
      : (config.default_cli ?? allowed[0]));
  if (!allowed.includes(vendor as ProviderVendor)) {
    const list =
      allowed.length === 1
        ? allowed[0]
        : `${allowed.slice(0, -1).join(", ")} and ${allowed[allowed.length - 1]}`;
    throw new FreeProviderError(
      provider.name === FREE_PROVIDER_NAME
        ? "The free preset supports codex, claude and qwen only. Select one with --vendor or default_cli."
        : `${providerLabel(provider.name)} speaks ${provider.transport}, which oma can route through ${list} only. Select one with --vendor or default_cli.`,
    );
  }
  return vendor as ProviderVendor;
}

/** The FreeLLMAPI transport (`model_preset: free`). */
export function resolveFreeVendor(
  config: Partial<OmaConfig>,
  override?: string,
  env: NodeJS.ProcessEnv = process.env,
): ProviderVendor {
  return resolveProviderVendor(
    resolveFreeProvider(config, env),
    config,
    override,
    env,
  );
}

/** The provider's key from the environment; never read from config files. */
export function providerApiKey(
  provider: LlmProvider,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const upstreamAlias =
    provider.name === FREE_PROVIDER_NAME &&
    provider.apiKeyEnv === "FREELLM_API_KEY";
  const key =
    env[provider.apiKeyEnv]?.trim() ||
    (upstreamAlias ? env.FREELLMAPI_API_KEY?.trim() : undefined);
  if (!key)
    throw new FreeProviderError(
      `${providerLabel(provider.name)} requires ${provider.apiKeyEnv}${upstreamAlias ? " (or FREELLMAPI_API_KEY)" : ""}. No vendor fallback was attempted.`,
    );
  if (/[\r\n\0]/.test(key))
    throw new FreeProviderError(
      `${providerLabel(provider.name)} API key contains invalid characters.`,
    );
  return key;
}
/** @deprecated Use {@link providerApiKey}. */
export const freeApiKey = providerApiKey;

/**
 * Authenticated, inference-free readiness check against `GET /models`.
 * Never echoes response bodies. Anthropic-only endpoints have no model list,
 * so they are not probed; a non-FreeLLMAPI endpoint that answers 404/405
 * simply lacks the listing and is not treated as unavailable.
 */
export async function probeLlmProvider(
  provider: LlmProvider,
  env: NodeJS.ProcessEnv = process.env,
  signal?: AbortSignal,
): Promise<void> {
  const key = providerApiKey(provider, env);
  if (provider.transport === "anthropic_messages") return;
  const label = providerLabel(provider.name);
  let response: Response;
  try {
    response = await fetch(`${provider.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
        : AbortSignal.timeout(5000),
      redirect: "error",
    });
  } catch {
    throw new FreeProviderError(
      provider.name === FREE_PROVIDER_NAME
        ? `Cannot reach FreeLLMAPI at ${provider.baseUrl}. Start the server or check free.base_url.`
        : `Cannot reach ${label} at ${provider.baseUrl}. Check providers.${provider.name}.base_url.`,
    );
  }
  await response.body?.cancel();
  if (response.ok) return;
  if (
    provider.name !== FREE_PROVIDER_NAME &&
    (response.status === 404 || response.status === 405)
  )
    return;
  throw new FreeProviderError(
    `${label} readiness check returned HTTP ${response.status}. Check the API key and server configuration.`,
  );
}
/** @deprecated Use {@link probeLlmProvider}. */
export const probeFreeProvider = probeLlmProvider;
