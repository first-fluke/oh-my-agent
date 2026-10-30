import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PRESETS } from "../../constants/index.js";

import { DOMAIN_PRESETS } from "../domain-presets.js";
import {
  buildMarketplaceManifest,
  emitClaudePlugin,
  emitCodexMarketplace,
} from "./claude-plugin.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");

describe("buildMarketplaceManifest", () => {
  it("keeps the full oma entry and adds isolated domain source roots", () => {
    const manifest = buildMarketplaceManifest(FIXTURES_REPO);
    const plugins = manifest.plugins as Array<Record<string, unknown>>;
    expect(plugins.map((plugin) => plugin.name)).toEqual([
      "oma",
      "oma-frontend",
      "oma-security",
      "oma-research",
    ]);
    expect(plugins[0]).toMatchObject({ source: "./" });
    expect(plugins[0]).not.toHaveProperty("skills");
    expect(plugins[0]).not.toHaveProperty("agents");
    expect(plugins[1]?.source).toBe("./.claude-plugin/domains/frontend");
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

  it("emits the full manifest with valid agent file paths", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-full-manifest-"));
    emitClaudePlugin(FIXTURES_REPO, outDir);
    const manifest = JSON.parse(
      readFileSync(path.join(outDir, "plugin.json"), "utf8"),
    );
    expect(manifest.agents).toEqual(["./.agents/agents/fixture-agent.md"]);
    expect(manifest.skills).toHaveLength(4);
  });

  it("packages only each domain's selected skills, roles, and preset bootstrap", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-domains-"));
    const root = path.resolve(import.meta.dirname, "../../..");
    emitClaudePlugin(root, outDir);
    for (const [domain, preset] of Object.entries(DOMAIN_PRESETS)) {
      const domainRoot = path.join(outDir, "domains", domain);
      expect(readdirSync(path.join(domainRoot, "skills")).sort()).toEqual(
        [...preset.skills].sort(),
      );
      expect(PRESETS[domain]).toEqual([...preset.skills]);
      const manifest = JSON.parse(
        readFileSync(
          path.join(domainRoot, ".claude-plugin/plugin.json"),
          "utf8",
        ),
      );
      expect(manifest.name).toBe(`oma-${domain}`);
      expect(manifest.agents).toEqual(
        preset.agents.map((name) => `./agents/${name}.md`),
      );
      expect(manifest.hooks.SessionStart[0].hooks[0].command).toContain(
        `plugin-bootstrap.sh" ${domain}`,
      );
      expect(manifest.hooks.SessionStart[0].hooks[0].async).toBe(true);
      const portable = JSON.parse(
        readFileSync(path.join(domainRoot, "plugin.json"), "utf8"),
      );
      expect(portable.name).toBe(`oma-${domain}`);
      expect(
        existsSync(path.join(domainRoot, "scripts/plugin-bootstrap.sh")),
      ).toBe(true);
    }
  });

  it("emits a self-contained directory entry with no executable components", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-directory-"));
    emitClaudePlugin(FIXTURES_REPO, outDir);
    const root = path.join(outDir, "directory");
    const manifest = JSON.parse(
      readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"),
    );

    expect(manifest.name).toBe("oh-my-agent");
    expect(manifest.version).toBe("0.0.1");
    expect(manifest.license).toBe("MIT");
    expect(manifest).not.toHaveProperty("hooks");
    expect(manifest).not.toHaveProperty("mcpServers");
    expect(manifest.agents).toEqual(["./agents/fixture-agent.md"]);
    expect(manifest.skills).toHaveLength(4);
    for (const entry of [...manifest.skills, ...manifest.agents]) {
      expect(existsSync(path.join(root, entry))).toBe(true);
    }
    expect(existsSync(path.join(root, "scripts"))).toBe(false);
    expect(existsSync(path.join(root, "hooks"))).toBe(false);
    const readme = readFileSync(path.join(root, "README.md"), "utf8");
    expect(readme).toContain("no hooks, no MCP servers, and no install step");
    expect(readme.split(/\s+/).filter(Boolean).length).toBeGreaterThan(40);
  });

  it("emits native Codex local sources with explicit installation policy", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-codex-catalog-"));
    const file = emitCodexMarketplace(FIXTURES_REPO, outDir);
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    expect(manifest.name).toBe("oh-my-agent");
    expect(
      manifest.plugins.map((plugin: { name: string }) => plugin.name),
    ).toEqual(["oma", "oma-frontend", "oma-security", "oma-research"]);
    expect(manifest.plugins[1]).toMatchObject({
      source: { source: "local", path: "./.claude-plugin/domains/frontend" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    });
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
