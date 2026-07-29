/**
 * Migration 011: Unify vendor workflow-skill directories into SSOT symlinks.
 *
 * Phase 2 introduced a canonical SSOT for workflow skills:
 *   <cwd>/.agents/skills/<workflow>/SKILL.md
 *
 * Per-vendor exposure happens via symlinks, e.g.:
 *   <cwd>/.claude/skills/<workflow>  →  ../../.agents/skills/<workflow>
 *   <cwd>/.codex/skills/<workflow>   →  ../../.agents/skills/<workflow>
 *   <cwd>/.qwen/skills/<workflow>    →  ../../.agents/skills/<workflow>
 *
 * This migration converts legacy real directories that were previously written
 * by earlier install code into proper symlinks. It preserves user-authored
 * skill directories (those without the oma:generated marker).
 *
 * Safety rules:
 * - Real directory WITH marker  → back up, remove, replace with symlink
 * - Real directory WITHOUT marker → user-authored, leave untouched
 * - Already a symlink → idempotent no-op (warn if target differs from SSOT)
 * - SSOT target does not exist → warn and skip (no dangling symlinks)
 *
 * Backup path: <cwd>/.agents/backup/011-unify-skills/.<vendor>/skills/<entry>/
 *
 * Idempotent: re-running after migration produces 0 actions.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { backupPathFromRoot } from "../../io/backup.js";
import { createLink } from "../../platform/fs-link.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OMA_GENERATED_MARKER = "<!-- oma:generated -->";

const VENDORS = ["claude", "codex", "qwen"] as const;
type MigratedVendor = (typeof VENDORS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read SKILL.md inside a directory and return true if it contains the
 * oma:generated marker, false otherwise (including when file is missing or
 * unreadable).
 */
function isOmaGeneratedSkill(skillDir: string): boolean {
  const skillFile = join(skillDir, "SKILL.md");
  if (!existsSync(skillFile)) return false;
  try {
    const content = readFileSync(skillFile, "utf-8");
    return content.includes(OMA_GENERATED_MARKER);
  } catch {
    return false;
  }
}

/**
 * Back up `src` directory into the migration backup root, mirroring the
 * relative structure from `cwd`.
 */
function backupDirectory(
  src: string,
  cwd: string,
  vendor: MigratedVendor,
  entryName: string,
): void {
  const dest = backupPathFromRoot(
    cwd,
    "011-unify-skills",
    `.${vendor}`,
    "skills",
    entryName,
  );
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

export const migrateUnifyWorkflowSkills: Migration = {
  name: "011-unify-workflow-skills",
  up(cwd: string, ctx?: MigrationContext): string[] {
    const actions: string[] = [];
    const ssotSkillsDir = join(cwd, ".agents", "skills");

    for (const vendor of VENDORS) {
      // Deselected vendors keep their legacy directories as-is; converting them
      // would write into a vendor tree this run was told to leave alone.
      if (!allowsVendor(ctx, vendor)) continue;

      const vendorSkillsDir = join(cwd, `.${vendor}`, "skills");

      if (!existsSync(vendorSkillsDir)) {
        // Vendor skills directory does not exist — nothing to migrate for this
        // vendor. Creating Qwen/Claude symlinks on fresh installs is handled
        // by the install/update flow, not by this migration.
        continue;
      }

      let entries: string[];
      try {
        entries = readdirSync(vendorSkillsDir);
      } catch {
        continue;
      }

      for (const entryName of entries) {
        const entryPath = join(vendorSkillsDir, entryName);

        let stat: ReturnType<typeof lstatSync>;
        try {
          stat = lstatSync(entryPath);
        } catch {
          continue;
        }

        // ---------------------------------------------------------------
        // Case 1: Already a symlink — idempotent no-op
        // ---------------------------------------------------------------
        if (stat.isSymbolicLink()) {
          try {
            const linkTarget = readlinkSync(entryPath);
            const resolvedTarget = resolve(dirname(entryPath), linkTarget);
            const expectedTarget = resolve(join(ssotSkillsDir, entryName));
            if (resolvedTarget !== expectedTarget) {
              actions.push(
                `.${vendor}/skills/${entryName}: symlink points to unexpected target (skipped) — expected ${join(".agents", "skills", entryName)}, got ${linkTarget}`,
              );
            }
            // Already linked correctly (or noted above) — no change needed.
          } catch {
            // Could not read link — leave it alone.
          }
          continue;
        }

        // ---------------------------------------------------------------
        // Case 2: Real directory
        // ---------------------------------------------------------------
        if (!stat.isDirectory()) {
          // Not a directory (e.g. a regular file) — skip silently.
          continue;
        }

        if (!isOmaGeneratedSkill(entryPath)) {
          // User-authored skill — never touch it.
          continue;
        }

        // ---------------------------------------------------------------
        // Case 3: oma:generated real directory — convert to symlink
        // ---------------------------------------------------------------
        const ssotTarget = join(ssotSkillsDir, entryName);
        if (!existsSync(ssotTarget)) {
          actions.push(
            `.${vendor}/skills/${entryName}: SSOT target missing at ${join(".agents", "skills", entryName)}, skipped (no dangling symlink)`,
          );
          continue;
        }

        // Back up before destructive operation
        try {
          backupDirectory(entryPath, cwd, vendor, entryName);
          actions.push(
            `.agents/backup/011-unify-skills/.${vendor}/skills/${entryName} (backed up)`,
          );
        } catch {
          // Best-effort backup; log and continue
          actions.push(
            `.${vendor}/skills/${entryName}: backup failed, skipping conversion`,
          );
          continue;
        }

        // Remove the real directory
        try {
          rmSync(entryPath, { recursive: true, force: true });
        } catch {
          actions.push(
            `.${vendor}/skills/${entryName}: failed to remove real directory, skipping`,
          );
          continue;
        }

        // Create the symlink using a relative path (same convention as
        // createVendorSymlinks in skills-installer.ts)
        const relativePath = relative(vendorSkillsDir, ssotTarget);
        try {
          createLink(relativePath, entryPath, "dir");
          actions.push(
            `.${vendor}/skills/${entryName} → ${join(".agents", "skills", entryName)} (symlinked)`,
          );
        } catch {
          actions.push(
            `.${vendor}/skills/${entryName}: symlink creation failed`,
          );
        }
      }
    }

    return actions;
  },
};
