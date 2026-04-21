import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyRecommendedCodexSettings,
  needsCodexSettingsUpdate,
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import {
  applyRecommendedQwenSettings,
  needsQwenSettingsUpdate,
} from "../../vendors/qwen/settings.js";
import type { Migration } from "./index.js";

/**
 * Ensure Serena MCP is registered for Codex (.codex/config.toml) and
 * Qwen (.qwen/settings.json) on existing installs that predate the
 * per-vendor settings generators.
 */
export const migrateCodexQwenSerena: Migration = {
  name: "007-codex-qwen-serena",
  up(cwd: string): string[] {
    const actions: string[] = [];

    const qwenSettingsPath = join(cwd, ".qwen", "settings.json");
    if (existsSync(qwenSettingsPath)) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(readFileSync(qwenSettingsPath, "utf-8"));
      } catch {
        parsed = {};
      }
      if (needsQwenSettingsUpdate(parsed)) {
        const next = applyRecommendedQwenSettings(parsed);
        writeFileSync(qwenSettingsPath, `${JSON.stringify(next, null, 2)}\n`);
        actions.push(".qwen/settings.json (Serena MCP registered)");
      }
    }

    const codexConfigPath = join(cwd, ".codex", "config.toml");
    if (existsSync(codexConfigPath)) {
      const rawToml = readFileSync(codexConfigPath, "utf-8");
      const parsed = parseCodexConfig(rawToml);
      if (needsCodexSettingsUpdate(parsed)) {
        const next = applyRecommendedCodexSettings(parsed);
        writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
        actions.push(".codex/config.toml (Serena MCP registered)");
      }
    }

    return actions;
  },
};
