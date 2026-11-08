/**
 * Z.ai ZCode plugin emit target.
 *
 * ZCode resolves a plugin manifest from `.zcode-plugin/plugin.json`
 * (recommended) and falls back to `.claude-plugin/plugin.json`
 * (zcode.z.ai/en/docs/plugin). The emitted manifest and marketplace live at
 * the repo root so adding the repository as a custom marketplace
 * (Settings -> Plugins -> Create -> Add marketplace) lists the same `oma` and
 * domain entries as the Claude marketplace; the domain roots are resolved
 * through their Claude manifests, which ZCode reads as the fallback.
 *
 * Hooks are not declared: ZCode's hook schema is Claude-compatible, but the
 * documented execution context does not include `${CLAUDE_PLUGIN_ROOT}`
 * expansion, which every command in the Claude `hooks/hooks.json` relies on.
 * Install is GUI-only, so there is no CLI validator; the shape is checked by
 * the unit tests against the documented field set.
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
import type { ZcodePluginEmitReport } from "./types.js";

/** Repo-relative directory ZCode reads its native manifest and catalog from. */
export const ZCODE_PLUGIN_DIR = ".zcode-plugin";

/** ZCode plugin name constraint (`^[a-z0-9][a-z0-9._-]{0,127}$`). */
export const ZCODE_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;

export function buildZcodeManifest(repoRoot: string): Record<string, unknown> {
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
    keywords: [...pkg.keywords, "zcode"],
    skills: discoverSkillDirs(repoRoot).map((name) => `./skills/${name}`),
    agents: listAgentFiles(repoRoot).map((file) => `./${AGENTS_DIR}/${file}`),
    ...(mcp ? { mcpServers: mcp.mcpServers } : {}),
  };
}

/**
 * Catalog entries carry `version` because ZCode's "Check for updates" compares
 * the marketplace version against the installed `plugin.json`; release-please
 * bumps every `plugins[*].version` alongside the manifests.
 */
export function buildZcodeMarketplace(
  repoRoot: string,
): Record<string, unknown> {
  const pkg = readPackageMetadata(repoRoot);
  return {
    name: NATIVE_MARKETPLACE_NAME,
    description: pkg.description,
    plugins: [
      {
        name: NATIVE_PLUGIN_NAME,
        source: "./",
        description: pkg.description,
        version: pkg.version,
        category: "development",
        tags: ["skills", "agents", "workflows"],
      },
      ...Object.entries(DOMAIN_PRESETS).map(([domain, preset]) => ({
        name: `${NATIVE_PLUGIN_NAME}-${domain}`,
        source: `./.claude-plugin/domains/${domain}`,
        description: preset.description,
        version: pkg.version,
        category: domain,
        tags: ["skills", "agents", domain],
      })),
    ],
  };
}

/** Emit `.zcode-plugin/{plugin.json, marketplace.json}` under `outDir`. */
export function emitZcodePlugin(
  repoRoot: string,
  outDir: string,
): ZcodePluginEmitReport {
  mkdirSync(outDir, { recursive: true });
  const manifest = buildZcodeManifest(repoRoot);
  const manifestPath = join(outDir, "plugin.json");
  writeFileSync(manifestPath, serializeJson(manifest));
  const marketplacePath = join(outDir, "marketplace.json");
  writeFileSync(
    marketplacePath,
    serializeJson(buildZcodeMarketplace(repoRoot)),
  );
  const mcp = buildClaudeStyleMcpServers(repoRoot);
  return {
    target: "zcode-plugin",
    outDir,
    manifestPath,
    marketplacePath,
    agents: (manifest.agents as string[]).map((p) =>
      p.replace(/^.*\//, "").replace(/\.md$/, ""),
    ),
    mcp: {
      emitted: mcp !== undefined,
      servers: mcp?.servers ?? [],
      skipped: mcp?.skipped ?? [],
    },
  };
}
