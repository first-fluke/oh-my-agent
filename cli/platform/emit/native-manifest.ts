/**
 * Shared helpers for the Claude-compatible native-manifest host family
 * (Antigravity, Grok Build, ZCode, Kimi Code). Each host reads a plugin
 * manifest whose shape descends from Claude Code's `.claude-plugin/plugin.json`
 * (name / version / description / author / skills / agents / mcpServers), so
 * the package metadata, agent listing, rule parsing, and MCP conversion are
 * collected here once and each emitter only decides the host-specific shape.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../../utils/frontmatter.js";

/** Stable public identity shared with the Claude marketplace and Agent Plugins package. */
export const NATIVE_PLUGIN_NAME = "oma";
export const NATIVE_MARKETPLACE_NAME = "oh-my-agent";
export const REPOSITORY_URL = "https://github.com/first-fluke/oh-my-agent";
export const HOMEPAGE_URL = "https://firstfluke.com/oh-my-agent";
export const DEFAULT_AUTHOR_NAME = "First Fluke";

// Agent and rule definitions come from the tracked `.agents/` SSOT, never
// from the gitignored per-machine `.claude/` projection (see claude-plugin.ts).
export const AGENTS_DIR = ".agents/agents";
export const RULES_DIR = ".agents/rules";
const MCP_SOURCE = ".agents/mcp.json";

export interface PackageMetadata {
  description: string;
  version: string;
  homepage: string;
  license: string;
  keywords: string[];
  author: { name: string; email?: string; url?: string };
}

interface PackageJsonShape {
  description?: string;
  version?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  author?: { name?: string; email?: string; url?: string } | string;
}

const DEFAULT_KEYWORDS = ["multi-agent", "orchestrator", "skills", "workflows"];

/** Normalized package.json metadata with the defaults every host manifest shares. */
export function readPackageMetadata(repoRoot: string): PackageMetadata {
  const pkgPath = join(repoRoot, "package.json");
  const pkg: PackageJsonShape = existsSync(pkgPath)
    ? (JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJsonShape)
    : {};
  const author =
    typeof pkg.author === "string"
      ? { name: pkg.author }
      : {
          name: pkg.author?.name ?? DEFAULT_AUTHOR_NAME,
          ...(pkg.author?.email ? { email: pkg.author.email } : {}),
          ...(pkg.author?.url ? { url: pkg.author.url } : {}),
        };
  // "pi-package" is Pi's discovery marker on the workspace root, not a tag.
  const keywords = (pkg.keywords ?? []).filter((k) => k !== "pi-package");
  return {
    // The workspace package.json carries no description; the Cursor manifest's
    // sentence is the canonical listing copy for the native-manifest hosts.
    description:
      pkg.description ??
      "Portable, vendor-agnostic agent harness for project-specific skills, workflows, and agent teams aligned with your codebase, conventions, and engineering standards.",
    version: pkg.version ?? "0.0.0",
    homepage: pkg.homepage ?? HOMEPAGE_URL,
    license: pkg.license ?? "MIT",
    keywords: keywords.length > 0 ? keywords : DEFAULT_KEYWORDS,
    author,
  };
}

