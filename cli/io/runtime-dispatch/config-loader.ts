import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { OmaConfig } from "../../platform/agent-config.js";
import { findFileUpwards } from "../../utils/fs-utils.js";
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

/**
 * Load user config from the canonical .agents/oma-config.yaml.
 * Returns partial OmaConfig shape — only fields present in the file are set.
 * Migration 003 ensures oma-config.yaml is the only user config file.
 *
 * Throws ConfigError with file:line:col when the file exists but contains
 * invalid YAML, so the user gets an actionable error message.
 * Throws ConfigError when model_preset is a legacy key (claude-only, codex-only, etc.)
 * to prompt the user to run `oma update`.
 */
export function loadUserConfig(cwd: string): Partial<OmaConfig> {
  const canonicalPath = findFileUpwards(
    cwd,
    path.join(".agents", "oma-config.yaml"),
  );
  if (!canonicalPath) return {};
  let content: string;
  try {
    content = fs.readFileSync(canonicalPath, "utf-8");
  } catch {
    return {};
  }
  try {
    const parsed = parseYaml(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const config = parsed as Partial<OmaConfig>;
      // Hard-error on legacy preset names before returning config
      if (typeof config.model_preset === "string") {
        assertNotLegacyPreset(config.model_preset, canonicalPath);
      }
      return config;
    }
    return {};
  } catch (err) {
    // Re-throw ConfigError as-is (includes both YAML parse errors and legacy preset errors)
    if (err instanceof ConfigError) throw err;
    const pos =
      err &&
      typeof err === "object" &&
      "linePos" in err &&
      Array.isArray((err as { linePos: unknown[] }).linePos) &&
      (err as { linePos: Array<{ line: number; col: number }> }).linePos
        .length > 0
        ? (err as { linePos: Array<{ line: number; col: number }> }).linePos[0]
        : null;
    const location = pos
      ? `${canonicalPath}:${pos.line}:${pos.col}`
      : canonicalPath;
    throw new ConfigError(
      `Failed to parse YAML at ${location}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
