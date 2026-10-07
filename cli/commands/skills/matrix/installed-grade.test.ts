import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { gradeMatrixCase } from "./grade.js";
import { matrixFixtureHash } from "./suite.js";
import type { MatrixRun, PreparedMatrixCase } from "./types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function installed(): PreparedMatrixCase {
  const workspace = realpathSync(
    mkdtempSync(join(tmpdir(), "matrix-installed-grade-")),
  );
  roots.push(workspace);
  const protectedRoot = join(workspace, ".agents", "skills");
  const skillRoot = join(protectedRoot, "oma-example");
  const files = {
    "SKILL.md":
      "---\nname: oma-example\ndescription: Actual example skill.\n---\nRead references/local.md and ../_shared/core/policy.md.\n",
    "references/local.md": "Actual local reference.\n",
    "../_shared/core/policy.md": "Actual shared policy.\n",
  };
  const protectedFiles = {
    "oma-example/SKILL.md": files["SKILL.md"],
    "oma-example/references/local.md": files["references/local.md"],
    "_shared/core/policy.md": files["../_shared/core/policy.md"],
  };
  for (const [relative, content] of Object.entries(protectedFiles)) {
    const absolute = join(protectedRoot, relative);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return {
    workspace,
    skillRoot,
    protectedRoot,
    protectedFiles,
    coverageComplete: true,
    contentHash: matrixFixtureHash(protectedFiles),
    prompt: `Injected SKILL.md body:\n${files["SKILL.md"]}\nReturn the audit JSON.`,
    testCase: {
      id: "installed-oma-example",
      skill: "oma-example",
      prompt: "Read the installed files for this audit.",
      files,
      references: ["references/local.md", "../_shared/core/policy.md"],
      expected: { audited: "oma-example" },
    },
  };
}

function completed(
  prepared: PreparedMatrixCase,
  overrides: Partial<MatrixRun> = {},
): MatrixRun {
  return {
    exitCode: 0,
    complete: true,
    nativeSuccess: true,
    output: JSON.stringify(prepared.testCase.expected),
    reads: Object.entries(prepared.testCase.files).map(
      ([relative, content]) => ({
        path: join(prepared.skillRoot, relative),
        success: true,
        missing: false,
        content,
      }),
    ),
    activations: [],
    cliVersion: "fixture 1.0",
    model: "fixture-observed-model",
    durationMs: 1,
    ...overrides,
  };
}

function check(prepared: PreparedMatrixCase, run: MatrixRun, id: string) {
  return gradeMatrixCase(prepared, run, "codex").checks.find(
    (candidate) => candidate.id === id,
  );
}

