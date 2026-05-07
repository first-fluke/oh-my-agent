/**
 * T9 - extract.test.ts
 *
 * Tests for the extractDocRefs function in extract.ts.
 * Fixtures live in __fixtures__/ relative to this file.
 *
 * Design: docs/plans/designs/008-oma-docs.md section Extractor
 */

import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractDocRefs, GENERATOR } from "./extract.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "__fixtures__");

// ---------------------------------------------------------------------------
// Schema invariants
// ---------------------------------------------------------------------------

describe("extractDocRefs - schema invariants", () => {
  it("schemaVersion is always 1", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    expect(index.schemaVersion).toBe(1);
  });

  it("generator equals the GENERATOR constant", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    expect(index.generator).toBe(GENERATOR);
    expect(index.generator).toBe("oma-docs/0.1.0");
  });

  it("index has no generatedAt field", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    expect(Object.keys(index)).not.toContain("generatedAt");
  });
});

// ---------------------------------------------------------------------------
// All 6 ref kinds - basic.md
// ---------------------------------------------------------------------------

describe("extractDocRefs - all 6 ref kinds (basic.md)", () => {
  it("extracts file ref from markdown link", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    expect(doc).toBeDefined();
    const fileRefs = doc.refs.filter((r) => r.kind === "file");
    const targets = fileRefs.map((r) => r.target);
    expect(targets).toContain("src/auth.ts");
  });

  it("extracts file ref from inline code backtick", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    const fileRefs = doc.refs.filter((r) => r.kind === "file");
    const targets = fileRefs.map((r) => r.target);
    expect(targets).toContain("cli/commands/docs/extract.ts");
  });

  it("extracts url ref", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    const urlRefs = doc.refs.filter((r) => r.kind === "url");
    expect(urlRefs.length).toBeGreaterThan(0);
    expect(urlRefs[0].target).toContain("example.com");
  });

  it("extracts cli ref from inline code with known binary", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    const cliRefs = doc.refs.filter((r) => r.kind === "cli");
    const targets = cliRefs.map((r) => r.target);
    expect(targets.some((t) => t.startsWith("oma"))).toBe(true);
  });

  it("extracts script refs (bun run test, npm run lint)", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    const scriptRefs = doc.refs.filter((r) => r.kind === "script");
    const targets = scriptRefs.map((r) => r.target);
    expect(targets).toContain("test");
    expect(targets).toContain("lint");
  });

  it("extracts env ref from process.env pattern", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    const envRefs = doc.refs.filter((r) => r.kind === "env");
    const targets = envRefs.map((r) => r.target);
    expect(targets).toContain("OPENAI_API_KEY");
  });

  it("extracts config ref from dot-path", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    const configRefs = doc.refs.filter((r) => r.kind === "config");
    const targets = configRefs.map((r) => r.target);
    expect(targets).toContain("docs.auto_verify");
  });

  it("each ref has a 1-based line number", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    for (const ref of doc.refs) {
      expect(ref.line).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Sort order
// ---------------------------------------------------------------------------

describe("extractDocRefs - sort order", () => {
  it("refs are sorted by line ascending", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const doc = index.docs[0];
    const lines = doc.refs.map((r) => r.line);
    const sorted = [...lines].sort((a, b) => a - b);
    expect(lines).toEqual(sorted);
  });

  it("docs are sorted alphabetically by path when scanning multiple files", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "**/*.md");
    const paths = index.docs.map((d) => d.path);
    const sorted = [...paths].sort((a, b) => a.localeCompare(b));
    expect(paths).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// Escape block
// ---------------------------------------------------------------------------

describe("extractDocRefs - escape block (escape-block.md)", () => {
  it("excludes refs inside ignore-start / ignore-end block", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "escape-block.md");
    const doc = index.docs[0];
    const targets = doc.refs.map((r) => r.target);
    expect(targets).not.toContain("src/ignored.ts");
    expect(targets.some((t) => t.includes("ignored-cmd"))).toBe(false);
  });

  it("includes refs outside the ignore block", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "escape-block.md");
    const doc = index.docs[0];
    const targets = doc.refs.map((r) => r.target);
    expect(targets).toContain("src/auth.ts");
  });

  it("includes ref that appears after the closing ignore-end tag", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "escape-block.md");
    const doc = index.docs[0];
    const cliRefs = doc.refs.filter((r) => r.kind === "cli");
    const targets = cliRefs.map((r) => r.target);
    expect(targets.some((t) => t.startsWith("oma docs verify"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unmatched ignore-start
// ---------------------------------------------------------------------------

describe("extractDocRefs - unmatched ignore-start (escape-unmatched.md)", () => {
  it("includes refs that appear before the lone ignore-start", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "escape-unmatched.md");
    const doc = index.docs[0];
    const targets = doc.refs.map((r) => r.target);
    expect(targets).toContain("src/before.ts");
  });

  it("excludes all refs after the lone ignore-start (treat as ignore until EOF)", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "escape-unmatched.md");
    const doc = index.docs[0];
    const targets = doc.refs.map((r) => r.target);
    expect(targets).not.toContain("src/after.ts");
    expect(targets.some((t) => t.includes("cmd-after-start"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Frontmatter skip
// ---------------------------------------------------------------------------

describe("extractDocRefs - frontmatter skip (frontmatter-skip.md)", () => {
  it("omits the file entirely from the docs array", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "frontmatter-skip.md");
    expect(index.docs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Empty refs
// ---------------------------------------------------------------------------

describe("extractDocRefs - empty refs (empty-refs.md)", () => {
  it("includes the doc entry even when it has no refs", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "empty-refs.md");
    expect(index.docs).toHaveLength(1);
    expect(index.docs[0].refs).toEqual([]);
  });

  it("entry path matches the relative fixture path", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "empty-refs.md");
    expect(index.docs[0].path).toBe("empty-refs.md");
  });
});

// ---------------------------------------------------------------------------
// BOM handling
// ---------------------------------------------------------------------------

describe("extractDocRefs - UTF-8 BOM (bom.md)", () => {
  it("handles BOM gracefully and still extracts refs", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "bom.md");
    expect(index.docs).toHaveLength(1);
    const doc = index.docs[0];
    expect(doc.refs.length).toBeGreaterThan(0);
  });

  it("BOM file produces file refs", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "bom.md");
    const doc = index.docs[0];
    const fileRefs = doc.refs.filter((r) => r.kind === "file");
    expect(fileRefs.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CLI disambiguation
// ---------------------------------------------------------------------------

describe("extractDocRefs - CLI disambiguation (cli-edge.md)", () => {
  it("does NOT extract random prose backticks as cli refs", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "cli-edge.md");
    const doc = index.docs[0];
    const cliRefs = doc.refs.filter((r) => r.kind === "cli");
    const targets = cliRefs.map((r) => r.target);
    expect(targets.some((t) => t.startsWith("notarealcommand"))).toBe(false);
    expect(targets.some((t) => t.startsWith("fakecmd"))).toBe(false);
  });

  it("extracts cli refs from known binaries inside fenced bash blocks", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "cli-edge.md");
    const doc = index.docs[0];
    const cliRefs = doc.refs.filter((r) => r.kind === "cli");
    const targets = cliRefs.map((r) => r.target);
    expect(targets.some((t) => t.startsWith("oma"))).toBe(true);
    expect(targets.some((t) => t.startsWith("git"))).toBe(true);
  });

  it("extracts inline CLI with known binary prefix", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "cli-edge.md");
    const doc = index.docs[0];
    const cliRefs = doc.refs.filter((r) => r.kind === "cli");
    const targets = cliRefs.map((r) => r.target);
    expect(targets.some((t) => t.includes("oma docs verify"))).toBe(true);
  });

  it("extracts file ref from file-like inline code token", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "cli-edge.md");
    const doc = index.docs[0];
    const fileRefs = doc.refs.filter((r) => r.kind === "file");
    const targets = fileRefs.map((r) => r.target);
    expect(targets).toContain("src/some-file.ts");
  });
});

