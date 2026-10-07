import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadMatrixSuite,
  MATRIX_CANARY,
  MATRIX_SUITE_LIMITS,
  matrixInstalledTreeHash,
  matrixSuiteHash,
  prepareMatrixCase,
} from "./suite.js";
import type { MatrixCase, MatrixSuite } from "./types.js";

const temporary: string[] = [];

function directory(): string {
  const result = mkdtempSync(path.join(tmpdir(), "oma-matrix-suite-"));
  temporary.push(result);
  return result;
}

function fixture(): MatrixCase {
  return {
    id: "custom",
    skill: "custom-skill",
    prompt: "Use custom-skill and return its JSON contract.",
    files: {
      "SKILL.md":
        '---\nname: custom-skill\ndescription: Custom diagnostic skill.\n---\nReturn {"ok":true}.\n',
      "references/guide.txt": "Some evidence.\n",
    },
    references: ["references/guide.txt"],
    expected: { ok: true },
  };
}

function load(value: unknown): MatrixSuite {
  const file = path.join(directory(), "suite.json");
  writeFileSync(file, JSON.stringify(value));
  return loadMatrixSuite(file);
}

function single(testCase: unknown = fixture()) {
  return { schemaVersion: 1, cases: [testCase] };
}

afterEach(() => {
  for (const file of temporary.splice(0))
    rmSync(file, { recursive: true, force: true });
});

describe("matrix suite validation", () => {
  it("loads the three built-in diagnostics and accepts an inline custom suite", () => {
    expect(loadMatrixSuite().cases.map((entry) => entry.id)).toEqual([
      "discovery",
      "reference",
      "missing-resource",
    ]);
    expect(load(single()).cases[0]).toEqual(fixture());
  });

  it.each([
    "../escape.txt",
    "/absolute.txt",
    "references/../../escape.txt",
    "references\\escape.txt",
    "C:/escape.txt",
    "references/\0bad.txt",
    "references/\nbad.txt",
    "references/\u007fbad.txt",
    "references//empty.txt",
    "references/./dot.txt",
    ".claude/settings.json",
    "references/AGENTS.md",
    "references/claude.md",
    "references/settings.local.json",
    "references/CON.txt",
    "references/trailing. ",
    "references/cafe\u0301.txt",
    `${"nested/".repeat(8)}file.txt`,
  ])("rejects unsafe fixture path %j", (file) => {
    const entry = fixture();
    entry.files[file] = "unsafe";
    expect(() => load(single(entry))).toThrow();
  });

  it("rejects case-insensitive and file-directory collisions, including intervening names", () => {
    for (const files of [
      { "SKILL.md": fixture().files["SKILL.md"], "skill.md": "duplicate" },
      {
        ...fixture().files,
        foo: "file",
        "foo.bar": "file",
        "foo/child": "file",
      },
    ]) {
      expect(() => load(single({ ...fixture(), files }))).toThrow(/collide/);
    }
  });

  it("validates the exact schema, identifiers and frontmatter name", () => {
    const entry = fixture();
    for (const invalid of [
      { ...single(), unknown: true },
      { schemaVersion: 2, cases: [entry] },
      single({ ...entry, command: "cat /secret" }),
      single({ ...entry, id: "../outside" }),
      single({ ...entry, skill: "Uppercase" }),
      single({ ...entry, expected: [] }),
      single({ ...entry, canary: null }),
      single({
        ...entry,
        files: { "SKILL.md": "---\nname: custom-skill\n---\n" },
      }),
      single({ ...entry, files: { "SKILL.md": "no frontmatter" } }),
      single({ ...entry, files: { "SKILL.md": "---\nname: wrong\n---\n" } }),
      single({
        ...entry,
        files: {
          "SKILL.md":
            "---\nname: custom-skill\nname: custom-skill\ndescription: Custom diagnostic skill.\n---\n",
        },
      }),
      { schemaVersion: 1, cases: [entry, { ...entry, id: "other" }] },
      { schemaVersion: 1, cases: [entry, { ...entry, skill: "other" }] },
    ]) {
      expect(() => load(invalid)).toThrow();
    }
  });

  it("requires installed references and absent missing paths", () => {
    expect(() =>
      load(single({ ...fixture(), references: ["references/absent.txt"] })),
    ).toThrow(/installed/);
    expect(() =>
      load(single({ ...fixture(), missing: ["references/guide.txt"] })),
    ).toThrow(/collide/);
    expect(() =>
      load(single({ ...fixture(), missing: ["references"] })),
    ).toThrow(/collide/);
  });

  it("bounds suite bytes, case/file counts, file bytes and JSON depth", () => {
    const entry = fixture();
    expect(() =>
      load({
        schemaVersion: 1,
        cases: Array.from({ length: 33 }, () => entry),
      }),
    ).toThrow();
    expect(() =>
      load(
        single({
          ...entry,
          files: {
            ...entry.files,
            large: "a".repeat(MATRIX_SUITE_LIMITS.fileBytes + 1),
          },
        }),
      ),
    ).toThrow(/bounded/);
    const files = Object.fromEntries(
      Array.from({ length: 32 }, (_, index) => [`file-${index}`, "x"]),
    );
    expect(() =>
      load(single({ ...entry, files: { ...files, ...entry.files } })),
    ).toThrow(/many/);
    let nested: unknown = "leaf";
    for (let index = 0; index < 20; index++) nested = { nested };
    expect(() => load(single({ ...entry, expected: { nested } }))).toThrow();
    const file = path.join(directory(), "large.json");
    writeFileSync(file, " ".repeat(MATRIX_SUITE_LIMITS.bytes + 1));
    expect(() => loadMatrixSuite(file)).toThrow(/bounded/);
  });

  it("rejects duplicate JSON keys and symlink suite files", () => {
    const root = directory();
    const file = path.join(root, "suite.json");
    writeFileSync(
      file,
      JSON.stringify(single()).replace(
        '"schemaVersion":1',
        '"schemaVersion":2,"schemaVersion":1',
      ),
    );
    expect(() => loadMatrixSuite(file)).toThrow(/valid JSON/);
    const linked = path.join(root, "link.json");
    symlinkSync(file, linked);
    expect(() => loadMatrixSuite(linked)).toThrow();
  });

  it("rejects invalid UTF-8 fixture files rather than hashing replacement characters", () => {
    const file = path.join(directory(), "suite.json");
    writeFileSync(file, Buffer.from([0xff, 0xfe]));
    expect(() => loadMatrixSuite(file)).toThrow(/UTF-8/);
  });

  it("confines a canary placeholder to its specified file and top-level expected field", () => {
    const entry = loadMatrixSuite().cases[0];
    if (!entry?.canary) throw new Error("Missing built-in canary");
    for (const invalid of [
      { ...entry, canary: undefined },
      { ...entry, prompt: `${entry.prompt} ${MATRIX_CANARY}` },
      { ...entry, files: { ...entry.files, other: MATRIX_CANARY } },
      {
        ...entry,
        files: { "SKILL.md": entry.files["SKILL.md"] + MATRIX_CANARY },
      },
      { ...entry, expected: { value: { nested: MATRIX_CANARY } } },
      { ...entry, expected: { value: MATRIX_CANARY, extra: MATRIX_CANARY } },
      { ...entry, canary: { ...entry.canary, file: "references/absent" } },
      { ...entry, canary: { ...entry.canary, unknown: true } },
    ]) {
      expect(() => load(single(invalid))).toThrow();
    }
  });
});

