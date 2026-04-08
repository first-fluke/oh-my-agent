/**
 * Migration 001: Migrate legacy directory and naming conventions.
 * - .agent/ → .agents/ (canonical root)
 * - Legacy skill names → oma-* prefixed names
 * - Legacy agent filenames → new names
 * - Clean up .cursor/skills symlinks
 */
import {
  existsSync,
  lstatSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

const SKILL_RENAMES: Record<string, string> = {
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

const AGENT_RENAMES: Record<string, string> = {
  "backend-impl.md": "backend-engineer.md",
  "db-impl.md": "db-engineer.md",
  "frontend-impl.md": "frontend-engineer.md",
  "mobile-impl.md": "mobile-engineer.md",
};

export const migrateToAgents: Migration = {
  name: "001-agents-dir",
  up(cwd: string): string[] {
    const actions: string[] = [];

    const oldDir = join(cwd, ".agent");
    const newDir = join(cwd, ".agents");

    // Migrate .agent/ → .agents/
    if (existsSync(oldDir) && !existsSync(newDir)) {
      renameSync(oldDir, newDir);
      actions.push(".agent/ → .agents/ (renamed)");
    } else if (existsSync(oldDir) && existsSync(newDir)) {
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
        rmSync(oldDir, { recursive: true, force: true });
        actions.push(".agent/ (removed after merge)");
      } catch {
        // Best-effort migration
      }
    }

    // Clean up legacy symlink directories
    for (const legacyDir of [".cursor/skills"]) {
      const dirPath = join(cwd, legacyDir);
      if (!existsSync(dirPath)) continue;

      try {
        const stat = lstatSync(dirPath);
        if (stat.isSymbolicLink()) {
          unlinkSync(dirPath);
          actions.push(`${legacyDir} (removed symlink)`);
        } else {
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

    // Rename legacy skill directories to oma-* prefix
    const skillsDir = join(cwd, ".agents", "skills");
    if (existsSync(skillsDir)) {
      for (const [oldName, newName] of Object.entries(SKILL_RENAMES)) {
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

    // Rename legacy agent files
    const agentsDir = join(cwd, ".claude", "agents");
    if (existsSync(agentsDir)) {
      for (const [oldName, newName] of Object.entries(AGENT_RENAMES)) {
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
  },
};
