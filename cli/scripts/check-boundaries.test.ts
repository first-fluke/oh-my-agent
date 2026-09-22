import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findBoundaryViolations } from "./check-boundaries.mjs";

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
});
