import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectLinkedTo } from "../../test/link-assertions.js";
import { _resetInstallContext, setInstallContext } from "../install-context.js";
import { recordManagedSkills } from "../managed-skill-ownership.js";
import { applySkillOverlay, resolveEffectiveSkill } from "../skill-overlays.js";
import {
  createGlobalSkillDiscoveryLinks,
  createVendorSymlinks,
} from "./skill-symlinks.js";
import { createVendorWorkflowSymlinks } from "./workflow-links.js";

const testHome = vi.hoisted(() => ({ path: undefined as string | undefined }));
vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: () => testHome.path ?? actual.homedir() };
});

const CURSOR_SKILLS = ".cursor/skills";

function setupSsotSkill(root: string, name: string): string {
  const skillDir = join(root, ".agents", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), `---\nname: ${name}\n---\n`);
  return skillDir;
}

function linkSkill(root: string, name: string): string {
  const linkRoot = join(root, CURSOR_SKILLS);
  mkdirSync(linkRoot, { recursive: true });
  const link = join(linkRoot, name);
  symlinkSync(
    relative(linkRoot, join(root, ".agents", "skills", name)),
    link,
    "junction",
  );
  return link;
}

describe("createVendorSymlinks (real fs)", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-skill-symlinks-"));
  });
  afterEach(() => {
    _resetInstallContext();
    testHome.path = undefined;
    rmSync(root, { recursive: true, force: true });
  });

  it("creates a missing symlink", () => {
    setupSsotSkill(root, "oma-test");

    const result = createVendorSymlinks(root, ["cursor"], ["oma-test"]);

    expect(result.created).toContain(`${CURSOR_SKILLS}/oma-test`);
    const link = join(root, CURSOR_SKILLS, "oma-test");
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
  });

  it("keeps an already-correct symlink instead of recreating it", () => {
    setupSsotSkill(root, "oma-test");
    const link = linkSkill(root, "oma-test");
    const before = readlinkSync(link);

    const result = createVendorSymlinks(root, ["cursor"], ["oma-test"]);

    expect(result.created).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.skipped).toContain(
      `${CURSOR_SKILLS}/oma-test (already linked)`,
    );
    expect(readlinkSync(link)).toBe(before);
  });

  it("prunes dangling symlinks (e.g. legacy skill names after a rename)", () => {
    setupSsotSkill(root, "oma-backend");
    // Legacy link whose SSOT target no longer exists
    const dangling = linkSkill(root, "backend-agent");

    const result = createVendorSymlinks(root, ["cursor"], ["oma-backend"]);

    expect(result.removed).toContain(`${CURSOR_SKILLS}/backend-agent`);
    expect(existsSync(dangling)).toBe(false);
    expect(lstatSync(join(root, CURSOR_SKILLS, "oma-backend"))).toBeDefined();
  });

  it("never touches real directories or live foreign symlinks", () => {
    setupSsotSkill(root, "oma-test");

    // Workflow-style real dir with a SKILL.md inside
    const workflowDir = join(root, CURSOR_SKILLS, "work");
    mkdirSync(workflowDir, { recursive: true });
    writeFileSync(join(workflowDir, "SKILL.md"), "---\nname: work\n---\n");

    // User-authored symlink pointing at a live target outside SSOT
    const userTarget = join(root, "my-skill");
    mkdirSync(userTarget, { recursive: true });
    const userLink = join(root, CURSOR_SKILLS, "my-skill");
    symlinkSync(userTarget, userLink, "junction");

    const result = createVendorSymlinks(root, ["cursor"], ["oma-test"]);

    expect(result.removed).toHaveLength(0);
    expect(existsSync(join(workflowDir, "SKILL.md"))).toBe(true);
    expect(lstatSync(userLink).isSymbolicLink()).toBe(true);
  });

  it("lets qwen discover shared skills without creating a vendor skills directory", () => {
    setupSsotSkill(root, "oma-test");

    const result = createVendorSymlinks(root, ["qwen", "cursor"], ["oma-test"]);

    expect(existsSync(join(root, ".qwen", "skills"))).toBe(false);
    expect(result.created).toEqual([`${CURSOR_SKILLS}/oma-test`]);
    expect(
      existsSync(join(root, ".agents", "skills", "oma-test", "SKILL.md")),
    ).toBe(true);
  });

  it("removes live and dangling legacy qwen links without recreating them", () => {
    const source = setupSsotSkill(root, "oma-test");
    const skills = join(root, ".qwen", "skills");
    mkdirSync(skills, { recursive: true });
    const targets: [string, string][] = [
      ["oma-test", relative(skills, source)],
      ["oma-old", join(root, ".agents", "skills", "oma-old")],
    ];
    for (const [name, target] of targets)
      symlinkSync(target, join(skills, name), "junction");

    const result = createVendorSymlinks(root, ["qwen"], ["oma-test"]);

    expect(result.created).toEqual([]);
    expect(result.removed.sort()).toEqual([
      ".qwen/skills/oma-old",
      ".qwen/skills/oma-test",
    ]);
    for (const [name] of targets)
      expect(() => lstatSync(join(skills, name))).toThrow();
    expect(createVendorSymlinks(root, ["qwen"], ["oma-test"]).removed).toEqual(
      [],
    );
  });

  it("preserves qwen user skills and foreign links, including dangling links", () => {
    setupSsotSkill(root, "oma-test");
    const skills = join(root, ".qwen", "skills");
    const userSkill = join(skills, "oma-user");
    mkdirSync(userSkill, { recursive: true });
    writeFileSync(join(userSkill, "SKILL.md"), "user skill");
    const foreign = join(root, "user-skills");
    mkdirSync(foreign);
    symlinkSync(foreign, join(skills, "oma-live"), "junction");
    symlinkSync(
      join(foreign, "missing"),
      join(skills, "oma-dangling"),
      "junction",
    );
    symlinkSync(
      join(root, "other", ".agents", "skills", "oma-other"),
      join(skills, "oma-other"),
      "junction",
    );
    const sharedCustom = setupSsotSkill(root, "user-skill");
    symlinkSync(sharedCustom, join(skills, "user-skill"), "junction");
    writeFileSync(join(skills, "oma-file"), "user file");

    const result = createVendorSymlinks(root, ["qwen"], ["oma-test"]);

    expect(result.removed).toEqual([]);
    expect(readFileSync(join(userSkill, "SKILL.md"), "utf8")).toBe(
      "user skill",
    );
    expect(readFileSync(join(skills, "oma-file"), "utf8")).toBe("user file");
    for (const name of ["oma-live", "oma-dangling", "oma-other", "user-skill"])
      expect(lstatSync(join(skills, name)).isSymbolicLink()).toBe(true);
  });

  it("retires legacy qwen links even after the last shared skill was removed", () => {
    const skills = join(root, ".qwen", "skills");
    mkdirSync(skills, { recursive: true });
    const link = join(skills, "oma-old");
    symlinkSync(join(root, ".agents", "skills", "oma-old"), link, "junction");

    const result = createVendorSymlinks(root, ["qwen"], []);

    expect(result.removed).toEqual([".qwen/skills/oma-old"]);
    expect(() => lstatSync(link)).toThrow();
  });

  it("removes a legacy managed overlay link without creating another qwen link", () => {
    setupSsotSkill(root, "oma-test");
    const base = resolveEffectiveSkill(root, "oma-test");
    applySkillOverlay({
      workspace: root,
      skillId: "oma-test",
      body: "# optimized",
      expectedBaseHash: base.baseHash,
      expectedEffectiveHash: base.effectiveHash,
    });
    const skills = join(root, ".qwen", "skills");
    mkdirSync(skills, { recursive: true });
    const link = join(skills, "oma-test");
    symlinkSync(
      resolveEffectiveSkill(root, "oma-test").directory,
      link,
      "junction",
    );

    const result = createVendorSymlinks(root, ["qwen"], ["oma-test"]);

    expect(result.removed).toEqual([".qwen/skills/oma-test"]);
    expect(() => lstatSync(link)).toThrow();
    expect(result.created).toEqual([]);
  });

  it("keeps qwen workflow commands linked after retiring skill links", () => {
    setupSsotSkill(root, "oma-test");
    const workflows = join(root, ".agents", "workflows");
    mkdirSync(workflows, { recursive: true });
    writeFileSync(
      join(workflows, "demo.md"),
      "---\nname: demo\n---\nDemo workflow",
    );
    createVendorWorkflowSymlinks(root, ["qwen"], ["demo"]);

    createVendorSymlinks(root, ["qwen"], ["oma-test"]);

    const command = join(root, ".qwen", "skills", "demo", "SKILL.md");
    // Symlink on POSIX; hardlink fallback on unprivileged Windows.
    expectLinkedTo(command, join(workflows, "demo.md"));
    expect(readFileSync(command, "utf8")).toContain("Demo workflow");
  });

  it("uses global shared discovery while retiring HOME-scoped qwen skill links", () => {
    setupSsotSkill(root, "oma-test");
    setupSsotSkill(root, "oma-shared");
    recordManagedSkills(root, ["oma-test", "oma-shared"]);
    testHome.path = join(root, "home");
    setInstallContext({ installRoot: root, mode: "global" });
    createGlobalSkillDiscoveryLinks(root);
    const skills = join(testHome.path, ".qwen", "skills");
    mkdirSync(skills, { recursive: true });
    const link = join(skills, "oma-test");
    symlinkSync(join(root, ".agents", "skills", "oma-test"), link, "junction");
    const sharedLink = join(skills, "oma-shared");
    symlinkSync(
      join(testHome.path, ".agents", "skills", "oma-shared"),
      sharedLink,
      "junction",
    );

    const result = createVendorSymlinks(
      root,
      ["qwen"],
      ["oma-test", "oma-shared"],
    );

    expect(result.removed.sort()).toEqual([
      ".qwen/skills/oma-shared",
      ".qwen/skills/oma-test",
    ]);
    expect(() => lstatSync(link)).toThrow();
    expect(() => lstatSync(sharedLink)).toThrow();
    expect(
      readFileSync(
        join(testHome.path, ".agents", "skills", "oma-test", "SKILL.md"),
        "utf8",
      ),
    ).toContain("name: oma-test");
  });
});
