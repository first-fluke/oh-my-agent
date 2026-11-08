/**
 * Antigravity plugin emit target.
 *
 * Builds the self-contained `antigravity-plugin/` package that the Antigravity
 * CLI (`agy`) installs with `agy plugin install <dir|github url>`. The layout
 * follows https://antigravity.google/docs/build-plugins and the manifest is
 * validated against https://antigravity.google/schemas/v1/plugin.json
 * (`additionalProperties: false`, `name` required).
 *
 * A dedicated tree (like `codex-plugin/`) is emitted instead of a repo-root
 * `.antigravity-plugin/plugin.json` because `agy plugin validate --strict`
 * rejects the repo root: Antigravity loads rules only from `rules/` (the root
 * `AGENTS.md` is reported as never loaded) and hooks only from a root
 * `hooks.json` (the Claude `hooks/hooks.json` is reported as never loaded).
 * Hooks are intentionally not emitted: Antigravity hook commands run with the
 * plugin root as cwd and must print a JSON object, which the Claude-style
 * `scripts/plugin-hook.sh` does not do; `oma install` provisions the native
 * Antigravity hook bridge (`.agents/hooks/variants/antigravity.json`) instead.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { serializeFrontmatter } from "../../utils/frontmatter.js";
import { emitAgentSkills } from "./agent-skills.js";
import {
  buildClaudeStyleMcpServers,
  HOMEPAGE_URL,
  NATIVE_PLUGIN_NAME,
  type ParsedRule,
  REPOSITORY_URL,
  readAgents,
  readPackageMetadata,
  readRules,
  serializeJson,
} from "./native-manifest.js";
import type { AntigravityEmitReport } from "./types.js";

/** Self-contained Antigravity install root (relative to the repo root). */
export const ANTIGRAVITY_PLUGIN_DIR = "antigravity-plugin";
export const ANTIGRAVITY_SCHEMA_URL =
  "https://antigravity.google/schemas/v1/plugin.json";
const LOGO_SOURCE = "web/static/icons/ios/512.png";
const LOGO_PATH = "assets/logo.png";

/**
 * Marketplace listing text: Antigravity recommends 120-160 characters and the
 * package.json description exceeds that, so the listing copy is fixed here.
 */
export const ANTIGRAVITY_DESCRIPTION =
  "Portable multi-agent harness: project skills, workflows, and specialist agents that plan, build in parallel, review, and debug your code.";

const SUGGESTED_PROMPTS = [
  "Plan this feature with /oma-pm and split it into parallel tasks",
  "Review the current diff with /oma-qa and list findings by severity",
  "Debug this failing test with /oma-debug and propose a minimal fix",
];

/** Build the `plugin.json` manifest (schema-conformant, no unknown keys). */
export function buildAntigravityManifest(
  repoRoot: string,
): Record<string, unknown> {
  const pkg = readPackageMetadata(repoRoot);
  return {
    $schema: ANTIGRAVITY_SCHEMA_URL,
    name: NATIVE_PLUGIN_NAME,
    displayName: "oh-my-agent",
    description: ANTIGRAVITY_DESCRIPTION,
    version: pkg.version,
    logo: LOGO_PATH,
    suggestedPrompts: SUGGESTED_PROMPTS,
    author: {
      name: pkg.author.name,
      url: pkg.author.url ?? "https://github.com/first-fluke",
    },
    homepage: pkg.homepage || HOMEPAGE_URL,
    repository: REPOSITORY_URL,
    license: pkg.license,
    keywords: [...pkg.keywords, "antigravity"],
  };
}

/**
 * Antigravity rule frontmatter: `trigger` selects activation and `globs` is a
 * comma-separated string (not a YAML list). oma's `alwaysApply: true` becomes
 * `always_on`, a `globs` rule becomes `glob`, and the rest are
 * `model_decision` rules keyed off their description.
 */
export function antigravityRuleFrontmatter(
  rule: ParsedRule,
): Record<string, unknown> {
  if (rule.alwaysApply) {
    return { trigger: "always_on", description: rule.description };
  }
  if (rule.globs.length > 0) {
    return {
      trigger: "glob",
      globs: rule.globs.join(", "),
      description: rule.description,
    };
  }
  return { trigger: "model_decision", description: rule.description };
}

/**
 * Antigravity infers the transport from the fields (`command` = stdio,
 * `url` = HTTP) and `agy plugin validate --strict` flags an explicit `type`
 * as an ignored unknown field, so it is dropped here.
 */
export function antigravityMcpServers(
  servers: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(servers).map(([name, { type: _type, ...server }]) => [
      name,
      server,
    ]),
  );
}

