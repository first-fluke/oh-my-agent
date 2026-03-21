import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const _LEGACY_DIRS = [".agent", ".cursor/skills"] as const;

/**
 * Migrate from legacy .agent/ to .agents/ canonical root.
 * Also cleans up legacy symlink directories (.cursor/skills).
 *
 * Safe to call multiple times — skips if already migrated.
 * Returns a list of actions taken for logging.
 */
export function migrateToAgents(targetDir: string): string[] {
  const actions: string[] = [];

  const oldDir = join(targetDir, ".agent");
  const newDir = join(targetDir, ".agents");

  // Migrate .agent/ → .agents/
  if (existsSync(oldDir) && !existsSync(newDir)) {
    renameSync(oldDir, newDir);
    actions.push(".agent/ → .agents/ (renamed)");
  } else if (existsSync(oldDir) && existsSync(newDir)) {
    // Both exist — merge: move missing items from old to new, then remove old
    try {
      const oldItems = readdirSync(oldDir);
      for (const item of oldItems) {
        const src = join(oldDir, item);
        const dest = join(newDir, item);
        if (!existsSync(dest)) {
          renameSync(src, dest);
          actions.push(`.agent/${item} → .agents/${item} (merged)`);
        }
      }
      // Remove old dir if empty
      const remaining = readdirSync(oldDir);
      if (remaining.length === 0) {
        rmSync(oldDir, { recursive: true });
        actions.push(".agent/ (removed empty dir)");
      }
    } catch {
      // Best-effort migration
    }
  }

  // Clean up legacy symlink directories
  for (const legacyDir of [".cursor/skills"]) {
    const dirPath = join(targetDir, legacyDir);
    if (!existsSync(dirPath)) continue;

    try {
      const stat = lstatSync(dirPath);
      if (stat.isSymbolicLink()) {
        unlinkSync(dirPath);
        actions.push(`${legacyDir} (removed symlink)`);
      } else {
        // Real directory with symlinked contents — remove individual symlinks
        const items = readdirSync(dirPath);
        let removedCount = 0;
        for (const item of items) {
          const itemPath = join(dirPath, item);
          const itemStat = lstatSync(itemPath);
          if (itemStat.isSymbolicLink()) {
            unlinkSync(itemPath);
            removedCount++;
          }
        }
        // Remove parent if now empty
        const remainingItems = readdirSync(dirPath);
        if (remainingItems.length === 0) {
          rmSync(dirPath, { recursive: true });
          actions.push(
            `${legacyDir} (removed ${removedCount} symlinks, cleaned dir)`,
          );
        } else if (removedCount > 0) {
          actions.push(`${legacyDir} (removed ${removedCount} symlinks)`);
        }
      }
    } catch {
      // Best-effort cleanup
    }
  }

  // Migrate legacy skill/agent names to oma-* prefixed names (v2.12+)
  const skillRenames: Record<string, string> = {
    "backend-agent": "oma-backend",
    "db-agent": "oma-db",
    "debug-agent": "oma-debug",
    "frontend-agent": "oma-frontend",
    "mobile-agent": "oma-mobile",
    "pm-agent": "oma-pm",
    "qa-agent": "oma-qa",
    "tf-infra-agent": "oma-tf-infra",
    brainstorm: "oma-brainstorm",
    commit: "oma-commit",
    orchestrator: "oma-orchestrator",
    "dev-workflow": "oma-dev-workflow",
    translator: "oma-translator",
    "workflow-guide": "oma-coordination",
  };

  const skillsDir = join(targetDir, ".agents", "skills");
  if (existsSync(skillsDir)) {
    for (const [oldName, newName] of Object.entries(skillRenames)) {
      const oldPath = join(skillsDir, oldName);
      const newPath = join(skillsDir, newName);
      if (existsSync(oldPath) && !existsSync(newPath)) {
        renameSync(oldPath, newPath);
        actions.push(`skills/${oldName} → skills/${newName}`);
      } else if (existsSync(oldPath) && existsSync(newPath)) {
        rmSync(oldPath, { recursive: true });
        actions.push(`skills/${oldName} (removed, replaced by ${newName})`);
      }
    }
  }

  const agentRenames: Record<string, string> = {
    "backend-impl.md": "backend-engineer.md",
    "db-impl.md": "db-engineer.md",
    "frontend-impl.md": "frontend-engineer.md",
    "mobile-impl.md": "mobile-engineer.md",
  };

  const agentsDir = join(targetDir, ".claude", "agents");
  if (existsSync(agentsDir)) {
    for (const [oldName, newName] of Object.entries(agentRenames)) {
      const oldPath = join(agentsDir, oldName);
      const newPath = join(agentsDir, newName);
      if (existsSync(oldPath) && !existsSync(newPath)) {
        renameSync(oldPath, newPath);
        actions.push(`agents/${oldName} → agents/${newName}`);
      } else if (existsSync(oldPath) && existsSync(newPath)) {
        rmSync(oldPath);
        actions.push(`agents/${oldName} (removed, replaced by ${newName})`);
      }
    }
  }

  return actions;
}

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

function toBackupPath(targetDir: string, legacyPath: string): string {
  const normalized = legacyPath.replace(/^\.agents\//, "");
  return join(
    targetDir,
    ".agents",
    ".migration-backup",
    "shared-layout-v2",
    normalized,
  );
}

function toBackupLabel(legacyPath: string): string {
  return join(
    ".agents",
    ".migration-backup",
    "shared-layout-v2",
    legacyPath.replace(/^\.agents\//, ""),
  );
}

/**
 * Migrate pre-v2.12 shared-resource layout to the nested core/conditional/runtime layout.
 *
 * Safe to call multiple times. If both legacy and target files exist:
 * - identical content -> remove legacy path
 * - different content -> back up the legacy file, then remove it
 */
export function migrateSharedLayout(targetDir: string): string[] {
  const actions: string[] = [];

  for (const migration of SHARED_LAYOUT_MIGRATIONS) {
    const oldPath = join(targetDir, migration.from);
    const newPath = join(targetDir, migration.to);

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
      const backupPath = toBackupPath(targetDir, migration.from);
      const backupLabel = toBackupLabel(migration.from);
      mkdirSync(dirname(backupPath), { recursive: true });
      writeFileSync(backupPath, oldContent, "utf-8");
      actions.push(`${migration.from} → ${backupLabel} (backup)`);
    }

    rmSync(oldPath, { force: true });
    actions.push(`${migration.from} (removed legacy path)`);
  }

  for (const legacyDir of LEGACY_SHARED_DIRS) {
    const dirPath = join(targetDir, legacyDir);
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
}
