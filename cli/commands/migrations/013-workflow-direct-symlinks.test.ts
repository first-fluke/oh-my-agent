import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateWorkflowDirectSymlinks } from "./013-workflow-direct-symlinks.js";

const GENERATED =
  "---\nname: docs\ndescription: Docs\ndisable-model-invocation: true\n---\n<!-- oma:generated -->\n\nRead and follow `.agents/workflows/docs.md` step by step.\n";

function setup(cwd: string): void {
  // SSOT workflow file
  const wfDir = join(cwd, ".agents", "workflows");
  mkdirSync(wfDir, { recursive: true });
  writeFileSync(join(wfDir, "docs.md"), "---\nname: docs\n---\n# /docs\n");

  // Legacy generated wrapper under .agents/skills/docs
  const wrapper = join(cwd, ".agents", "skills", "docs");
  mkdirSync(wrapper, { recursive: true });
  writeFileSync(join(wrapper, "SKILL.md"), GENERATED);

  // Legacy vendor dir-symlink → .agents/skills/docs
  const vendorSkills = join(cwd, ".claude", "skills");
  mkdirSync(vendorSkills, { recursive: true });
  symlinkSync(resolve(wrapper), join(vendorSkills, "docs"), "dir");
}

describe("migrateWorkflowDirectSymlinks (013)", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "oma-mig013-"));
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it("removes the legacy vendor dir-symlink and the generated wrapper", () => {
    setup(cwd);
    const actions = migrateWorkflowDirectSymlinks.up(cwd);

    expect(existsSync(join(cwd, ".claude", "skills", "docs"))).toBe(false);
    expect(existsSync(join(cwd, ".agents", "skills", "docs"))).toBe(false);
    expect(actions.length).toBeGreaterThanOrEqual(2);
    // Backup was written
    expect(
      existsSync(
        join(
          cwd,
          ".migration-backup",
          "013",
          ".agents",
          "skills",
          "docs",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
  });

  it("is idempotent — a second run produces no actions", () => {
    setup(cwd);
    migrateWorkflowDirectSymlinks.up(cwd);
    const second = migrateWorkflowDirectSymlinks.up(cwd);
    expect(second).toHaveLength(0);
  });

  it("never removes a user-authored skill dir (no oma marker)", () => {
    setup(cwd);
    // A user-authored skill that happens to share a workflow name should be
    // left alone — but our wrapper detection is marker-gated, so write a
    // non-generated SKILL.md under a workflow-named dir.
    const userWrapper = join(cwd, ".agents", "skills", "docs");
    rmSync(userWrapper, { recursive: true, force: true });
    mkdirSync(userWrapper, { recursive: true });
    writeFileSync(
      join(userWrapper, "SKILL.md"),
      "---\nname: docs\n---\nmine\n",
    );

    migrateWorkflowDirectSymlinks.up(cwd);
    expect(existsSync(join(userWrapper, "SKILL.md"))).toBe(true);
  });

  it("leaves a real (non-symlink) vendor dir untouched", () => {
    setup(cwd);
    // Replace the vendor symlink with a real user dir.
    const vendorEntry = join(cwd, ".claude", "skills", "docs");
    rmSync(vendorEntry, { recursive: true, force: true });
    mkdirSync(vendorEntry, { recursive: true });
    writeFileSync(join(vendorEntry, "SKILL.md"), "user content");

    migrateWorkflowDirectSymlinks.up(cwd);
    const stat = lstatSync(vendorEntry);
    expect(stat.isDirectory() && !stat.isSymbolicLink()).toBe(true);
  });

  it("does nothing when there are no workflows", () => {
    expect(migrateWorkflowDirectSymlinks.up(cwd)).toEqual([]);
  });
});
