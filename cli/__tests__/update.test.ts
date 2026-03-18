import { describe, expect, it, vi } from "vitest";
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

    expect(skillNames).toContain("frontend-agent");
    expect(skillNames).toContain("backend-agent");
    expect(skillNames).toContain("pm-agent");
    expect(skillNames).toContain("commit");

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
      "frontend-agent",
      "backend-agent",
      "mobile-agent",
      "pm-agent",
      "qa-agent",
      "workflow-guide",
      "orchestrator",
      "debug-agent",
      "commit",
    ];

    for (const expected of expectedSkills) {
      expect(skillNames).toContain(expected);
    }
  });
});
