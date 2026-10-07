import { execFileSync } from "node:child_process";
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
  installedMatrixSuiteHash,
  installedMatrixTreeHash,
  loadInstalledMatrixBundle,
  prepareInstalledMatrixCase,
} from "./bundle.js";
import { BundleCollector, INSTALLED_MATRIX_LIMITS } from "./bundle-io.js";
import { installedMarkdownReferences } from "./bundle-refs.js";
import { matrixFixtureHash } from "./suite.js";

const temporary: string[] = [];

function directory(): string {
  const result = mkdtempSync(path.join(tmpdir(), "oma-installed-bundle-"));
  temporary.push(result);
  return result;
}

function write(root: string, file: string, content: string | Buffer): void {
  const absolute = path.join(root, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

function entry(name: string, body = ""): string {
  return `---\nname: ${name}\ndescription: Read audit example.\n---\n${body}`;
}

function project(
  body = "`resources/guide.md` and `../_shared/core/policy.md`",
): string {
  const root = directory();
  write(
    root,
    ".agents/skills/oma-example/SKILL.md",
    entry("oma-example", body),
  );
  write(
    root,
    ".agents/skills/oma-example/resources/guide.md",
    "Unchanged guide.\r\n",
  );
  write(
    root,
    ".agents/skills/oma-example/config/example.yaml",
    "enabled: true\n",
  );
  write(root, ".agents/skills/_shared/core/policy.md", "Shared policy.\n");
  write(
    root,
    ".agents/skills/_shared/core/unrelated.md",
    "Not required to read.\n",
  );
  return root;
}

afterEach(() => {
  for (const root of temporary.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("installed skill bundle snapshot", () => {
  it("copies unchanged own and shared files and declares only direct literal reads", () => {
    const root = project();
    write(
      root,
      ".agents/skills/oma-example/resources/guide.md",
      "An indirect `nested.md` reference.\r\n",
    );
    const bundle = loadInstalledMatrixBundle(root, ["oma-example"]);
    expect(bundle.manifest.skills[0]?.requiredFiles).toEqual([
      "_shared/core/policy.md",
      "oma-example/SKILL.md",
      "oma-example/resources/guide.md",
    ]);
    expect(bundle.manifest.skills[0]?.missingFiles).toEqual([]);
    expect(bundle.files["oma-example/resources/guide.md"]).toBe(
      "An indirect `nested.md` reference.\r\n",
    );
    expect(bundle.files["_shared/core/unrelated.md"]).toBe(
      "Not required to read.\n",
    );
    expect(bundle.cases[0]?.references).toEqual([
      "../_shared/core/policy.md",
      "resources/guide.md",
    ]);
    expect(bundle.cases[0]?.expected).toEqual({ read: true });
    expect(bundle.cases[0]?.canary).toBeUndefined();
    expect(JSON.stringify(bundle.manifest)).not.toContain(root);
  });

  it("hashes source bytes and selection deterministically across project roots/order", () => {
    const first = project();
    const second = project();
    for (const root of [first, second])
      write(root, ".agents/skills/oma-other/SKILL.md", entry("oma-other"));
    const a = loadInstalledMatrixBundle(first, ["oma-example", "oma-other"]);
    const b = loadInstalledMatrixBundle(second, ["oma-other", "oma-example"]);
    expect(a.manifest).toEqual(b.manifest);
    expect(
      a.manifest.skills.find((skill) => skill.name === "oma-example")?.hash,
    ).toBe(
      loadInstalledMatrixBundle(first, ["oma-example"]).manifest.skills[0]
        ?.hash,
    );
    expect(installedMatrixSuiteHash(a, "native")).toBe(
      installedMatrixSuiteHash(b, "native"),
    );
    expect(installedMatrixSuiteHash(a, "native")).not.toBe(
      installedMatrixSuiteHash(a, "injected"),
    );
    write(
      first,
      ".agents/skills/oma-example/config/example.yaml",
      "enabled: false\n",
    );
    expect(
      loadInstalledMatrixBundle(first, ["oma-example", "oma-other"]).manifest
        .hash,
    ).not.toBe(a.manifest.hash);
  });

  it("includes bounded sibling dependency trees without requiring their unrelated files", () => {
    const root = project("See `../oma-other/SKILL.md`.");
    write(
      root,
      ".agents/skills/oma-other/SKILL.md",
      entry("oma-other", "See `../oma-third/SKILL.md`."),
    );
    write(
      root,
      ".agents/skills/oma-other/resources/detail.md",
      "Included sibling resource.",
    );
    write(
      root,
      ".agents/skills/oma-third/SKILL.md",
      entry("oma-third", "Cycle `../oma-example/SKILL.md`."),
    );
    const bundle = loadInstalledMatrixBundle(root, ["oma-example"]);
    expect(bundle.files["oma-third/SKILL.md"]).toContain("name: oma-third");
    expect(bundle.files["oma-other/resources/detail.md"]).toBe(
      "Included sibling resource.",
    );
    expect(bundle.manifest.skills[0]?.requiredFiles).toEqual([
      "oma-example/SKILL.md",
      "oma-other/SKILL.md",
    ]);
  });

  it("keeps missing optional/generated literal resources incomplete and excludes project references", () => {
    const root = project(
      "Optional `stack/tech-stack.md`. Also `../../rules/backend.md`, `DESIGN.md`, and `AGENTS.md`.",
    );
    const bundle = loadInstalledMatrixBundle(root, ["oma-example"]);
    expect(bundle.manifest.skills[0]?.missingFiles).toEqual([
      "oma-example/stack/tech-stack.md",
    ]);
    expect(bundle.manifest.skills[0]?.excludedReferences).toEqual([
      { path: "../../rules/backend.md", reason: "outside-skills-root" },
      { path: "AGENTS.md", reason: "project-scope-reference" },
      { path: "DESIGN.md", reason: "project-scope-reference" },
    ]);
    expect(bundle.cases[0]?.references).toContain("stack/tech-stack.md");
    expect(bundle.cases[0]?.missing).toBeUndefined();
  });

  it("accepts explicit protocol resources and credential-related markdown documentation", () => {
    const root = project();
    write(
      root,
      ".agents/skills/_shared/runtime/execution-protocols/claude.md",
      "Claude protocol.",
    );
    write(
      root,
      ".agents/skills/_shared/runtime/execution-protocols/codex.md",
      "Codex protocol.",
    );
    write(
      root,
      ".agents/skills/oma-example/resources/tokens.md",
      "Token handling documentation.",
    );
    expect(
      Object.keys(loadInstalledMatrixBundle(root, ["oma-example"]).files),
    ).toContain("_shared/runtime/execution-protocols/claude.md");
  });

  it.each([
    ".env",
    "auth.json",
    "credentials.json",
    "resources/CLAUDE.md",
    "resources/AGENTS.md",
    "resources/claude.md",
    "resources/private.key",
    "resources/bad\nname.md",
  ])("rejects credential/control/unsafe file %j", (file) => {
    const root = project();
    write(root, `.agents/skills/oma-example/${file}`, "Not copied.");
    expect(() => loadInstalledMatrixBundle(root, ["oma-example"])).toThrow(
      /path/,
    );
  });

  it("rejects credential values and binary or oversized resource files", () => {
    for (const content of [
      `sk-proj-${"a".repeat(40)}`,
      "-----BEGIN PRIVATE KEY-----\nprivate",
      Buffer.from([0xff, 0xfe]),
      "a".repeat(INSTALLED_MATRIX_LIMITS.fileBytes + 1),
    ]) {
      const root = project();
      write(root, ".agents/skills/oma-example/resources/value.txt", content);
      expect(() => loadInstalledMatrixBundle(root, ["oma-example"])).toThrow();
    }
  });

  it("rejects symlink source files, dependency roots and ancestor segments", () => {
    for (const target of [
      "oma-example/resources/link.md",
      "_shared",
      "oma-example",
    ]) {
      const root = project();
      const file = path.join(root, ".agents/skills", target);
      rmSync(file, { recursive: true, force: true });
      symlinkSync(directory(), file);
      expect(() => loadInstalledMatrixBundle(root, ["oma-example"])).toThrow();
    }
  });

  it("rejects changed snapshots", () => {
    const root = project();
    const collector = new BundleCollector(path.join(root, ".agents/skills"));
    collector.collectTree("oma-example");
    write(
      root,
      ".agents/skills/oma-example/resources/guide.md",
      "Changed after collection.",
    );
    expect(() => collector.assertUnchanged()).toThrow(/changed/);
  });

  it("bounds tree depth and total bytes and rejects special files", () => {
    const deep = project();
    write(
      deep,
      `.agents/skills/oma-example/${"nested/".repeat(14)}file.md`,
      "Too deep.",
    );
    expect(() => loadInstalledMatrixBundle(deep, ["oma-example"])).toThrow(
      /depth/,
    );
    const large = project();
    for (let index = 0; index < 65; index++)
      write(
        large,
        `.agents/skills/oma-example/resources/large-${index}.txt`,
        "a".repeat(INSTALLED_MATRIX_LIMITS.fileBytes),
      );
    expect(() => loadInstalledMatrixBundle(large, ["oma-example"])).toThrow(
      /total byte/,
    );
    if (process.platform !== "win32") {
      const special = project();
      execFileSync("mkfifo", [
        path.join(special, ".agents/skills/oma-example/resources/pipe"),
      ]);
      expect(() => loadInstalledMatrixBundle(special, ["oma-example"])).toThrow(
        /special/,
      );
    }
  });

  it("rejects unbounded/invalid selections and missing entry frontmatter", () => {
    const root = project();
    for (const names of [
      [],
      ["../outside"],
      ["oma-example", "oma-example"],
      Array.from({ length: 33 }, (_, index) => `skill-${index}`),
    ])
      expect(() => loadInstalledMatrixBundle(root, names)).toThrow();
    write(root, ".agents/skills/oma-example/SKILL.md", entry("wrong"));
    expect(() => loadInstalledMatrixBundle(root, ["oma-example"])).toThrow(
      /frontmatter/,
    );
  });
});

describe("installed bundle delivery", () => {
  it.each(["native", "injected"] as const)(
    "preserves paths and byte hashes for Claude %s delivery",
    (delivery) => {
      const root = project();
      const bundle = loadInstalledMatrixBundle(root, ["oma-example"]);
      const testCase = bundle.cases[0];
      if (!testCase) throw new Error("Missing case");
      const prepared = prepareInstalledMatrixCase(
        bundle,
        testCase,
        directory(),
        "claude",
        delivery,
      );
      expect(prepared.protectedRoot).toBe(
        path.join(
          prepared.workspace,
          delivery === "native" ? ".claude/skills" : ".agents/skills",
        ),
      );
      expect(
        readFileSync(
          path.join(prepared.skillRoot, "resources/guide.md"),
          "utf8",
        ),
      ).toBe("Unchanged guide.\r\n");
      expect(prepared.coverageComplete).toBe(true);
      expect(prepared.contentHash).toBe(bundle.manifest.skills[0]?.hash);
      expect(installedMatrixTreeHash(prepared.protectedRoot ?? "")).toBe(
        matrixFixtureHash(prepared.protectedFiles ?? {}),
      );
      expect(prepared.prompt).toContain(
        path.join(prepared.skillRoot, "SKILL.md"),
      );
      expect(prepared.prompt).toContain("read-access audit only");
      if (delivery === "injected")
        expect(prepared.prompt).toContain(
          `## Skill oma-example\nSource: ${path.join(prepared.skillRoot, "SKILL.md")}\n${testCase.files["SKILL.md"]}`,
        );
      else expect(prepared.prompt).not.toContain(testCase.files["SKILL.md"]);
    },
  );

  it("marks missing/excluded coverage incomplete and guards the full installed tree", () => {
    const bundle = loadInstalledMatrixBundle(
      project("Optional `stack/snippets.md`. `../../rules/backend.md`."),
      ["oma-example"],
    );
    const testCase = bundle.cases[0];
    if (!testCase) throw new Error("Missing case");
    const prepared = prepareInstalledMatrixCase(
      bundle,
      testCase,
      directory(),
      "codex",
      "native",
    );
    expect(prepared.coverageComplete).toBe(false);
    expect(prepared.prompt).toContain(
      path.join(prepared.skillRoot, "stack/snippets.md"),
    );
    writeFileSync(
      path.join(prepared.protectedRoot ?? "", "_shared/core/unrelated.md"),
      "Tampered shared file.",
    );
    expect(installedMatrixTreeHash(prepared.protectedRoot ?? "")).not.toBe(
      matrixFixtureHash(prepared.protectedFiles ?? {}),
    );
  });
});

describe("literal Markdown reference detection", () => {
  it("keeps literal local paths and anchors while excluding remote/template patterns", () => {
    expect(
      installedMarkdownReferences(
        "`resources/a.md` [Policy](../_shared/core/policy.md#section) `https://example.com/doc.md` `resources/{name}.md` `*.md` `README.md`",
      ),
    ).toEqual(["../_shared/core/policy.md", "README.md", "resources/a.md"]);
  });
});
