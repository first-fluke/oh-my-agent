import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../cli-kit/frontmatter.js";
import { installVendorAgents } from "../../platform/agent-composer.js";

const GEMINI_ALLOWED_FRONTMATTER_KEYS = new Set([
  "name",
  "description",
  "kind",
  "tools",
  "mcpServers",
  "model",
  "temperature",
  "max_turns",
  "timeout_mins",
]);

describe("gemini agent generation smoke test", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("generates Gemini-compatible agent definitions for all core agents", () => {
    const repoRoot = join(__dirname, "..", "..", "..");
    const outputRoot = mkdtempSync(join(tmpdir(), "oma-gemini-smoke-"));
    tempRoots.push(outputRoot);

    installVendorAgents(repoRoot, outputRoot, "gemini");

    const generatedDir = join(outputRoot, ".gemini", "agents");
    const generatedFiles = readdirSync(generatedDir).filter((entry) =>
      entry.endsWith(".md"),
    );

    expect(generatedFiles.length).toBeGreaterThan(0);

    for (const file of generatedFiles) {
      const sourcePath = join(repoRoot, ".agents", "agents", file);
      const generatedPath = join(generatedDir, file);

      const source = parseFrontmatter(readFileSync(sourcePath, "utf-8"));
      const generated = parseFrontmatter(readFileSync(generatedPath, "utf-8"));

      for (const key of Object.keys(generated.frontmatter)) {
        expect(
          GEMINI_ALLOWED_FRONTMATTER_KEYS.has(key),
          `${file} contains unsupported Gemini frontmatter key: ${key}`,
        ).toBe(true);
      }

      expect(
        generated.frontmatter.skills,
        `${file} should not emit skills`,
      ).toBe(undefined);

      if (Array.isArray(source.frontmatter.skills)) {
        expect(generated.body).toContain("## Skill References");

        for (const skill of source.frontmatter.skills) {
          expect(generated.body).toContain(
            `.agents/skills/${String(skill)}/SKILL.md`,
          );
        }
      }
    }
  });
});
