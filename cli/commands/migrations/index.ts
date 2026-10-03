/**
 * Migration runner — executes all registered migrations in order.
 * Each migration is idempotent: safe to run multiple times.
 * Returns action log strings for UI display.
 *
 * Every migration runs on every install/update — there is deliberately no
 * applied-migration ledger. Vendor-scoped migrations gate their writes on the
 * run's vendor selection (`allowsVendor`), so one that was a no-op for a vendor
 * the user had not selected must run again once that vendor is added; a ledger
 * would skip it forever. Idempotence makes the repeat runs safe.
 *
 * Each migration is isolated: one that throws is reported and the rest still
 * run, so a single bad file cannot abort an install/update half-way.
 */

import pc from "picocolors";
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
   * Whether actions from this migration require downloaded project assets to
   * be copied and vendor links to be reconciled. State-only migrations should
   * set this to false.
   */
  requiresReconcile?: boolean;
  /**
   * `ctx` carries the vendor selection in force for this run. Any migration
   * that writes into a vendor-owned path must gate that write on
   * `allowsVendor(ctx, vendor)`. Omitting `ctx` means unrestricted.
   */
  up(cwd: string, ctx?: MigrationContext): string[];
}

export interface MigrationFailure {
  name: string;
  error: string;
}

export interface MigrationRunStatus {
  actions: string[];
  requiresReconcile: boolean;
  /** Migrations that threw. The others still ran. */
  failures: MigrationFailure[];
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
import { migrateRemoveEvalArtifacts } from "./021-remove-eval-artifacts.js";
import { migrateUnifySkillConfigs } from "./022-unify-skill-configs.js";
import { migrateCapabilitySkillNames } from "./023-capability-skill-names.js";
import { migrateSerenaNoMemories } from "./024-serena-no-memories.js";
import { migrateUnifiedSerenaContext } from "./025-unify-serena-context.js";
import { migrateGlobalCodexSerenaTransport } from "./026-global-codex-serena-transport.js";
import { migrateAntigravityDesktopSerenaBridge } from "./027-antigravity-desktop-serena-bridge.js";
import { migrateProfileSessions } from "./028-profile-sessions.js";
import { migrateProjectSerenaBridge } from "./029-project-serena-bridge.js";
import { migrateLegacyGeminiMcp } from "./030-legacy-gemini-mcp.js";
import { migrateClaudeMdAgents } from "./031-claude-md-agents.js";

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
  migrateRemoveEvalArtifacts,
  migrateUnifySkillConfigs,
  migrateCapabilitySkillNames,
  migrateSerenaNoMemories,
  migrateUnifiedSerenaContext,
  migrateGlobalCodexSerenaTransport,
  migrateAntigravityDesktopSerenaBridge,
  migrateProfileSessions,
  migrateProjectSerenaBridge,
  migrateLegacyGeminiMcp,
  migrateClaudeMdAgents,
];

export function runMigrations(
  cwd: string,
  ctx: MigrationContext = UNRESTRICTED_MIGRATION_CONTEXT,
): string[] {
  return runMigrationsWithStatus(cwd, ctx).actions;
}

export function runMigrationsWithStatus(
  cwd: string,
  ctx: MigrationContext = UNRESTRICTED_MIGRATION_CONTEXT,
  registry: readonly Migration[] = migrations,
): MigrationRunStatus {
  const actions: string[] = [];
  const failures: MigrationFailure[] = [];
  let requiresReconcile = false;
  for (const migration of registry) {
    let migrationActions: string[];
    try {
      migrationActions = migration.up(cwd, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ name: migration.name, error: message });
      // Printed for every caller (install/update render only `actions`); the
      // failure is not fatal, but it must not pass silently either.
      console.warn(
        `${pc.yellow("⚠")} Migration ${migration.name} failed: ${message}. The remaining migrations still ran; re-run the command after fixing the cause.`,
      );
      // It may have written part of its change before throwing — reconcile so
      // the vendor files it touched are regenerated.
      if (migration.requiresReconcile !== false) requiresReconcile = true;
      continue;
    }
    actions.push(...migrationActions);
    if (migrationActions.length > 0 && migration.requiresReconcile !== false) {
      requiresReconcile = true;
    }
  }
  return { actions, requiresReconcile, failures };
}
