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
import { afterEach, describe, expect, it } from "vitest";
import { installCodexWorkflowSkills } from "./skills-installer.js";

function setupSource(root: string, workflows: Record<string, string>): void {
  const dir = join(root, ".agents", "workflows");
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(workflows)) {
    writeFileSync(join(dir, `${name}.md`), content);
  }
}

describe("installCodexWorkflowSkills", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  function mkTemp(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempRoots.push(dir);
    return dir;
  }

  it("generates SKILL.md wrappers for each top-level workflow", () => {
    const sourceDir = mkTemp("oma-codex-src-");
    const targetDir = mkTemp("oma-codex-dst-");
    setupSource(sourceDir, {
      ralph: "---\ndescription: Ralph loop\n---\n\n# body",
      debug: "---\ndescription: Bug diagnosis\n---\n\n# body",
    });

    installCodexWorkflowSkills(sourceDir, targetDir);

    const ralphFile = join(targetDir, ".codex", "skills", "ralph", "SKILL.md");
    const debugFile = join(targetDir, ".codex", "skills", "debug", "SKILL.md");
    expect(existsSync(ralphFile)).toBe(true);
    expect(existsSync(debugFile)).toBe(true);

    const ralphBody = readFileSync(ralphFile, "utf-8");
    expect(ralphBody).toContain("name: ralph");
    expect(ralphBody).toContain("description: Ralph loop");
    expect(ralphBody).toContain("<!-- oma:generated -->");
    expect(ralphBody).toContain(
      "Read and follow `.agents/workflows/ralph.md` step by step.",
    );
  });

  it("falls back to a default description when frontmatter is missing", () => {
    const sourceDir = mkTemp("oma-codex-src-");
    const targetDir = mkTemp("oma-codex-dst-");
    setupSource(sourceDir, {
      bare: "# no frontmatter here\n",
    });

    installCodexWorkflowSkills(sourceDir, targetDir);

    const body = readFileSync(
      join(targetDir, ".codex", "skills", "bare", "SKILL.md"),
      "utf-8",
    );
    expect(body).toContain("description: Workflow: bare");
  });

  it("skips subdirectories under workflows/", () => {
    const sourceDir = mkTemp("oma-codex-src-");
    const targetDir = mkTemp("oma-codex-dst-");
    setupSource(sourceDir, {
      ralph: "---\ndescription: Ralph\n---\n",
    });
    mkdirSync(join(sourceDir, ".agents", "workflows", "ralph", "resources"), {
      recursive: true,
    });
    writeFileSync(
      join(sourceDir, ".agents", "workflows", "ralph", "resources", "judge.md"),
      "nested",
    );

    installCodexWorkflowSkills(sourceDir, targetDir);

    expect(existsSync(join(targetDir, ".codex", "skills", "resources"))).toBe(
      false,
    );
    expect(existsSync(join(targetDir, ".codex", "skills", "judge"))).toBe(
      false,
    );
  });

  it("prunes stale oma-generated wrappers whose workflow was removed", () => {
    const sourceDir = mkTemp("oma-codex-src-");
    const targetDir = mkTemp("oma-codex-dst-");
    setupSource(sourceDir, { debug: "---\ndescription: Bug\n---\n" });

    const staleDir = join(targetDir, ".codex", "skills", "ralph");
    mkdirSync(staleDir, { recursive: true });
    writeFileSync(
      join(staleDir, "SKILL.md"),
      "---\nname: ralph\ndescription: old\n---\n<!-- oma:generated -->\n\nRead and follow `.agents/workflows/ralph.md` step by step.\n",
    );

    installCodexWorkflowSkills(sourceDir, targetDir);

    expect(existsSync(staleDir)).toBe(false);
    expect(
      existsSync(join(targetDir, ".codex", "skills", "debug", "SKILL.md")),
    ).toBe(true);
  });

  it("does not touch user-authored skills without the oma marker", () => {
    const sourceDir = mkTemp("oma-codex-src-");
    const targetDir = mkTemp("oma-codex-dst-");
    setupSource(sourceDir, { debug: "---\ndescription: Bug\n---\n" });

    const userDir = join(targetDir, ".codex", "skills", "my-custom");
    mkdirSync(userDir, { recursive: true });
    const userSkill =
      "---\nname: my-custom\ndescription: User skill\n---\nHi\n";
    writeFileSync(join(userDir, "SKILL.md"), userSkill);

    installCodexWorkflowSkills(sourceDir, targetDir);

    expect(readFileSync(join(userDir, "SKILL.md"), "utf-8")).toBe(userSkill);
  });

  it("is idempotent on repeated calls", () => {
    const sourceDir = mkTemp("oma-codex-src-");
    const targetDir = mkTemp("oma-codex-dst-");
    setupSource(sourceDir, { ralph: "---\ndescription: Ralph\n---\n" });

    installCodexWorkflowSkills(sourceDir, targetDir);
    const first = readFileSync(
      join(targetDir, ".codex", "skills", "ralph", "SKILL.md"),
      "utf-8",
    );
    installCodexWorkflowSkills(sourceDir, targetDir);
    const second = readFileSync(
      join(targetDir, ".codex", "skills", "ralph", "SKILL.md"),
      "utf-8",
    );
    expect(second).toBe(first);
  });

  it("does nothing when the workflows source does not exist", () => {
    const sourceDir = mkTemp("oma-codex-src-");
    const targetDir = mkTemp("oma-codex-dst-");

    installCodexWorkflowSkills(sourceDir, targetDir);

    expect(existsSync(join(targetDir, ".codex", "skills"))).toBe(false);
  });
});
