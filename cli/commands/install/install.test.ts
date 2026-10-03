import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanDanglingSymlinks,
  getExistingLanguage,
  isExplicitYes,
  isNonInteractive,
  scanLanguages,
} from "../install/run.js";
import { README_LANGUAGES } from "./preferences.js";

describe("scanLanguages", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("offers the README language list when the payload has no docs directory", () => {
    // The release asset ships `.agents/` only — no `docs/` to scan.
    const root = mkdtempSync(join(tmpdir(), "oma-install-"));
    tempRoots.push(root);

    const result = scanLanguages(root);

    expect(result.map((r) => r.value)).toEqual([...README_LANGUAGES]);
    expect(result[0]).toEqual({ value: "en", label: "English" });
    expect(result.find((r) => r.value === "ko")?.label).toBe("한국어");
  });

  it("keeps README_LANGUAGES in sync with the repository's docs/README.*.md", () => {
    const docsDir = fileURLToPath(new URL("../../../docs", import.meta.url));
    const translated = readdirSync(docsDir)
      .map((file) => file.match(/^README\.(.+)\.md$/)?.[1])
      .filter((code): code is string => Boolean(code))
      .sort();

    expect([...README_LANGUAGES]).toEqual(["en", ...translated]);
  });

  it("discovers languages from README.*.md files", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-install-"));
    tempRoots.push(root);

    const docsDir = join(root, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "README.ko.md"), "# Korean", "utf-8");
    writeFileSync(join(docsDir, "README.ja.md"), "# Japanese", "utf-8");

    const result = scanLanguages(root);
    const values = result.map((r) => r.value);

    expect(values).toContain("en");
    expect(values).toContain("ko");
    expect(values).toContain("ja");
  });

  it("maps known language codes to native names", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-install-"));
    tempRoots.push(root);

    const docsDir = join(root, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "README.ko.md"), "", "utf-8");
    writeFileSync(join(docsDir, "README.de.md"), "", "utf-8");

    const result = scanLanguages(root);
    const ko = result.find((r) => r.value === "ko");
    const de = result.find((r) => r.value === "de");

    expect(ko?.label).toBe("한국어");
    expect(de?.label).toBe("Deutsch");
  });

  it("uses language code as label for unknown languages", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-install-"));
    tempRoots.push(root);

    const docsDir = join(root, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "README.sw.md"), "", "utf-8");

    const result = scanLanguages(root);
    const sw = result.find((r) => r.value === "sw");

    expect(sw?.label).toBe("sw");
  });

  it("ignores non-README files in docs", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-install-"));
    tempRoots.push(root);

    const docsDir = join(root, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "README.ko.md"), "", "utf-8");
    writeFileSync(join(docsDir, "CONTRIBUTING.md"), "", "utf-8");
    writeFileSync(join(docsDir, "guide.md"), "", "utf-8");

    const result = scanLanguages(root);

    expect(result).toHaveLength(2); // en + ko
  });

  it("always includes en as the first option", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-install-"));
    tempRoots.push(root);

    const docsDir = join(root, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "README.zh.md"), "", "utf-8");

    const result = scanLanguages(root);

    expect(result[0]).toEqual({ value: "en", label: "English" });
  });
});

describe("getExistingLanguage", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("reads the current language from oma-config.yaml", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-language-"));
    tempRoots.push(root);

    const agentsDir = join(root, ".agents");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "oma-config.yaml"),
      "language: ko\ntimezone: Asia/Seoul\n",
      "utf-8",
    );

    expect(getExistingLanguage(root)).toBe("ko");
  });

  it("returns null when the preferences file is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-language-"));
    tempRoots.push(root);

    expect(getExistingLanguage(root)).toBeNull();
  });
});

describe("cleanDanglingSymlinks", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("removes a broken symlink whose target does not exist", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-symlink-"));
    tempRoots.push(root);
    const skillsDir = join(root, ".claude", "skills");
    mkdirSync(skillsDir, { recursive: true });

    const broken = join(skillsDir, "oma-commit");
    symlinkSync("/nonexistent/path/oma-commit", broken);

    cleanDanglingSymlinks(skillsDir);

    // The broken symlink must be gone
    expect(() => {
      const { lstatSync } = require("node:fs");
      lstatSync(broken);
    }).toThrow();
  });

  it("preserves a valid symlink whose target exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-symlink-"));
    tempRoots.push(root);
    const skillsDir = join(root, ".claude", "skills");
    const targetDir = join(root, ".agents", "skills", "oma-frontend");
    mkdirSync(skillsDir, { recursive: true });
    mkdirSync(targetDir, { recursive: true });

    const link = join(skillsDir, "oma-frontend");
    symlinkSync(targetDir, link);

    cleanDanglingSymlinks(skillsDir);

    // Valid symlink must still exist
    const { lstatSync } = require("node:fs");
    const stat = lstatSync(link);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it("does not remove regular files or directories", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-symlink-"));
    tempRoots.push(root);
    const skillsDir = join(root, ".claude", "skills");
    mkdirSync(skillsDir, { recursive: true });

    const regularFile = join(skillsDir, "some-file.txt");
    const regularDir = join(skillsDir, "some-dir");
    writeFileSync(regularFile, "data");
    mkdirSync(regularDir);

    cleanDanglingSymlinks(skillsDir);

    const { lstatSync } = require("node:fs");
    expect(lstatSync(regularFile).isFile()).toBe(true);
    expect(lstatSync(regularDir).isDirectory()).toBe(true);
  });

  it("no-ops silently when the directory does not exist", () => {
    expect(() =>
      cleanDanglingSymlinks("/nonexistent/path/to/skills"),
    ).not.toThrow();
  });
});

describe("non-interactive mode", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.OMA_YES = undefined;
    process.env.CI = undefined;
    delete process.env.OMA_YES;
    delete process.env.CI;
  });

  afterEach(() => {
    delete process.env.OMA_YES;
    delete process.env.CI;
    if (originalEnv.OMA_YES) process.env.OMA_YES = originalEnv.OMA_YES;
    if (originalEnv.CI) process.env.CI = originalEnv.CI;
  });

  it("isExplicitYes is false by default", () => {
    expect(isExplicitYes()).toBe(false);
    expect(isExplicitYes({})).toBe(false);
    expect(isExplicitYes({ yes: false })).toBe(false);
  });

  it("isExplicitYes is true when --yes flag is set", () => {
    expect(isExplicitYes({ yes: true })).toBe(true);
  });

  it("isExplicitYes is true when OMA_YES=1", () => {
    process.env.OMA_YES = "1";
    expect(isExplicitYes()).toBe(true);
  });

  it("isExplicitYes is true when OMA_YES=true", () => {
    process.env.OMA_YES = "true";
    expect(isExplicitYes()).toBe(true);
  });

  it("isExplicitYes is false when CI=true (env-only auto-detect does not count as explicit)", () => {
    process.env.CI = "true";
    expect(isExplicitYes()).toBe(false);
  });

  it("isNonInteractive is true on explicit yes", () => {
    expect(isNonInteractive({ yes: true })).toBe(true);
  });

  it("isNonInteractive is true when CI=true", () => {
    process.env.CI = "true";
    expect(isNonInteractive()).toBe(true);
  });

  it("isNonInteractive is true when CI=1", () => {
    process.env.CI = "1";
    expect(isNonInteractive()).toBe(true);
  });

  it("isNonInteractive is false when no signal is set", () => {
    expect(isNonInteractive()).toBe(false);
  });
});
