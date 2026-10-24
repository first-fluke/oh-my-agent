import { detectRuntimeVendor } from "../io/runtime-dispatch/detect.js";
import type { OmaConfig } from "../platform/agent-config/types.js";
import { isRecord } from "./type-guards.js";

export type FreeVendor = "codex" | "claude" | "qwen";
export interface FreeProvider {
  baseUrl: string;
  apiKeyEnv: string;
  model: string;
}

/** These errors must never fall back to subscription/vendor defaults. */
export class FreeProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreeProviderError";
  }
}

export function resolveFreeVendor(
  config: Partial<OmaConfig>,
  override?: string,
  env: NodeJS.ProcessEnv = process.env,
): FreeVendor {
  const runtime = detectRuntimeVendor(env);
  const vendor =
    override ??
    env.OMA_RUNTIME_VENDOR ??
    (["codex", "claude", "qwen"].includes(runtime)
      ? runtime
      : (config.default_cli ?? "codex"));
  if (vendor !== "codex" && vendor !== "claude" && vendor !== "qwen") {
    throw new FreeProviderError(
      "The free preset supports codex, claude and qwen only. Select one with --vendor or default_cli.",
    );
  }
  return vendor;
}

export function resolveFreeProvider(
  config: Partial<OmaConfig>,
  env: NodeJS.ProcessEnv = process.env,
): FreeProvider {
  if (config.free !== undefined && !isRecord(config.free))
    throw new FreeProviderError("free must be a configuration object.");
  const raw = config.free ?? {};
  if (
    Object.keys(raw).some(
      (key) => !["base_url", "api_key_env", "model"].includes(key),
    )
  ) {
    throw new FreeProviderError(
      "Unknown free setting. Use base_url, api_key_env and model; keep API keys in environment variables.",
    );
  }
  for (const value of Object.values(raw)) {
    if (typeof value !== "string" || !value.trim())
      throw new FreeProviderError(
        "FreeLLMAPI settings must be non-empty strings.",
      );
  }
  const base =
    env.FREELLM_BASE_URL ?? raw.base_url ?? "http://127.0.0.1:31415/v1";
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new FreeProviderError(
      "FreeLLMAPI base_url must be an absolute HTTP(S) URL.",
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
      "FreeLLMAPI base_url must be HTTP(S), without credentials, query parameters or fragments.",
    );
  }
  const baseUrl = url.href.replace(/\/+$/, "");
  const apiKeyEnv = raw.api_key_env ?? "FREELLM_API_KEY";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(apiKeyEnv))
    throw new FreeProviderError(
      "free.api_key_env must be an environment variable name.",
    );
  const model = env.FREELLM_MODEL ?? raw.model ?? "auto";
  if (!model.trim() || /[\r\n\0]/.test(model))
    throw new FreeProviderError(
      "FreeLLMAPI model must be a non-empty model ID.",
    );
  return {
    baseUrl: baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`,
    apiKeyEnv,
    model,
  };
}

export function freeApiKey(
  provider: FreeProvider,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const key =
    env[provider.apiKeyEnv]?.trim() ||
    (provider.apiKeyEnv === "FREELLM_API_KEY"
      ? env.FREELLMAPI_API_KEY?.trim()
      : undefined);
  if (!key)
    throw new FreeProviderError(
      `FreeLLMAPI requires ${provider.apiKeyEnv}${provider.apiKeyEnv === "FREELLM_API_KEY" ? " (or FREELLMAPI_API_KEY)" : ""}. No vendor fallback was attempted.`,
    );
  if (/[\r\n\0]/.test(key))
    throw new FreeProviderError(
      "FreeLLMAPI API key contains invalid characters.",
    );
  return key;
}

/** Authenticated, inference-free readiness check. Never echo response bodies. */
export async function probeFreeProvider(
  provider: FreeProvider,
  env: NodeJS.ProcessEnv = process.env,
  signal?: AbortSignal,
): Promise<void> {
  const key = freeApiKey(provider, env);
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
      `Cannot reach FreeLLMAPI at ${provider.baseUrl}. Start the server or check free.base_url.`,
    );
  }
  await response.body?.cancel();
  if (!response.ok)
    throw new FreeProviderError(
      `FreeLLMAPI readiness check returned HTTP ${response.status}. Check the unified API key and server configuration.`,
    );
}
