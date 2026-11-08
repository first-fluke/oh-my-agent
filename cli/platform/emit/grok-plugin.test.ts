import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DOMAIN_PRESETS } from "../domain-presets.js";
import {
  buildGrokManifest,
  buildGrokMarketplace,
  emitGrokPlugin,
} from "./grok-plugin.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

// Grok's marketplace contract (github.com/xai-org/plugin-marketplace): kebab
// case ids, a `source` that is either a local object or a url pinned to a
// full 40-hex sha; `scripts/validate-catalog.py` enforces the sha rule.
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
function catalogProblems(catalog: Record<string, unknown>): string[] {
  const problems: string[] = [];
  for (const key of ["name", "description", "owner", "plugins"])
    if (!(key in catalog)) problems.push(`missing ${key}`);
  const owner = catalog.owner as { name?: unknown } | undefined;
  if (typeof owner?.name !== "string") problems.push("owner.name missing");
  const plugins = catalog.plugins;
  if (!Array.isArray(plugins)) return [...problems, "plugins not an array"];
  for (const entry of plugins as Array<Record<string, unknown>>) {
    const name = String(entry.name);
    if (!KEBAB.test(name)) problems.push(`bad name ${name}`);
    const source = entry.source;
    if (typeof source === "string") continue;
    if (!source || typeof source !== "object") {
      problems.push(`${name}: missing source`);
      continue;
    }
    const src = source as Record<string, unknown>;
    if (src.source === "url") {
      if (!/^[0-9a-f]{40}$/.test(String(src.sha)))
        problems.push(`${name}: url source needs a 40-hex sha`);
    } else if (src.type === "local") {
      if (typeof src.path !== "string" || !src.path.startsWith("./"))
        problems.push(`${name}: local path must be relative`);
    } else {
      problems.push(`${name}: unknown source form`);
    }
  }
  return problems;
}

describe("buildGrokManifest", () => {
  it("emits Claude-compatible metadata with explicit component paths", () => {
    const manifest = buildGrokManifest(FIXTURES_REPO);
    expect(manifest).toMatchObject({
      name: "oma",
      version: "0.0.1",
      description: "Fixture repo for oma emit tests",
      author: { name: "Fixture Author" },
      license: "MIT",
      repository: "https://github.com/first-fluke/oh-my-agent",
    });
    expect(manifest.keywords).toContain("grok");
    expect(manifest.skills).toEqual([
      "./skills/folded-desc-skill",
      "./skills/invalid-skill",
      "./skills/oversized-skill",
      "./skills/valid-skill",
    ]);
    expect(manifest.agents).toEqual(["./.agents/agents/fixture-agent.md"]);
    // Hooks are omitted: the Claude hook commands depend on
    // ${CLAUDE_PLUGIN_ROOT}, which Grok's documented hook env does not set.
    expect(manifest).not.toHaveProperty("hooks");
    const mcp = manifest.mcpServers as Record<string, unknown>;
    expect(mcp["good-http"]).toEqual({
      type: "http",
      url: "https://example.com/mcp",
    });
    expect(mcp["good-stdio"]).not.toHaveProperty("available_tools");
  });
});

describe("buildGrokMarketplace", () => {
  it("mirrors the Claude marketplace entries with local object sources", () => {
    const catalog = buildGrokMarketplace(FIXTURES_REPO);
    expect(catalogProblems(catalog)).toEqual([]);
    expect(catalog.name).toBe("oh-my-agent");
    const plugins = catalog.plugins as Array<Record<string, unknown>>;
    expect(plugins.map((p) => p.name)).toEqual([
      "oma",
      ...Object.keys(DOMAIN_PRESETS).map((d) => `oma-${d}`),
    ]);
    expect(plugins[0]).toMatchObject({
      source: { type: "local", path: "./" },
      category: "development",
      author: "Fixture Author",
    });
    expect(plugins[1]).toMatchObject({
      source: { type: "local", path: "./.claude-plugin/domains/frontend" },
      category: "frontend",
      description: DOMAIN_PRESETS.frontend.description,
    });
    // Entry versions are display metadata on Grok; leaving them out keeps the
    // catalog free of release-bump churn.
    for (const plugin of plugins) expect(plugin).not.toHaveProperty("version");
  });

  it("flags url sources without a pinned sha", () => {
    expect(
      catalogProblems({
        name: "x",
        description: "y",
        owner: { name: "o" },
        plugins: [{ name: "p", source: { source: "url", url: "u" } }],
      }),
    ).toEqual(["p: url source needs a 40-hex sha"]);
  });
});

describe("emitGrokPlugin", () => {
  let outDir: string;
  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("writes plugin.json and marketplace.json into the given directory", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-grok-"));
    const report = emitGrokPlugin(FIXTURES_REPO, outDir);
    expect(report.manifestPath).toBe(path.join(outDir, "plugin.json"));
    expect(report.marketplacePath).toBe(path.join(outDir, "marketplace.json"));
    expect(report.agents).toEqual(["fixture-agent"]);
    expect(existsSync(report.manifestPath)).toBe(true);
    expect(JSON.parse(readFileSync(report.marketplacePath, "utf8")).name).toBe(
      "oh-my-agent",
    );
  });

  it("points every real-repo path at an existing file or directory", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-grok-repo-"));
    emitGrokPlugin(REPO_ROOT, outDir);
    const manifest = JSON.parse(
      readFileSync(path.join(outDir, "plugin.json"), "utf8"),
    );
    for (const entry of [...manifest.skills, ...manifest.agents])
      expect(existsSync(path.join(REPO_ROOT, entry)), entry).toBe(true);
    const catalog = JSON.parse(
      readFileSync(path.join(outDir, "marketplace.json"), "utf8"),
    );
    expect(catalogProblems(catalog)).toEqual([]);
    for (const plugin of catalog.plugins)
      expect(
        existsSync(path.join(REPO_ROOT, plugin.source.path)),
        plugin.name,
      ).toBe(true);
  });
});
