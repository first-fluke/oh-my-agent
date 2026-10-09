import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetInstallContext, setInstallContext } from "./install-context.js";
import { recordManagedSkills } from "./managed-skill-ownership.js";
import { createGlobalSkillDiscoveryLinks } from "./skills-installer/skill-symlinks.js";
import { vendorSkillsDir } from "./skills-installer/vendor-dirs.js";

const context = vi.hoisted(() => ({ home: "/nonexistent-oma-discovery-home" }));
vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  homedir: () => context.home,
}));

describe("global common skill discovery", () => {
  let root: string;
  let oma: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-global-discovery-"));
    context.home = join(root, "native-home");
    oma = join(root, "custom-oma");
    _resetInstallContext();
    setInstallContext({ mode: "global", installRoot: oma });
  });
  afterEach(() => {
    _resetInstallContext();
    rmSync(root, { recursive: true, force: true });
  });

  function skill(
    base: string,
    name = "oma-test",
    content = "original skill\n",
  ) {
    const dir = join(base, ".agents", "skills", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), content);
    return dir;
  }

  it("archives an identical owned legacy directory before projecting it, and reuses the link", () => {
    const original = skill(context.home);
    recordManagedSkills(context.home, ["oma-test"]);
    const source = skill(oma);
    recordManagedSkills(oma, ["oma-test"]);
    const created = createGlobalSkillDiscoveryLinks(oma);
    expect(created).toEqual([original]);
    expect(lstatSync(original).isSymbolicLink()).toBe(true);
    expect(resolve(original, "..", readlinkSync(original))).toBe(source);
    const backupRoot = join(oma, "backup", "legacy-global-skills");
    const archive = join(
      backupRoot,
      readdirSync(backupRoot)[0] ?? "",
      "oma-test",
      "SKILL.md",
    );
    expect(readFileSync(archive, "utf8")).toBe("original skill\n");
    expect(createGlobalSkillDiscoveryLinks(oma)).toEqual([]);
    expect(readdirSync(backupRoot)).toHaveLength(1);
    expect(vendorSkillsDir("codex", oma)).toBe(
      join(context.home, ".codex", "skills"),
    );
    expect(existsSync(join(oma, ".codex"))).toBe(false);
  });

  it("preserves unowned directories and foreign links even when names match", () => {
    const user = skill(context.home, "oma-user", "my customized skill\n");
    skill(oma, "oma-user");
    const foreign = skill(join(root, "elsewhere"), "oma-foreign");
    const link = join(context.home, ".agents", "skills", "oma-foreign");
    symlinkSync(foreign, link, "dir");
    skill(oma, "oma-foreign");
    recordManagedSkills(oma, ["oma-user", "oma-foreign"]);
    expect(createGlobalSkillDiscoveryLinks(oma)).toEqual([]);
    expect(readFileSync(join(user, "SKILL.md"), "utf8")).toBe(
      "my customized skill\n",
    );
    expect(readlinkSync(link)).toBe(foreign);
    expect(existsSync(join(oma, "backup"))).toBe(false);
  });

  it("refuses to replace a managed directory whose migrated copy differs", () => {
    const original = skill(context.home, "oma-test", "original bytes\n");
    recordManagedSkills(context.home, ["oma-test"]);
    skill(oma, "oma-test", "different bytes\n");
    recordManagedSkills(oma, ["oma-test"]);
    expect(() => createGlobalSkillDiscoveryLinks(oma)).toThrow(
      "Global skill discovery conflict",
    );
    expect(lstatSync(original).isDirectory()).toBe(true);
    expect(readFileSync(join(original, "SKILL.md"), "utf8")).toBe(
      "original bytes\n",
    );
    expect(existsSync(join(oma, "backup"))).toBe(false);
  });

  it("preserves nested asset bytes and symlink targets in the archive", () => {
    const original = skill(context.home);
    mkdirSync(join(original, "assets"));
    writeFileSync(
      join(original, "assets", "binary"),
      Buffer.from([0, 255, 1, 2]),
    );
    symlinkSync("assets/binary", join(original, "asset"));
    cpSync(original, join(oma, ".agents", "skills", "oma-test"), {
      recursive: true,
      verbatimSymlinks: true,
    });
    recordManagedSkills(context.home, ["oma-test"]);
    recordManagedSkills(oma, ["oma-test"]);
    createGlobalSkillDiscoveryLinks(oma);
    const base = join(oma, "backup", "legacy-global-skills");
    const backup = join(base, readdirSync(base)[0] ?? "", "oma-test");
    expect(readFileSync(join(backup, "assets", "binary"))).toEqual(
      Buffer.from([0, 255, 1, 2]),
    );
    expect(readlinkSync(join(backup, "asset"))).toBe("assets/binary");
  });
});
