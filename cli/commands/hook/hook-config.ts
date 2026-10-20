// Project config for one `oma hook run` dispatch, loaded once through the CLI
// loader so handlers see CUE and local overlays instead of re-reading
// oma-config.yaml with their standalone regex readers.

import { dirname, join, resolve } from "node:path";
import {
  ConfigLayerError,
  loadConfigLayers,
} from "../../utils/config-layers.js";
import {
  ProvidersSchema,
  type SemanticMemoryProviderName,
} from "../../utils/providers.js";
import type { HookConfig } from "./types.js";

export interface ResolvedHookConfig {
  /**
   * Full effective config only when `<projectRoot>/.agents/` owns a layer.
   * Otherwise only provider and diagnostic feedback preferences are projected,
   * without granting global workflow settings project hook ownership.
   * Undefined when no such preferences exist or loading failed.
   */
  config?: HookConfig;
  /** Semantic memory provider selected by the same load. */
  memory: SemanticMemoryProviderName;
}

/**
 * Fail-open: a broken config never disables the hook chain. A broken local
 * layer (the one that may pick a provider) selects no memory provider rather
 * than silently enabling AgentMemory; other errors keep the default, as
 * `loadOmaConfig` does.
 */
export function resolveHookConfig(projectRoot: string): ResolvedHookConfig {
  let layers: ReturnType<typeof loadConfigLayers>;
  try {
    layers = loadConfigLayers(projectRoot, process.env, {
      searchParents: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `[oma hook] warn: config unavailable (${message}) — hooks use built-in defaults\n`,
    );
    const local = error instanceof ConfigLayerError && error.local;
    return { memory: local ? "none" : "agentmemory" };
  }

  const providers = ProvidersSchema.safeParse(
    layers.config.providers === undefined ? {} : layers.config.providers,
  );
  if (!providers.success) {
    process.stderr.write(
      "[oma hook] warn: invalid providers config — semantic memory disabled for this hook run\n",
    );
  }
  const memory = providers.success
    ? (providers.data.semantic_memory ?? "agentmemory")
    : "none";

  const source = layers.sources.shared ?? layers.sources.local;
  const ownsConfig =
    source !== undefined &&
    resolve(dirname(source)) === resolve(join(projectRoot, ".agents"));
  if (ownsConfig) return { config: layers.config as HookConfig, memory };
  const config: HookConfig = {};
  if (layers.config.providers !== undefined) {
    // Retain invalid explicit choices so consumers can disable their feature,
    // rather than mistake a rejected selection for an omitted default.
    config.providers = providers.success
      ? providers.data
      : layers.config.providers;
  }
  if (layers.config.diagnostic_feedback !== undefined)
    config.diagnostic_feedback = layers.config.diagnostic_feedback;
  return Object.keys(config).length ? { config, memory } : { memory };
}
