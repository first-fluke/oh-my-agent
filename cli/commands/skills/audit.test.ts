import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import { auditSkills } from "./audit.js";

function writeSkill(root: string, name: string, description: string): void {
  const dir = join(root, INSTALLED_SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`,
  );
}

describe("auditSkills", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-skills-audit-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("reports no findings when descriptions are distinct", () => {
    writeSkill(
      workspace,
      "oma-frontend",
      "React Next.js TypeScript UI components shadcn Tailwind",
    );
    writeSkill(
      workspace,
      "oma-db",
      "PostgreSQL schema migration vector indexing transactions",
    );
    const report = auditSkills(workspace);
    expect(report.skillCount).toBe(2);
    expect(report.findings).toHaveLength(0);
  });

  it("flags near-duplicate descriptions as fail", () => {
    writeSkill(
      workspace,
      "oma-frontend-a",
      "React Next.js TypeScript UI component frontend page layout",
    );
    writeSkill(
      workspace,
      "oma-frontend-b",
      "Frontend React Next.js TypeScript UI component page layout",
    );
    const report = auditSkills(workspace);
    expect(report.skillCount).toBe(2);
    const failFinding = report.findings.find((f) => f.severity === "fail");
    expect(failFinding).toBeDefined();
  });

  it("skips _shared and missing SKILL.md entries", () => {
    writeSkill(workspace, "oma-frontend", "React frontend components");
    mkdirSync(join(workspace, INSTALLED_SKILLS_DIR, "_shared"), {
      recursive: true,
    });
    mkdirSync(join(workspace, INSTALLED_SKILLS_DIR, "empty-skill"), {
      recursive: true,
    });
    const report = auditSkills(workspace);
    expect(report.skillCount).toBe(1);
  });
});
