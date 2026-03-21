import { describe, expect, it, vi, beforeEach } from "vitest";
import * as skills from "../lib/skills.js";

vi.mock("../lib/manifest.js", () => ({
  fetchRemoteManifest: vi.fn(),
  getLocalVersion: vi.fn(),
  saveLocalVersion: vi.fn(),
}));

vi.mock("../lib/tarball.js", () => ({
  downloadAndExtract: vi.fn(),
}));

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
