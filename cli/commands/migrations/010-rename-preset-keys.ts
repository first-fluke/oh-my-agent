/**
 * Migration 010: Rename legacy model_preset keys in oma-config.yaml.
 *
 * Maps:
 *   claude-only  → claude
 *   codex-only   → codex
 *   gemini-only  → antigravity
 *   qwen-only    → qwen
 *   cursor-only  → cursor
 *
 * Idempotent: skips when model_preset is already a canonical key or absent.
 * Backs up oma-config.yaml into `.agents/backup/010-rename-preset/` before writing.
 *
 * Historical note: `antigravity` previously aliased to `mixed`. As of the agy
 * CLI launch (Antigravity 2.0), `antigravity` is a first-class preset that
 * targets the agy binary directly — no rename is performed for it.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { backupPathFromRoot } from "../../io/backup.js";
import type { Migration } from "./index.js";

// ---------------------------------------------------------------------------
// Rename map
// ---------------------------------------------------------------------------

const LEGACY_TO_CANONICAL: Record<string, string> = {
  "claude-only": "claude",
  "codex-only": "codex",
  "gemini-only": "antigravity",
  "qwen-only": "qwen",
  "cursor-only": "cursor",
};

const LEGACY_KEYS = new Set(Object.keys(LEGACY_TO_CANONICAL));

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

export const migrateRenamePresetKeys: Migration = {
  name: "010-rename-preset-keys",
  up(cwd: string): string[] {
    const actions: string[] = [];
    const omaConfigPath = join(cwd, ".agents", "oma-config.yaml");

    if (!existsSync(omaConfigPath)) {
      return actions;
    }

    let content: string;
    try {
      content = readFileSync(omaConfigPath, "utf-8");
    } catch {
      return actions;
    }

    // Extract current model_preset value via regex (same pattern as getExistingPreset)
    const match = content.match(
      /^(model_preset:\s*)([A-Za-z0-9_-]+)([ \t]*(?:#[^\n]*)?)$/m,
    );
    if (!match) {
      // model_preset line not found — nothing to do
      return actions;
    }

    const currentPreset = match[2];
    if (!currentPreset) {
      return actions;
    }

    // Idempotency: skip when already a canonical key
    if (!LEGACY_KEYS.has(currentPreset)) {
      return actions;
    }

    const canonical = LEGACY_TO_CANONICAL[currentPreset];
    if (!canonical) {
      return actions;
    }

    // Back up into the canonical backup root before writing
    const backupPath = backupPathFromRoot(
      cwd,
      "010-rename-preset",
      "oma-config.yaml",
    );
    try {
      mkdirSync(dirname(backupPath), { recursive: true });
      copyFileSync(omaConfigPath, backupPath);
      actions.push(
        `Backed up .agents/oma-config.yaml → .agents/backup/010-rename-preset/oma-config.yaml`,
      );
    } catch {
      // best-effort backup; proceed with rename anyway
    }

    // In-place replacement: replace only the model_preset value, preserve comments
    const newContent = content.replace(
      /^(model_preset:\s*)([A-Za-z0-9_-]+)([ \t]*(?:#[^\n]*)?)$/m,
      (_full, prefix, _old, suffix) => `${prefix}${canonical}${suffix}`,
    );

    writeFileSync(omaConfigPath, newContent, "utf-8");
    actions.push(
      `.agents/oma-config.yaml: model_preset "${currentPreset}" → "${canonical}"`,
    );

    return actions;
  },
};