describe("matrix case preparation", () => {
  it("installs only inline files under each native skill root with fresh nonces", () => {
    const source = loadMatrixSuite().cases[1];
    if (!source) throw new Error("Missing reference probe");
    const claude = prepareMatrixCase(source, directory(), "claude");
    const codex = prepareMatrixCase(source, directory(), "codex");
    expect(claude.skillRoot).toBe(
      path.join(claude.workspace, ".claude/skills", source.skill),
    );
    expect(codex.skillRoot).toBe(
      path.join(codex.workspace, ".agents/skills", source.skill),
    );
    expect(claude.canary?.value).toMatch(/^[a-f0-9]{48}$/);
    expect(claude.canary?.value).not.toBe(codex.canary?.value);
    expect(claude.contentHash).toBe(codex.contentHash);
    expect(source.expected.value).toBe(MATRIX_CANARY);
    expect(claude.testCase.prompt).not.toContain(claude.canary?.value);
    expect(
      readFileSync(path.join(claude.skillRoot, "SKILL.md"), "utf8"),
    ).not.toContain(claude.canary?.value);
    expect(
      readFileSync(
        path.join(claude.skillRoot, "references/answer.txt"),
        "utf8",
      ).trim(),
    ).toBe(claude.canary?.value);
  });

  it("rejects symlink installation segments and an existing skill root", () => {
    const testCase = fixture();
    for (const parent of [".claude", ".claude/skills"]) {
      const workspace = directory();
      if (parent.includes("/")) mkdirSync(path.join(workspace, ".claude"));
      symlinkSync(directory(), path.join(workspace, parent));
      expect(() => prepareMatrixCase(testCase, workspace, "claude")).toThrow(
        /link/,
      );
    }
    const workspace = directory();
    prepareMatrixCase(testCase, workspace, "codex");
    expect(() => prepareMatrixCase(testCase, workspace, "codex")).toThrow();
  });

  it("hashes the source suite deterministically and detects protected tree changes", () => {
    const suite = load(single());
    const reordered = { cases: suite.cases, schemaVersion: 1 } as MatrixSuite;
    expect(matrixSuiteHash(suite)).toBe(matrixSuiteHash(reordered));
    const entry = suite.cases[0];
    if (!entry) throw new Error("Missing fixture");
    const prepared = prepareMatrixCase(entry, directory(), "codex");
    const before = matrixInstalledTreeHash(prepared.skillRoot);
    writeFileSync(
      path.join(prepared.skillRoot, "references/guide.txt"),
      "tampered",
    );
    expect(matrixInstalledTreeHash(prepared.skillRoot)).not.toBe(before);
    entry.files["references/guide.txt"] = "different source";
    expect(matrixSuiteHash(suite)).not.toBe(matrixSuiteHash(load(single())));
  });
});
