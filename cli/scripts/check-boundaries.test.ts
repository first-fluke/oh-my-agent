import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "@babel/parser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectImports, findBoundaryViolations } from "./check-boundaries.mjs";

describe("check-boundaries", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it("detects static, side-effect, dynamic, require, and re-export imports", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundaries-"));
    roots.push(root);
    mkdirSync(join(root, "commands", "update"), { recursive: true });
    mkdirSync(join(root, "commands", "schedule"), { recursive: true });
    writeFileSync(
      join(root, "commands", "update", "run.ts"),
      [
        'import { sync } from "../schedule/static.js";',
        'import "../schedule/side-effect.js";',
        'import("../schedule/dynamic.js");',
        "import(`../schedule/template.js`);",
        'require("../schedule/require.js");',
        'export * from "../schedule/reexport.js";',
        'type Schedule = import("../schedule/import-type.js").Schedule;',
        'import Scheduler = require("../schedule/import-equals.js");',
        'export { start } from "../schedule/named-reexport.js";',
      ].join("\n"),
    );

    expect(findBoundaryViolations({ cliDir: root })).toEqual(
      Array(9).fill(
        `${join("commands", "update", "run.ts")} -> commands/schedule`,
      ),
    );
  });

  it("ignores import-like text in comments and strings", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundaries-"));
    roots.push(root);
    mkdirSync(join(root, "commands", "update"), { recursive: true });
    mkdirSync(join(root, "commands", "schedule"), { recursive: true });
    writeFileSync(
      join(root, "commands", "update", "run.ts"),
      [
        '// import "../schedule/comment.js";',
        `const example = 'require("../schedule/string.js")';`,
      ].join("\n"),
    );

    expect(findBoundaryViolations({ cliDir: root })).toEqual([]);
  });

  it("scans every file in a large input", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundaries-"));
    roots.push(root);
    const updateDir = join(root, "commands", "update");
    mkdirSync(updateDir, { recursive: true });
    mkdirSync(join(root, "commands", "schedule"), { recursive: true });
    for (let index = 0; index < 21; index++) {
      writeFileSync(
        join(updateDir, `run-${index}.ts`),
        'import "../schedule/sync.js";',
      );
    }

    const violations = findBoundaryViolations({ cliDir: root });

    expect(violations).toHaveLength(21);
    expect(
      violations.every((violation) =>
        violation.endsWith("-> commands/schedule"),
      ),
    ).toBe(true);
  });

  it("parses TypeScript files in-process once each", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundary-parser-"));
    roots.push(root);
    const files = Array.from({ length: 41 }, (_, index) => {
      const file = join(root, `fixture-${index}.ts`);
      writeFileSync(file, 'import "./dependency.js";');
      return file;
    });
    const parseSource = vi.fn(parse);
    const imports = collectImports(files, parseSource);

    expect(imports.size).toBe(41);
    expect([...imports.values()]).toEqual(
      Array.from({ length: 41 }, () => ["./dependency.js"]),
    );
    expect(parseSource).toHaveBeenCalledTimes(41);
  });

  it("reports the file and preserves the parser error without retrying", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundary-failure-"));
    roots.push(root);
    const file = join(root, "fixture.ts");
    writeFileSync(file, "");
    const parserError = new Error("Invalid syntax");
    const parseSource = vi.fn(() => {
      throw parserError;
    });
    try {
      collectImports([file], parseSource);
      throw new Error("Expected parse failure");
    } catch (error) {
      expect(error).toMatchObject({
        message: `Could not parse ${file}: Invalid syntax`,
        cause: parserError,
      });
    }
    expect(parseSource).toHaveBeenCalledOnce();
  });

  it("fails when a source file contains invalid syntax", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundary-invalid-"));
    roots.push(root);
    const file = join(root, "fixture.ts");
    writeFileSync(file, "const broken = ;");
    expect(() => collectImports([file])).toThrow(`Could not parse ${file}`);
  });

  it("does not invoke the parser for an empty scan", () => {
    const parseSource = vi.fn(() => {
      throw new Error("Unexpected parse");
    });

    expect(collectImports([], parseSource)).toEqual(new Map());
    expect(parseSource).not.toHaveBeenCalled();
  });

  it("finds imports inside TSX expressions and ignores JSX text", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundary-tsx-"));
    roots.push(root);
    const file = join(root, "fixture.tsx");
    writeFileSync(
      file,
      [
        'const expression = <div>{import("./actual.js")}</div>;',
        'const text = <div>import "./example.js"</div>;',
        "const assertion = expression as JSX.Element;",
      ].join("\n"),
    );
    expect(collectImports([file]).get(file)).toEqual(["./actual.js"]);
  });

  it("decodes escaped literals and ignores interpolated module paths", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-boundary-literals-"));
    roots.push(root);
    const file = join(root, "fixture.ts");
    writeFileSync(
      file,
      [
        'import "./\\u0061ctual.js";',
        "import(`./\\u0061nother.js`);",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Keep interpolation in the parsed fixture.
        "import(`./${vendor}/dynamic.js`);",
        'const example = `import("./example.js")`;',
      ].join("\n"),
    );
    expect(collectImports([file]).get(file)).toEqual([
      "./actual.js",
      "./another.js",
    ]);
  });
});
