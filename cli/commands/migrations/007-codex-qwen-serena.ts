import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyCodexSettings,
  needsCodexSettingsUpdate,
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import {
  applyQwenSettings,
  needsQwenSettingsUpdate,
} from "../../vendors/qwen/settings.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

/**
 * Ensure Serena MCP is registered for Codex (.codex/config.toml) and
 * Qwen (.qwen/settings.json) on existing installs that predate the
 * per-vendor settings generators.
 *
 * Both files can exist because the user installed that CLI independently of
 * oma, so file existence alone is not consent to write — the vendor must also
 * be in the run's selection set.
 */
export const migrateCodexQwenSerena: Migration = {
  name: "007-codex-qwen-serena",
  up(cwd: string, ctx?: MigrationContext): string[] {
    const actions: string[] = [];

    const qwenSettingsPath = join(cwd, ".qwen", "settings.json");
    if (allowsVendor(ctx, "qwen") && existsSync(qwenSettingsPath)) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(readFileSync(qwenSettingsPath, "utf-8"));
      } catch {
        parsed = {};
      }
      if (needsQwenSettingsUpdate(parsed)) {
        const next = applyQwenSettings(parsed);
        writeFileSync(qwenSettingsPath, `${JSON.stringify(next, null, 2)}\n`);
        actions.push(".qwen/settings.json (Serena MCP registered)");
      }
    }

    const codexConfigPath = join(cwd, ".codex", "config.toml");
    if (allowsVendor(ctx, "codex") && existsSync(codexConfigPath)) {
      const rawToml = readFileSync(codexConfigPath, "utf-8");
      const parsed = parseCodexConfig(rawToml);
      if (needsCodexSettingsUpdate(parsed)) {
        const next = applyCodexSettings(parsed);
        writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
        actions.push(".codex/config.toml (Serena MCP registered)");
      }
    }

    return actions;
  },
};
