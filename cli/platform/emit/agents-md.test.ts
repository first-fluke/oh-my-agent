import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildAgentsMd, emitAgentsMd } from "./agents-md.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");

describe("buildAgentsMd", () => {
  it("includes every skill in the skill index", () => {
    const md = buildAgentsMd(FIXTURES_REPO);
    expect(md).toContain("| valid-skill |");
    expect(md).toContain("| invalid-skill |");
    expect(md).toContain("| oversized-skill |");
  });

  it("includes top-level workflows but excludes nested subdirectory files", () => {
    const md = buildAgentsMd(FIXTURES_REPO);
    expect(md).toContain("| fixture-workflow |");
    expect(md).not.toContain("nested-should-not-appear");
  });

  it("includes the rules index with scope from globs", () => {
    const md = buildAgentsMd(FIXTURES_REPO);
    expect(md).toContain("| fixture-rule |");
    expect(md).toContain("**/*.fixture");
  });

  it("collapses a YAML folded description into a single table row", () => {
    const md = buildAgentsMd(FIXTURES_REPO);
    const line = md
      .split("\n")
      .find((l) => l.startsWith("| folded-desc-skill |"));
    expect(line).toBeDefined();
    expect(line?.trimEnd().endsWith("|")).toBe(true);
    expect(line).toContain("normalized before use in Markdown tables.");
  });
});

describe("emitAgentsMd", () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("writes AGENTS.md to outDir and flags divergence from the existing root file", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agents-md-"));
    const report = emitAgentsMd(FIXTURES_REPO, outDir);

    expect(report.existingExists).toBe(true);
    expect(report.existingDiffers).toBe(true);

    const written = readFileSync(path.join(outDir, "AGENTS.md"), "utf-8");
    expect(written).toContain("## Skills");
  });

  it("never writes to the existing root AGENTS.md path", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agents-md-"));
    const report = emitAgentsMd(FIXTURES_REPO, outDir);
    const before = readFileSync(report.existingPath, "utf-8");
    expect(before).toContain("fixture");
    expect(report.outPath).not.toBe(report.existingPath);
  });
});
