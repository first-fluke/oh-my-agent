import {
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { gradeMatrixCase } from "./grade.js";
import {
  loadMatrixSuite,
  preparedMatrixFiles,
  prepareMatrixCase,
} from "./suite.js";
import type { MatrixCase, MatrixRun, PreparedMatrixCase } from "./types.js";

const temporary: string[] = [];

function prepare(id = "discovery", custom?: MatrixCase): PreparedMatrixCase {
  const workspace = mkdtempSync(path.join(tmpdir(), "oma-matrix-grade-"));
  temporary.push(workspace);
  const testCase =
    custom ?? loadMatrixSuite().cases.find((entry) => entry.id === id);
  if (!testCase) throw new Error("Missing probe");
  return prepareMatrixCase(testCase, workspace, "codex");
}

function run(
  prepared: PreparedMatrixCase,
  options: Partial<MatrixRun> = {},
): MatrixRun {
  const expected = { ...prepared.testCase.expected };
  if (prepared.canary) expected[prepared.canary.field] = prepared.canary.value;
  return {
    exitCode: 0,
    complete: true,
    nativeSuccess: true,
    output: JSON.stringify(expected),
    reads: [],
    activations: [],
    cliVersion: "1.0.0",
    model: "fixture-model",
    durationMs: 10,
    ...options,
  };
}

afterEach(() => {
  for (const file of temporary.splice(0))
    rmSync(file, { recursive: true, force: true });
});

describe("matrix grading", () => {
  it("passes fresh canary content proof without claiming native activation", () => {
    const prepared = prepare();
    const cell = gradeMatrixCase(prepared, run(prepared), "codex");
    expect(cell.status).toBe("pass");
    expect(cell.nativeActivation).toBe("unobserved");
    expect(cell.checks.find((check) => check.id === "content")?.proof).toBe(
      "canary",
    );
    expect(JSON.stringify(cell)).not.toContain(prepared.canary?.value);
    expect(JSON.stringify(cell)).not.toContain("Return exactly");
  });

  it("reports observed activation separately and preserves usage conditions", () => {
    const prepared = prepare();
    const cell = gradeMatrixCase(
      prepared,
      run(prepared, {
        activations: [prepared.testCase.skill],
        usage: { inputTokens: 3, outputTokens: 2 },
      }),
      "codex",
    );
    expect(cell.nativeActivation).toBe("observed");
    expect(cell.usage).toEqual({ inputTokens: 3, outputTokens: 2 });
  });

  it.each([
    { exitCode: 1 },
    { nativeSuccess: false },
    { complete: false },
    { exitCode: null },
    { error: "SECRET_CREDENTIAL=do-not-save" },
  ])("rejects unsuccessful process conditions %j", (conditions) => {
    const prepared = prepare();
    const cell = gradeMatrixCase(prepared, run(prepared, conditions), "codex");
    expect(cell.status).not.toBe("pass");
    expect(JSON.stringify(cell)).not.toContain("SECRET_CREDENTIAL");
  });

  it("accepts one JSON fence and ignores object key order", () => {
    const prepared = prepare("missing-resource");
    const result = run(prepared, {
      output: `\`\`\`json\n{"missing":true,"value":"${prepared.canary?.value}"}\n\`\`\``,
      reads: [
        {
          path: path.join(prepared.skillRoot, "references/unavailable.txt"),
          success: false,
          missing: true,
          content: "not found",
        },
      ],
    });
    expect(gradeMatrixCase(prepared, result, "codex").status).toBe("pass");
  });

  it.each([
    (value: string) => `Here is the result: {"value":"${value}"}`,
    (value: string) => `{"value":"${value}","extra":true}`,
    (value: string) => `{"value":"${value}"}\n{"value":"other"}`,
    (value: string) => `{"value":"other","value":"${value}"}`,
    (value: string) => `{"nested":{"value":"${value}"}}`,
    () => '{"value":"guessed"}',
  ])("rejects ambiguous or inexact terminal output", (output) => {
    const prepared = prepare();
    expect(
      gradeMatrixCase(
        prepared,
        run(prepared, { output: output(prepared.canary?.value ?? "") }),
        "codex",
      ).status,
    ).toBe("fail");
  });

  it("uses a canary only for the reference file that contains it", () => {
    const prepared = prepare("reference");
    expect(gradeMatrixCase(prepared, run(prepared), "codex").status).toBe(
      "pass",
    );
    prepared.testCase.files["references/other.txt"] = "Other content";
    prepared.testCase.references?.push("references/other.txt");
    writeFileSync(
      path.join(prepared.skillRoot, "references/other.txt"),
      "Other content",
    );
    const cell = gradeMatrixCase(prepared, run(prepared), "codex");
    expect(cell.status).toBe("unverifiable");
    expect(
      cell.checks.find((check) => check.id === "reference:references/other.txt")
        ?.status,
    ).toBe("unverifiable");
  });

  it("requires successful actual content reads for custom cases without canaries", () => {
    const custom: MatrixCase = {
      id: "custom",
      skill: "custom",
      prompt: "Use custom.",
      files: {
        "SKILL.md":
          '---\nname: custom\ndescription: Custom diagnostic skill.\n---\nReturn {"ok":true}.\n',
        "references/guide.txt": "Expected reference.\n",
      },
      references: ["references/guide.txt"],
      expected: { ok: true },
    };
    const prepared = prepare("custom", custom);
    expect(gradeMatrixCase(prepared, run(prepared), "codex").status).toBe(
      "unverifiable",
    );
    const reads = Object.entries(preparedMatrixFiles(prepared)).map(
      ([file, content]) => ({
        path: path.join(prepared.skillRoot, file),
        success: true,
        missing: false,
        content,
      }),
    );
    expect(
      gradeMatrixCase(prepared, run(prepared, { reads }), "codex").status,
    ).toBe("pass");
    for (const invalid of [
      reads.map((read) => ({ ...read, success: false })),
      reads.map((read) => ({ ...read, content: "Wrong file text" })),
      reads.map((read) => ({ ...read, path: `${read.path}.other` })),
      reads.map((read) => ({ ...read, missing: true })),
    ]) {
      expect(
        gradeMatrixCase(prepared, run(prepared, { reads: invalid }), "codex")
          .status,
      ).toBe("unverifiable");
    }
  });

  it("requires a correlated not-found result rather than a missing claim or failed unrelated command", () => {
    const prepared = prepare("missing-resource");
    for (const reads of [
      [],
      [
        {
          path: path.join(prepared.skillRoot, "references/other.txt"),
          success: false,
          missing: true,
          content: "not found",
        },
      ],
      [
        {
          path: path.join(prepared.skillRoot, "references/unavailable.txt"),
          success: false,
          missing: false,
          content: "permission denied",
        },
      ],
      [
        {
          path: path.join(prepared.skillRoot, "references/unavailable.txt"),
          success: true,
          missing: true,
          content: "",
        },
      ],
    ]) {
      expect(
        gradeMatrixCase(prepared, run(prepared, { reads }), "codex").status,
      ).toBe("unverifiable");
    }
  });

  it.each(["modified", "extra", "prototype-extra", "removed", "symlink"])(
    "fails immutable skill tree check for %s files",
    (mode) => {
      const prepared = prepare();
      const file = path.join(prepared.skillRoot, "SKILL.md");
      if (mode === "modified") writeFileSync(file, "changed");
      if (mode === "extra")
        writeFileSync(path.join(prepared.skillRoot, "extra.txt"), "extra");
      if (mode === "prototype-extra")
        writeFileSync(path.join(prepared.skillRoot, "__proto__"), "extra");
      if (mode === "removed" || mode === "symlink") rmSync(file);
      if (mode === "symlink")
        symlinkSync(path.join(prepared.workspace, "missing"), file);
      const cell = gradeMatrixCase(prepared, run(prepared), "codex");
      expect(cell.status).toBe("fail");
      expect(
        cell.checks.find((check) => check.id === "integrity")?.status,
      ).toBe("fail");
    },
  );

  it("rejects a replaced ancestor even when the linked skill file content is unchanged", () => {
    const prepared = prepare();
    const vendorRoot = path.join(prepared.workspace, ".agents");
    const movedRoot = path.join(prepared.workspace, "moved");
    renameSync(vendorRoot, movedRoot);
    symlinkSync(movedRoot, vendorRoot);
    expect(gradeMatrixCase(prepared, run(prepared), "codex").status).toBe(
      "fail",
    );
  });
});
