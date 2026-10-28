import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { PRESETS } from "../constants/index.js";
import { installPiPromptTemplates } from "./pi-prompts.js";
import {
  inspectWorkflowAvailability,
  WORKFLOW_DEPENDENCIES,
} from "./skills-installer/workflow-dependencies.js";
import {
  createVendorWorkflowSymlinks,
  getInstalledWorkflowNames,
  installCopilotWorkflowPrompts,
  installZcodeWorkflowCommands,
} from "./skills-installer/workflow-links.js";

const repository = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(shipped = false) {
  const root = mkdtempSync(join(tmpdir(), "oma-workflow-deps-"));
  roots.push(root);
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const skill = (
    name: string,
    body = `---\nname: ${name}\ndescription: Fixture skill\n---\n`,
  ) => write(`.agents/skills/${name}/SKILL.md`, body);
  if (shipped)
    cpSync(
      join(repository, ".agents", "workflows"),
      join(root, ".agents", "workflows"),
      { recursive: true },
    );
  else
    write(
      ".agents/workflows/custom.md",
      "---\nname: custom\ndependencies:\n  required: [oma-qa]\n  conditional: [oma-backend]\n---\n# Custom workflow\n",
    );
  return { root, write, skill };
}

describe("workflow selective-install requirements", () => {
  it("declares every shipped workflow and keeps frontend selection unchanged", () => {
    const f = fixture(true);
    expect(Object.keys(WORKFLOW_DEPENDENCIES).sort()).toEqual(
      getInstalledWorkflowNames(f.root).sort(),
    );
    const selected = [...(PRESETS.frontend ?? [])];
    for (const name of selected) f.skill(name);
    const state = inspectWorkflowAvailability(f.root, "work");
    expect(state.available).toBe(false);
    expect(state.missingRequired).toContain("oma-coordination");
    createVendorWorkflowSymlinks(
      f.root,
      ["claude"],
      getInstalledWorkflowNames(f.root),
    );
    expect(existsSync(join(f.root, ".claude/skills/work/SKILL.md"))).toBe(
      false,
    );
    expect(readdirSync(join(f.root, ".agents/skills")).sort()).toEqual(
      selected.sort(),
    );
  });

  it("exposes every shipped workflow with a complete valid install", () => {
    const f = fixture(true);
    for (const name of PRESETS.all ?? []) f.skill(name);
    const names = getInstalledWorkflowNames(f.root);
    expect(
      names.filter(
        (name) => !inspectWorkflowAvailability(f.root, name).available,
      ),
    ).toEqual([]);
    expect(
      createVendorWorkflowSymlinks(f.root, ["claude"], names).created,
    ).toHaveLength(names.length);
  });

  it("re-enables work after adding its one missing frontend prerequisite", () => {
    const f = fixture(true);
    const selected = PRESETS.frontend ?? [];
    for (const name of selected) f.skill(name);
    expect(inspectWorkflowAvailability(f.root, "work").missingRequired).toEqual(
      ["oma-coordination"],
    );
    f.skill("oma-coordination");
    expect(inspectWorkflowAvailability(f.root, "work").available).toBe(true);
    expect(
      createVendorWorkflowSymlinks(f.root, ["claude"], ["work"]).created,
    ).toEqual([".claude/skills/work"]);
    expect(readdirSync(join(f.root, ".agents/skills"))).toHaveLength(
      selected.length + 1,
    );
  });

  it.each([
    "",
    "# No manifest metadata\n",
    "---\nname: another-skill\ndescription: Wrong name\n---\n",
    "---\nname: [broken\n---\n",
  ])("rejects malformed required manifest %j", (body) => {
    const f = fixture();
    f.skill("oma-qa", body);
    expect(inspectWorkflowAvailability(f.root, "custom")).toMatchObject({
      available: false,
      missingRequired: ["oma-qa"],
    });
  });

  it("keeps conditional dependencies advisory", () => {
    const f = fixture();
    f.skill("oma-qa");
    expect(inspectWorkflowAvailability(f.root, "custom")).toMatchObject({
      available: true,
      missingRequired: [],
      missingConditional: ["oma-backend"],
    });
    expect(
      createVendorWorkflowSymlinks(f.root, ["claude"], ["custom"]).created,
    ).toEqual([".claude/skills/custom"]);
    expect(existsSync(join(f.root, ".agents/skills/oma-backend"))).toBe(false);
  });

  it("removes stale owned workflow links on reinstall and restores them after repair", () => {
    const f = fixture();
    f.skill("oma-qa");
    createVendorWorkflowSymlinks(f.root, ["claude", "codex"], ["custom"]);
    rmSync(join(f.root, ".agents/skills/oma-qa/SKILL.md"));
    createVendorWorkflowSymlinks(f.root, ["claude", "codex"], ["custom"]);
    for (const vendor of ["claude", "codex"])
      expect(
        existsSync(join(f.root, `.${vendor}/skills/custom/SKILL.md`)),
      ).toBe(false);
    f.skill("oma-qa");
    expect(
      createVendorWorkflowSymlinks(f.root, ["claude", "codex"], ["custom"])
        .created,
    ).toHaveLength(2);
  });

  it("preserves user-authored commands and other files when suppressing a workflow", () => {
    const f = fixture();
    f.skill("oma-qa");
    createVendorWorkflowSymlinks(f.root, ["claude"], ["custom"]);
    f.write(".claude/skills/custom/notes.txt", "User notes");
    f.write(".codex/skills/custom/SKILL.md", "User-owned skill");
    rmSync(join(f.root, ".agents/skills/oma-qa/SKILL.md"));
    createVendorWorkflowSymlinks(f.root, ["claude", "codex"], ["custom"]);
    expect(
      readFileSync(join(f.root, ".claude/skills/custom/notes.txt"), "utf8"),
    ).toBe("User notes");
    expect(
      readFileSync(join(f.root, ".codex/skills/custom/SKILL.md"), "utf8"),
    ).toBe("User-owned skill");
  });

  it("prunes stale ZCode and Copilot exposure using the definition root's requirements", () => {
    const f = fixture();
    const target = fixture().root;
    f.skill("oma-qa");
    installZcodeWorkflowCommands(f.root, target);
    installCopilotWorkflowPrompts(f.root, target);
    installPiPromptTemplates(f.root, target);
    expect(existsSync(join(target, ".zcode/commands/custom.md"))).toBe(true);
    expect(existsSync(join(target, ".github/prompts/custom.prompt.md"))).toBe(
      true,
    );
    expect(existsSync(join(target, ".pi/prompts/custom.md"))).toBe(true);
    rmSync(join(f.root, ".agents/skills/oma-qa/SKILL.md"));
    installZcodeWorkflowCommands(f.root, target);
    installCopilotWorkflowPrompts(f.root, target);
    installPiPromptTemplates(f.root, target);
    expect(existsSync(join(target, ".zcode/commands/custom.md"))).toBe(false);
    expect(existsSync(join(target, ".github/prompts/custom.prompt.md"))).toBe(
      false,
    );
    expect(existsSync(join(target, ".pi/prompts/custom.md"))).toBe(false);
  });

  it("keeps custom workflows without dependency metadata backward compatible", () => {
    const f = fixture();
    f.write(".agents/workflows/local.md", "# User-authored workflow\n");
    expect(inspectWorkflowAvailability(f.root, "local")).toMatchObject({
      available: true,
      required: [],
      conditional: [],
    });
  });

  it.each([
    "required: oma-qa",
    "required: null",
    "required: [../escape]",
    "required: [42]",
    "[invalid",
  ])("fails closed on malformed custom dependencies %j", (dependencies) => {
    const f = fixture();
    f.write(
      ".agents/workflows/custom.md",
      `---\nname: custom\ndependencies:\n  ${dependencies}\n---\n`,
    );
    expect(inspectWorkflowAvailability(f.root, "custom")).toMatchObject({
      available: false,
      issue: "workflow manifest missing, unreadable or invalid",
    });
  });

  it("fails closed on unfinished workflow frontmatter", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/custom.md",
      "---\nname: custom\ndependencies: {required: []}\n",
    );
    expect(inspectWorkflowAvailability(f.root, "custom").available).toBe(false);
  });

  it("does not expose a workflow when a dependency key is misspelled", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/custom.md",
      "---\nname: custom\ndependencies: {require: [oma-security]}\n---\n",
    );
    expect(inspectWorkflowAvailability(f.root, "custom")).toMatchObject({
      available: false,
      issue: "workflow manifest missing, unreadable or invalid",
    });
    expect(
      createVendorWorkflowSymlinks(f.root, ["claude"], ["custom"]).created,
    ).toEqual([]);
    expect(existsSync(join(f.root, ".claude/skills/custom/SKILL.md"))).toBe(
      false,
    );
  });

  it("does not weaken built-in requirements through custom dependency metadata", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/work.md",
      "---\nname: work\ndependencies: {required: []}\n---\n",
    );
    expect(inspectWorkflowAvailability(f.root, "work")).toMatchObject({
      available: false,
      missingRequired: expect.arrayContaining(["oma-coordination"]),
    });
  });

  it("removes legacy generated links but preserves links to unrelated files", () => {
    const f = fixture();
    f.write(".agents/skills/custom/SKILL.md", "<!-- oma:generated -->\n");
    mkdirSync(join(f.root, ".claude/skills"), { recursive: true });
    symlinkSync(
      join(f.root, ".agents/skills/custom"),
      join(f.root, ".claude/skills/custom"),
    );
    f.write("private/SKILL.md", "Private skill\n");
    mkdirSync(join(f.root, ".codex/skills/custom"), { recursive: true });
    symlinkSync(
      join(f.root, "private/SKILL.md"),
      join(f.root, ".codex/skills/custom/SKILL.md"),
    );
    createVendorWorkflowSymlinks(f.root, ["claude", "codex"], ["custom"]);
    expect(existsSync(join(f.root, ".claude/skills/custom"))).toBe(false);
    expect(
      readFileSync(join(f.root, ".codex/skills/custom/SKILL.md"), "utf8"),
    ).toBe("Private skill\n");
  });
});
