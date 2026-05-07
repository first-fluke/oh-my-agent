/**
 * T10 - resolve.test.ts
 *
 * Tests for the resolveRefs function in resolve.ts.
 * All external I/O is mocked: http, child_process (which), fs (partial).
 *
 * Design: docs/plans/designs/008-oma-docs.md section Resolver
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock http module (axios wrapper) before importing resolve
// ---------------------------------------------------------------------------

const mockHttpHead = vi.hoisted(() => vi.fn());

vi.mock("../../io/http.js", () => ({
  http: {
    head: mockHttpHead,
  },
  isAxiosError: (err: unknown) => err instanceof Error && "isAxiosError" in err,
}));

// ---------------------------------------------------------------------------
// Mock child_process (for which / where + grep)
// ---------------------------------------------------------------------------

const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  return {
    ...original,
    execSync: mockExecSync,
  };
});

import type { DocRefsIndex } from "../../types/docs.js";
import { resolveRefs } from "./resolve.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIndex(
  docPath: string,
  refs: DocRefsIndex["docs"][0]["refs"],
): DocRefsIndex {
  return {
    schemaVersion: 1,
    generator: "oma-docs/0.1.0",
    docs: [{ path: docPath, refs }],
  };
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "oma-docs-test-"));
}

function cleanupDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// File resolution
// ---------------------------------------------------------------------------

describe("resolveRefs - file: doc-relative then repo-root fallback", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir();
    // Default: no which calls
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      if (cmd.includes("grep")) throw new Error("no match");
      return Buffer.from("");
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanupDir(tmp);
  });

  it("resolves doc-relative path when file exists", async () => {
    // Create doc at tmp/docs/guide.md and target at tmp/docs/src/auth.ts
    const docsDir = path.join(tmp, "docs");
    const srcDir = path.join(tmp, "docs", "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "auth.ts"), "");
    fs.writeFileSync(path.join(docsDir, "guide.md"), "");

    const index = makeIndex("docs/guide.md", [
      { kind: "file", target: "src/auth.ts", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(0);
    expect(report.scannedDocs).toBe(1);
    expect(report.totalRefs).toBe(1);
  });

  it("falls back to repo-root when doc-relative fails but repo-root exists", async () => {
    // File at repo root: tmp/src/auth.ts
    const srcDir = path.join(tmp, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "auth.ts"), "");
    // Doc lives at tmp/docs/guide.md (no docs/src/ directory)
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs", "guide.md"), "");

    const index = makeIndex("docs/guide.md", [
      { kind: "file", target: "src/auth.ts", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(0);
  });

  it("reports broken when both doc-relative and repo-root paths fail", async () => {
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs", "guide.md"), "");

    const index = makeIndex("docs/guide.md", [
      { kind: "file", target: "src/nonexistent.ts", line: 5 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(1);
    expect(report.broken[0].kind).toBe("file");
    expect(report.broken[0].reason).toMatch(/file_missing/);
    // Both attempted paths should appear in the reason
    expect(report.broken[0].reason).toMatch(/tried:/);
  });

  it("broken reason contains both attempted paths", async () => {
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });

    const index = makeIndex("docs/guide.md", [
      { kind: "file", target: "missing/file.ts", line: 3 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken[0].reason).toMatch(/docs[/\\]missing[/\\]file\.ts/);
    expect(report.broken[0].reason).toMatch(/missing[/\\]file\.ts/);
  });
});

// ---------------------------------------------------------------------------
// File resolution - case sensitivity
// ---------------------------------------------------------------------------

describe("resolveRefs - file: case-sensitive matching", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir();
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      if (cmd.includes("grep")) throw new Error("no match");
      return Buffer.from("");
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanupDir(tmp);
  });

  it("enforces case-sensitive matching via fs.readdir", async () => {
    // Create the file as lowercase
    const srcDir = path.join(tmp, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "foo.ts"), "");

    // Reference uses uppercase — should be broken (case-sensitive enforcement)
    const index = makeIndex("README.md", [
      { kind: "file", target: "src/Foo.ts", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    // On case-insensitive FS (macOS) this is the key test:
    // the resolver uses fs.readdir to check actual directory entries.
    // "Foo.ts" is NOT in the readdir entries (only "foo.ts" is).
    expect(report.broken).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// URL resolution - internal host skip
// ---------------------------------------------------------------------------

describe("resolveRefs - url: internal hosts are skipped (never HEAD-requested)", () => {
  beforeEach(() => {
    mockExecSync.mockImplementation(() => Buffer.from(""));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const internalUrls = [
    "http://localhost:3000",
    "http://127.0.0.1",
    "https://app.local",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "https://service.internal",
  ];

  for (const url of internalUrls) {
    it(`skips ${url} as internal-host without making HTTP request`, async () => {
      const index = makeIndex("README.md", [
        { kind: "url", target: url, line: 1 },
      ]);

      const report = await resolveRefs(index, "/tmp");

      // Must not have made any HTTP request
      expect(mockHttpHead).not.toHaveBeenCalled();

      expect(report.broken).toHaveLength(0);
      expect(report.skipped).toHaveLength(1);
      expect(report.skipped[0].reason).toBe("internal-host");
    });
  }
});

// ---------------------------------------------------------------------------
// URL resolution - HTTP status codes
// ---------------------------------------------------------------------------

describe("resolveRefs - url: HTTP status code handling", () => {
  beforeEach(() => {
    mockExecSync.mockImplementation(() => Buffer.from(""));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("404 response is broken", async () => {
    mockHttpHead.mockResolvedValueOnce({ status: 404 });

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/gone", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(1);
    expect(report.broken[0].reason).toMatch(/404/);
    expect(report.skipped).toHaveLength(0);
  });

  it("410 response is broken", async () => {
    mockHttpHead.mockResolvedValueOnce({ status: 410 });

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/gone", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(1);
    expect(report.broken[0].reason).toMatch(/410/);
  });

  it("200 response is ok", async () => {
    mockHttpHead.mockResolvedValueOnce({ status: 200 });

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });

  it("301 redirect is ok", async () => {
    mockHttpHead.mockResolvedValueOnce({ status: 301 });

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/old", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });

  it("401 response is skipped (auth-required), NOT broken", async () => {
    mockHttpHead.mockResolvedValueOnce({ status: 401 });

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/private", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/auth-required/);
  });

  it("403 response is skipped (auth-required), NOT broken", async () => {
    mockHttpHead.mockResolvedValueOnce({ status: 403 });

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/forbidden", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/auth-required/);
  });

  it("500 server error is skipped (unreachable), NOT broken", async () => {
    mockHttpHead.mockResolvedValueOnce({ status: 500 });

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/server-error", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/unreachable/);
  });

  it("timeout error is skipped (unreachable), NOT broken", async () => {
    const timeoutErr = new Error("timeout of 10000ms exceeded");
    mockHttpHead.mockRejectedValueOnce(timeoutErr);

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/slow", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/unreachable/);
  });

  it("ECONNREFUSED error is skipped (unreachable), NOT broken", async () => {
    const connErr = new Error("connect ECONNREFUSED 1.2.3.4:443");
    mockHttpHead.mockRejectedValueOnce(connErr);

    const index = makeIndex("README.md", [
      { kind: "url", target: "https://example.com/refused", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// CLI resolution
// ---------------------------------------------------------------------------

describe("resolveRefs - cli: which-based lookup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("cli binary present on PATH is ok", async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      // which/where succeeds
      return Buffer.from("/usr/bin/oma");
    });

    const index = makeIndex("README.md", [
      { kind: "cli", target: "oma docs verify", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });

  it("cli binary absent from PATH is skipped as cli-unavailable, NOT broken", async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      // which fails = binary not found
      throw new Error("not found");
    });

    const index = makeIndex("README.md", [
      { kind: "cli", target: "nonexistent-binary foo", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toBe("cli-unavailable");
  });
});

// ---------------------------------------------------------------------------
// Script resolution
// ---------------------------------------------------------------------------

describe("resolveRefs - script: package.json lookup", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir();
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      if (cmd.includes("grep")) throw new Error("no match");
      return Buffer.from("");
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanupDir(tmp);
  });

  it("script present in nearest package.json is ok", async () => {
    const pkg = { scripts: { test: "vitest run", lint: "biome check ." } };
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg));

    const index = makeIndex("README.md", [
      { kind: "script", target: "test", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(0);
  });

  it("script absent from package.json is broken", async () => {
    const pkg = { scripts: { build: "bun build" } };
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg));

    const index = makeIndex("README.md", [
      { kind: "script", target: "missing-script", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(1);
    expect(report.broken[0].reason).toMatch(/script_not_in_package_json/);
  });

  it("no package.json found while walking up is broken", async () => {
    // No package.json created in tmp - use a subdirectory as docPath root
    const subDir = path.join(tmp, "deep", "docs");
    fs.mkdirSync(subDir, { recursive: true });

    // Resolve from a path that resolveRefs places outside the tmp repoRoot
    // by pointing docPath within tmp but with no package.json present
    const index = makeIndex("docs/guide.md", [
      { kind: "script", target: "test", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(1);
    expect(report.broken[0].reason).toMatch(/package_json_not_found/);
  });
});

// ---------------------------------------------------------------------------
// Env var resolution
// ---------------------------------------------------------------------------

describe("resolveRefs - env: code grep and .env.example lookup", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir();
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanupDir(tmp);
  });

  it("env var found in source code via grep is ok", async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      if (cmd.includes("grep") && cmd.includes("MY_VAR")) {
        return Buffer.from("src/app.ts");
      }
      throw new Error("no match");
    });

    const index = makeIndex("README.md", [
      { kind: "env", target: "MY_VAR", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });

  it("env var found in .env.example is ok", async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      // grep finds nothing in code
      throw new Error("no match");
    });

    fs.writeFileSync(
      path.join(tmp, ".env.example"),
      "MY_SECRET_KEY=changeme\n",
    );

    const index = makeIndex("README.md", [
      { kind: "env", target: "MY_SECRET_KEY", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });

  it("env var missing entirely is skipped with warn reason, NOT broken", async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("git ls-files")) return Buffer.from("");
      throw new Error("no match");
    });

    // No .env.example in tmp

    const index = makeIndex("README.md", [
      { kind: "env", target: "COMPLETELY_MISSING_VAR", line: 1 },
    ]);

    const report = await resolveRefs(index, tmp);
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/env-not-found-locally/);
  });
});

// ---------------------------------------------------------------------------
// Config key resolution
// ---------------------------------------------------------------------------

describe("resolveRefs - config: dot-path matching", () => {
  beforeEach(() => {
    mockExecSync.mockImplementation(() => Buffer.from(""));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("known exact config path is ok", async () => {
    const index = makeIndex("README.md", [
      { kind: "config", target: "docs.auto_verify", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
  });

  it("top-level known config key is ok", async () => {
    const index = makeIndex("README.md", [
      { kind: "config", target: "language", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
  });

  it("session.quota_cap deep path is ok", async () => {
    const index = makeIndex("README.md", [
      { kind: "config", target: "session.quota_cap", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(0);
  });

  it("deep partial path that does not exist is broken", async () => {
    const index = makeIndex("README.md", [
      { kind: "config", target: "docs.auto_verify.deeper", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(1);
    expect(report.broken[0].reason).toMatch(/config_key_not_found/);
  });

  it("completely unknown config key is broken", async () => {
    const index = makeIndex("README.md", [
      { kind: "config", target: "nonexistent.key.path", line: 1 },
    ]);

    const report = await resolveRefs(index, "/tmp");
    expect(report.broken).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// DriftReport totals
// ---------------------------------------------------------------------------

describe("resolveRefs - DriftReport totals", () => {
  beforeEach(() => {
    mockExecSync.mockImplementation(() => Buffer.from(""));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("scannedDocs equals the number of docs in the index", async () => {
    const index: DocRefsIndex = {
      schemaVersion: 1,
      generator: "oma-docs/0.1.0",
      docs: [
        { path: "doc1.md", refs: [] },
        { path: "doc2.md", refs: [] },
        { path: "doc3.md", refs: [] },
      ],
    };

    const report = await resolveRefs(index, "/tmp");
    expect(report.scannedDocs).toBe(3);
  });

  it("totalRefs equals the sum of all refs across all docs", async () => {
    mockHttpHead.mockResolvedValue({ status: 200 });

    const index: DocRefsIndex = {
      schemaVersion: 1,
      generator: "oma-docs/0.1.0",
      docs: [
        {
          path: "doc1.md",
          refs: [
            { kind: "config", target: "language", line: 1 },
            { kind: "config", target: "docs.auto_verify", line: 2 },
          ],
        },
        {
          path: "doc2.md",
          refs: [{ kind: "config", target: "session.quota_cap", line: 5 }],
        },
      ],
    };

    const report = await resolveRefs(index, "/tmp");
    expect(report.totalRefs).toBe(3);
  });

  it("empty index produces zeroed totals", async () => {
    const index: DocRefsIndex = {
      schemaVersion: 1,
      generator: "oma-docs/0.1.0",
      docs: [],
    };

    const report = await resolveRefs(index, "/tmp");
    expect(report.scannedDocs).toBe(0);
    expect(report.totalRefs).toBe(0);
    expect(report.broken).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });

  it("doc with no refs contributes 0 to totalRefs but 1 to scannedDocs", async () => {
    const index = makeIndex("empty.md", []);

    const report = await resolveRefs(index, "/tmp");
    expect(report.scannedDocs).toBe(1);
    expect(report.totalRefs).toBe(0);
  });
});
