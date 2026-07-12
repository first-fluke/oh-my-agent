import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  discoverSkillDirs,
  emitAgentSkills,
  transformSkill,
  validateSkillFrontmatter,
} from "./agent-skills.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");

describe("validateSkillFrontmatter", () => {
  it("passes a conformant name + description", () => {
    const result = validateSkillFrontmatter(
      "valid-skill",
      {
        name: "valid-skill",
        description: "A conformant description.",
      },
      10,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a name that does not match the directory", () => {
    const result = validateSkillFrontmatter(
      "invalid-skill",
      { name: "Invalid_Name", description: "x" },
      1,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("rejects an uppercase/underscore name even when it matches the directory", () => {
    const result = validateSkillFrontmatter(
      "Invalid_Name",
      { name: "Invalid_Name", description: "x" },
      1,
    );
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("lowercase alphanumeric")),
    ).toBe(true);
  });

  it("rejects a missing or empty description", () => {
    const result = validateSkillFrontmatter(
      "valid-skill",
      { name: "valid-skill", description: "" },
      1,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "description")).toBe(true);
  });

  it("rejects a description over 1024 chars", () => {
    const result = validateSkillFrontmatter(
      "valid-skill",
      { name: "valid-skill", description: "x".repeat(1025) },
      1,
    );
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("must be 1-1024")),
    ).toBe(true);
  });

  it("warns (but does not fail) on unrecognized frontmatter fields", () => {
    const result = validateSkillFrontmatter(
      "valid-skill",
      { name: "valid-skill", description: "ok", extraField: "nope" },
      1,
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.field === "extraField")).toBe(true);
  });

  it("warns when the body exceeds the recommended 500-line budget", () => {
    const result = validateSkillFrontmatter(
      "valid-skill",
      { name: "valid-skill", description: "ok" },
      501,
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.field === "body")).toBe(true);
  });
});

describe("transformSkill", () => {
  it("passes short bodies through unchanged and drops unrecognized fields", () => {
    const result = transformSkill(
      { name: "valid-skill", description: "ok", extraField: "drop me" },
      "short body",
    );
    expect(result.frontmatter).toEqual({
      name: "valid-skill",
      description: "ok",
    });
    expect(result.body).toBe("short body");
    expect(result.overflow).toBeUndefined();
  });

  it("preserves optional spec fields", () => {
    const result = transformSkill(
      { name: "valid-skill", description: "ok", license: "MIT" },
      "short body",
    );
    expect(result.frontmatter).toEqual({
      name: "valid-skill",
      description: "ok",
      license: "MIT",
    });
  });

  it("splits bodies over 500 lines into head + overflow", () => {
    const lines = Array.from({ length: 550 }, (_, i) => `line ${i}`);
    const result = transformSkill(
      { name: "valid-skill", description: "ok" },
      lines.join("\n"),
    );
    expect(result.overflow).toBeDefined();
    expect(result.body).toContain("references/overflow.md");
    expect(
      result.body.split("\n").filter((l) => l.startsWith("line ")),
    ).toHaveLength(500);
    expect(result.overflow).toContain("line 500");
    expect(result.overflow).toContain("line 549");
  });
});

describe("discoverSkillDirs", () => {
  it("finds skill dirs and excludes _shared/dotfiles", () => {
    const dirs = discoverSkillDirs(FIXTURES_REPO);
    expect(dirs).toEqual([
      "folded-desc-skill",
      "invalid-skill",
      "oversized-skill",
      "valid-skill",
    ]);
  });
});

describe("emitAgentSkills", () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("emits every skill with per-skill validation results", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agent-skills-"));
    const results = emitAgentSkills(FIXTURES_REPO, outDir);

    expect(results.map((r) => r.skill)).toEqual([
      "folded-desc-skill",
      "invalid-skill",
      "oversized-skill",
      "valid-skill",
    ]);

    const valid = results.find((r) => r.skill === "valid-skill");
    expect(valid?.validation.valid).toBe(true);
    expect(valid?.overflowed).toBe(false);

    const invalid = results.find((r) => r.skill === "invalid-skill");
    expect(invalid?.validation.valid).toBe(false);

    const oversized = results.find((r) => r.skill === "oversized-skill");
    expect(oversized?.overflowed).toBe(true);
  });

  it("writes a conformant SKILL.md for the valid fixture", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agent-skills-"));
    emitAgentSkills(FIXTURES_REPO, outDir);

    const written = readFileSync(
      path.join(outDir, "valid-skill", "SKILL.md"),
      "utf-8",
    );
    expect(written).toContain("name: valid-skill");
    expect(written).toContain("# Valid Skill");
  });

  it("trims the trailing newline a YAML folded description carries", async () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agent-skills-"));
    emitAgentSkills(FIXTURES_REPO, outDir);

    const { parseFrontmatter } = await import("../../utils/frontmatter.js");
    const written = readFileSync(
      path.join(outDir, "folded-desc-skill", "SKILL.md"),
      "utf-8",
    );
    const { frontmatter } = parseFrontmatter(written);
    expect(frontmatter.description).not.toMatch(/\n/);
    expect(frontmatter.description).not.toMatch(/\s$/);
  });

  it("splits the oversized fixture into SKILL.md + references/overflow.md", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agent-skills-"));
    emitAgentSkills(FIXTURES_REPO, outDir);

    const skillMd = readFileSync(
      path.join(outDir, "oversized-skill", "SKILL.md"),
      "utf-8",
    );
    const overflow = readFileSync(
      path.join(outDir, "oversized-skill", "references", "overflow.md"),
      "utf-8",
    );
    expect(skillMd).toContain("references/overflow.md");
    expect(overflow.length).toBeGreaterThan(0);
  });
});
