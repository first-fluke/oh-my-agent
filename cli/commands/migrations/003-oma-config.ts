/**
 * Migration 003: Move .agents/config/user-preferences.yaml → .agents/oma-config.yaml
 * Removes the empty config/ directory if no other files remain.
 */
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

export const migrateOmaConfig: Migration = {
  name: "003-oma-config",
  up(cwd: string): string[] {
    const actions: string[] = [];
    const legacyPath = join(
      cwd,
      ".agents",
      "config",
      "user-preferences.yaml",
    );
    const newPath = join(cwd, ".agents", "oma-config.yaml");

    if (!existsSync(newPath) && existsSync(legacyPath)) {
      cpSync(legacyPath, newPath);
      rmSync(legacyPath);
      actions.push(
        ".agents/config/user-preferences.yaml → .agents/oma-config.yaml",
      );

      const legacyDir = join(cwd, ".agents", "config");
      if (existsSync(legacyDir) && readdirSync(legacyDir).length === 0) {
        rmSync(legacyDir, { recursive: true });
        actions.push(".agents/config/ (removed empty dir)");
      }
    }
    return actions;
  },
};
