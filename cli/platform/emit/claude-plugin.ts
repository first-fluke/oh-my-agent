import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { discoverSkillDirs, SKILLS_DIR } from "./agent-skills.js";
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

/** List `.agents/agents/*.md` basenames (sans extension), or `[]` if absent. */
function discoverClaudeAgents(repoRoot: string): string[] {
  const dir = join(repoRoot, AGENTS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

/**
 * Build a Claude Code plugin marketplace manifest for oma, modeled on the
 * public schema used by github.com/anthropics/skills
 * (.claude-plugin/marketplace.json): a single owner block plus a `plugins`
 * array, each entry listing its `skills` (relative source paths). Agents are
 * attached as a best-effort `agents` extension field — the public schema
 * does not yet document per-plugin agent listing, so this is oma's own
 * addition pending upstream clarification.
 */
export function buildMarketplaceManifest(
  repoRoot: string,
): Record<string, unknown> {
  const pkg = readPackageJson(repoRoot);
  const skillDirs = discoverSkillDirs(repoRoot);
  const agents = discoverClaudeAgents(repoRoot);

  const skills = skillDirs.map((dirName) => {
    const skillMdPath = join(repoRoot, SKILLS_DIR, dirName, "SKILL.md");
    const content = existsSync(skillMdPath)
      ? readFileSync(skillMdPath, "utf-8")
      : "";
    const { frontmatter } = parseFrontmatter(content);
    return {
      dirName,
      description:
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : "",
    };
  });

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
        description:
          pkg.description ??
          "Portable multi-agent harness for .agents-based skills and workflows",
        source: "./",
        strict: false,
        skills: skills.map((s) => `./${SKILLS_DIR}/${s.dirName}`),
        agents: agents.map((name) => `./${AGENTS_DIR}/${name}.md`),
      },
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

  return { target: "claude-plugin", outPath };
}
