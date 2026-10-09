import type { OmaConfig } from "../../platform/agent-config.js";
import {
  ConfigLayerError,
  loadConfigLayers,
} from "../../utils/config-layers.js";
import { ConfigError } from "./config-error.js";

// ---------------------------------------------------------------------------
// Legacy preset name guard
// ---------------------------------------------------------------------------

/** Preset keys that were valid before the 010-rename-preset-keys migration. */
const LEGACY_PRESET_KEYS = new Set([
  "claude-only",
  "codex-only",
  "gemini-only",
  "qwen-only",
  "cursor-only",
]);

/**
 * Maps legacy key → canonical replacement.
 * `gemini-only` retires to `antigravity` (the standalone gemini preset was
 * removed; antigravity is Google's successor CLI).
 */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  "claude-only": "claude",
  "codex-only": "codex",
  "gemini-only": "antigravity",
  "qwen-only": "qwen",
  "cursor-only": "cursor",
};

/**
 * Throw a ConfigError with an actionable message when the user's oma-config.yaml
 * still contains a legacy preset name (claude-only, codex-only, gemini-only,
 * qwen-only, cursor-only). Run `oma update` to auto-migrate.
 *
 * `antigravity` was previously a legacy alias for `mixed`; with the agy CLI
 * launch it is now a first-class preset and is no longer rejected.
 */
function assertNotLegacyPreset(modelPreset: string, filePath: string): void {
  if (LEGACY_PRESET_KEYS.has(modelPreset)) {
    const canonical = LEGACY_TO_CANONICAL[modelPreset] ?? modelPreset;
    throw new ConfigError(
      `Legacy preset name "${modelPreset}" is no longer valid in ${filePath}.\n` +
        `  Rename it to "${canonical}" — or run \`oma update\` for automatic migration.\n` +
        `  Built-in presets: antigravity | claude | codex | cursor | grok | mixed | qwen`,
    );
  }
}

/** Load the effective project config; retain the legacy preset diagnostic. */
export function loadUserConfig(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Partial<OmaConfig> {
  try {
    const { config, sources } = loadConfigLayers(cwd, env);
    if (typeof config.model_preset === "string") {
      assertNotLegacyPreset(
        config.model_preset,
        sources.local ??
          sources.shared ??
          sources.globalLocal ??
          sources.global ??
          cwd,
      );
    }
    return config;
  } catch (error) {
    if (error instanceof ConfigLayerError && error.local) throw error;
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