/** Emit the Antigravity package under `outDir` (the package root itself). */
export function emitAntigravityPlugin(
  repoRoot: string,
  outDir: string,
): AntigravityEmitReport {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const skills = emitAgentSkills(repoRoot, join(outDir, "skills"));

  const agents = readAgents(repoRoot);
  if (agents.length > 0) mkdirSync(join(outDir, "agents"), { recursive: true });
  for (const agent of agents) {
    writeFileSync(
      join(outDir, "agents", `${agent.id}.md`),
      serializeFrontmatter(
        { name: agent.name, description: agent.description },
        agent.body,
      ),
    );
  }

  const rules = readRules(repoRoot);
  mkdirSync(join(outDir, "rules"), { recursive: true });
  for (const rule of rules) {
    writeFileSync(
      join(outDir, "rules", `${rule.id}.md`),
      serializeFrontmatter(antigravityRuleFrontmatter(rule), rule.body),
    );
  }
  writeFileSync(
    join(outDir, "rules", "AGENTS.md"),
    buildAlwaysOnRule(
      skills.map((s) => s.skill),
      agents,
    ),
  );

  const mcp = buildClaudeStyleMcpServers(repoRoot);
  if (mcp) {
    writeFileSync(
      join(outDir, "mcp_config.json"),
      serializeJson({ mcpServers: antigravityMcpServers(mcp.mcpServers) }),
    );
  }

  const logoSource = join(repoRoot, LOGO_SOURCE);
  if (existsSync(logoSource)) {
    mkdirSync(join(outDir, "assets"), { recursive: true });
    cpSync(logoSource, join(outDir, LOGO_PATH));
  }
  if (existsSync(join(repoRoot, "LICENSE")))
    cpSync(join(repoRoot, "LICENSE"), join(outDir, "LICENSE"));

  const manifest = buildAntigravityManifest(repoRoot);
  if (!existsSync(logoSource)) delete manifest.logo;
  const manifestPath = join(outDir, "plugin.json");
  writeFileSync(manifestPath, serializeJson(manifest));
  writeFileSync(
    join(outDir, "README.md"),
    buildReadme(skills.length, agents.length, rules.length, mcp?.servers ?? []),
  );

  const passCount = skills.filter((s) => s.validation.valid).length;
  return {
    target: "antigravity-plugin",
    outDir,
    manifestPath,
    skills,
    passCount,
    failCount: skills.length - passCount,
    agents: agents.map((a) => a.id),
    rules: rules.map((r) => r.id),
    mcp: {
      emitted: mcp !== undefined,
      servers: mcp?.servers ?? [],
      skipped: mcp?.skipped ?? [],
    },
  };
}

function buildAlwaysOnRule(
  skills: string[],
  agents: Array<{ name: string; description: string }>,
): string {
  const agentLines = agents
    .map((a) => `- **${a.name}**: ${a.description}`)
    .join("\n");
  return `# oh-my-agent

This plugin adds the oh-my-agent (oma) skills, rules, and specialist agents.

- Load a skill with \`/<skill-name>\` (for example \`/oma-pm\`, \`/oma-qa\`, \`/oma-debug\`) when a task needs it; only its name and description are loaded until then.
- Agent definitions stay in English; respond in the user's prompt language.
- Workflows and project hooks need the \`oma\` CLI (\`npm i -g oh-my-agent\`), which also installs the native Antigravity hook bridge. Skills and agents work without it.

## Agents

${agentLines}

## Skills

${skills.map((s) => `- \`/${s}\``).join("\n")}
`;
}

function buildReadme(
  skillCount: number,
  agentCount: number,
  ruleCount: number,
  mcpServers: string[],
): string {
  return `# oh-my-agent for Antigravity

**Ship 400+ commits a day.** oh-my-agent turns Antigravity into a team: a planner splits the work, engineers build in parallel, a reviewer checks the result, and a debugger fixes the root cause.

This plugin bundles ${skillCount} skills, ${agentCount} specialist agents, and ${ruleCount} scoped rules. Skills load on demand (\`/<skill-name>\`), so the rest stay out of your context.

## Install

\`\`\`bash
# From a clone of the repository
agy plugin validate --strict ./antigravity-plugin
agy plugin install ./antigravity-plugin
\`\`\`

List what was loaded with \`agy plugin list\` and start a session with a bundled agent using \`agy --agent pm-planner\`.

## What this plugin runs

- \`mcp_config.json\` declares ${mcpServers.length} MCP server${mcpServers.length === 1 ? "" : "s"}${mcpServers.length ? ` (${mcpServers.join(", ")})` : ""}. Local stdio servers only start when their executable is installed.
- No hooks ship in this package. The \`oma\` CLI (\`npm i -g oh-my-agent\`, then \`oma install\`) provisions the native Antigravity hook bridge for workflows.

Generated by \`oma emit --target antigravity-plugin\` from the \`.agents/\` source of truth; do not edit by hand.

## License

MIT
`;
}
