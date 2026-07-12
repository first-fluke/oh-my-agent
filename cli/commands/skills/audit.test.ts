import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import type { SimilarityPair } from "../../utils/text-similarity.js";
import {
  auditSkills,
  computeBreadths,
  computeFocusFindings,
  detectBlackHoles,
  FOCUS_BODY_WARN_THRESHOLD,
  FOCUS_DOC_WARN_THRESHOLD,
  SKILLS_COUNT_WARN_THRESHOLD,
} from "./audit.js";

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

  it("warns on library size past the routing-decay threshold", () => {
    const count = SKILLS_COUNT_WARN_THRESHOLD + 1;
    for (let i = 0; i < count; i++) {
      // Distinct token per skill → no pairwise/black-hole noise.
      writeSkill(workspace, `oma-skill-${i}`, `uniquedomain${i} specialist`);
    }
    const report = auditSkills(workspace);
    expect(report.skillCount).toBe(count);
    expect(report.sizeFinding).toBeDefined();
    expect(report.sizeFinding?.threshold).toBe(SKILLS_COUNT_WARN_THRESHOLD);
    expect(report.findings).toHaveLength(0);
  });

  it("does not warn on library size at or below the threshold", () => {
    writeSkill(workspace, "oma-a", "alpha domain specialist");
    writeSkill(workspace, "oma-b", "bravo domain specialist");
    const report = auditSkills(workspace);
    expect(report.sizeFinding).toBeUndefined();
  });
});

describe("computeFocusFindings", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-skills-focus-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  function skillsDir(): string {
    return join(workspace, INSTALLED_SKILLS_DIR);
  }

  function writeDocs(skill: string, subdir: string, count: number): void {
    const dir = join(skillsDir(), skill, subdir);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < count; i++) {
      writeFileSync(join(dir, `doc-${i}.md`), `# doc ${i}\n`);
    }
  }

  it("stays quiet on a lean skill", () => {
    writeSkill(workspace, "oma-lean", "narrow domain specialist");
    writeDocs("oma-lean", "resources", 3);
    expect(computeFocusFindings(skillsDir(), ["oma-lean"])).toHaveLength(0);
  });

  it("warns when reference docs exceed the focus threshold", () => {
    writeSkill(workspace, "oma-bundle", "sprawling multi domain bundle");
    writeDocs("oma-bundle", "resources", FOCUS_DOC_WARN_THRESHOLD + 1);
    const findings = computeFocusFindings(skillsDir(), ["oma-bundle"]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.reasons).toContain("docs");
    expect(findings[0]?.docCount).toBe(FOCUS_DOC_WARN_THRESHOLD + 1);
    expect(findings[0]?.severity).toBe("warn");
  });

  it("warns when the SKILL.md body is oversized", () => {
    writeSkill(workspace, "oma-fat", "oversized body skill");
    const path = join(skillsDir(), "oma-fat", "SKILL.md");
    writeFileSync(
      path,
      `---\nname: oma-fat\ndescription: x\n---\n${"y".repeat(FOCUS_BODY_WARN_THRESHOLD + 1)}`,
    );
    const findings = computeFocusFindings(skillsDir(), ["oma-fat"]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.reasons).toContain("body");
  });

  it("ignores vendored trees when counting docs", () => {
    writeSkill(workspace, "oma-vendored", "skill with vendored tooling");
    writeDocs("oma-vendored", "node_modules/pkg", FOCUS_DOC_WARN_THRESHOLD + 5);
    writeDocs("oma-vendored", "vendor/lib", FOCUS_DOC_WARN_THRESHOLD + 5);
    expect(computeFocusFindings(skillsDir(), ["oma-vendored"])).toHaveLength(0);
  });

  it("is wired into auditSkills", () => {
    writeSkill(workspace, "oma-bundle", "sprawling bundle skill docs");
    writeSkill(workspace, "oma-lean", "narrow database specialist");
    writeDocs("oma-bundle", "resources", FOCUS_DOC_WARN_THRESHOLD + 1);
    const report = auditSkills(workspace);
    expect(report.focusFindings.map((f) => f.id)).toEqual(["oma-bundle"]);
  });
});

describe("computeBreadths", () => {
  it("returns mean similarity of each skill to all others", () => {
    const pairs: SimilarityPair[] = [
      { a: "x", b: "y", similarity: 0.4 },
      { a: "x", b: "z", similarity: 0.6 },
      { a: "y", b: "z", similarity: 0.2 },
    ];
    const breadths = computeBreadths(["x", "y", "z"], pairs);
    const byId = new Map(breadths.map((b) => [b.id, b.breadth]));
    expect(byId.get("x")).toBeCloseTo(0.5, 6); // (0.4 + 0.6) / 2
    expect(byId.get("y")).toBeCloseTo(0.3, 6); // (0.4 + 0.2) / 2
    expect(byId.get("z")).toBeCloseTo(0.4, 6); // (0.6 + 0.2) / 2
    // sorted descending by breadth
    expect(breadths[0]?.id).toBe("x");
  });

  it("returns empty for fewer than two skills", () => {
    expect(computeBreadths(["x"], [])).toHaveLength(0);
  });
});

describe("detectBlackHoles", () => {
  it("flags an outlier breadth as a black-hole", () => {
    const breadths = [
      { id: "generic", breadth: 0.45 },
      { id: "a", breadth: 0.05 },
      { id: "b", breadth: 0.06 },
      { id: "c", breadth: 0.04 },
      { id: "d", breadth: 0.05 },
    ];
    const found = detectBlackHoles(breadths);
    expect(found.map((f) => f.id)).toContain("generic");
    expect(found.every((f) => f.severity === "warn")).toBe(true);
  });

  it("stays quiet when breadth is uniform", () => {
    const breadths = [
      { id: "a", breadth: 0.2 },
      { id: "b", breadth: 0.2 },
      { id: "c", breadth: 0.2 },
      { id: "d", breadth: 0.2 },
      { id: "e", breadth: 0.2 },
    ];
    expect(detectBlackHoles(breadths)).toHaveLength(0);
  });

  it("needs a minimum population before flagging", () => {
    const breadths = [
      { id: "generic", breadth: 0.9 },
      { id: "a", breadth: 0.01 },
    ];
    expect(detectBlackHoles(breadths)).toHaveLength(0);
  });

  it("respects the absolute breadth floor", () => {
    // An outlier in z-score terms but well below the floor → not a black-hole.
    const breadths = [
      { id: "slightly-high", breadth: 0.08 },
      { id: "a", breadth: 0.01 },
      { id: "b", breadth: 0.01 },
      { id: "c", breadth: 0.01 },
      { id: "d", breadth: 0.01 },
    ];
    expect(detectBlackHoles(breadths)).toHaveLength(0);
  });
});
