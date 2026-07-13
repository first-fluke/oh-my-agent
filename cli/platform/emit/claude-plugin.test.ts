import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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

  it("lists .agents/agents/*.md as the agents extension field", () => {
    const manifest = buildMarketplaceManifest(FIXTURES_REPO);
    const plugins = manifest.plugins as Array<{ agents: string[] }>;
    expect(plugins[0]?.agents).toEqual(["./.agents/agents/fixture-agent.md"]);
  });

  it("uses the stable public marketplace name, not the package.json name", () => {
    const manifest = buildMarketplaceManifest(FIXTURES_REPO);
    expect(manifest.name).toBe("oh-my-agent");
  });

  it("pulls version from package.json", () => {
    const manifest = buildMarketplaceManifest(FIXTURES_REPO);
    expect((manifest.metadata as { version: string }).version).toBe("0.0.1");
  });
});

describe("emitClaudePlugin", () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("writes marketplace.json to the given outDir verbatim", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-claude-plugin-"));
    const report = emitClaudePlugin(FIXTURES_REPO, outDir);

    expect(report.outPath).toBe(path.join(outDir, "marketplace.json"));
    expect(existsSync(report.outPath)).toBe(true);
  });

  it("leaves the repo-root .claude-plugin untouched when emitting elsewhere", () => {
    const rootManifest = path.join(
      FIXTURES_REPO,
      ".claude-plugin",
      "marketplace.json",
    );
    const before = readFileSync(rootManifest, "utf-8");
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-claude-plugin-"));
    emitClaudePlugin(FIXTURES_REPO, outDir);
    expect(readFileSync(rootManifest, "utf-8")).toBe(before);
  });
});
