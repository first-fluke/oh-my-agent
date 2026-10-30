import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { DOMAIN_PRESETS } from "../domain-presets.js";
import { buildPluginManifest } from "./agent-plugin.js";
import {
  discoverSkillDirs,
  emitAgentSkills,
  SKILLS_DIR,
} from "./agent-skills.js";
import type { ClaudePluginEmitReport } from "./types.js";

/**
 * Stable public marketplace identity. Deliberately NOT sourced from
 * package.json: the npm workspace root is named `oh-my-agent-workspace`, but
 * the marketplace that consumers `marketplace add` is `oh-my-agent`.
 */
const MARKETPLACE_NAME = "oh-my-agent";

// Agent definitions are read from the tracked .agents/ SSOT, NOT from
// .claude/agents (a gitignored per-machine vendor artifact of `oma install`) —
// sourcing the latter made the emitted manifest differ between a dev machine
// and a fresh CI checkout, failing the drift gate.
const AGENTS_DIR = ".agents/agents";

interface PackageJsonShape {
  name?: string;
  description?: string;
  version?: string;
  homepage?: string;
  author?: { name?: string; email?: string } | string;
}

function readPackageJson(repoRoot: string): PackageJsonShape {
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) return {};
  return JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJsonShape;
}

/** Build the catalog; each entry delegates components to its own manifest. */
export function buildMarketplaceManifest(
  repoRoot: string,
): Record<string, unknown> {
  const pkg = readPackageJson(repoRoot);
  const ownerName =
    typeof pkg.author === "string" ? pkg.author : pkg.author?.name;

  return {
    $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
    name: MARKETPLACE_NAME,
    owner: {
      name: ownerName ?? "First Fluke",
      url: pkg.homepage ?? "https://github.com/first-fluke/oh-my-agent",
    },
    metadata: {
      description:
        pkg.description ??
        "Portable multi-agent harness for .agents-based skills and workflows",
      version: pkg.version ?? "0.0.0",
    },
    plugins: [
      {
        name: "oma",
        description: pkg.description ?? "All OMA skills and specialist teams",
        source: "./",
      },
      ...Object.entries(DOMAIN_PRESETS).map(([domain, preset]) => ({
        name: `oma-${domain}`,
        description: preset.description,
        category: domain,
        source: `./.claude-plugin/domains/${domain}`,
      })),
    ],
  };
}

/**
 * Emit the marketplace manifest to `outDir/marketplace.json`. The canonical
 * committed copy lives at the repo-root `.claude-plugin/marketplace.json`
 * (the path Claude Code auto-discovers), so `oma emit` targets that directory
 * directly — emit, not a hand-authored file, is the single source of truth.
 * `outDir` is honored verbatim so the drift check can emit into a scratch
 * directory without touching the working tree.
 */
