/**
 * Migration 002: Migrate pre-v2.12 shared-resource flat layout
 * to nested core/conditional/runtime structure.
 *
 * Safe to call multiple times. If both legacy and target files exist:
 * - identical content → remove legacy path
 * - different content → back up the legacy file, then remove it
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { Migration } from "./index.js";

const SHARED_LAYOUT_MIGRATIONS = [
  {
    from: ".agents/skills/_shared/api-contracts/README.md",
    to: ".agents/skills/_shared/core/api-contracts/README.md",
  },
  {
    from: ".agents/skills/_shared/api-contracts/template.md",
    to: ".agents/skills/_shared/core/api-contracts/template.md",
  },
  {
    from: ".agents/skills/_shared/clarification-protocol.md",
    to: ".agents/skills/_shared/core/clarification-protocol.md",
  },
  {
    from: ".agents/skills/_shared/common-checklist.md",
    to: ".agents/skills/_shared/core/common-checklist.md",
  },
  {
    from: ".agents/skills/_shared/context-budget.md",
    to: ".agents/skills/_shared/core/context-budget.md",
  },
  {
    from: ".agents/skills/_shared/context-loading.md",
    to: ".agents/skills/_shared/core/context-loading.md",
  },
  {
    from: ".agents/skills/_shared/difficulty-guide.md",
    to: ".agents/skills/_shared/core/difficulty-guide.md",
  },
  {
    from: ".agents/skills/_shared/lessons-learned.md",
    to: ".agents/skills/_shared/core/lessons-learned.md",
  },
  {
    from: ".agents/skills/_shared/prompt-structure.md",
    to: ".agents/skills/_shared/core/prompt-structure.md",
  },
  {
    from: ".agents/skills/_shared/quality-principles.md",
    to: ".agents/skills/_shared/core/quality-principles.md",
  },
  {
    from: ".agents/skills/_shared/reasoning-templates.md",
    to: ".agents/skills/_shared/core/reasoning-templates.md",
  },
  {
    from: ".agents/skills/_shared/session-metrics.md",
    to: ".agents/skills/_shared/core/session-metrics.md",
  },
  {
    from: ".agents/skills/_shared/skill-routing.md",
    to: ".agents/skills/_shared/core/skill-routing.md",
  },
  {
    from: ".agents/skills/_shared/experiment-ledger.md",
    to: ".agents/skills/_shared/conditional/experiment-ledger.md",
  },
  {
    from: ".agents/skills/_shared/exploration-loop.md",
    to: ".agents/skills/_shared/conditional/exploration-loop.md",
  },
  {
    from: ".agents/skills/_shared/quality-score.md",
    to: ".agents/skills/_shared/conditional/quality-score.md",
  },
  {
    from: ".agents/skills/_shared/memory-protocol.md",
    to: ".agents/skills/_shared/runtime/memory-protocol.md",
  },
  {
    from: ".agents/skills/_shared/execution-protocols/claude.md",
    to: ".agents/skills/_shared/runtime/execution-protocols/claude.md",
  },
  {
    from: ".agents/skills/_shared/execution-protocols/codex.md",
    to: ".agents/skills/_shared/runtime/execution-protocols/codex.md",
  },
  {
    from: ".agents/skills/_shared/execution-protocols/gemini.md",
    to: ".agents/skills/_shared/runtime/execution-protocols/gemini.md",
  },
  {
    from: ".agents/skills/_shared/execution-protocols/qwen.md",
    to: ".agents/skills/_shared/runtime/execution-protocols/qwen.md",
  },
  {
    from: ".agents/skills/_shared/multi-review-protocol.md",
    to: ".agents/workflows/ultrawork/resources/multi-review-protocol.md",
  },
  {
    from: ".agents/skills/_shared/phase-gates.md",
    to: ".agents/workflows/ultrawork/resources/phase-gates.md",
  },
] as const;

const LEGACY_SHARED_DIRS = [
  ".agents/skills/_shared/api-contracts",
  ".agents/skills/_shared/execution-protocols",
] as const;

function toBackupPath(cwd: string, legacyPath: string): string {
  const normalized = legacyPath.replace(/^\.agents\//, "");
  return join(
    cwd,
    ".agents",
    ".migration-backup",
    "shared-layout-v2",
    normalized,
  );
}

function toBackupLabel(legacyPath: string): string {
  // Always emit POSIX-style separators: this string is a user-facing action
  // log entry, not a filesystem path, and must not vary by OS.
  const tail = legacyPath.replace(/^\.agents\//, "");
  return `.agents/.migration-backup/shared-layout-v2/${tail}`;
}

export const migrateSharedLayout: Migration = {
  name: "002-shared-layout",
  up(cwd: string): string[] {
    const actions: string[] = [];

    for (const migration of SHARED_LAYOUT_MIGRATIONS) {
      const oldPath = join(cwd, migration.from);
      const newPath = join(cwd, migration.to);

      if (!existsSync(oldPath)) continue;

      if (!existsSync(newPath)) {
        mkdirSync(dirname(newPath), { recursive: true });
        renameSync(oldPath, newPath);
        actions.push(`${migration.from} → ${migration.to}`);
        continue;
      }

      const oldContent = readFileSync(oldPath, "utf-8");
      const newContent = readFileSync(newPath, "utf-8");

      if (oldContent !== newContent) {
        const backupPath = toBackupPath(cwd, migration.from);
        const backupLabel = toBackupLabel(migration.from);
        mkdirSync(dirname(backupPath), { recursive: true });
        writeFileSync(backupPath, oldContent, "utf-8");
        actions.push(`${migration.from} → ${backupLabel} (backup)`);
      }

      rmSync(oldPath, { force: true });
      actions.push(`${migration.from} (removed legacy path)`);
    }

    for (const legacyDir of LEGACY_SHARED_DIRS) {
      const dirPath = join(cwd, legacyDir);
      if (!existsSync(dirPath)) continue;

      try {
        if (readdirSync(dirPath).length === 0) {
          rmSync(dirPath, { recursive: true, force: true });
          actions.push(`${legacyDir} (removed empty dir)`);
        }
      } catch {
        // Best-effort cleanup
      }
    }

    return actions;
  },
};
