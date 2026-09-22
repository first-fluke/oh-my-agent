import { beforeEach, describe, expect, it, vi } from "vitest";
import { isExcludedSearchScope } from "../../.agents/hooks/core/code-intelligence-scope.ts";

const fixture = vi.hoisted(() => ({ gitignore: "" }));

vi.mock("node:path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:path")>();
  return actual.win32;
});

vi.mock("node:fs", () => ({
  readFileSync: vi.fn((path: string) => {
    if (path === "C:\\repo\\.serena\\project.yml") {
      return 'ignored_paths: ["node_modules/", "third-party/"]\n';
    }
    if (path === "C:\\repo\\.gitignore") return fixture.gitignore;
    throw new Error("ENOENT");
  }),
  statSync: vi.fn(() => ({ isDirectory: () => true })),
}));

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(() => {
    throw new Error("no matching gitignore rule");
  }),
}));

beforeEach(() => {
  fixture.gitignore = "";
});

describe("code intelligence search scope with Windows paths", () => {
  it("recognizes excluded paths with native separators", () => {
    expect(
      isExcludedSearchScope("serena", "C:\\repo", [
        "C:\\repo\\node_modules\\pkg",
      ]),
    ).toBe(true);
  });

  it("keeps mixed and parent-traversal scopes guarded", () => {
    expect(
      isExcludedSearchScope("serena", "C:\\repo", [
        "C:\\repo\\node_modules",
        "C:\\repo\\src",
      ]),
    ).toBe(false);
    expect(
      isExcludedSearchScope("serena", "C:\\repo", [
        "C:\\repo\\node_modules\\..\\src",
      ]),
    ).toBe(false);
  });

  it("checks ancestor gitignore re-inclusions", () => {
    fixture.gitignore = "!third-party/ours/\n";
    expect(
      isExcludedSearchScope("serena", "C:\\repo", ["C:\\repo\\third-party"]),
    ).toBe(false);
  });

  it("allows package caches on another drive", () => {
    expect(
      isExcludedSearchScope("serena", "C:\\repo", ["D:\\uv\\cache\\pkg"]),
    ).toBe(true);
  });
});
