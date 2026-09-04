/**
 * Migration 026: reconcile OMA's legacy global Codex Serena launcher.
 *
 * Codex merges its user config (`~/.codex/config.toml`) with a project's
 * `.codex/config.toml`. A same-named project server wins, but the legacy uvx
 * launcher remains active in directories that do not have a project config.
 * Repair the exact OMA-owned `uvx --from git+…/serena` shape during a project
 * update, while preserving every unrelated user-global setting.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { serenaTransportMode } from "../../utils/config.js";
import {
  migrateLegacyCodexSerena,
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

export const migrateGlobalCodexSerenaTransport: Migration = {
  name: "026-global-codex-serena-transport",
  up(cwd: string, ctx?: MigrationContext): string[] {
    if (!allowsVendor(ctx, "codex")) return [];

    const configPath = join(homedir(), ".codex", "config.toml");
    if (!existsSync(configPath)) return [];

    let settings: unknown;
    try {
      settings = parseCodexConfig(readFileSync(configPath, "utf-8"));
    } catch {
      return [];
    }

    const migrated = migrateLegacyCodexSerena(
      settings,
      serenaTransportMode(cwd),
    );
    if (!migrated) return [];

    writeFileSync(configPath, `${serializeCodexConfig(migrated)}\n`, "utf-8");
    return ["~/.codex/config.toml (legacy Serena launcher → OMA bridge)"];
  },
};
