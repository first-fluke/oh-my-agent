import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import { LINT_MAX_BODY_LINES, lintSkills } from "./lint.js";

const SSL_LITE_BODY = `
# Test Skill

## Scheduling

### Goal
Do the thing.

### When to use
- Positive case

### When NOT to use
- Boundary case -> use other skill

## Structural Flow

### Failure and recovery
| Failure | Recovery |
|---------|----------|
| Command exits non-zero because the fixture is stale | Regenerate the fixture with the seed script |

## Logical Operations

### Canonical workflow path
1. Step one
2. Step two

## References
- Template: \`resources/template.md\`
`;

function writeSkill(
  root: string,
  name: string,
  options: {
    description?: string;
    body?: string;
    resources?: string[];
    omitName?: boolean;
  } = {},
): void {
  const dir = join(root, INSTALLED_SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  const description =
    options.description ??
    "A routing-grade description long enough to carry trigger phrases and domains";
  const nameLine = options.omitName ? "" : `name: ${name}\n`;
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\n${nameLine}description: ${description}\n---\n${options.body ?? SSL_LITE_BODY}`,
  );
  for (const resource of options.resources ?? []) {
    const resourcePath = join(dir, resource);
    mkdirSync(join(resourcePath, ".."), { recursive: true });
    writeFileSync(resourcePath, "# resource\n");
  }
}

describe("lintSkills", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-skills-lint-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("passes a well-formed ssl-lite skill", () => {
    writeSkill(workspace, "oma-clean", {
      resources: ["resources/template.md"],
    });
    const report = lintSkills(workspace);
    expect(report.skillCount).toBe(1);
    expect(report.sslLiteCount).toBe(1);
    expect(report.smells).toHaveLength(0);
    expect(report.cleanCount).toBe(1);
  });

  it("fails on missing frontmatter name and description", () => {
    writeSkill(workspace, "oma-bare", {
      omitName: true,
      description: " ",
      body: "# Bare\n\nJust prose.\n",
    });
    const report = lintSkills(workspace);
    const ids = report.smells.map((s) => s.smell);
    expect(ids).toContain("missing-name");
    expect(ids).toContain("missing-description");
    expect(report.smells.every((s) => s.severity === "fail")).toBe(true);
  });

  it("warns on a thin description", () => {
    writeSkill(workspace, "oma-thin", {
      description: "Short blurb",
      body: "# Thin\n\nProse only.\n",
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).toContain("weak-description");
  });

  it("warns when the SKILL.md body exceeds the 500-line cap", () => {
    writeSkill(workspace, "oma-bloated", {
      body: `# Bloated\n\n${"Filler line.\n".repeat(LINT_MAX_BODY_LINES)}`,
    });
    const report = lintSkills(workspace);
    const smell = report.smells.find((s) => s.smell === "body-too-long");
    expect(smell?.severity).toBe("warn");
  });

  it("does not flag a body at the 500-line cap", () => {
    writeSkill(workspace, "oma-atcap", {
      body: `${"Filler line.\n".repeat(LINT_MAX_BODY_LINES - 1)}`,
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).not.toContain("body-too-long");
  });

  it("warns on leftover template placeholders outside code", () => {
    writeSkill(workspace, "oma-placeholder", {
      body: "# P\n\n{Boundary case} -> out of scope\n",
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).toContain("template-placeholder");
  });

  it("ignores placeholders inside fenced and inline code", () => {
    writeSkill(workspace, "oma-code", {
      body: "# C\n\nUse `.claude/agents/{Name}.md` and:\n\n```\n{Not A Placeholder}\n```\n",
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).not.toContain(
      "template-placeholder",
    );
  });

  it("fails on a broken resources/ reference", () => {
    writeSkill(workspace, "oma-broken", {
      body: "# B\n\nSee `resources/missing-file.md` for details.\n",
    });
    const report = lintSkills(workspace);
    const broken = report.smells.find((s) => s.smell === "broken-reference");
    expect(broken).toBeDefined();
    expect(broken?.severity).toBe("fail");
    expect(broken?.detail).toContain("resources/missing-file.md");
  });

  it("does not flag glob references", () => {
    writeSkill(workspace, "oma-glob", {
      body: "# G\n\nOutputs land in resources/*.md files.\n",
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).not.toContain("broken-reference");
  });

  it("fails ssl-lite skills with deviant top-level sections", () => {
    writeSkill(workspace, "oma-deviant", {
      body: "# D\n\n## Scheduling\n\n### When NOT to use\n- x\n\n## Extra Section\n\n### Canonical workflow path\n1. step\n\n### Failure and recovery\n| Failure | Recovery |\n|---|---|\n| a | b |\n",
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).toContain("ssl-structure");
  });

  it("fails ssl-lite skills without exactly one canonical path", () => {
    const body = SSL_LITE_BODY.replace(
      "### Canonical workflow path\n1. Step one\n2. Step two\n",
      "",
    );
    writeSkill(workspace, "oma-nopath", {
      body,
      resources: ["resources/template.md"],
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).toContain("canonical-path");
  });

  it("accepts bullet-style failure and recovery sections", () => {
    const body = SSL_LITE_BODY.replace(
      "### Failure and recovery\n| Failure | Recovery |\n|---------|----------|\n| Command exits non-zero because the fixture is stale | Regenerate the fixture with the seed script |\n",
      "### Failure and recovery\n- If the fixture is stale, regenerate it with the seed script.\n",
    );
    writeSkill(workspace, "oma-bullets", {
      body,
      resources: ["resources/template.md"],
    });
    const report = lintSkills(workspace);
    expect(report.smells.map((s) => s.smell)).not.toContain(
      "empty-failure-recovery",
    );
  });

  it("warns when When NOT to use and failure rows are absent", () => {
    writeSkill(workspace, "oma-noboundary", {
      body: "# N\n\n## Scheduling\n\n## Structural Flow\n\n## Logical Operations\n\n### Canonical workflow path\n1. step\n\n## References\n",
    });
    const report = lintSkills(workspace);
    const ids = report.smells.map((s) => s.smell);
    expect(ids).toContain("missing-boundaries");
    expect(ids).toContain("empty-failure-recovery");
  });

  it("skips generated wrappers and applies only generic checks to non-ssl skills", () => {
    const dir = join(workspace, INSTALLED_SKILLS_DIR, "oma-generated");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: oma-generated\ndescription: wrapper\n---\n<!-- oma:generated -->\n# W\n",
    );
    writeSkill(workspace, "oma-thirdparty", {
      body: "# Third-party skill\n\nNo SSL-lite sections at all.\n",
    });
    const report = lintSkills(workspace);
    expect(report.skillCount).toBe(1);
    expect(report.sslLiteCount).toBe(0);
    expect(report.smells.filter((s) => s.smell.startsWith("ssl"))).toHaveLength(
      0,
    );
  });

  it("filters to a single skill when requested", () => {
    writeSkill(workspace, "oma-a", { resources: ["resources/template.md"] });
    writeSkill(workspace, "oma-b", {
      body: "# B\n\nSee resources/gone.md\n",
    });
    const report = lintSkills(workspace, "oma-b");
    expect(report.skillCount).toBe(1);
    expect(report.smells.map((s) => s.skill)).toEqual(["oma-b"]);
  });
});
