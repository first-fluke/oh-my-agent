import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runEmit } from "./command.js";
import { renderJson, renderText } from "./report.js";

const FIXTURES_REPO = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "platform",
  "emit",
  "__fixtures__",
  "repo",
);

describe("runEmit", () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("target=agent-skills only populates the agentSkills report", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-command-"));
    const report = runEmit({
      target: "agent-skills",
      repoRoot: FIXTURES_REPO,
      outDir,
    });
    expect(report.agentSkills).toBeDefined();
    expect(report.agentPlugin).toBeUndefined();
    expect(report.claudePlugin).toBeUndefined();
    expect(report.agentsMd).toBeUndefined();
    expect(report.agentSkills?.failCount).toBeGreaterThan(0);
  });

  it("target=all populates every report", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-command-"));
    const report = runEmit({ target: "all", repoRoot: FIXTURES_REPO, outDir });
    expect(report.agentSkills).toBeDefined();
    expect(report.agentPlugin).toBeDefined();
    expect(report.claudePlugin).toBeDefined();
    expect(report.agentsMd).toBeDefined();
    expect(
      report.cliDocs?.files.map((file) => path.basename(file.outPath)),
    ).toEqual(["AGENTS.md"]);
    expect(existsSync(path.join(outDir, "cli", "CLAUDE.md"))).toBe(false);
  });

  it("target=cli-docs emits AGENTS.md without creating CLAUDE.md", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-command-"));

    const report = runEmit({
      target: "cli-docs",
      repoRoot: FIXTURES_REPO,
      outDir,
    });

    expect(
      report.cliDocs?.files.map((file) => path.basename(file.outPath)),
    ).toEqual(["AGENTS.md"]);
    expect(report.agentSkills).toBeUndefined();
    expect(report.agentPlugin).toBeUndefined();
    expect(report.claudePlugin).toBeUndefined();
    expect(report.agentsMd).toBeUndefined();
    expect(existsSync(path.join(outDir, "cli", "AGENTS.md"))).toBe(true);
    expect(existsSync(path.join(outDir, "cli", "CLAUDE.md"))).toBe(false);
  });
});

describe("report rendering", () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("renderText surfaces pass/fail counts and per-skill validation errors", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-command-"));
    const report = runEmit({
      target: "agent-skills",
      repoRoot: FIXTURES_REPO,
      outDir,
    });
    const text = renderText(report);
    expect(text).toContain("passed");
    expect(text).toContain("[FAIL] invalid-skill");
  });

  it("renderJson round-trips through JSON.parse", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-command-"));
    const report = runEmit({ target: "all", repoRoot: FIXTURES_REPO, outDir });
    const parsed = JSON.parse(renderJson(report));
    expect(parsed.agentSkills.passCount).toBe(report.agentSkills?.passCount);
  });
});
