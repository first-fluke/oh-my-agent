// ---------------------------------------------------------------------------
// 011-unify-workflow-skills.test.ts
//
// Verifies migration 011: convert legacy oma:generated vendor skill directories
// into SSOT symlinks under .agents/skills/, with backup and idempotency.
// ---------------------------------------------------------------------------

import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateUnifyWorkflowSkills } from "./011-unify-workflow-skills.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MARKER = "<!-- oma:generated -->";

function makeTempRoot(): string {
  return mkdtempSync(join(tmpdir(), "oma-011-test-"));
}

/** Seed a SKILL.md inside a vendor skill dir, creating parent dirs as needed. */
function seedSkillDir(
  root: string,
  vendor: string,
  skillName: string,
  content: string,
): string {
  const dir = join(root, `.${vendor}`, "skills", skillName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content, "utf-8");
  return dir;
}

/** Seed the SSOT target dir under .agents/skills/. */
function seedSsotSkill(
  root: string,
  skillName: string,
  content: string,
): string {
  const dir = join(root, ".agents", "skills", skillName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content, "utf-8");
  return dir;
}

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function isRealDir(path: string): boolean {
  try {
    const st = lstatSync(path);
    return st.isDirectory() && !st.isSymbolicLink();
  } catch {
    return false;
  }
}

/** Follow symlinks and return the canonical real path. */
function realpath(path: string): string {
  return realpathSync(path);
}

