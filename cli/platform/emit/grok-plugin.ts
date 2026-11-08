/**
 * Grok Build CLI plugin emit target.
 *
 * Grok auto-reads Claude Code plugins and marketplaces (`.claude-plugin/`)
 * with no setup, and additionally honors a native, Claude-compatible manifest
 * at `.grok-plugin/plugin.json` plus a catalog at
 * `.grok-plugin/marketplace.json` (docs.x.ai/build/features/skills-plugins-marketplaces,
 * github.com/xai-org/plugin-marketplace). Both are emitted at the repo root so
 * `grok plugin marketplace add first-fluke/oh-my-agent` resolves the same
 * `oma` + domain entries as the Claude marketplace.
 *
 * Hooks are deliberately not declared: Grok reads the Claude hooks.json shape
 * and maps Claude tool names, but its documented hook environment is
 * `GROK_HOOK_*` / `GROK_PLUGIN_ROOT`, and the Claude hook commands here expand
 * `${CLAUDE_PLUGIN_ROOT}` / `CLAUDE_PROJECT_DIR`. An unexpanded path simply
 * fails open on Grok (non-zero exit is logged and ignored), so the manifest
 * omits `hooks` rather than advertise a bridge that cannot run.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOMAIN_PRESETS } from "../domain-presets.js";
import { discoverSkillDirs } from "./agent-skills.js";
import {
  AGENTS_DIR,
  buildClaudeStyleMcpServers,
  listAgentFiles,
  NATIVE_MARKETPLACE_NAME,
  NATIVE_PLUGIN_NAME,
  REPOSITORY_URL,
  readPackageMetadata,
  serializeJson,
} from "./native-manifest.js";
import type { GrokPluginEmitReport } from "./types.js";

/** Repo-relative directory Grok reads its native manifest and catalog from. */
export const GROK_PLUGIN_DIR = ".grok-plugin";

/** Native manifest: Claude-compatible metadata plus explicit component paths. */
export function buildGrokManifest(repoRoot: string): Record<string, unknown> {
  const pkg = readPackageMetadata(repoRoot);
  const mcp = buildClaudeStyleMcpServers(repoRoot);
  return {
    name: NATIVE_PLUGIN_NAME,
    version: pkg.version,
    description: pkg.description,
    author: pkg.author,
    homepage: pkg.homepage,
    repository: REPOSITORY_URL,
    license: pkg.license,
    keywords: [...pkg.keywords, "grok"],
    // The root `skills/` tree is the Agent Plugins package: every skill
    // bundles its shared resources, so each folder loads in isolation.
    skills: discoverSkillDirs(repoRoot).map((name) => `./skills/${name}`),
    agents: listAgentFiles(repoRoot).map((file) => `./${AGENTS_DIR}/${file}`),
    ...(mcp ? { mcpServers: mcp.mcpServers } : {}),
  };
}

/**
 * Catalog mirroring the Claude marketplace entries. Sources use Grok's local
 * object form (`{type: "local", path}`), resolved against the marketplace
 * repository root; `url` sources would require a pinned 40-hex commit sha.
 */
export function buildGrokMarketplace(
  repoRoot: string,
): Record<string, unknown> {
  const pkg = readPackageMetadata(repoRoot);
  const base = {
    homepage: pkg.homepage,
    author: pkg.author.name,
  };
  return {
    name: NATIVE_MARKETPLACE_NAME,
    description: pkg.description,
    owner: { name: pkg.author.name, url: REPOSITORY_URL },
    plugins: [
      {
        name: NATIVE_PLUGIN_NAME,
        description: pkg.description,
        category: "development",
        source: { type: "local", path: "./" },
        keywords: pkg.keywords,
        tags: ["skills", "agents", "workflows"],
        ...base,
      },
      ...Object.entries(DOMAIN_PRESETS).map(([domain, preset]) => ({
        name: `${NATIVE_PLUGIN_NAME}-${domain}`,
        description: preset.description,
        category: domain,
        source: {
          type: "local",
          path: `./.claude-plugin/domains/${domain}`,
        },
        keywords: [domain, ...preset.skills],
        tags: ["skills", "agents", domain],
        ...base,
      })),
    ],
  };
}

/** Emit `.grok-plugin/{plugin.json, marketplace.json}` under `outDir`. */
export function emitGrokPlugin(
  repoRoot: string,
  outDir: string,
): GrokPluginEmitReport {
  mkdirSync(outDir, { recursive: true });
  const manifest = buildGrokManifest(repoRoot);
  const manifestPath = join(outDir, "plugin.json");
  writeFileSync(manifestPath, serializeJson(manifest));
  const marketplacePath = join(outDir, "marketplace.json");
  writeFileSync(marketplacePath, serializeJson(buildGrokMarketplace(repoRoot)));
  return {
    target: "grok-plugin",
    outDir,
    manifestPath,
    marketplacePath,
    agents: (manifest.agents as string[]).map((p) =>
      p.replace(/^.*\//, "").replace(/\.md$/, ""),
    ),
  };
}
