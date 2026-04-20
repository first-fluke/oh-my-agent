import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getExistingLanguage,
  scanLanguages,
} from "../commands/install/install.js";

describe("scanLanguages", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("returns en as default when no docs directory exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-install-"));
    tempRoots.push(root);

    const result = scanLanguages(root);

    expect(result).toEqual([{ value: "en", label: "English" }]);
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