/** Sorted `<name>.md` agent files directly under `.agents/agents/` (variants/ excluded). */
export function listAgentFiles(repoRoot: string): string[] {
  const dir = join(repoRoot, AGENTS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

export interface ParsedAgent {
  /** File name without `.md`. */
  id: string;
  name: string;
  description: string;
  /** Skill names the SSOT agent declares (`skills:` frontmatter). */
  skills: string[];
  body: string;
}

/** Parse every SSOT agent definition. */
export function readAgents(repoRoot: string): ParsedAgent[] {
  return listAgentFiles(repoRoot).map((file) => {
    const { frontmatter, body } = parseFrontmatter(
      readFileSync(join(repoRoot, AGENTS_DIR, file), "utf-8"),
    );
    const id = file.replace(/\.md$/, "");
    const skills = Array.isArray(frontmatter.skills)
      ? frontmatter.skills.filter((s): s is string => typeof s === "string")
      : [];
    return {
      id,
      name: typeof frontmatter.name === "string" ? frontmatter.name : id,
      description:
        typeof frontmatter.description === "string"
          ? frontmatter.description.replace(/\s+/g, " ").trim()
          : "",
      skills,
      body: body.trim(),
    };
  });
}

export interface ParsedRule {
  /** File name without `.md`. */
  id: string;
  description: string;
  /** Glob patterns with brace sets expanded (`**\/*.{a,b}` -> two globs). */
  globs: string[];
  alwaysApply: boolean;
  body: string;
}

/**
 * Expand a single brace set (`**\/*.{tsx,jsx}`) into plain globs. Hosts that
 * take a comma-separated glob string (Antigravity) do not document brace
 * expansion, so the emitters hand them one pattern per extension.
 */
export function expandGlobBraces(pattern: string): string[] {
  const match = /^(.*)\{([^{}]*)\}(.*)$/.exec(pattern);
  if (!match) return [pattern];
  const [, head = "", alternatives = "", tail = ""] = match;
  return alternatives
    .split(",")
    .map((alt) => alt.trim())
    .filter(Boolean)
    .flatMap((alt) => expandGlobBraces(`${head}${alt}${tail}`));
}

/** Split a comma-separated glob list, keeping commas inside `{...}` sets intact. */
export function splitGlobList(value: string): string[] {
  const globs: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "{") depth++;
    if (char === "}") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      globs.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  globs.push(current);
  return globs.map((g) => g.trim()).filter(Boolean);
}

/** Parse every SSOT rule (`.agents/rules/*.md`). */
export function readRules(repoRoot: string): ParsedRule[] {
  const dir = join(repoRoot, RULES_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort()
    .map((file) => {
      const { frontmatter, body } = parseFrontmatter(
        readFileSync(join(dir, file), "utf-8"),
      );
      const rawGlobs = frontmatter.globs;
      const globList = Array.isArray(rawGlobs)
        ? rawGlobs.filter((g): g is string => typeof g === "string")
        : typeof rawGlobs === "string"
          ? splitGlobList(rawGlobs)
          : [];
      return {
        id: file.replace(/\.md$/, ""),
        description:
          typeof frontmatter.description === "string"
            ? frontmatter.description.replace(/\s+/g, " ").trim()
            : "",
        globs: globList
          .map((g) => g.trim())
          .filter(Boolean)
          .flatMap(expandGlobBraces),
        alwaysApply: frontmatter.alwaysApply === true,
        body: body.trim(),
      };
    });
}

export type ClaudeStyleMcpServer = Record<string, unknown>;

export interface ClaudeStyleMcpConversion {
  mcpServers: Record<string, ClaudeStyleMcpServer>;
  servers: string[];
  skipped: Array<{ server: string; reason: string }>;
}

/**
 * Convert the SSOT `.agents/mcp.json` (superset format) into the plain
 * Claude-style `mcpServers` object the native-manifest hosts read: stdio
 * servers keep `command`/`args`/`env`/`cwd`, remote servers keep
 * `type: "http" | "sse"`, `url`, and `headers`. oma-only keys
 * (`available_tools`, `memoryConfig`, `toolGroups`) never leak through
 * because fields are copied allowlist-style. Returns undefined when the SSOT
 * has no mcp.json.
 */
export function buildClaudeStyleMcpServers(
  repoRoot: string,
): ClaudeStyleMcpConversion | undefined {
  const sourcePath = join(repoRoot, MCP_SOURCE);
  if (!existsSync(sourcePath)) return undefined;
  const conversion: ClaudeStyleMcpConversion = {
    mcpServers: {},
    servers: [],
    skipped: [],
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(sourcePath, "utf-8"));
  } catch {
    return conversion;
  }
  const sourceServers =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>).mcpServers
      : undefined;
  if (!sourceServers || typeof sourceServers !== "object") return conversion;

  for (const [name, raw] of Object.entries(sourceServers)) {
    if (!raw || typeof raw !== "object") {
      conversion.skipped.push({
        server: name,
        reason: "entry is not an object",
      });
      continue;
    }
    const entry = raw as Record<string, unknown>;
    if (typeof entry.command === "string") {
      if (/\s/.test(entry.command)) {
        conversion.skipped.push({
          server: name,
          reason: "stdio command must be a single executable token",
        });
        continue;
      }
      const server: ClaudeStyleMcpServer = { command: entry.command };
      if (Array.isArray(entry.args)) server.args = entry.args;
      if (entry.env && typeof entry.env === "object") server.env = entry.env;
      if (typeof entry.cwd === "string") server.cwd = entry.cwd;
      conversion.mcpServers[name] = server;
      conversion.servers.push(name);
      continue;
    }
    if (typeof entry.url === "string") {
      let url: URL;
      try {
        url = new URL(entry.url);
      } catch {
        conversion.skipped.push({
          server: name,
          reason: `invalid url "${entry.url}"`,
        });
        continue;
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        conversion.skipped.push({
          server: name,
          reason: `unsupported url scheme "${url.protocol}"`,
        });
        continue;
      }
      const server: ClaudeStyleMcpServer = {
        type: entry.type === "sse" ? "sse" : "http",
        url: entry.url,
      };
      if (entry.headers && typeof entry.headers === "object") {
        server.headers = entry.headers;
      }
      conversion.mcpServers[name] = server;
      conversion.servers.push(name);
      continue;
    }
    conversion.skipped.push({
      server: name,
      reason: "entry has neither a stdio command nor a remote url",
    });
  }
  return conversion;
}

/** Serialize a manifest with the repo's two-space style and trailing newline. */
export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
