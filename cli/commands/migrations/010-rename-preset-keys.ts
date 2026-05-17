/**
 * Migration 010: Rename legacy model_preset keys in oma-config.yaml.
 *
 * Maps:
 *   claude-only  → claude
 *   codex-only   → codex
 *   gemini-only  → gemini
 *   qwen-only    → qwen
 *   cursor-only  → cursor
 *   antigravity  → mixed
 *
 * Idempotent: skips when model_preset is already a canonical key or absent.
 * Creates a .bak backup of oma-config.yaml before writing.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

// ---------------------------------------------------------------------------
// Rename map
// ---------------------------------------------------------------------------

const LEGACY_TO_CANONICAL: Record<string, string> = {
  "claude-only": "claude",
  "codex-only": "codex",
  "gemini-only": "gemini",
  "qwen-only": "qwen",
  "cursor-only": "cursor",
  antigravity: "mixed",
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

    // Idempotency: skip when already a canonical key
    if (!LEGACY_KEYS.has(currentPreset)) {
      return actions;
    }

    const canonical = LEGACY_TO_CANONICAL[currentPreset];
    if (!canonical) {
      return actions;
    }

    // Create .bak backup before writing
    const backupPath = `${omaConfigPath}.bak`;
    try {
      copyFileSync(omaConfigPath, backupPath);
      actions.push(
        `Backed up .agents/oma-config.yaml → .agents/oma-config.yaml.bak`,
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
