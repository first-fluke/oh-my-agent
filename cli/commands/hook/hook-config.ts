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
   * Config read from `<projectRoot>/.agents/`. Undefined when the project has
   * no config there (a parent or global install's config never applies to a
   * project's handlers) or when loading failed; handlers then fall back to
   * their own readers.
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
    layers = loadConfigLayers(projectRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `[oma hook] warn: config unavailable (${message}) — hooks use built-in defaults\n`,
    );
    const local = error instanceof ConfigLayerError && error.local;
    return { memory: local ? "none" : "agentmemory" };
  }

  const providers = ProvidersSchema.safeParse(layers.config.providers ?? {});
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
  return ownsConfig
    ? { config: layers.config as HookConfig, memory }
    : { memory };
}