// ---------------------------------------------------------------------------
// Exclusions - generated/** must not appear
// ---------------------------------------------------------------------------

describe("extractDocRefs - exclusions", () => {
  it("excludes files under generated/ subdirectory from the index", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "**/*.md");
    const paths = index.docs.map((d) => d.path);
    const hasGenerated = paths.some((p) => p.split("/").includes("generated"));
    expect(hasGenerated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Path glob - single file narrowing
// ---------------------------------------------------------------------------

describe("extractDocRefs - path glob", () => {
  it("single-file path narrows the scan to exactly that file", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "empty-refs.md");
    expect(index.docs).toHaveLength(1);
    expect(index.docs[0].path).toBe("empty-refs.md");
  });

  it("glob pattern matching a specific file returns only that file", async () => {
    const index = await extractDocRefs(FIXTURES_DIR, "basic.md");
    expect(index.docs).toHaveLength(1);
    expect(index.docs[0].path).toBe("basic.md");
  });
});

// ---------------------------------------------------------------------------
// Determinism - most important invariant
// ---------------------------------------------------------------------------

describe("extractDocRefs - determinism", () => {
  it("produces byte-identical JSON output on repeated calls (single file)", async () => {
    const run1 = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const run2 = await extractDocRefs(FIXTURES_DIR, "basic.md");
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  it("produces byte-identical JSON output on repeated calls (full fixture dir)", async () => {
    const run1 = await extractDocRefs(FIXTURES_DIR, "**/*.md");
    const run2 = await extractDocRefs(FIXTURES_DIR, "**/*.md");
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  it("determinism holds across basic.md refs ordering", async () => {
    const run1 = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const run2 = await extractDocRefs(FIXTURES_DIR, "basic.md");
    const refs1 = run1.docs[0]?.refs ?? [];
    const refs2 = run2.docs[0]?.refs ?? [];
    expect(refs1).toEqual(refs2);
  });
});
