import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildMarketplaceManifest, emitClaudePlugin } from "./claude-plugin.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");

describe("buildMarketplaceManifest", () => {
  it("lists every discovered skill under the single oma plugin entry", () => {
    const manifest = buildMarketplaceManifest(FIXTURES_REPO);
    const plugins = manifest.plugins as Array<{
      name: string;
      skills: string[];
      agents: string[];
    }>;
    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.skills).toEqual([
      "./.agents/skills/folded-desc-skill",
      "./.agents/skills/invalid-skill",
      "./.agents/skills/oversized-skill",
      "./.agents/skills/valid-skill",
    ]);
  });

  it("lists .claude/agents/*.md as the agents extension field", () => {
    const manifest = buildMarketplaceManifest(FIXTURES_REPO);
    const plugins = manifest.plugins as Array<{ agents: string[] }>;
    expect(plugins[0]?.agents).toEqual(["./.claude/agents/fixture-agent.md"]);
  });

  it("pulls name/description/version from package.json", () => {
    const manifest = buildMarketplaceManifest(FIXTURES_REPO);
    expect(manifest.name).toBe("fixture-repo");
    expect((manifest.metadata as { version: string }).version).toBe("0.0.1");
  });
});

describe("emitClaudePlugin", () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("writes marketplace.json and flags divergence from the existing hand-authored file", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-claude-plugin-"));
    const report = emitClaudePlugin(FIXTURES_REPO, outDir);

    expect(report.existingDiffers).toBe(true);
    expect(report.outPath).toBe(path.join(outDir, "marketplace.json"));
  });

  it("never writes to the existing .claude-plugin/marketplace.json path", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-claude-plugin-"));
    const report = emitClaudePlugin(FIXTURES_REPO, outDir);
    expect(report.existingPath).toBe(
      path.join(FIXTURES_REPO, ".claude-plugin", "marketplace.json"),
    );
    expect(report.outPath).not.toBe(report.existingPath);
  });
});
