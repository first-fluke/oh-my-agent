/**
 * sync-propose.test.ts
 *
 * Tests for proposeSyncPatches and getExcludedFiles in sync-propose.ts.
 * All external I/O is mocked: no real git, no real fs, no LLM (the CLI
 * does not call any LLM — patch synthesis is the host LLM's job per the
 * SKILL.md contract).
 *
 * Mock strategy:
 *   - vi.hoisted() to define mock factories before vi.mock() hoisting
 *   - vi.mock("node:child_process") to stub execFileSync (git diff)
 *   - vi.mock("../../io/gitignore.js") to stub isPathGitIgnored
 *
 * Design: docs/plans/designs/008-oma-docs.md § Sync pipeline
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock factories — must be declared before any vi.mock() calls
// ---------------------------------------------------------------------------

const mockExecFileSync = vi.hoisted(() => vi.fn());
const mockIsPathGitIgnored = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  return {
    ...original,
    execFileSync: mockExecFileSync,
  };
});

vi.mock("../../io/gitignore.js", () => ({
  isPathGitIgnored: mockIsPathGitIgnored,
}));

import type { DocRefsIndex } from "../../types/docs.js";
import { getExcludedFiles, proposeSyncPatches } from "./sync-propose.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIndex(
  docPath: string,
  fileTargets: string[],
  line = 1,
): DocRefsIndex {
  return {
    schemaVersion: 1,
    generator: "oma-docs/0.1.0",
    docs: [
      {
        path: docPath,
        refs: fileTargets.map((target) => ({ kind: "file", target, line })),
      },
    ],
  };
}

function makeMultiDocIndex(
  entries: Array<{ path: string; targets: string[] }>,
): DocRefsIndex {
  return {
    schemaVersion: 1,
    generator: "oma-docs/0.1.0",
    docs: entries.map(({ path, targets }) => ({
      path,
      refs: targets.map((target, i) => ({
        kind: "file" as const,
        target,
        line: i + 1,
      })),
    })),
  };
}

const REPO_ROOT = "/fake/repo";

// Default: git diff returns empty, no files reported as gitignored
function setupDefaultGitMocks(changedFiles: string[] = []) {
  mockIsPathGitIgnored.mockReturnValue(false);
  mockExecFileSync.mockImplementation((bin: string, args: string[]) => {
    const cmd = [bin, ...args].join(" ");
    // git diff --name-only <range>
    if (cmd.includes("git diff --name-only")) {
      return changedFiles.join("\0");
    }
    // git diff <range> -- <file> → empty diff
    if (cmd.includes("git diff") && cmd.includes(" -- ")) {
      return "";
    }
    return "";
  });
}

// ---------------------------------------------------------------------------
// Empty diff
// ---------------------------------------------------------------------------

describe("proposeSyncPatches - empty diff", () => {
  beforeEach(() => {
    setupDefaultGitMocks([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no files changed", async () => {
    const index = makeIndex("docs/README.md", ["cli/commands/docs/extract.ts"]);
    const proposals = await proposeSyncPatches({
      repoRoot: REPO_ROOT,
      diffRange: "HEAD~1..HEAD",
      index,
    });
    expect(proposals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// --cached default + fallback to HEAD~1..HEAD
// ---------------------------------------------------------------------------

describe("proposeSyncPatches - --cached default + fallback", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses --cached by default when no diffRange given", async () => {
    mockIsPathGitIgnored.mockReturnValue(false);
    mockExecFileSync.mockImplementation((bin: string, args: string[]) => {
      const cmd = [bin, ...args].join(" ");
      if (cmd.includes("--cached") && cmd.includes("--name-only")) {
        return "cli/commands/docs/extract.ts\0";
      }
      if (cmd.includes("git diff") && cmd.includes(" -- ")) return "";
      return "";
    });

    const index = makeIndex("docs/README.md", ["cli/commands/docs/extract.ts"]);
    const proposals = await proposeSyncPatches({ repoRoot: REPO_ROOT, index });
    expect(proposals).toHaveLength(1);
    // Verify --cached was invoked
    const cachedCall = mockExecFileSync.mock.calls.find(
      (call: unknown[]) =>
        call[0] === "git" &&
        Array.isArray(call[1]) &&
        call[1].includes("--cached") &&
        call[1].includes("--name-only"),
    );
    expect(cachedCall).toBeDefined();
  });

  it("falls back to HEAD~1..HEAD when --cached returns empty", async () => {
    mockIsPathGitIgnored.mockReturnValue(false);
    mockExecFileSync.mockImplementation((bin: string, args: string[]) => {
      const cmd = [bin, ...args].join(" ");
      if (cmd.includes("--cached") && cmd.includes("--name-only")) {
        return ""; // empty staged
      }
      if (cmd.includes("HEAD~1..HEAD") && cmd.includes("--name-only")) {
        return "cli/commands/docs/extract.ts\0";
      }
      if (cmd.includes("git diff") && cmd.includes(" -- ")) return "";
      return "";
    });

    const index = makeIndex("docs/README.md", ["cli/commands/docs/extract.ts"]);
    const proposals = await proposeSyncPatches({ repoRoot: REPO_ROOT, index });
    expect(proposals).toHaveLength(1);
    const fallbackCall = mockExecFileSync.mock.calls.find(
      (call: unknown[]) =>
        call[0] === "git" &&
        Array.isArray(call[1]) &&
        call[1].includes("HEAD~1..HEAD") &&
        call[1].includes("--name-only"),
    );
    expect(fallbackCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Reverse lookup correctness
// ---------------------------------------------------------------------------

describe("proposeSyncPatches - reverse lookup correctness", () => {
  beforeEach(() => {
    setupDefaultGitMocks(["cli/commands/docs/extract.ts"]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns one proposal for the doc that references a changed file", async () => {
    const index = makeIndex("docs/README.md", ["cli/commands/docs/extract.ts"]);
    const proposals = await proposeSyncPatches({
      repoRoot: REPO_ROOT,
      diffRange: "HEAD~1..HEAD",
      index,
    });
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.doc).toBe("docs/README.md");
  });

  it("does not include docs that have no matching ref for changed files", async () => {
    const index = makeMultiDocIndex([
      {
        path: "docs/README.md",
        targets: ["cli/commands/docs/extract.ts"],
      },
      {
        path: "docs/GUIDE.md",
        targets: ["cli/platform/agent-config.ts"], // not changed
      },
    ]);
    const proposals = await proposeSyncPatches({
      repoRoot: REPO_ROOT,
      diffRange: "HEAD~1..HEAD",
      index,
    });
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.doc).toBe("docs/README.md");
  });

  it("includes changedFiles in the proposal", async () => {
    const index = makeIndex("docs/README.md", ["cli/commands/docs/extract.ts"]);
    const proposals = await proposeSyncPatches({
      repoRoot: REPO_ROOT,
      diffRange: "HEAD~1..HEAD",
      index,
    });
    expect(proposals[0]?.changedFiles).toContain(
      "cli/commands/docs/extract.ts",
    );
  });

  it("includes matchedRefs in the proposal", async () => {
    const index = makeIndex("docs/README.md", ["cli/commands/docs/extract.ts"]);
    const proposals = await proposeSyncPatches({
      repoRoot: REPO_ROOT,
      diffRange: "HEAD~1..HEAD",
      index,
    });
    expect(proposals[0]?.matchedRefs).toHaveLength(1);
    expect(proposals[0]?.matchedRefs[0]?.target).toBe(
      "cli/commands/docs/extract.ts",
    );
  });

  it("returns proposals sorted by doc path", async () => {
    setupDefaultGitMocks(["cli/commands/docs/extract.ts", "cli/io/llm.ts"]);
    const index = makeMultiDocIndex([
      {
        path: "docs/z-guide.md",
        targets: ["cli/io/llm.ts"],
      },
      {
        path: "docs/a-readme.md",
        targets: ["cli/commands/docs/extract.ts"],
      },
    ]);
    const proposals = await proposeSyncPatches({
      repoRoot: REPO_ROOT,
      diffRange: "HEAD~1..HEAD",
      index,
    });
    expect(proposals).toHaveLength(2);
    expect(proposals[0]?.doc).toBe("docs/a-readme.md");
    expect(proposals[1]?.doc).toBe("docs/z-guide.md");
  });
});

// ---------------------------------------------------------------------------
// Secret redaction - file exclusion (pattern-based)
// ---------------------------------------------------------------------------

describe("proposeSyncPatches - secret redaction (file exclusion by pattern)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const secretFiles = [
    ".env",
    ".env.production",
    "private.pem",
    "secret.key",
    "id_rsa",
    "id_rsa.pub",
  ];

  for (const secretFile of secretFiles) {
    it(`excludes ${secretFile} from LLM prompt content`, async () => {
      setupDefaultGitMocks([secretFile, "cli/commands/docs/extract.ts"]);

      // Doc references both the secret file and the normal changed file
      const index = makeMultiDocIndex([
        {
          path: "docs/README.md",
          targets: [secretFile, "cli/commands/docs/extract.ts"],
        },
      ]);

      await proposeSyncPatches({
        repoRoot: REPO_ROOT,
        diffRange: "HEAD~1..HEAD",
        index,
      });

      // git diff should never be called for the secret file
      const diffCallsForSecret = mockExecFileSync.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" &&
          call[0].includes("git diff") &&
          call[0].includes(secretFile) &&
          call[0].includes(" -- "),
      );
      expect(diffCallsForSecret).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// getExcludedFiles - pattern-based exclusion
// ---------------------------------------------------------------------------

describe("getExcludedFiles - pattern-based exclusion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns .env file as excluded", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not ignored");
    });
    const excluded = getExcludedFiles([".env", "src/auth.ts"], REPO_ROOT);
    expect(excluded).toContain(".env");
    expect(excluded).not.toContain("src/auth.ts");
  });

  it("returns .env.production as excluded", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not ignored");
    });
    const excluded = getExcludedFiles(
      [".env.production", "cli/io/llm.ts"],
      REPO_ROOT,
    );
    expect(excluded).toContain(".env.production");
    expect(excluded).not.toContain("cli/io/llm.ts");
  });

  it("returns *.pem files as excluded", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not ignored");
    });
    const excluded = getExcludedFiles(["private.pem", "cert.pem"], REPO_ROOT);
    expect(excluded).toContain("private.pem");
    expect(excluded).toContain("cert.pem");
  });

  it("returns *.key files as excluded", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not ignored");
    });
    const excluded = getExcludedFiles(["secret.key", "api.key"], REPO_ROOT);
    expect(excluded).toContain("secret.key");
    expect(excluded).toContain("api.key");
  });

  it("returns id_rsa as excluded", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not ignored");
    });
    const excluded = getExcludedFiles(["id_rsa"], REPO_ROOT);
    expect(excluded).toContain("id_rsa");
  });

  it("returns id_rsa* variants as excluded", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not ignored");
    });
    const excluded = getExcludedFiles(
      ["id_rsa.pub", "id_rsa_backup"],
      REPO_ROOT,
    );
    expect(excluded).toContain("id_rsa.pub");
    expect(excluded).toContain("id_rsa_backup");
  });

  it("returns empty array for normal files", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not ignored");
    });
    const excluded = getExcludedFiles(
      ["cli/commands/docs/extract.ts", "README.md"],
      REPO_ROOT,
    );
    expect(excluded).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Secret redaction - gitignored exclusion
// ---------------------------------------------------------------------------

describe("getExcludedFiles - gitignored exclusion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("excludes files reported as gitignored", () => {
    mockIsPathGitIgnored.mockImplementation(
      (filePath: string) => filePath === "ignored-file.ts",
    );
    const excluded = getExcludedFiles(
      ["ignored-file.ts", "normal-file.ts"],
      REPO_ROOT,
    );
    expect(excluded).toContain("ignored-file.ts");
    expect(excluded).not.toContain("normal-file.ts");
  });

  it("does not exclude files reported as not gitignored", () => {
    mockIsPathGitIgnored.mockReturnValue(false);
    const excluded = getExcludedFiles(["normal-file.ts"], REPO_ROOT);
    expect(excluded).toHaveLength(0);
  });
});