describe("installed bundle read-audit grading", () => {
  it("passes only with matching entry, local reference, and shared reference reads", () => {
    const prepared = installed();
    const cell = gradeMatrixCase(prepared, completed(prepared), "codex");
    expect(cell.status).toBe("pass");
    expect(cell.contentHash).toBe(
      matrixFixtureHash(prepared.protectedFiles ?? {}),
    );
    expect(cell.nativeActivation).toBe("unobserved");
    expect(
      cell.checks.filter((item) => item.proof).map((item) => item.proof),
    ).toEqual(["read", "read", "read"]);
    expect(cell.checks.find((item) => item.id === "integrity")?.status).toBe(
      "pass",
    );
  });

  it("does not count an injected body, correct JSON, or native activation as a file read", () => {
    const prepared = installed();
    expect(prepared.prompt).toContain(prepared.testCase.files["SKILL.md"]);
    const run = completed(prepared, {
      reads: [],
      activations: [prepared.testCase.skill],
    });
    const cell = gradeMatrixCase(prepared, run, "claude");
    expect(cell.status).toBe("unverifiable");
    expect(cell.nativeActivation).toBe("observed");
    expect(cell.checks.find((item) => item.id === "content")?.status).toBe(
      "unverifiable",
    );
  });

  it("requires installed file reads even if synthetic canary metadata is supplied", () => {
    const prepared = installed();
    prepared.canary = {
      file: "SKILL.md",
      field: "audited",
      value: "oma-example",
    };
    const cell = gradeMatrixCase(
      prepared,
      completed(prepared, { reads: [] }),
      "codex",
    );
    expect(cell.status).toBe("unverifiable");
    expect(
      cell.checks.find((item) => item.id === "content")?.proof,
    ).toBeUndefined();
  });

  it.each([false, undefined])(
    "does not pass an installed audit with incomplete or unknown reference coverage: %s",
    (coverageComplete) => {
      const prepared = installed();
      prepared.coverageComplete = coverageComplete;
      const cell = gradeMatrixCase(prepared, completed(prepared), "codex");
      expect(cell.status).toBe("unverifiable");
      expect(
        cell.checks.find((item) => item.id === "reference-coverage")?.status,
      ).toBe("unverifiable");
    },
  );

  it.each(["SKILL.md", "references/local.md", "../_shared/core/policy.md"])(
    "requires the full observed content of %s",
    (relative) => {
      const prepared = installed();
      const run = completed(prepared);
      const read = run.reads.find(
        (candidate) => candidate.path === join(prepared.skillRoot, relative),
      );
      if (!read) throw new Error("Test read missing");
      read.content = "incomplete or unrelated content";
      expect(gradeMatrixCase(prepared, run, "codex").status).toBe(
        "unverifiable",
      );
    },
  );

  it("does not pass a declared missing reference even if a run claims a successful read", () => {
    const prepared = installed();
    prepared.testCase.references?.push("../_shared/core/absent.md");
    const run = completed(prepared);
    run.reads.push({
      path: join(prepared.skillRoot, "../_shared/core/absent.md"),
      success: true,
      missing: false,
      content: "invented",
    });
    expect(
      check(prepared, run, "reference:../_shared/core/absent.md")?.status,
    ).toBe("unverifiable");
    expect(gradeMatrixCase(prepared, run, "codex").status).toBe("unverifiable");
  });

  it("rejects a changed shared file even when supplied read evidence matches the original", () => {
    const prepared = installed();
    const run = completed(prepared);
    writeFileSync(
      join(prepared.skillRoot, "../_shared/core/policy.md"),
      "Changed shared content.\n",
    );
    expect(
      check(prepared, run, "reference:../_shared/core/policy.md")?.status,
    ).toBe("pass");
    expect(check(prepared, run, "integrity")?.status).toBe("fail");
    expect(gradeMatrixCase(prepared, run, "codex").status).toBe("fail");
  });

  it("rejects added siblings outside the selected skill directory", () => {
    const prepared = installed();
    const sibling = join(
      prepared.protectedRoot ?? "",
      "unselected",
      "SKILL.md",
    );
    mkdirSync(dirname(sibling), { recursive: true });
    writeFileSync(sibling, "Unexpected sibling.");
    expect(check(prepared, completed(prepared), "integrity")?.status).toBe(
      "fail",
    );
  });

  it("rejects deleted or symlink-replaced shared files", () => {
    const prepared = installed();
    const shared = join(prepared.skillRoot, "../_shared/core/policy.md");
    rmSync(shared);
    expect(check(prepared, completed(prepared), "integrity")?.status).toBe(
      "fail",
    );
    const target = join(prepared.workspace, "outside-policy.md");
    writeFileSync(
      target,
      prepared.testCase.files["../_shared/core/policy.md"] ?? "",
    );
    symlinkSync(target, shared);
    expect(check(prepared, completed(prepared), "integrity")?.status).toBe(
      "fail",
    );
  });

  it("cannot pass integrity without the protected bundle snapshot", () => {
    const prepared = installed();
    delete prepared.protectedFiles;
    expect(check(prepared, completed(prepared), "integrity")?.status).toBe(
      "fail",
    );
  });
});
