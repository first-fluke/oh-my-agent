import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  readJsonMergeBaseOrWarn,
  readTomlMergeBaseOrWarn,
} from "../../utils/merge-read.js";
import { loadProviders } from "../../utils/providers.js";
import { isRecord } from "../../utils/type-guards.js";
import {
  applyCodexSettings,
  type CodexSettings,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import { applyQwenSettings } from "../../vendors/qwen/settings.js";
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

    if (loadProviders(cwd).code_intelligence !== "serena") return actions;

    const qwenSettingsPath = join(cwd, ".qwen", "settings.json");
    // A file that does not parse is left untouched (warned, never rewritten
    // from `{}`); `oma link` reports it again until the user fixes it.
    const qwenBase =
      allowsVendor(ctx, "qwen") && existsSync(qwenSettingsPath)
        ? readJsonMergeBaseOrWarn(qwenSettingsPath)
        : null;
    if (qwenBase) {
      const base = qwenBase;
      const servers = isRecord(base.mcpServers) ? base.mcpServers : {};
      // Migrate only Serena. Full settings generators also seed Chrome and
      // privacy defaults, which conflict with the user's reconciled choices.
      const serena = applyQwenSettings({
        mcpServers: { serena: servers.serena ?? {} },
      }).mcpServers?.serena;
      if (serena && !isDeepStrictEqual(servers.serena, serena)) {
        const next = { ...base, mcpServers: { ...servers, serena } };
        writeFileSync(qwenSettingsPath, `${JSON.stringify(next, null, 2)}\n`);
        actions.push(".qwen/settings.json (Serena MCP registered)");
      }
    }

    const codexConfigPath = join(cwd, ".codex", "config.toml");
    const codexBase =
      allowsVendor(ctx, "codex") && existsSync(codexConfigPath)
        ? readTomlMergeBaseOrWarn(codexConfigPath)
        : null;
    if (codexBase) {
      const parsed = codexBase as CodexSettings;
      const servers = isRecord(parsed.mcp_servers) ? parsed.mcp_servers : {};
      const serena = applyCodexSettings({
        mcp_servers: { serena: servers.serena },
      }).mcp_servers?.serena;
      if (serena && !isDeepStrictEqual(servers.serena, serena)) {
        const next = { ...parsed, mcp_servers: { ...servers, serena } };
        writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
        actions.push(".codex/config.toml (Serena MCP registered)");
      }
    }

    return actions;
  },
};