export function emitClaudePlugin(
  repoRoot: string,
  outDir: string,
): ClaudePluginEmitReport {
  const manifest = buildMarketplaceManifest(repoRoot);
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "marketplace.json");
  writeFileSync(outPath, serialized);
  const pkg = readPackageJson(repoRoot);
  const fullAgentsDir = join(repoRoot, AGENTS_DIR);
  writeFileSync(
    join(outDir, "plugin.json"),
    `${JSON.stringify(
      {
        name: "oma",
        version: pkg.version ?? "0.0.0",
        description: pkg.description ?? "All OMA skills and specialist teams",
        author:
          typeof pkg.author === "object" ? pkg.author : { name: "First Fluke" },
        homepage: pkg.homepage ?? "https://firstfluke.com/oh-my-agent",
        repository: "https://github.com/first-fluke/oh-my-agent",
        license: "MIT",
        skills: discoverSkillDirs(repoRoot).map(
          (name) => `./.agents/skills/${name}`,
        ),
        agents: existsSync(fullAgentsDir)
          ? readdirSync(fullAgentsDir)
              .filter((name) => name.endsWith(".md"))
              .sort()
              .map((name) => `./${AGENTS_DIR}/${name}`)
          : [],
        hooks: "./hooks/hooks.json",
      },
      null,
      2,
    )}\n`,
  );

  // Isolated roots prevent Claude from merging the full plugin manifest or
  // discovering every root skill while loading a domain entry.
  for (const [domain, preset] of Object.entries(DOMAIN_PRESETS)) {
    const root = join(outDir, "domains", domain);
    rmSync(root, { recursive: true, force: true });
    mkdirSync(join(root, ".claude-plugin"), { recursive: true });
    if (existsSync(join(repoRoot, "LICENSE")))
      cpSync(join(repoRoot, "LICENSE"), join(root, "LICENSE"));
    const skills = emitAgentSkills(repoRoot, join(root, "skills"), {
      skills: preset.skills,
    });
    const agents: string[] = [];
    for (const name of preset.agents) {
      const source = join(repoRoot, AGENTS_DIR, `${name}.md`);
      if (!existsSync(source)) continue;
      mkdirSync(join(root, "agents"), { recursive: true });
      cpSync(source, join(root, "agents", `${name}.md`));
      agents.push(`./agents/${name}.md`);
    }
    writeFileSync(
      join(root, "plugin.json"),
      `${JSON.stringify(
        {
          ...buildPluginManifest(repoRoot, []),
          name: `oma-${domain}`,
          description: preset.description,
        },
        null,
        2,
      )}\n`,
    );
    mkdirSync(join(root, "scripts"), { recursive: true });
    for (const script of ["plugin-bootstrap.sh", "plugin-hook.sh"]) {
      const source = join(repoRoot, "scripts", script);
      if (existsSync(source)) cpSync(source, join(root, "scripts", script));
    }
    writeFileSync(
      join(root, "selection.json"),
      `${JSON.stringify(
        {
          preset: domain,
          skills: [...preset.skills],
        },
        null,
        2,
      )}\n`,
    );
    const hook = (event: string, matcher?: string) => ({
      ...(matcher ? { matcher } : {}),
      hooks: [
        {
          type: "command",
          command:
            event === "SessionStart"
              ? `sh "\${CLAUDE_PLUGIN_ROOT}/scripts/plugin-bootstrap.sh" ${domain}`
              : `sh "\${CLAUDE_PLUGIN_ROOT}/scripts/plugin-hook.sh" ${event}${matcher ? ` ${matcher}` : ""}`,
          ...(event === "SessionStart" ? { async: true } : {}),
          timeout: event === "SessionStart" ? 600 : event === "Stop" ? 40 : 15,
        },
      ],
    });
    writeFileSync(
      join(root, ".claude-plugin", "plugin.json"),
      `${JSON.stringify(
        {
          name: `oma-${domain}`,
          version: readPackageJson(repoRoot).version ?? "0.0.0",
          description: preset.description,
          author: { name: "First Fluke" },
          skills: skills.map((skill) => `./skills/${skill.skill}`),
          agents,
          hooks: {
            SessionStart: [hook("SessionStart")],
            UserPromptSubmit: [hook("UserPromptSubmit")],
            PreToolUse: [hook("PreToolUse", "Bash")],
            Stop: [hook("Stop")],
          },
        },
        null,
        2,
      )}\n`,
    );
  }

  emitDirectoryPlugin(repoRoot, join(outDir, "directory"));

  return { target: "claude-plugin", outPath };
}

/** Name of the self-contained entry submitted to Anthropic's plugin directory. */
export const DIRECTORY_PLUGIN_NAME = "oh-my-agent";
const DIRECTORY_ICON = "web/static/icons/ios/512.png";

