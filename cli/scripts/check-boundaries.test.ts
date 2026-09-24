import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
      ].join("\n"),
    );

    expect(findBoundaryViolations({ cliDir: root })).toEqual(
      Array(7).fill(
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

  it("scans every file when parsing spans multiple batches", () => {
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

  it("retries only a transient TypeScript child-process exit", () => {
    const parseBatch = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("Unexpected EOF while reading from child process");
      })
      .mockReturnValue(new Map([["fixture.ts", ["../schedule/example.js"]]]));

    expect(collectImports(["fixture.ts"], parseBatch)).toEqual(
      new Map([["fixture.ts", ["../schedule/example.js"]]]),
    );
    expect(parseBatch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a parser error", () => {
    const parseBatch = vi.fn(() => {
      throw new Error("Could not parse fixture.ts");
    });

    expect(() => collectImports(["fixture.ts"], parseBatch)).toThrow(
      "Could not parse fixture.ts",
    );
    expect(parseBatch).toHaveBeenCalledOnce();
  });

  it("stops after three compiler exits", () => {
    const parseBatch = vi.fn(() => {
      throw new Error("Unexpected EOF while reading from child process");
    });

    expect(() => collectImports(["fixture.ts"], parseBatch)).toThrow(
      "Unexpected EOF while reading from child process",
    );
    expect(parseBatch).toHaveBeenCalledTimes(3);
  });
});
