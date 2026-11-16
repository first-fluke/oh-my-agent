/**
 * Migration 037: Remove the retired `oma-coordination` skill.
 *
 * The skill carried six shared rules and a manual mode. The rules now live in
 * `_shared/core/collaboration-policy.md`, which every multi-agent workflow
 * reads, and the manual mode is part of `oma-orchestration`. `oma update`
 * overwrites shipped skills but never prunes one that stopped shipping, so the
 * directory is removed here; the vendor links to it are pruned by the link
 * step once the source is gone.
 *
 * Only the shipped skill is removed. A project skill that reuses the directory
 * name is recognized by another `name` in its frontmatter and is left alone.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

const SHIPPED_NAME = /^name:\s*oma-coordination\s*$/m;

export const migrateRemoveCoordinationSkill: Migration = {
  name: "037-remove-coordination-skill",
  up(cwd: string): string[] {
    const skillDir = join(cwd, ".agents", "skills", "oma-coordination");
    const entry = join(skillDir, "SKILL.md");
    if (!existsSync(entry)) return [];

    try {
      if (!SHIPPED_NAME.test(readFileSync(entry, "utf-8"))) return [];
      rmSync(skillDir, { recursive: true, force: true });
      return [".agents/skills/oma-coordination (removed retired skill)"];
    } catch {
      // Best-effort: leave an unreadable or protected directory untouched.
      return [];
    }
  },
};
