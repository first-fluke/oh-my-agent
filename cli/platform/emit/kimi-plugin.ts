/**
 * Kimi Code CLI plugin emit target.
 *
 * Kimi reads `kimi.plugin.json` or `.kimi-plugin/plugin.json` at the plugin
 * root (moonshotai.github.io/kimi-code/en/customization/plugins.html). The
 * manifest is emitted at `.kimi-plugin/plugin.json` so a clone of this
 * repository installs with `/plugins install <path-or-github-url>`:
 *
 * - `skills` entries are scan directories (containers of `<name>/SKILL.md`),
 *   so the manifest points at the root Agent Plugins `./skills` tree, whose
 *   folders bundle their shared resources.
 * - `agents` entries are `./` paths to agent files. oma's `.agents/agents/*.md`
 *   already use Kimi's format (Markdown body as system prompt, frontmatter
 *   `name` + `description`; unknown keys such as `skills` are ignored), so the
 *   SSOT files are referenced directly, no conversion copy needed.
 * - `mcpServers` reuses the MCP schema: stdio `command`/`args`/`env`, http `url`.
 *
 * Hooks are not declared: Kimi runs plugin hooks with the plugin root (the
 * per-user managed copy) as cwd and across every project, while the Claude
 * `scripts/plugin-bootstrap.sh` / `plugin-hook.sh` resolve the project from
 * `CLAUDE_PROJECT_DIR` or `$PWD`. Running them from the managed copy would
 * bootstrap the wrong directory, so `oma install` provisions the Kimi hook
 * bridge (`.kimi-code/config.toml` via `.agents/hooks/variants/kimi.json`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AGENTS_DIR,
  buildClaudeStyleMcpServers,
  listAgentFiles,
  NATIVE_PLUGIN_NAME,
  readPackageMetadata,
  serializeJson,
} from "./native-manifest.js";
import type { KimiPluginEmitReport } from "./types.js";

/** Repo-relative directory Kimi reads its manifest from. */
export const KIMI_PLUGIN_DIR = ".kimi-plugin";

/** Kimi plugin id constraint. */
export const KIMI_NAME_RE =
  /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*(@[A-Za-z0-9_-]+)?$/;

export function buildKimiManifest(repoRoot: string): Record<string, unknown> {
  const pkg = readPackageMetadata(repoRoot);
  const mcp = buildClaudeStyleMcpServers(repoRoot);
  return {
    name: NATIVE_PLUGIN_NAME,
    version: pkg.version,
    description: pkg.description,
    keywords: [...pkg.keywords, "kimi"],
    author: pkg.author.name,
    homepage: pkg.homepage,
    license: pkg.license,
    interface: {
      displayName: "oh-my-agent",
      shortDescription: "Skills, specialist agents, and MCP servers for oma",
      longDescription: pkg.description,
      developerName: pkg.author.name,
      websiteURL: pkg.homepage,
      defaultLocale: "en-US",
    },
    skills: ["./skills"],
    agents: listAgentFiles(repoRoot).map((file) => `./${AGENTS_DIR}/${file}`),
    ...(mcp ? { mcpServers: mcp.mcpServers } : {}),
    skillInstructions:
      "Skills from oh-my-agent reference shared resources under their own references/_shared/ folder. Respond in the user's prompt language; keep code, commit messages, and file paths in English.",
  };
}

/** Emit `.kimi-plugin/plugin.json` under `outDir`. */
export function emitKimiPlugin(
  repoRoot: string,
  outDir: string,
): KimiPluginEmitReport {
  mkdirSync(outDir, { recursive: true });
  const manifest = buildKimiManifest(repoRoot);
  const manifestPath = join(outDir, "plugin.json");
  writeFileSync(manifestPath, serializeJson(manifest));
  const mcp = buildClaudeStyleMcpServers(repoRoot);
  return {
    target: "kimi-plugin",
    outDir,
    manifestPath,
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