function frontmatterDescription(file: string): string {
  const { frontmatter } = parseFrontmatter(readFileSync(file, "utf-8"));
  return String(frontmatter.description ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The directory reads one plugin folder and scans everything it runs, so this
 * entry carries skills and agents only. It has no hooks, scripts, or MCP
 * servers, which means installing it never downloads or executes anything.
 */
function emitDirectoryPlugin(repoRoot: string, root: string): void {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  if (existsSync(join(repoRoot, "LICENSE")))
    cpSync(join(repoRoot, "LICENSE"), join(root, "LICENSE"));
  // The directory keeps the icon from the first submission, so it must be
  // present before the plugin is ever saved in the developer portal.
  if (existsSync(join(repoRoot, DIRECTORY_ICON)))
    cpSync(
      join(repoRoot, DIRECTORY_ICON),
      join(root, ".claude-plugin", "icon.png"),
    );

  const skills = emitAgentSkills(repoRoot, join(root, "skills"), {
    sharedResources: "package",
  }).map((result) => result.skill);
  const agentsDir = join(repoRoot, AGENTS_DIR);
  const agents = existsSync(agentsDir)
    ? readdirSync(agentsDir)
        .filter((name) => name.endsWith(".md"))
        .sort()
    : [];
  if (agents.length) mkdirSync(join(root, "agents"), { recursive: true });
  for (const name of agents)
    cpSync(join(agentsDir, name), join(root, "agents", name));

  const pkg = readPackageJson(repoRoot);
  writeFileSync(
    join(root, ".claude-plugin", "plugin.json"),
    `${JSON.stringify(
      {
        name: DIRECTORY_PLUGIN_NAME,
        version: pkg.version ?? "0.0.0",
        description: `${skills.length} skills and ${agents.length} specialist agents that plan, build in parallel, review, and debug.`,
        author: { name: "First Fluke" },
        homepage: "https://firstfluke.com/oh-my-agent",
        documentationUrl: "https://firstfluke.com/oh-my-agent/",
        supportUrl: "https://github.com/first-fluke/oh-my-agent/issues",
        repository: "https://github.com/first-fluke/oh-my-agent",
        license: "MIT",
        skills: skills.map((skill) => `./skills/${skill}`),
        agents: agents.map((name) => `./agents/${name}`),
      },
      null,
      2,
    )}\n`,
  );

  const list = (entries: Array<[name: string, file: string]>) =>
    entries
      .map(([name, file]) => `- **${name}** ${frontmatterDescription(file)}`)
      .join("\n");
  writeFileSync(
    join(root, "README.md"),
    `# oh-my-agent

**Ship 400+ commits a day.**

oh-my-agent turns Claude into a team. A planner splits the work, engineers build in parallel, a reviewer checks the result, and a debugger fixes the root cause.

This plugin adds ${skills.length} skills and ${agents.length} specialist agents. Claude loads a skill only when a task needs it, so the rest stay out of your context.

## Agents

${list(agents.map((name) => [name.replace(/\.md$/, ""), join(agentsDir, name)]))}

## Skills

${list(skills.map((name) => [name, join(repoRoot, SKILLS_DIR, name, "SKILL.md")]))}

## What this plugin runs

This plugin has no hooks, no MCP servers, and no install step. It only adds instructions.

Some skills ask Claude to run local tools such as \`git\`, \`gh\`, or the \`oma\` command line tool when they are installed. A few skills can call services you set up yourself, such as a search, image, or video provider. Claude runs those commands under your normal permission settings, and nothing runs on its own.

For workflows, project hooks, and the \`oma\` command line tool, install the full runtime from [first-fluke/oh-my-agent](https://github.com/first-fluke/oh-my-agent).

## License

MIT
`,
  );
}

/** Codex marketplace metadata; source paths resolve from the repository root. */
export function emitCodexMarketplace(repoRoot: string, outDir: string): string {
  const plugins = [
    { name: "oma", path: "./" },
    ...Object.keys(DOMAIN_PRESETS).map((domain) => ({
      name: `oma-${domain}`,
      path: `./.claude-plugin/domains/${domain}`,
    })),
  ];
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "marketplace.json");
  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        name: MARKETPLACE_NAME,
        interface: {
          displayName: "oh-my-agent",
          shortDescription:
            readPackageJson(repoRoot).name ??
            "Scoped agent skills and specialist teams",
        },
        plugins: plugins.map(({ name, path }) => ({
          name,
          source: { source: "local", path },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "Productivity",
        })),
      },
      null,
      2,
    )}\n`,
  );
  return outPath;
}
