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
import { afterEach, describe, expect, it, vi } from "vitest";
import { matrixReportFailed, runSkillsMatrix } from "./run.js";
import type { MatrixInvocation, MatrixRun } from "./types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-installed-matrix-test-"));
  roots.push(root);
  const skill = join(root, ".agents", "skills", "oma-example");
  const shared = join(root, ".agents", "skills", "_shared", "core");
  mkdirSync(skill, { recursive: true });
  mkdirSync(shared, { recursive: true });
  writeFileSync(
    join(skill, "SKILL.md"),
    "---\nname: oma-example\ndescription: Example installed skill.\n---\nRead `../_shared/core/example.md`.\n",
  );
  writeFileSync(join(shared, "example.md"), "Original shared resource.\n");
  return root;
}

function auditRun(input: MatrixInvocation): MatrixRun {
  const skillsRoot = join(input.workspace, ".agents", "skills");
  const files = ["oma-example/SKILL.md", "_shared/core/example.md"];
  return {
    exitCode: 0,
    complete: true,
    nativeSuccess: true,
    output: '{"read":true}',
    reads: files.map((file) => ({
      path: join(skillsRoot, file),
      success: true,
      missing: false,
      content: readFileSync(join(skillsRoot, file), "utf8"),
    })),
    activations: [],
    cliVersion: "fixture 1.0",
    model: input.model ?? null,
    durationMs: 1,
  };
}

describe("installed matrix execution", () => {
  it("plans an unchanged installed bundle without invoking any native CLI", async () => {
    const root = project();
    const run = vi.fn();
    const report = await runSkillsMatrix(
      { projectRoot: root, skills: "oma-example", delivery: "injected" },
      { run },
    );
    expect(report).toMatchObject({
      sourceKind: "installed",
      delivery: "injected",
      auditScope: "read-reference",
      protocolVersion: "oma-skill-matrix-v2",
      mode: "plan",
      cells: [],
      plannedCalls: 2,
    });
    expect(run).not.toHaveBeenCalled();
    expect(report.bundle?.skills[0]).toMatchObject({
      name: "oma-example",
      missingFiles: [],
      excludedReferences: [],
    });
    expect(report.bundle?.skills[0]?.requiredFiles).toContain(
      "_shared/core/example.md",
    );
    expect(JSON.stringify(report)).not.toContain("Original shared resource");
    expect(JSON.stringify(report)).not.toContain(root);
    expect(
      readFileSync(
        join(root, ".agents/skills/_shared/core/example.md"),
        "utf8",
      ),
    ).toBe("Original shared resource.\n");
  });

  it("invalidates provenance after a shared resource changes", async () => {
    const root = project();
    const options = {
      projectRoot: root,
      skills: "oma-example",
      delivery: "injected",
    };
    const before = await runSkillsMatrix(options);
    writeFileSync(
      join(root, ".agents/skills/_shared/core/example.md"),
      "Changed shared resource.\n",
    );
    const after = await runSkillsMatrix(options);
    expect(after.bundle?.hash).not.toBe(before.bundle?.hash);
    expect(after.bundle?.skills[0]?.hash).not.toBe(
      before.bundle?.skills[0]?.hash,
    );
    expect(after.suiteHash).not.toBe(before.suiteHash);
  });

  it("audits AV-style injected copies while keeping native activation observational", async () => {
    const root = project();
    const workspaces: string[] = [];
    const run = vi.fn(async (input: MatrixInvocation) => {
      workspaces.push(input.workspace);
      expect(input.prompt).toContain("## Skill oma-example\nSource: ");
      expect(input.prompt).not.toContain(root);
      expect(
        readFileSync(
          join(input.workspace, ".agents/skills/_shared/core/example.md"),
          "utf8",
        ),
      ).toBe("Original shared resource.\n");
      return auditRun(input);
    });
    const report = await runSkillsMatrix(
      {
        projectRoot: root,
        skills: "oma-example",
        delivery: "injected",
        live: true,
        yes: true,
      },
      { run },
    );
    expect(report.summary).toMatchObject({ pass: 2, measured: 2 });
    expect(
      report.cells.every(
        (cell) => cell.contentHash === report.bundle?.skills[0]?.hash,
      ),
    ).toBe(true);
    expect(
      report.cells.every((cell) => cell.nativeActivation === "unobserved"),
    ).toBe(true);
    expect(matrixReportFailed(report)).toBe(false);
    expect(workspaces.every((workspace) => !existsSync(workspace))).toBe(true);
  });

  it("does not count injected content or a correct final response as read evidence", async () => {
    const root = project();
    const report = await runSkillsMatrix(
      {
        projectRoot: root,
        skills: "oma-example",
        delivery: "injected",
        live: true,
        yes: true,
      },
      {
        run: async (input) => ({ ...auditRun(input), reads: [] }),
      },
    );
    expect(report.summary.unverifiable).toBe(2);
    expect(matrixReportFailed(report)).toBe(true);
  });

  it.each([
    [{ projectRoot: "/unused" }, "together"],
    [{ skills: "oma-example" }, "together"],
    [
      { projectRoot: "/unused", skills: "oma-example", suite: "suite.json" },
      "combined",
    ],
    [{ delivery: "injected" }, "requires"],
    [{ delivery: "unknown" }, "--delivery"],
    [{ projectRoot: "", skills: "oma-example" }, "--project-root"],
  ])(
    "rejects incompatible installed-audit options before dispatch: %j",
    async (options, message) => {
      const run = vi.fn();
      await expect(runSkillsMatrix(options, { run })).rejects.toThrow(message);
      expect(run).not.toHaveBeenCalled();
    },
  );
});
