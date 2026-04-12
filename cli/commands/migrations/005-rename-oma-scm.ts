/**
 * Migration 005: Rename oma-commit skill to oma-scm.
 * - .agents/skills/oma-commit → .agents/skills/oma-scm
 * - Safe to run repeatedly.
 */
import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

export const migrateRenameOmaScm: Migration = {
  name: "005-rename-oma-scm",
  up(cwd: string): string[] {
    const actions: string[] = [];
    const skillsDir = join(cwd, ".agents", "skills");
    const oldPath = join(skillsDir, "oma-commit");
    const newPath = join(skillsDir, "oma-scm");
    const legacyWorkflowPath = join(cwd, ".agents", "workflows", "commit.md");

    if (existsSync(legacyWorkflowPath)) {
      rmSync(legacyWorkflowPath, { force: true });
      actions.push("workflows/commit.md (removed legacy workflow)");
    }

    if (!existsSync(oldPath)) return actions;

    if (!existsSync(newPath)) {
      renameSync(oldPath, newPath);
      actions.push("skills/oma-commit → skills/oma-scm");
      return actions;
    }

    rmSync(oldPath, { recursive: true, force: true });
    actions.push("skills/oma-commit (removed, replaced by oma-scm)");
    return actions;
  },
};
