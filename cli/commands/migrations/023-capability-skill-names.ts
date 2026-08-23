/**
 * Migration 023: Rename actor-style skill ids to capability nouns.
 *
 * Generated skill definitions are replaced by install/update, so a conflicting
 * legacy definition can be removed safely. User-authored eval fixtures are only
 * renamed when the canonical destination does not already exist.
 */
import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

export const CAPABILITY_SKILL_RENAMES: Record<string, string> = {
  "oma-academic-writer": "oma-academic-writing",
  "oma-explainer": "oma-explanation",
  "oma-orchestrator": "oma-orchestration",
  "oma-skill-creator": "oma-skill-creation",
  "oma-translator": "oma-translation",
};

function renameGeneratedSkill(
  cwd: string,
  oldName: string,
  newName: string,
  actions: string[],
): void {
  const oldPath = join(cwd, ".agents", "skills", oldName);
  const newPath = join(cwd, ".agents", "skills", newName);
  if (!existsSync(oldPath)) return;

  try {
    if (existsSync(newPath)) {
      rmSync(oldPath, { recursive: true, force: true });
      actions.push(
        `.agents/skills/${oldName} removed (replaced by ${newName})`,
      );
    } else {
      renameSync(oldPath, newPath);
      actions.push(`.agents/skills/${oldName} → ${newName}`);
    }
  } catch {
    // Best-effort migration; install/update will reconcile generated skills.
  }
}

function renameEvalFixtures(
  cwd: string,
  oldName: string,
  newName: string,
  actions: string[],
): void {
  const oldPath = join(cwd, ".agents", "eval", oldName);
  const newPath = join(cwd, ".agents", "eval", newName);
  if (!existsSync(oldPath) || existsSync(newPath)) return;

  try {
    renameSync(oldPath, newPath);
    actions.push(`.agents/eval/${oldName} → ${newName}`);
  } catch {
    // Preserve user-authored fixtures when they cannot be moved safely.
  }
}

export const migrateCapabilitySkillNames: Migration = {
  name: "023-capability-skill-names",
  up(cwd: string): string[] {
    const actions: string[] = [];
    for (const [oldName, newName] of Object.entries(CAPABILITY_SKILL_RENAMES)) {
      renameGeneratedSkill(cwd, oldName, newName, actions);
      renameEvalFixtures(cwd, oldName, newName, actions);
    }
    return actions;
  },
};
