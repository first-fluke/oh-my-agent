import {
  existsSync,
  lstatSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

const LEGACY_DIRS = [".agent", ".cursor/skills"] as const;

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

  return actions;
}
