import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DOMAIN_PRESETS } from "../domain-presets.js";
import {
  buildZcodeManifest,
  buildZcodeMarketplace,
  emitZcodePlugin,
  ZCODE_NAME_RE,
} from "./zcode-plugin.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

// Documented field set (zcode.z.ai/en/docs/plugin). ZCode ignores nothing
// silently in strict marketplaces, so the manifest stays inside this list.
const MANIFEST_FIELDS = new Set([
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "commands",
  "skills",
  "agents",
  "hooks",
  "mcpServers",
  "dependencies",
  "userConfig",
]);
const MARKETPLACE_FIELDS = new Set([
  "name",
  "description",
  "plugins",
  "pluginRoot",
  "allowCrossMarketplaceDependenciesOn",
]);
const ENTRY_FIELDS = new Set([
  "name",
  "source",
  "description",
  "version",
  "category",
  "tags",
  "dependencies",
  "strict",
]);
const SOURCE_KINDS = new Set([
  "directory",
  "github",
  "git",
  "file",
  "url",
  "npm",
]);

function manifestProblems(manifest: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!ZCODE_NAME_RE.test(String(manifest.name)))
    problems.push(`bad name ${manifest.name}`);
  for (const key of Object.keys(manifest))
    if (!MANIFEST_FIELDS.has(key)) problems.push(`unknown field ${key}`);
  for (const key of ["skills", "agents", "commands", "hooks", "mcpServers"]) {
    const value = manifest[key];
    if (value === undefined) continue;
    const ok =
      typeof value === "string" ||
      (Array.isArray(value) && value.every((v) => typeof v === "string")) ||
      (typeof value === "object" && value !== null);
    if (!ok) problems.push(`${key} must be a path, path array, or object`);
  }
  return problems;
}

function marketplaceProblems(catalog: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (typeof catalog.name !== "string") problems.push("name required");
  for (const key of Object.keys(catalog))
    if (!MARKETPLACE_FIELDS.has(key)) problems.push(`unknown field ${key}`);
  if (!Array.isArray(catalog.plugins)) return [...problems, "plugins required"];
  for (const entry of catalog.plugins as Array<Record<string, unknown>>) {
    if (!ZCODE_NAME_RE.test(String(entry.name)))
      problems.push(`bad entry name ${entry.name}`);
    for (const key of Object.keys(entry))
      if (!ENTRY_FIELDS.has(key))
        problems.push(`${entry.name}: unknown ${key}`);
    const source = entry.source;
    if (typeof source === "string") {
      if (!source.startsWith("./"))
        problems.push(`${entry.name}: relative source must start with ./`);
    } else if (source && typeof source === "object") {
      if (!SOURCE_KINDS.has(String((source as { source?: unknown }).source)))
        problems.push(`${entry.name}: unknown source kind`);
    } else {
      problems.push(`${entry.name}: source required`);
    }
  }
  return problems;
}

describe("buildZcodeManifest", () => {
  it("stays within the documented field set and name pattern", () => {
    const manifest = buildZcodeManifest(FIXTURES_REPO);
    expect(manifestProblems(manifest)).toEqual([]);
    expect(manifest).toMatchObject({
      name: "oma",
      version: "0.0.1",
      author: { name: "Fixture Author" },
      license: "MIT",
    });
    expect(manifest.keywords).toContain("zcode");
    expect(manifest.skills).toEqual([
      "./skills/folded-desc-skill",
      "./skills/invalid-skill",
      "./skills/oversized-skill",
      "./skills/valid-skill",
    ]);
    expect(manifest.agents).toEqual(["./.agents/agents/fixture-agent.md"]);
    expect(manifest).not.toHaveProperty("hooks");
    expect(
      (manifest.mcpServers as Record<string, unknown>)["good-stdio"],
    ).toEqual({ command: "echo", args: ["hello"], env: { FIXTURE: "1" } });
  });

  it("rejects names outside ZCode's pattern", () => {
    expect(ZCODE_NAME_RE.test("Oma")).toBe(false);
    expect(ZCODE_NAME_RE.test("-oma")).toBe(false);
    expect(ZCODE_NAME_RE.test("oma.frontend_v2-x")).toBe(true);
  });
});

describe("buildZcodeMarketplace", () => {
  it("lists the oma entry and domain roots with relative sources and versions", () => {
    const catalog = buildZcodeMarketplace(FIXTURES_REPO);
    expect(marketplaceProblems(catalog)).toEqual([]);
    const plugins = catalog.plugins as Array<Record<string, unknown>>;
    expect(plugins.map((p) => p.name)).toEqual([
      "oma",
      ...Object.keys(DOMAIN_PRESETS).map((d) => `oma-${d}`),
    ]);
    expect(plugins[0]).toMatchObject({
      source: "./",
      version: "0.0.1",
      category: "development",
    });
    expect(plugins[1]).toMatchObject({
      source: "./.claude-plugin/domains/frontend",
      version: "0.0.1",
      description: DOMAIN_PRESETS.frontend.description,
    });
    expect(catalog).not.toHaveProperty("owner");
  });
});

describe("emitZcodePlugin", () => {
  let outDir: string;
  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("writes plugin.json and marketplace.json into the given directory", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-zcode-"));
    const report = emitZcodePlugin(FIXTURES_REPO, outDir);
    expect(report.manifestPath).toBe(path.join(outDir, "plugin.json"));
    expect(report.marketplacePath).toBe(path.join(outDir, "marketplace.json"));
    expect(report.agents).toEqual(["fixture-agent"]);
    expect(report.mcp.emitted).toBe(true);
    expect(existsSync(report.manifestPath)).toBe(true);
  });

  it("resolves every real-repo path and marketplace source", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-zcode-repo-"));
    emitZcodePlugin(REPO_ROOT, outDir);
    const manifest = JSON.parse(
      readFileSync(path.join(outDir, "plugin.json"), "utf8"),
    );
    expect(manifestProblems(manifest)).toEqual([]);
    for (const entry of [...manifest.skills, ...manifest.agents])
      expect(existsSync(path.join(REPO_ROOT, entry)), entry).toBe(true);
    const catalog = JSON.parse(
      readFileSync(path.join(outDir, "marketplace.json"), "utf8"),
    );
    expect(marketplaceProblems(catalog)).toEqual([]);
    for (const plugin of catalog.plugins) {
      const root = path.join(REPO_ROOT, plugin.source);
      // Each source root carries a manifest ZCode can resolve: the native one
      // at the repo root, the Claude fallback in every domain root.
      expect(
        existsSync(path.join(root, ".zcode-plugin", "plugin.json")) ||
          existsSync(path.join(root, ".claude-plugin", "plugin.json")),
        plugin.name,
      ).toBe(true);
    }
  });
});
