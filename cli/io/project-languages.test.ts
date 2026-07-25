import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectableLanguages,
  detectProjectLanguages,
} from "./project-languages.js";

let root: string;

function write(relPath: string, content = ""): void {
  const full = join(root, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-detect-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("detectProjectLanguages", () => {
  it("returns an empty list for an empty project", () => {
    expect(detectProjectLanguages(root)).toEqual([]);
  });

  it("returns an empty list for a nonexistent path", () => {
    expect(detectProjectLanguages(join(root, "nope"))).toEqual([]);
  });

  it("detects a language from a marker file alone", () => {
    write("pubspec.yaml", "name: app\n");
    expect(detectProjectLanguages(root)).toEqual(["dart"]);
  });

  it("detects a language once the source-file threshold is met", () => {
    write("src/a.rs");
    write("src/b.rs");
    write("src/c.rs");
    expect(detectProjectLanguages(root)).toEqual(["rust"]);
  });

  it("ignores a stray file below the threshold", () => {
    // A single utility script must not boot a Python language server.
    write("scripts/one_off.py");
    write("index.ts");
    write("app.ts");
    write("util.ts");
    expect(detectProjectLanguages(root)).toEqual(["typescript"]);
  });

  it("does not descend into build output or dependency directories", () => {
    write("node_modules/pkg/a.py");
    write("node_modules/pkg/b.py");
    write("node_modules/pkg/c.py");
    write("dist/bundle.py");
    write("package.json", "{}");
    expect(detectProjectLanguages(root)).toEqual(["typescript"]);
  });

  it("finds languages nested inside a monorepo", () => {
    write("apps/api/pyproject.toml");
    write("apps/web/package.json", "{}");
    expect(detectProjectLanguages(root)).toEqual(["python", "typescript"]);
  });

  it("never reports bash, which oma deliberately does not manage", () => {
    write("scripts/a.sh");
    write("scripts/b.sh");
    write("scripts/c.sh");
    write("scripts/d.sh");
    expect(detectProjectLanguages(root)).not.toContain("bash");
  });

  it("returns a sorted list for deterministic output", () => {
    write("go.mod");
    write("Cargo.toml");
    write("pubspec.yaml");
    const result = detectProjectLanguages(root);
    expect(result).toEqual([...result].sort());
  });
});

describe("detectableLanguages", () => {
  it("covers every language oma maps from skills", () => {
    // SKILL_LANGUAGE_MAP in serena.ts derives these; each must be detectable,
    // otherwise it could be added but never pruned.
    for (const language of ["typescript", "dart", "terraform", "python"]) {
      expect(detectableLanguages()).toContain(language);
    }
  });

  it("excludes bash so a hand-added entry survives reconcile", () => {
    expect(detectableLanguages()).not.toContain("bash");
  });
});
