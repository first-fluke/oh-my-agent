import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import {
  LINT_MAX_BODY_LINES,
  lintSkillPath,
  lintSkills,
  renderSkillLintReport,
  requiresSslLite,
  runSkillsLint,
} from "./lint.js";

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
    declaredName?: string;
    omitName?: boolean;
  } = {},
): void {
  const dir = join(root, INSTALLED_SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  const description =
    options.description ??
    "A routing-grade description long enough to carry trigger phrases and domains";
  const nameLine = options.omitName
    ? ""
    : `name: ${options.declaredName ?? name}\n`;
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

function writeExternalSkill(
  root: string,
  directoryName: string,
  declaredName: string,
  body = SSL_LITE_BODY,
): string {
  const skillDir = join(root, directoryName);
  mkdirSync(join(skillDir, "resources"), { recursive: true });
  writeFileSync(join(skillDir, "resources", "template.md"), "# resource\n");
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---\nname: ${declaredName}\ndescription: A routing-grade description long enough to carry trigger phrases and domains\n---\n${body}`,
  );
  return skillDir;
}

describe("lintSkillPath", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-skills-lint-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("warns on an operation-heavy description without rejecting the skill", () => {
    const skillDir = writeExternalSkill(workspace, "verbose", "verbose");
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---\nname: verbose\ndescription: ${"Configure providers and run every mode. ".repeat(12)}\n---\n${SSL_LITE_BODY}`,
    );
    const report = lintSkillPath(skillDir);
    expect(report.smells).toContainEqual(
      expect.objectContaining({
        smell: "verbose-description",
        severity: "warn",
      }),
    );
    expect(report.smells.some((smell) => smell.severity === "fail")).toBe(
      false,
    );
  });

  it("uses a prefixed declared name even when its exposed name is unprefixed", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "external-skill",
      "oma-declared",
      "# No Scheduling heading\n",
    );

    const report = lintSkillPath(`${skillDir}/`, {
      exposedNames: ["external-skill"],
    });

    expect(report.sslLiteCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });

  it("uses a prefixed alias for an unprefixed declared name", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "external-skill",
      "external-skill",
      "# No Scheduling heading\n",
    );

    const report = lintSkillPath(skillDir, { exposedNames: ["oma-alias"] });

    expect(report.sslLiteCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });

  it("uses a prefixed directory name for paths with a trailing slash", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "oma-directory",
      "external-skill",
      "# No Scheduling heading\n",
    );

    const report = lintSkillPath(`${skillDir}/`);

    expect(report.sslLiteCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });

  it("does not let requireSslLite false bypass a prefixed name", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "external-skill",
      "oma-declared",
      "# No Scheduling heading\n",
    );

    const report = lintSkillPath(skillDir, { requireSslLite: false });

    expect(report.sslLiteCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });

  it("honors explicit SSL-lite enforcement for an unprefixed skill", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "external-skill",
      "external-skill",
      "# No Scheduling heading\n",
    );

    const report = lintSkillPath(skillDir, { requireSslLite: true });

    expect(report.sslLiteCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });

  it("passes a valid SSL-lite skill without installation", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "external-skill",
      "oma-clean",
    );

    const report = lintSkillPath(skillDir);

    expect(report).toMatchObject({
      skillCount: 1,
      sslLiteCount: 1,
      cleanCount: 1,
      smells: [],
    });
  });

  it("preserves generic-only linting for an unprefixed skill without Scheduling", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "external-skill",
      "external-skill",
      "# Ordinary skill\n",
    );

    const report = lintSkillPath(skillDir);

    expect(report).toMatchObject({
      skillCount: 1,
      sslLiteCount: 0,
      cleanCount: 1,
      smells: [],
    });
  });

  it("fails closed for an invalid directory or missing SKILL.md", () => {
    const missingDirectory = lintSkillPath(join(workspace, "missing"));
    const emptyDirectory = join(workspace, "empty");
    mkdirSync(emptyDirectory);
    const missingSkillFile = lintSkillPath(emptyDirectory);

    expect(missingDirectory.smells[0]?.smell).toBe("invalid-directory");
    expect(missingSkillFile.smells[0]?.smell).toBe("missing-skill-file");
    expect(missingDirectory.skillCount).toBe(0);
    expect(missingSkillFile.skillCount).toBe(0);
  });

  it("fails closed when SKILL.md cannot be read", () => {
    const skillDir = writeExternalSkill(workspace, "external-skill", "plain");
    const skillFile = join(skillDir, "SKILL.md");
    chmodSync(skillFile, 0o000);

    try {
      const report = lintSkillPath(skillDir);
      expect(report.smells[0]?.smell).toBe("unreadable-skill-file");
      expect(report.skillCount).toBe(0);
    } finally {
      chmodSync(skillFile, 0o644);
    }
  });

  it("reports malformed YAML frontmatter", () => {
    const skillDir = join(workspace, "external-skill");
    mkdirSync(skillDir);
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: [broken\ndescription: broken\n---\n# Body\n",
    );

    const report = lintSkillPath(skillDir);

    expect(report.smells.map((smell) => smell.smell)).toContain(
      "malformed-frontmatter",
    );
  });

  it("does not skip a generated wrapper when the path is explicit", () => {
    const skillDir = writeExternalSkill(
      workspace,
      "external-skill",
      "oma-generated",
      "<!-- oma:generated -->\n# Wrapper\n",
    );

    const report = lintSkillPath(skillDir);

    expect(report.skillCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });
});

