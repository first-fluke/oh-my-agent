import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { AGENTS_SKILLS_DIR } from "../../../constants/paths.js";
import { backupPathFromRoot, findProjectRoot } from "../../../io/backup.js";

// --- Input validation ---

/**
 * Assert that `skillId` does not contain path traversal characters.
 * A skill ID is a simple identifier: no path separators, no `..`.
 */
export function assertSafeSkillId(skillId: string): void {
  if (
    skillId.includes("..") ||
    skillId.includes("/") ||
    skillId.includes(sep)
  ) {
    throw new Error(
      `--skill must be a simple identifier (no path separators or '..'): ${skillId}`,
    );
  }
}

// --- oma-owned guard ---

/**
 * Returns true when the skill is oma-owned (shipped with oh-my-agent).
 *
 * oma-owned skills live under `.agents/skills/oma-*` and are overwritten by
 * `oma update`. Applying edits to them without `--yes` is discouraged.
 */
export function isOmaOwnedSkill(skillId: string): boolean {
  return skillId.startsWith("oma-");
}

// --- SKILL.md path resolution ---

/**
 * Resolve the absolute path to a skill's SKILL.md file.
 *
 * Mirrors the resolution in `loadSkillMdBody` from eval.ts (single source:
 * `<workspace>/<AGENTS_SKILLS_DIR>/<skillId>/SKILL.md`).
 */
export function resolveSkillMdPath(skillId: string, workspace: string): string {
  return join(workspace, AGENTS_SKILLS_DIR, skillId, "SKILL.md");
}

// --- Backup helper ---

/**
 * Back up a SKILL.md before the optimizer overwrites it.
 *
 * Lands under the canonical gitignored root `<project>/.agents/backup/skills-opt/`
 * (relative path flattened with `__` to avoid collisions), falling back to a
 * sibling `<path>.bak` when the file lives outside any project. If the chosen
 * `<name>.bak` already exists, tries suffixed names (`.bak.1`, `.bak.2`, …) up
 * to 99. Throws when all suffixes are exhausted. Returns the path written.
 */
export function backupSkillMd(skillMdPath: string): string {
  const root = findProjectRoot(skillMdPath);
  const base = root
    ? backupPathFromRoot(
        root,
        "skills-opt",
        `${relative(root, skillMdPath).split(sep).join("__")}.bak`,
      )
    : `${skillMdPath}.bak`;

  const write = (dest: string): string => {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(skillMdPath, "utf-8"), "utf-8");
    return dest;
  };

  if (!existsSync(base)) return write(base);
  for (let i = 1; i <= 99; i++) {
    const candidate = `${base}.${i}`;
    if (!existsSync(candidate)) return write(candidate);
  }
  throw new Error(
    `[oma skills opt] cannot create backup: all suffix slots (.bak through .bak.99) are taken for ${base}`,
  );
}
