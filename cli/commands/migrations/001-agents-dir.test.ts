import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrateToAgents as _migrateToAgents } from "./001-agents-dir.js";

const migrateToAgents = (cwd: string) => _migrateToAgents.up(cwd);

describe("migrateToAgents", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("renames .agent/ to .agents/ when only .agent/ exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldDir = join(root, ".agent");
    mkdirSync(join(oldDir, "skills"), { recursive: true });
    writeFileSync(join(oldDir, "skills", "test.md"), "content", "utf-8");

    const actions = migrateToAgents(root);

    expect(actions).toContain(".agent/ → .agents/ (renamed)");
    expect(existsSync(oldDir)).toBe(false);
    expect(existsSync(join(root, ".agents", "skills", "test.md"))).toBe(true);
  });

  it("removes .agent/ after merge when both directories have overlapping items", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldDir = join(root, ".agent");
    const newDir = join(root, ".agents");

    // Create overlapping structure
    mkdirSync(join(oldDir, "skills"), { recursive: true });
    mkdirSync(join(newDir, "skills"), { recursive: true });
    writeFileSync(join(oldDir, "skills", "a.md"), "old", "utf-8");
    writeFileSync(join(newDir, "skills", "a.md"), "new", "utf-8");

    const actions = migrateToAgents(root);

    expect(actions).toContain(".agent/ (removed after merge)");
    expect(existsSync(oldDir)).toBe(false);
    // .agents/ keeps its own version for overlapping items
    expect(readFileSync(join(newDir, "skills", "a.md"), "utf-8")).toBe("new");
  });

  it("merges unique items from .agent/ into .agents/ then removes .agent/", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldDir = join(root, ".agent");
    const newDir = join(root, ".agents");

    mkdirSync(join(oldDir, "config"), { recursive: true });
    mkdirSync(join(newDir, "skills"), { recursive: true });
    writeFileSync(join(oldDir, "config", "custom.yaml"), "custom", "utf-8");
    writeFileSync(join(newDir, "skills", "a.md"), "skill", "utf-8");

    const actions = migrateToAgents(root);

    expect(actions).toContain(".agent/config → .agents/config (merged)");
    expect(actions).toContain(".agent/ (removed after merge)");
    expect(existsSync(oldDir)).toBe(false);
    expect(existsSync(join(newDir, "config", "custom.yaml"))).toBe(true);
    expect(existsSync(join(newDir, "skills", "a.md"))).toBe(true);
  });

  it("keeps per-item symlinks in .cursor/skills (reconcile owns them)", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const skillDir = join(root, ".agents", "skills", "oma-backend");
    mkdirSync(skillDir, { recursive: true });
    const cursorSkills = join(root, ".cursor", "skills");
    mkdirSync(cursorSkills, { recursive: true });
    symlinkSync(skillDir, join(cursorSkills, "oma-backend"), "junction");

    const actions = migrateToAgents(root);

    expect(lstatSync(join(cursorSkills, "oma-backend")).isSymbolicLink()).toBe(
      true,
    );
    expect(actions.filter((a) => a.includes(".cursor/skills"))).toHaveLength(0);
  });

  it("removes .cursor/skills when the directory itself is a legacy symlink", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const target = join(root, ".agents", "skills");
    mkdirSync(target, { recursive: true });
    mkdirSync(join(root, ".cursor"), { recursive: true });
    symlinkSync(target, join(root, ".cursor", "skills"), "junction");

    const actions = migrateToAgents(root);

    expect(actions).toContain(".cursor/skills (removed symlink)");
    expect(existsSync(join(root, ".cursor", "skills"))).toBe(false);
  });

  it("does nothing when only .agents/ exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills"), { recursive: true });

    const actions = migrateToAgents(root);

    // No .agent/ → .agents/ migration actions
    const dirMigrationActions = actions.filter(
      (a) => a.includes(".agent/") && !a.includes("skills/"),
    );
    expect(dirMigrationActions).toHaveLength(0);
  });
});
