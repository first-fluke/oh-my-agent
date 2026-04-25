/**
 * Migration runner — executes all registered migrations in order.
 * Each migration is idempotent: safe to run multiple times.
 * Returns action log strings for UI display.
 */

export interface Migration {
  name: string;
  up(cwd: string): string[];
}

import { migrateToAgents } from "./001-agents-dir.js";
import { migrateSharedLayout } from "./002-shared-layout.js";
import { migrateOmaConfig } from "./003-oma-config.js";
import { migrateClaudeMdLocal } from "./004-claude-md-local.js";
import { migrateRenameOmaScm } from "./005-rename-oma-scm.js";
import { migrateGeminiCliCompat } from "./006-gemini-cli-compat.js";
import { migrateCodexQwenSerena } from "./007-codex-qwen-serena.js";
import { migrateModelPreset } from "./008-model-preset.js";

const migrations: Migration[] = [
  migrateToAgents,
  migrateSharedLayout,
  migrateOmaConfig,
  migrateClaudeMdLocal,
  migrateRenameOmaScm,
  migrateGeminiCliCompat,
  migrateCodexQwenSerena,
  migrateModelPreset,
];

export function runMigrations(cwd: string): string[] {
  const actions: string[] = [];
  for (const migration of migrations) {
    actions.push(...migration.up(cwd));
  }
  return actions;
}
