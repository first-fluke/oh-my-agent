import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CAPABILITY_SKILL_RENAMES,
  migrateCapabilitySkillNames,
} from "./023-capability-skill-names.js";

describe("migration 023 — actor-style skill ids → capability nouns", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "oma-mig023-"));
  });

  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it("renames every generated skill directory", () => {
    for (const oldName of Object.keys(CAPABILITY_SKILL_RENAMES)) {
      const dir = join(cwd, ".agents", "skills", oldName);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "SKILL.md"), `name: ${oldName}\n`);
    }

    const actions = migrateCapabilitySkillNames.up(cwd);

    for (const [oldName, newName] of Object.entries(CAPABILITY_SKILL_RENAMES)) {
      expect(existsSync(join(cwd, ".agents", "skills", oldName))).toBe(false);
      expect(existsSync(join(cwd, ".agents", "skills", newName))).toBe(true);
    }
    expect(actions).toHaveLength(Object.keys(CAPABILITY_SKILL_RENAMES).length);
  });

  it("removes a generated legacy directory when its replacement exists", () => {
    const oldPath = join(cwd, ".agents", "skills", "oma-translator");
    const newPath = join(cwd, ".agents", "skills", "oma-translation");
    mkdirSync(oldPath, { recursive: true });
    mkdirSync(newPath, { recursive: true });

    migrateCapabilitySkillNames.up(cwd);

    expect(existsSync(oldPath)).toBe(false);
    expect(existsSync(newPath)).toBe(true);
  });

  it("renames user-authored eval fixtures when the destination is free", () => {
    const oldPath = join(cwd, ".agents", "eval", "oma-explainer");
    const newPath = join(cwd, ".agents", "eval", "oma-explanation");
    mkdirSync(oldPath, { recursive: true });
    writeFileSync(join(oldPath, "task.yaml"), "id: explain\n");

    migrateCapabilitySkillNames.up(cwd);

    expect(existsSync(oldPath)).toBe(false);
    expect(existsSync(join(newPath, "task.yaml"))).toBe(true);
  });

  it("preserves both eval directories when the destination already exists", () => {
    const oldPath = join(cwd, ".agents", "eval", "oma-explainer");
    const newPath = join(cwd, ".agents", "eval", "oma-explanation");
    mkdirSync(oldPath, { recursive: true });
    mkdirSync(newPath, { recursive: true });

    const actions = migrateCapabilitySkillNames.up(cwd);

    expect(existsSync(oldPath)).toBe(true);
    expect(existsSync(newPath)).toBe(true);
    expect(actions).toEqual([]);
  });

  it("is idempotent", () => {
    const oldPath = join(cwd, ".agents", "skills", "oma-orchestrator");
    mkdirSync(oldPath, { recursive: true });

    migrateCapabilitySkillNames.up(cwd);
    expect(migrateCapabilitySkillNames.up(cwd)).toEqual([]);
  });
});
