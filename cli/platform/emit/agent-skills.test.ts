import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

  it("excludes junk resource entries while keeping legitimate resource files", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agent-skills-"));
    emitAgentSkills(FIXTURES_REPO, outDir);

    const resourcesDir = path.join(outDir, "valid-skill", "resources");
    expect(existsSync(path.join(resourcesDir, "node_modules"))).toBe(false);
    expect(existsSync(path.join(resourcesDir, ".DS_Store"))).toBe(false);
    expect(existsSync(path.join(resourcesDir, "reference.txt"))).toBe(true);
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

  describe("individually installed skills", () => {
    function emitIsolatedSkill(body?: string): string {
      outDir = mkdtempSync(path.join(tmpdir(), "oma-portable-skill-"));
      const repoRoot = path.join(outDir, "repo");
      const emittedRoot = path.join(outDir, "emitted");
      const installedSkill = path.join(outDir, "installed", "portable-skill");
      const files: Record<string, string> = {
        ".agents/skills/portable-skill/SKILL.md": [
          "---",
          "name: portable-skill",
          "description: A skill that depends on shared resources.",
          "---",
          body ??
            [
              "Read `.agents/skills/_shared/core/policy.md`.",
              "Read [Contract](../_shared/runtime/contract.md#result).",
              "Follow [Guide](resources/nested/guide.md).",
              "See https://example.test/.agents/skills/_shared/core/policy.md#remote.",
              "Example source path: `src/_shared/core/policy.md`.",
            ].join("\n"),
        ].join("\n"),
        ".agents/skills/portable-skill/resources/nested/guide.md": [
          "# Guide",
          "Read [Policy](../../../_shared/core/policy.md#authorization).",
          "Read `.agents/skills/_shared/runtime/contract.md`.",
        ].join("\n"),
        ".agents/skills/_shared/core/policy.md": [
          "# Policy",
          "## Authorization",
          "Follow [Contract](../runtime/contract.md#result).",
        ].join("\n"),
        ".agents/skills/_shared/runtime/contract.md": [
          "# Contract",
          "## Result",
          "Read [Checklist](checklist.md#verify).",
          "Return to [Policy](../core/policy.md#authorization).",
        ].join("\n"),
        ".agents/skills/_shared/runtime/checklist.md": [
          "# Checklist",
          "## Verify",
          "Verify the result.",
        ].join("\n"),
      };
      for (const [relativePath, content] of Object.entries(files)) {
        const filePath = path.join(repoRoot, relativePath);
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, content);
      }

      emitAgentSkills(repoRoot, emittedRoot);
      mkdirSync(path.dirname(installedSkill), { recursive: true });
      cpSync(path.join(emittedRoot, "portable-skill"), installedSkill, {
        recursive: true,
      });
      rmSync(repoRoot, { recursive: true });
      rmSync(emittedRoot, { recursive: true });
      return installedSkill;
    }

    it("resolves shared resources after copying only one emitted skill", () => {
      const installedSkill = emitIsolatedSkill();
      const skillMd = readFileSync(
        path.join(installedSkill, "SKILL.md"),
        "utf-8",
      );
      expect(skillMd).toContain("`references/_shared/core/policy.md`");
      expect(skillMd).toContain(
        "[Contract](references/_shared/runtime/contract.md#result)",
      );
      expect(skillMd).toContain("[Guide](resources/nested/guide.md)");

      const policy = readFileSync(
        path.join(installedSkill, "references/_shared/core/policy.md"),
        "utf-8",
      );
      expect(policy).toContain("[Contract](../runtime/contract.md#result)");
      const contract = readFileSync(
        path.join(installedSkill, "references/_shared/runtime/contract.md"),
        "utf-8",
      );
      expect(contract).toContain("[Checklist](checklist.md#verify)");
      expect(contract).toContain("[Policy](../core/policy.md#authorization)");
      expect(
        readFileSync(
          path.join(installedSkill, "references/_shared/runtime/checklist.md"),
          "utf-8",
        ),
      ).toContain("Verify the result.");
    });

    it("rewrites nested resources while preserving URLs and unrelated source paths", () => {
      const installedSkill = emitIsolatedSkill();
      const guide = readFileSync(
        path.join(installedSkill, "resources/nested/guide.md"),
        "utf-8",
      );
      expect(guide).toContain(
        "[Policy](../../references/_shared/core/policy.md#authorization)",
      );
      expect(guide).toContain("`../../references/_shared/runtime/contract.md`");
      const skillMd = readFileSync(
        path.join(installedSkill, "SKILL.md"),
        "utf-8",
      );
      expect(skillMd).toContain(
        "https://example.test/.agents/skills/_shared/core/policy.md#remote",
      );
      expect(skillMd).toContain("`src/_shared/core/policy.md`");
    });

    it("resolves shared paths relative to the generated overflow file", () => {
      const body = [
        ...Array.from({ length: 501 }, (_, index) => `line ${index}`),
        "Read [Policy](.agents/skills/_shared/core/policy.md#authorization).",
      ].join("\n");
      const installedSkill = emitIsolatedSkill(body);
      const overflow = readFileSync(
        path.join(installedSkill, "references/overflow.md"),
        "utf-8",
      );
      expect(overflow).toContain(
        "[Policy](_shared/core/policy.md#authorization)",
      );
      expect(
        existsSync(
          path.join(installedSkill, "references/_shared/core/policy.md"),
        ),
      ).toBe(true);
    });

    it("removes obsolete bundled shared resources when emitting again", () => {
      outDir = mkdtempSync(path.join(tmpdir(), "oma-portable-skill-cleanup-"));
      const repoRoot = path.join(outDir, "repo");
      const emittedRoot = path.join(outDir, "emitted");
      const skillDir = path.join(repoRoot, ".agents/skills/portable-skill");
      const sharedDir = path.join(repoRoot, ".agents/skills/_shared/core");
      mkdirSync(path.join(skillDir, "references"), { recursive: true });
      mkdirSync(sharedDir, { recursive: true });
      writeFileSync(path.join(sharedDir, "policy.md"), "# Shared policy");
      writeFileSync(
        path.join(skillDir, "references/local.md"),
        "# Local guide",
      );
      const frontmatter = [
        "---",
        "name: portable-skill",
        "description: A skill whose shared dependencies change.",
        "---",
        "",
      ].join("\n");
      writeFileSync(
        path.join(skillDir, "SKILL.md"),
        `${frontmatter}Read \`.agents/skills/_shared/core/policy.md\`.`,
      );
      emitAgentSkills(repoRoot, emittedRoot);
      const bundledPolicy = path.join(
        emittedRoot,
        "portable-skill/references/_shared/core/policy.md",
      );
      expect(existsSync(bundledPolicy)).toBe(true);

      writeFileSync(
        path.join(skillDir, "SKILL.md"),
        `${frontmatter}Read [Local guide](references/local.md).`,
      );
      emitAgentSkills(repoRoot, emittedRoot);
      expect(existsSync(bundledPolicy)).toBe(false);
      expect(
        readFileSync(
          path.join(emittedRoot, "portable-skill/references/local.md"),
          "utf-8",
        ),
      ).toBe("# Local guide");
    });
  });
});
