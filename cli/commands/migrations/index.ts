/**
 * Migration runner — executes all registered migrations in order.
 * Each migration is idempotent: safe to run multiple times.
 * Returns action log strings for UI display.
 */

import {
  type MigrationContext,
  UNRESTRICTED_MIGRATION_CONTEXT,
} from "./vendor-scope.js";

export {
  allowsVendor,
  type MigrationContext,
  UNRESTRICTED_MIGRATION_CONTEXT,
} from "./vendor-scope.js";

export interface Migration {
  name: string;
  /**
   * `ctx` carries the vendor selection in force for this run. Any migration
   * that writes into a vendor-owned path must gate that write on
   * `allowsVendor(ctx, vendor)`. Omitting `ctx` means unrestricted.
   */
  up(cwd: string, ctx?: MigrationContext): string[];
}

import { migrateToAgents } from "./001-agents-dir.js";
import { migrateSharedLayout } from "./002-shared-layout.js";
import { migrateOmaConfig } from "./003-oma-config.js";
import { migrateClaudeMdLocal } from "./004-claude-md-local.js";
import { migrateRenameOmaScm } from "./005-rename-oma-scm.js";
// 006-gemini-cli-compat removed with the Gemini CLI vendor (no-op for new installs).
import { migrateCodexQwenSerena } from "./007-codex-qwen-serena.js";
import { migrateModelPreset } from "./008-model-preset.js";
import { migrateSerenaUvTool } from "./009-serena-uv-tool.js";
import { migrateRenamePresetKeys } from "./010-rename-preset-keys.js";
import { migrateUnifyWorkflowSkills } from "./011-unify-workflow-skills.js";
import { migrateVersionInstallMode } from "./012-version-install-mode.js";
import { migrateWorkflowDirectSymlinks } from "./013-workflow-direct-symlinks.js";
import { migrateRenameAgentExplore } from "./014-rename-agent-explore.js";
import { migrateSerenaProjectFromCwd } from "./015-serena-project-from-cwd.js";
import { migrateRemoveEvaluatorTuning } from "./016-remove-evaluator-tuning.js";
import { migrateStateMemories } from "./017-state-memories.js";
import { migrateUnifyScmConfig } from "./018-unify-scm-config.js";
import { migrateMcpProcessCost } from "./019-mcp-process-cost.js";
import { migrateSerenaHomeProject } from "./020-serena-home-project.js";

const migrations: Migration[] = [
  migrateToAgents,
  migrateSharedLayout,
  migrateOmaConfig,
  migrateClaudeMdLocal,
  migrateRenameOmaScm,
  migrateCodexQwenSerena,
  migrateModelPreset,
  migrateSerenaUvTool,
  migrateRenamePresetKeys,
  migrateUnifyWorkflowSkills,
  migrateVersionInstallMode,
  migrateWorkflowDirectSymlinks,
  migrateRenameAgentExplore,
  migrateSerenaProjectFromCwd,
  migrateRemoveEvaluatorTuning,
  migrateStateMemories,
  migrateUnifyScmConfig,
  migrateMcpProcessCost,
  migrateSerenaHomeProject,
];

export function runMigrations(
  cwd: string,
  ctx: MigrationContext = UNRESTRICTED_MIGRATION_CONTEXT,
): string[] {
  const actions: string[] = [];
  for (const migration of migrations) {
    actions.push(...migration.up(cwd, ctx));
  }
  return actions;
}
