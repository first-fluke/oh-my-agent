/**
 * Drift guard: every skill under .agents/skills/ must be registered in the
 * generated SKILLS registry (run `bun run generate:skill-data` after adding a
 * skill) and documented with a table row in README.md and every locale
 * docs/README.*.md. Added after oma-refactor shipped without either.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SKILLS } from "./skill-data.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function skillDirNames(): string[] {
  const skillsDir = join(repoRoot, ".agents", "skills");
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        !e.name.startsWith("_") &&
        existsSync(join(skillsDir, e.name, "SKILL.md")),
    )
    .map((e) => e.name)
    .sort();
}

function readmePaths(): string[] {
  const docsDir = join(repoRoot, "docs");
  const locales = readdirSync(docsDir)
    .filter((f) => /^README\.[a-z]{2}\.md$/.test(f))
    .map((f) => join(docsDir, f));
  return [join(repoRoot, "README.md"), ...locales];
}

describe("skill registry drift guard", () => {
  const dirs = skillDirNames();
  const registered = Object.values(SKILLS)
    .flat()
    .map((s) => s.name)
    .sort();

  it("every .agents/skills/ directory is in the generated SKILLS registry", () => {
    const missing = dirs.filter((d) => !registered.includes(d));
    expect(
      missing,
      `Missing from cli/constants/skill-data.ts. Run \`bun run generate:skill-data\`: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every SKILLS registry entry has a skill directory (no stale entries)", () => {
    const stale = registered.filter((r) => !dirs.includes(r));
    expect(
      stale,
      `Stale entries in skill-data.ts without a skill directory: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("every skill has a table row in README.md and all docs/README.*.md", () => {
    const failures: string[] = [];
    for (const path of readmePaths()) {
      const content = readFileSync(path, "utf-8");
      for (const skill of dirs) {
        if (!content.includes(`| **${skill}** |`)) {
          failures.push(`${path.replace(`${repoRoot}/`, "")}: ${skill}`);
        }
      }
    }
    expect(
      failures,
      `READMEs missing a skill row:\n${failures.join("\n")}`,
    ).toEqual([]);
  });
});
