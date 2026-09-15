import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applySkillOverlay,
  resolveEffectiveSkill,
  rollbackSkillOverlay,
  skillOverlayMdPath,
} from "./skill-overlays.js";
import {
  assertSkillOverlayVendorLinks,
  createVendorSymlinks,
  isProjectLocalSkillPath,
} from "./skills-installer/skill-symlinks.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function setup(): string {
  const workspace = join(
    tmpdir(),
    `oma-overlay-${process.pid}-${Math.random()}`,
  );
  roots.push(workspace);
  const skill = join(workspace, ".agents", "skills", "demo");
  mkdirSync(join(skill, "resources"), { recursive: true });
  writeFileSync(join(skill, "resources", "note.md"), "resource");
  writeFileSync(
    join(skill, "SKILL.md"),
    "# base\n[resource](resources/note.md)\n",
  );
  return workspace;
}

function apply(workspace: string, body: string): void {
  const current = resolveEffectiveSkill(workspace, "demo");
  applySkillOverlay({
    workspace,
    skillId: "demo",
    body,
    expectedBaseHash: current.baseHash,
    expectedEffectiveHash: current.effectiveHash,
  });
}

describe("skill overlays", () => {
  it("pins the base, projects relative resources, and falls back after an update", () => {
    const workspace = setup();
    apply(workspace, "# overlay\n[resource](resources/note.md)\n");
    const active = resolveEffectiveSkill(workspace, "demo");
    expect(active.kind).toBe("overlay");
    expect(
      readFileSync(join(active.directory, "resources", "note.md"), "utf-8"),
    ).toBe("resource");

    writeFileSync(
      join(workspace, ".agents", "skills", "demo", "SKILL.md"),
      "# updated base\n",
    );
    const conflicted = resolveEffectiveSkill(workspace, "demo");
    expect(conflicted).toMatchObject({
      kind: "base",
      conflict: "base-changed",
      body: "# updated base\n",
    });
  });

  it("does not activate a new body when the active-pointer write fails", () => {
    const workspace = setup();
    apply(workspace, "# first\n");
    const before = resolveEffectiveSkill(workspace, "demo");
    expect(() =>
      applySkillOverlay({
        workspace,
        skillId: "demo",
        body: "# never active\n",
        expectedBaseHash: before.baseHash,
        expectedEffectiveHash: before.effectiveHash,
        _writeActivePointer: () => {
          throw new Error("pointer failure");
        },
      }),
    ).toThrow("pointer failure");
    expect(resolveEffectiveSkill(workspace, "demo").body).toBe("# first\n");
    apply(workspace, "# never active\n");
    expect(resolveEffectiveSkill(workspace, "demo").body).toBe(
      "# never active\n",
    );
  });

  it("rolls a first overlay back to the current managed base after an update", () => {
    const workspace = setup();
    const base = resolveEffectiveSkill(workspace, "demo");
    apply(workspace, "# overlay\n");
    const overlay = resolveEffectiveSkill(workspace, "demo");
    writeFileSync(
      join(workspace, ".agents", "skills", "demo", "SKILL.md"),
      "# updated base\n",
    );
    rollbackSkillOverlay({
      workspace,
      skillId: "demo",
      expectedCandidateHash: overlay.effectiveHash,
      parentHash: base.effectiveHash,
      parentBody: base.body,
    });
    expect(resolveEffectiveSkill(workspace, "demo")).toMatchObject({
      kind: "base",
      body: "# updated base\n",
    });
  });

  it("returns native vendor links to base when an update conflicts", () => {
    const workspace = setup();
    apply(workspace, "# overlay\n");
    mkdirSync(join(workspace, ".claude", "skills"), { recursive: true });
    createVendorSymlinks(workspace, ["claude"], ["demo"]);
    expect(
      readFileSync(
        join(workspace, ".claude", "skills", "demo", "SKILL.md"),
        "utf-8",
      ),
    ).toBe("# overlay\n");
    writeFileSync(
      join(workspace, ".agents", "skills", "demo", "SKILL.md"),
      "# updated base\n",
    );
    createVendorSymlinks(workspace, ["claude"], ["demo"]);
    expect(
      readFileSync(
        join(workspace, ".claude", "skills", "demo", "SKILL.md"),
        "utf-8",
      ),
    ).toBe("# updated base\n");
  });

  it("keeps immutable version bodies when a later overlay is applied", () => {
    const workspace = setup();
    apply(workspace, "# one\n");
    const first = resolveEffectiveSkill(workspace, "demo");
    apply(workspace, "# two\n");
    const second = resolveEffectiveSkill(workspace, "demo");
    expect(readFileSync(first.skillMdPath, "utf-8")).toBe("# one\n");
    expect(readFileSync(second.skillMdPath, "utf-8")).toBe("# two\n");
    expect(existsSync(skillOverlayMdPath(workspace, "demo"))).toBe(true);
  });

  it("restores the prior overlay, then deactivates the first overlay", () => {
    const workspace = setup();
    const base = resolveEffectiveSkill(workspace, "demo");
    apply(workspace, "# one\n");
    const first = resolveEffectiveSkill(workspace, "demo");
    apply(workspace, "# two\n");
    const second = resolveEffectiveSkill(workspace, "demo");
    rollbackSkillOverlay({
      workspace,
      skillId: "demo",
      expectedCandidateHash: second.effectiveHash,
      parentHash: first.effectiveHash,
      parentBody: first.body,
    });
    expect(resolveEffectiveSkill(workspace, "demo").body).toBe("# one\n");
    rollbackSkillOverlay({
      workspace,
      skillId: "demo",
      expectedCandidateHash: first.effectiveHash,
      parentHash: base.effectiveHash,
      parentBody: base.body,
    });
    expect(resolveEffectiveSkill(workspace, "demo").body).toBe(base.body);
  });

  it("does not rebind a restored overlay to a changed managed base", () => {
    const workspace = setup();
    apply(workspace, "# one\n");
    const first = resolveEffectiveSkill(workspace, "demo");
    apply(workspace, "# two\n");
    const second = resolveEffectiveSkill(workspace, "demo");
    writeFileSync(
      join(workspace, ".agents", "skills", "demo", "SKILL.md"),
      "# updated base\n",
    );
    rollbackSkillOverlay({
      workspace,
      skillId: "demo",
      expectedCandidateHash: second.effectiveHash,
      parentHash: first.effectiveHash,
      parentBody: first.body,
    });
    expect(resolveEffectiveSkill(workspace, "demo")).toMatchObject({
      kind: "base",
      conflict: "base-changed",
      body: "# updated base\n",
    });
  });

  it("keeps a project's automatic overlay refresh out of another scope", () => {
    expect(
      isProjectLocalSkillPath("/projects/a/.claude/skills", "/projects/a"),
    ).toBe(true);
    expect(
      isProjectLocalSkillPath("/projects/b/.claude/skills", "/projects/a"),
    ).toBe(false);
    expect(
      isProjectLocalSkillPath(
        "/Users/example/.gemini/antigravity-cli/skills",
        "/projects/a",
      ),
    ).toBe(false);
  });

  it("refuses an overlay if a local vendor has an unmanaged real skill copy", () => {
    const workspace = setup();
    mkdirSync(join(workspace, ".claude", "skills", "demo"), {
      recursive: true,
    });
    expect(() => assertSkillOverlayVendorLinks(workspace, "demo")).toThrow(
      /real vendor skill directory/,
    );
  });
});