function backupPath(root: string, vendor: string, skillName: string): string {
  return join(
    root,
    ".agents",
    "backup",
    "011-unify-skills",
    `.${vendor}`,
    "skills",
    skillName,
  );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("migration 011 — unify-workflow-skills", () => {
  const tempRoots: string[] = [];
  let root: string;

  beforeEach(() => {
    root = makeTempRoot();
    tempRoots.push(root);
  });

  afterEach(() => {
    for (const r of tempRoots) {
      rmSync(r, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  // -------------------------------------------------------------------------
  // 1. Idempotency
  // -------------------------------------------------------------------------
  it("is idempotent — second run produces 0 actions and symlinks remain intact", () => {
    const ssotContent = `${MARKER}\n# orchestrate skill\n`;
    const ssotDir = seedSsotSkill(root, "orchestrate", ssotContent);
    seedSkillDir(root, "claude", "orchestrate", ssotContent);

    const firstActions = migrateUnifyWorkflowSkills.up(root);
    expect(firstActions.length).toBeGreaterThan(0);

    const symlinkPath = join(root, ".claude", "skills", "orchestrate");
    expect(isSymlink(symlinkPath)).toBe(true);

    const secondActions = migrateUnifyWorkflowSkills.up(root);
    expect(secondActions).toHaveLength(0);

    // Symlink still intact after second run and resolves to SSOT
    expect(isSymlink(symlinkPath)).toBe(true);
    expect(realpath(symlinkPath)).toBe(realpath(ssotDir));
  });

  // -------------------------------------------------------------------------
  // 2. User-skill preservation (no marker)
  // -------------------------------------------------------------------------
  it("leaves user-authored skill dirs (no marker) untouched", () => {
    const userContent = "# my custom skill — no oma marker here\n";
    const userDir = seedSkillDir(root, "claude", "my-user-skill", userContent);

    const actions = migrateUnifyWorkflowSkills.up(root);

    // Migration must not touch user-authored dir
    expect(isRealDir(userDir)).toBe(true);
    expect(readFileSync(join(userDir, "SKILL.md"), "utf-8")).toBe(userContent);

    // No backup created for this skill
    const backup = backupPath(root, "claude", "my-user-skill");
    expect(existsSync(backup)).toBe(false);

    // No action should reference this skill
    expect(actions.some((a) => a.includes("my-user-skill"))).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 3. Marker enforcement — backup + symlink conversion
  // -------------------------------------------------------------------------
  it("converts oma:generated real dir to symlink and backs it up", () => {
    const skillContent = `${MARKER}\n# orchestrate\n`;
    const ssotDir = seedSsotSkill(root, "orchestrate", skillContent);
    seedSkillDir(root, "codex", "orchestrate", skillContent);

    const actions = migrateUnifyWorkflowSkills.up(root);

    // Backup must exist
    const backup = backupPath(root, "codex", "orchestrate");
    expect(existsSync(backup)).toBe(true);
    expect(existsSync(join(backup, "SKILL.md"))).toBe(true);

    // Original path is now a symlink
    const linkPath = join(root, ".codex", "skills", "orchestrate");
    expect(isSymlink(linkPath)).toBe(true);

    // Symlink resolves to SSOT target (follow symlinks with realpathSync)
    expect(realpath(linkPath)).toBe(realpath(ssotDir));

    // Actions reference backup and symlink creation
    expect(
      actions.some(
        (a) =>
          a.includes(
            ".agents/backup/011-unify-skills/.codex/skills/orchestrate",
          ) && a.includes("backed up"),
      ),
    ).toBe(true);
    expect(
      actions.some(
        (a) =>
          a.includes(".codex/skills/orchestrate") && a.includes("symlinked"),
      ),
    ).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. Rollback via backup — backup content is faithful
  // -------------------------------------------------------------------------
  it("backup contains a faithful copy of the original SKILL.md content", () => {
    const originalContent = `${MARKER}\n# My generated skill — original content\nsome detail here\n`;
    seedSsotSkill(root, "orchestrate", originalContent);
    seedSkillDir(root, "codex", "orchestrate", originalContent);

    migrateUnifyWorkflowSkills.up(root);

    const backup = backupPath(root, "codex", "orchestrate");
    const backupContent = readFileSync(join(backup, "SKILL.md"), "utf-8");
    expect(backupContent).toBe(originalContent);
  });

  // -------------------------------------------------------------------------
  // 5. No dangling symlinks — SSOT target missing
  // -------------------------------------------------------------------------
  it("does NOT create a dangling symlink when SSOT target is missing", () => {
    const skillContent = `${MARKER}\n# legacy-workflow\n`;
    // Seed vendor dir WITH marker but NO SSOT target
    seedSkillDir(root, "codex", "legacy-workflow", skillContent);
    // Intentionally do NOT create .agents/skills/legacy-workflow/

    migrateUnifyWorkflowSkills.up(root);

    const vendorSkillPath = join(root, ".codex", "skills", "legacy-workflow");

    // Must not be a symlink pointing to a non-existent target
    if (isSymlink(vendorSkillPath)) {
      // If a symlink was somehow created, its target must exist (not dangling)
      expect(existsSync(vendorSkillPath)).toBe(true);
    } else {
      // Preferred path: migration skips conversion, no dangling symlink created
      expect(isSymlink(vendorSkillPath)).toBe(false);
    }

    // SSOT target must still not exist (migration must not create it)
    const ssotTarget = join(root, ".agents", "skills", "legacy-workflow");
    expect(existsSync(ssotTarget)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. Existing correct symlink — no-op
  // -------------------------------------------------------------------------
  it("leaves already-correct symlinks unchanged (no backup, no rewrite)", () => {
    const skillContent = `${MARKER}\n# orchestrate\n`;
    const ssotDir = seedSsotSkill(root, "orchestrate", skillContent);

    // Pre-seed a correct symlink for qwen
    const vendorSkillsDir = join(root, ".qwen", "skills");
    mkdirSync(vendorSkillsDir, { recursive: true });
    const linkPath = join(vendorSkillsDir, "orchestrate");
    const relTarget = relative(vendorSkillsDir, ssotDir);
    symlinkSync(relTarget, linkPath, "junction");

    expect(isSymlink(linkPath)).toBe(true);

    const actions = migrateUnifyWorkflowSkills.up(root);

    // No backup created
    const backup = backupPath(root, "qwen", "orchestrate");
    expect(existsSync(backup)).toBe(false);

    // Symlink still intact and resolves correctly
    expect(isSymlink(linkPath)).toBe(true);
    expect(realpath(linkPath)).toBe(realpath(ssotDir));

    // No symlink-creation action emitted for this already-correct link
    expect(
      actions.some(
        (a) =>
          a.includes(".qwen/skills/orchestrate") && a.includes("symlinked"),
      ),
    ).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 7. Per-vendor coverage — all three vendors migrated simultaneously
  // -------------------------------------------------------------------------
  it("migrates marker-stamped entries across all three vendors in one run", () => {
    const skillContent = `${MARKER}\n# orchestrate\n`;
    const ssotDir = seedSsotSkill(root, "orchestrate", skillContent);

    // Seed all three vendors with a real dir that has the marker
    const vendors = ["claude", "codex", "qwen"] as const;
    for (const vendor of vendors) {
      seedSkillDir(root, vendor, "orchestrate", skillContent);
    }

    const actions = migrateUnifyWorkflowSkills.up(root);

    for (const vendor of vendors) {
      const linkPath = join(root, `.${vendor}`, "skills", "orchestrate");

      // Each is now a symlink
      expect(isSymlink(linkPath), `${vendor} should be a symlink`).toBe(true);

      // Each resolves to SSOT (use realpathSync to follow symlinks)
      expect(
        realpath(linkPath),
        `${vendor} symlink should resolve to SSOT`,
      ).toBe(realpath(ssotDir));

      // Each got backed up
      const backup = backupPath(root, vendor, "orchestrate");
      expect(existsSync(backup), `${vendor} backup should exist`).toBe(true);

      // Actions include backup entry for each vendor
      expect(
        actions.some(
          (a) =>
            a.includes(
              `.agents/backup/011-unify-skills/.${vendor}/skills/orchestrate`,
            ) && a.includes("backed up"),
        ),
        `${vendor} backup action should be present`,
      ).toBe(true);

      // Actions include symlink entry for each vendor
      expect(
        actions.some(
          (a) =>
            a.includes(`.${vendor}/skills/orchestrate`) &&
            a.includes("symlinked"),
        ),
        `${vendor} symlink action should be present`,
      ).toBe(true);
    }
  });
});
