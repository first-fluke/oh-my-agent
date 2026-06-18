/**
 * Tests for oma-docs noise reduction:
 *  1. `docs.exclude` glob filtering in the file walker (extractDocRefs).
 *  2. gitignored generated-output targets classified as `skipped`, not
 *     `broken`, by the resolver (rule-based `git check-ignore`).
 *
 * Both use a real temp git repo because gitignore resolution shells out to
 * `git check-ignore`.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractDocRefs } from "./extract.js";
import { _clearDirListingCache, resolveRefs } from "./resolve.js";

let repo: string;

function write(rel: string, content: string): void {
  const abs = path.join(repo, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf-8");
}

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "oma-docs-noise-"));
  execFileSync("git", ["init", "-q"], { cwd: repo });
});

afterEach(() => {
  _clearDirListingCache();
  fs.rmSync(repo, { recursive: true, force: true });
});

describe("docs.exclude glob filtering", () => {
  it("skips docs under an excluded subtree", async () => {
    write("keep/a.md", "see [x](./x.md)\n");
    write("keep/x.md", "ok\n");
    write("benchmarks/runs/b.md", "see [missing](./nope.md)\n");

    const index = await extractDocRefs(repo, "**/*.md", ["benchmarks/**"]);
    const docs = index.docs.map((d) => d.path);

    expect(docs).toContain("keep/a.md");
    expect(docs).not.toContain("benchmarks/runs/b.md");
  });

  it("with no excludes, scans every doc", async () => {
    write("keep/a.md", "ok\n");
    write("benchmarks/runs/b.md", "ok\n");

    const index = await extractDocRefs(repo, "**/*.md", []);
    const docs = index.docs.map((d) => d.path);

    expect(docs).toContain("keep/a.md");
    expect(docs).toContain("benchmarks/runs/b.md");
  });

  it("matches dot-dir excludes via { dot: true }", async () => {
    write("docs/a.md", "ok\n");
    write(".agents/results/r.md", "ok\n");

    const index = await extractDocRefs(repo, "**/*.md", [".agents/**"]);
    const docs = index.docs.map((d) => d.path);

    expect(docs).toContain("docs/a.md");
    expect(docs).not.toContain(".agents/results/r.md");
  });
});

describe("gitignored generated targets are skipped, not broken", () => {
  it("classifies a missing-but-gitignored target as skipped", async () => {
    write(".gitignore", "generated/\n");
    write(
      "doc.md",
      "output lands at `generated/output.md` and `src/real-missing.ts`\n",
    );

    _clearDirListingCache();
    const index = await extractDocRefs(repo);
    const report = await resolveRefs(index, repo, { kinds: ["file"] });

    const brokenTargets = report.broken.map((r) => r.target);
    const skippedTargets = report.skipped.map((r) => r.target);

    // gitignored generated output → skipped (not broken)
    expect(skippedTargets).toContain("generated/output.md");
    expect(brokenTargets).not.toContain("generated/output.md");

    // genuinely missing, non-ignored path → still broken
    expect(brokenTargets).toContain("src/real-missing.ts");
  });
});