describe("requiresSslLite", () => {
  it("requires an oma- declared or exposed name", () => {
    expect(
      requiresSslLite({ declaredName: "oma-declared", exposedNames: [] }),
    ).toBe(true);
    expect(
      requiresSslLite({ declaredName: "plain", exposedNames: ["oma-alias"] }),
    ).toBe(true);
    expect(
      requiresSslLite({ declaredName: "plain", exposedNames: ["alias"] }),
    ).toBe(false);
  });
});

describe("skill lint reporting", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-skills-lint-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("renders an explicit missing skill failure instead of a clean no-skills result", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      renderSkillLintReport(lintSkills(workspace, "missing-skill"));

      const rendered = output.mock.calls.flat().join("\n");
      expect(rendered).toContain("[FAIL] missing-skill: invalid-directory");
      expect(rendered).not.toContain("No skills found to lint.");
    } finally {
      output.mockRestore();
    }
  });

  it("retains the no-skills message for an empty clean enumeration", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      renderSkillLintReport(lintSkills(workspace));

      expect(output.mock.calls.flat().join("\n")).toContain(
        "No skills found to lint.",
      );
    } finally {
      output.mockRestore();
    }
  });

  it("emits JSON and exits non-zero for a missing selected skill", () => {
    const cwd = process.cwd();
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit(${code})`);
      });
    process.chdir(workspace);

    try {
      expect(() => runSkillsLint(true, { skill: "missing-skill" })).toThrow(
        "process.exit(1)",
      );
      expect(JSON.parse(output.mock.calls[0]?.[0] as string)).toMatchObject({
        ok: false,
        skillCount: 0,
        smells: [{ smell: "invalid-directory", severity: "fail" }],
      });
    } finally {
      process.chdir(cwd);
      output.mockRestore();
      exit.mockRestore();
    }
  });
});

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
    writeSkill(workspace, "bare", {
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

  it("skips unprefixed generated wrappers during normal enumeration", () => {
    const dir = join(workspace, INSTALLED_SKILLS_DIR, "generated-wrapper");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: docs\ndescription: A generated wrapper that is skipped during normal enumeration\n---\n<!-- oma:generated -->\n# W\n",
    );
    writeSkill(workspace, "thirdparty", {
      body: "# Third-party skill\n\nNo SSL-lite sections at all.\n",
    });
    const report = lintSkills(workspace);
    expect(report.skillCount).toBe(1);
    expect(report.sslLiteCount).toBe(0);
    expect(report.smells.filter((s) => s.smell.startsWith("ssl"))).toHaveLength(
      0,
    );
  });

  it("does not let a generated marker bypass a prefixed wrapper", () => {
    const dir = join(workspace, INSTALLED_SKILLS_DIR, "oma-generated");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: docs\ndescription: A prefixed generated wrapper must still satisfy SSL-lite\n---\n<!-- oma:generated -->\n# W\n",
    );

    const report = lintSkills(workspace);

    expect(report.skillCount).toBe(1);
    expect(report.sslLiteCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });

  it("enforces SSL-lite for a prefixed declared name during normal enumeration", () => {
    writeSkill(workspace, "external-source", {
      declaredName: "oma-source",
      body: "# No Scheduling heading\n",
    });

    const report = lintSkills(workspace);

    expect(report.sslLiteCount).toBe(1);
    expect(report.smells.map((smell) => smell.smell)).toContain(
      "ssl-structure",
    );
  });

  it("filters to a single skill when requested", () => {
    writeSkill(workspace, "oma-a", { resources: ["resources/template.md"] });
    writeSkill(workspace, "oma-b", {
      body: "# B\n\nSee resources/gone.md\n",
    });
    const report = lintSkills(workspace, "oma-b");
    expect(report.skillCount).toBe(1);
    expect(new Set(report.smells.map((s) => s.skill))).toEqual(
      new Set(["oma-b"]),
    );
  });

  it("fails when a selected skill is missing", () => {
    const report = lintSkills(workspace, "missing-skill");

    expect(report.skillCount).toBe(0);
    expect(report.smells[0]?.smell).toBe("invalid-directory");
  });
});
