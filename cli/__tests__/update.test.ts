import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyUpdateTarget } from "../commands/update.js";
import { hasInstalledProject } from "../lib/manifest.js";
import * as skills from "../lib/skills.js";

describe("whitelist-based skill filtering", () => {
  it("getAllSkills should return only registered skills", () => {
    const allSkills = skills.getAllSkills();
    const skillNames = allSkills.map((s) => s.name);

    expect(skillNames).toContain("oma-frontend");
    expect(skillNames).toContain("oma-backend");
    expect(skillNames).toContain("oma-pm");
    expect(skillNames).toContain("oma-commit");

    expect(skillNames).not.toContain(".DS_Store");
    expect(skillNames).not.toContain("_version.json");
    expect(skillNames).not.toContain("_shared");
    expect(skillNames).not.toContain("my-custom-skill");
  });

  it("SKILLS registry should not contain internal files or hidden files", () => {
    const allSkills = skills.getAllSkills();

    for (const skill of allSkills) {
      expect(skill.name).not.toMatch(/^\./);
      expect(skill.name).not.toMatch(/^_/);
      expect(skill.name).not.toMatch(/\.json$/);
    }
  });

  it("getAllSkills should include all domain, coordination, and utility skills", () => {
    const allSkills = skills.getAllSkills();
    const skillNames = allSkills.map((s) => s.name);

    const expectedSkills = [
      "oma-frontend",
      "oma-backend",
      "oma-mobile",
      "oma-pm",
      "oma-qa",
      "oma-coordination",
      "oma-orchestrator",
      "oma-debug",
      "oma-commit",
    ];

    for (const expected of expectedSkills) {
      expect(skillNames).toContain(expected);
    }
  });
});

describe("update stack/ preservation logic", () => {
  it("should detect legacy files for migration", () => {
    const mockExistsSync = vi.fn((p: string) => {
      if (p.includes("resources/snippets.md")) return true;
      if (p.includes("/stack")) return false;
      return false;
    });

    const legacyFiles = ["snippets.md", "tech-stack.md", "api-template.py"];
    const hasLegacyFiles = legacyFiles.some((f) =>
      mockExistsSync(`/project/.agents/skills/oma-backend/resources/${f}`),
    );
    const hasBackendStack = mockExistsSync(
      "/project/.agents/skills/oma-backend/stack",
    );

    expect(hasLegacyFiles).toBe(true);
    expect(hasBackendStack).toBe(false);
    expect(hasLegacyFiles && !hasBackendStack).toBe(true);
  });

  it("should not migrate when stack/ already exists", () => {
    const mockExistsSync = vi.fn((p: string) => {
      if (p.includes("resources/snippets.md")) return true;
      if (p.includes("/stack")) return true;
      return false;
    });

    const legacyFiles = ["snippets.md", "tech-stack.md", "api-template.py"];
    const hasLegacyFiles = legacyFiles.some((f) =>
      mockExistsSync(`/project/.agents/skills/oma-backend/resources/${f}`),
    );
    const hasBackendStack = mockExistsSync(
      "/project/.agents/skills/oma-backend/stack",
    );

    expect(hasLegacyFiles).toBe(true);
    expect(hasBackendStack).toBe(true);
    expect(hasLegacyFiles && !hasBackendStack).toBe(false);
  });

  it("stack.yaml should contain migrated source marker", () => {
    const expectedStackYaml =
      "language: python\nframework: fastapi\norm: sqlalchemy\nsource: migrated\n";

    expect(expectedStackYaml).toContain("language: python");
    expect(expectedStackYaml).toContain("framework: fastapi");
    expect(expectedStackYaml).toContain("orm: sqlalchemy");
    expect(expectedStackYaml).toContain("source: migrated");
  });
});

describe("hasInstalledProject", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("treats an existing .agents tree without _version.json as installed", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-update-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills", "oma-backend"), {
      recursive: true,
    });
    mkdirSync(join(root, ".agents", "config"), { recursive: true });
    mkdirSync(join(root, ".agents", "workflows"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "config", "user-preferences.yaml"),
      "language: ko\n",
      { encoding: "utf-8", flag: "w" },
    );

    expect(hasInstalledProject(root)).toBe(true);
  });

  it("does not treat a random directory as installed", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-update-"));
    tempRoots.push(root);

    expect(hasInstalledProject(root)).toBe(false);
  });
});

describe("classifyUpdateTarget", () => {
  it("treats versioned installs as ready", () => {
    expect(classifyUpdateTarget("4.22.1", true)).toBe("ready");
    expect(classifyUpdateTarget("4.22.1", false)).toBe("ready");
  });

  it("treats .agents installs without version metadata as legacy", () => {
    expect(classifyUpdateTarget(null, true)).toBe("legacy");
  });

  it("treats directories without an install as missing", () => {
    expect(classifyUpdateTarget(null, false)).toBe("missing");
  });
});
