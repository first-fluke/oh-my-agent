import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { WORKFLOW_DEPENDENCIES } from "../../platform/skills-installer/workflow-dependencies.js";
import { migrateRemoveCoordinationSkill } from "./037-remove-coordination-skill.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
});

function projectWithSkill(frontmatterName: string): {
  root: string;
  dir: string;
} {
  const root = mkdtempSync(join(tmpdir(), "oma-migrate-037-"));
  tempRoots.push(root);
  const dir = join(root, ".agents", "skills", "oma-coordination");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${frontmatterName}\ndescription: fixture\n---\n\n# Rules\n`,
  );
  return { root, dir };
}

describe("migrateRemoveCoordinationSkill (037)", () => {
  it("removes the shipped skill and is then a no-op", () => {
    const { root, dir } = projectWithSkill("oma-coordination");

    expect(migrateRemoveCoordinationSkill.up(root)).toEqual([
      ".agents/skills/oma-coordination (removed retired skill)",
    ]);
    expect(existsSync(dir)).toBe(false);
    expect(migrateRemoveCoordinationSkill.up(root)).toEqual([]);
  });

  it("leaves a project skill that only reuses the directory name", () => {
    const { root, dir } = projectWithSkill("team-coordination");

    expect(migrateRemoveCoordinationSkill.up(root)).toEqual([]);
    expect(existsSync(join(dir, "SKILL.md"))).toBe(true);
  });

  it("does nothing when the skill is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-037-"));
    tempRoots.push(root);

    expect(migrateRemoveCoordinationSkill.up(root)).toEqual([]);
  });

  // Regression: four workflows required a skill that only carried shared
  // rules, so removing it would have disabled them. The rules must stay
  // reachable from a file every install has.
  it("leaves no workflow depending on the retired skill", () => {
    for (const { required, conditional } of Object.values(
      WORKFLOW_DEPENDENCIES,
    )) {
      expect([...required, ...conditional]).not.toContain("oma-coordination");
    }
    for (const workflow of ["work", "orchestrate", "ultrawork"]) {
      const body = readFileSync(
        join(repoRoot, ".agents", "workflows", `${workflow}.md`),
        "utf-8",
      );
      expect(body).not.toContain("oma-coordination");
      expect(body).toContain("_shared/core/collaboration-policy.md");
    }
    expect(
      readFileSync(
        join(
          repoRoot,
          ".agents",
          "skills",
          "_shared",
          "core",
          "collaboration-policy.md",
        ),
        "utf-8",
      ),
    ).toContain("## Coordination rules");
  });
});
