import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  EXCLUDED_RESOURCE_NAMES,
  emitAgentSkills,
  SKILLS_DIR,
} from "./agent-skills.js";
import type {
  AgentPluginEmitReport,
  AgentPluginMcpSkip,
  SkillEmitResult,
} from "./types.js";

/** Canonical schema identifiers for the Agent Plugins 1.0.0 release. */
const PLUGIN_SCHEMA_ID =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

/**
 * Stable portable plugin identity. Like the claude-plugin marketplace name,
 * this is deliberately NOT sourced from package.json: the npm workspace root
 * is `oh-my-agent-workspace`, but the plugin conformant clients load is `oma`.
 */
const PLUGIN_NAME = "oma";

/**
 * Reverse-domain client-extension namespace (firstfluke.com). Everything the
 * portable spec does not cover — agents, workflows, rules, oma-config.yaml —
 * ships under this directory; conformant clients ignore it, oma-aware
 * installs read it.
 */
export const OMA_EXTENSION_NAMESPACE = "com.firstfluke.oma";

/**
 * SSOT entries projected into the extension namespace dir. Hooks are
 * intentionally absent: they are runtime machinery that only works with the
 * oma CLI installed, so shipping them in a portable package would be inert.
 */
const EXTENSION_ENTRIES = [
  ".agents/agents",
  ".agents/workflows",
  ".agents/rules",
  ".agents/oma-config.yaml",
] as const;

const MCP_SOURCE = ".agents/mcp.json";

interface PackageJsonShape {
  description?: string;
  version?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  repository?: { url?: string } | string;
  author?: { name?: string; email?: string; url?: string } | string;
}

function readPackageJson(repoRoot: string): PackageJsonShape {
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) return {};
  return JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJsonShape;
}

function repositoryUrl(repository: PackageJsonShape["repository"]): string {
  if (typeof repository === "string") return repository;
  return repository?.url ?? "https://github.com/first-fluke/oh-my-agent";
}

/** True for URLs the spec allows over plain HTTP (loopback only). */
function isLoopbackHttp(url: URL): boolean {
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1"
  );
}

type PortableMcpServer = Record<string, unknown>;

interface PortableMcpConversion {
  mcpServers: Record<string, PortableMcpServer>;
  servers: string[];
  skipped: AgentPluginMcpSkip[];
}

/**
 * Convert one SSOT mcp server entry to the closed portable variant, or return
 * a skip reason. The SSOT format carries oma-only keys (`available_tools`,
 * memory/tool-group config lives beside `mcpServers`) that must not leak into
 * the closed spec schema, so fields are copied allowlist-style.
 */
function convertMcpServer(
  entry: Record<string, unknown>,
): { server: PortableMcpServer } | { reason: string } {
  if (typeof entry.command === "string") {
    // Spec §stdio: `command` is a single executable token, never a shell string.
    if (/\s/.test(entry.command)) {
      return { reason: "stdio command must be a single executable token" };
    }
    const server: PortableMcpServer = {
      type: "stdio",
      command: entry.command,
    };
    if (Array.isArray(entry.args)) server.args = entry.args;
    if (entry.env && typeof entry.env === "object") server.env = entry.env;
    if (typeof entry.cwd === "string") server.cwd = entry.cwd;
    return { server };
  }

  if (typeof entry.url === "string") {
    let url: URL;
    try {
      url = new URL(entry.url);
    } catch {
      return { reason: `invalid url "${entry.url}"` };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { reason: `unsupported url scheme "${url.protocol}"` };
    }
    if (url.protocol === "http:" && !isLoopbackHttp(url)) {
      return { reason: "plain http is only allowed for loopback hosts" };
    }
    const server: PortableMcpServer = {
      type: entry.type === "sse" ? "sse" : "streamable-http",
      url: entry.url,
    };
    if (entry.headers && typeof entry.headers === "object") {
      server.headers = entry.headers;
    }
    return { server };
  }

  return { reason: "entry has neither a stdio command nor a remote url" };
}

/**
 * Convert the SSOT `.agents/mcp.json` (superset format) into a conformant
 * portable `mcp.json`. Invalid entries are skipped, not fatal, mirroring the
 * spec's per-server failure boundary.
 */
export function buildPortableMcpConfig(
  repoRoot: string,
): PortableMcpConversion | undefined {
  const sourcePath = join(repoRoot, MCP_SOURCE);
  if (!existsSync(sourcePath)) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(sourcePath, "utf-8"));
  } catch {
    return { mcpServers: {}, servers: [], skipped: [] };
  }

  const sourceServers =
    parsed && typeof parsed === "object"
      ? ((parsed as Record<string, unknown>).mcpServers ?? {})
      : {};

  const conversion: PortableMcpConversion = {
    mcpServers: {},
    servers: [],
    skipped: [],
  };
  if (!sourceServers || typeof sourceServers !== "object") return conversion;

  for (const [name, entry] of Object.entries(sourceServers)) {
    if (!entry || typeof entry !== "object") {
      conversion.skipped.push({
        server: name,
        reason: "entry is not an object",
      });
      continue;
    }
    const result = convertMcpServer(entry as Record<string, unknown>);
    if ("server" in result) {
      conversion.mcpServers[name] = result.server;
      conversion.servers.push(name);
    } else {
      conversion.skipped.push({ server: name, reason: result.reason });
    }
  }
  return conversion;
}

/** Copy a file or directory into the package, pruning excluded names. */
function copyEntry(src: string, dest: string): void {
  if (statSync(src).isDirectory()) {
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, {
      recursive: true,
      force: true,
      filter: (source) => !EXCLUDED_RESOURCE_NAMES.has(basename(source)),
    });
  } else {
    mkdirSync(join(dest, ".."), { recursive: true });
    cpSync(src, dest, { force: true });
  }
}

const DEFAULT_KEYWORDS = ["multi-agent", "orchestrator", "skills", "workflows"];

function pluginKeywords(keywords: string[] | undefined): string[] {
  const filtered = (keywords ?? []).filter((k) => k !== "pi-package");
  return filtered.length > 0 ? filtered : DEFAULT_KEYWORDS;
}

/** Build the root plugin.json manifest for the portable package. */
export function buildPluginManifest(
  repoRoot: string,
  extensionEntries: string[],
): Record<string, unknown> {
  const pkg = readPackageJson(repoRoot);
  const authorName =
    typeof pkg.author === "string" ? pkg.author : pkg.author?.name;

  const manifest: Record<string, unknown> = {
    $schema: PLUGIN_SCHEMA_ID,
    name: PLUGIN_NAME,
    version: pkg.version ?? "0.0.0",
    description:
      pkg.description ??
      "Portable multi-agent harness for .agents-based skills and workflows",
    author: { name: authorName ?? "First Fluke" },
    homepage: pkg.homepage ?? "https://github.com/first-fluke/oh-my-agent",
    repository: repositoryUrl(pkg.repository),
    license: pkg.license ?? "MIT",
    // "pi-package" is Pi's package-discovery marker on the workspace root,
    // not a descriptive tag — keep it out of the portable manifest.
    keywords: pluginKeywords(pkg.keywords),
  };

  if (extensionEntries.length > 0) {
    manifest.extensions = {
      [OMA_EXTENSION_NAMESPACE]: {
        entries: extensionEntries.map(
          (entry) => `./${OMA_EXTENSION_NAMESPACE}/${basename(entry)}`,
        ),
      },
    };
  }
  return manifest;
}

/**
 * Emit a self-contained Agent Plugins 1.0.0 package
 * (https://agent-plugins.org/specification) from the `.agents/` SSOT:
 *
 *   outDir/
 *   ├── plugin.json               closed-schema manifest
 *   ├── skills/                   conformant Agent Skills (+ _shared assets)
 *   ├── mcp.json                  portable transport config, when SSOT has one
 *   └── com.firstfluke.oma/       agents / workflows / rules / oma-config.yaml
 *
 * The out dir is fully rebuilt on every run so removed SSOT entries cannot
 * linger in the package.
 */
export function emitAgentPlugin(
  repoRoot: string,
  outDir: string,
): AgentPluginEmitReport {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const skills: SkillEmitResult[] = emitAgentSkills(
    repoRoot,
    join(outDir, "skills"),
  );

  // Skills reference `../_shared/...`; ship it beside them so the package is
  // self-contained. Without a SKILL.md it is skipped by skill discovery, and
  // it stays inside the plugin root, so both spec rules hold.
  const sharedDir = join(repoRoot, SKILLS_DIR, "_shared");
  if (existsSync(sharedDir)) {
    copyEntry(sharedDir, join(outDir, "skills", "_shared"));
  }

  const mcp = buildPortableMcpConfig(repoRoot);
  if (mcp) {
    writeFileSync(
      join(outDir, "mcp.json"),
      `${JSON.stringify(
        { $schema: MCP_SCHEMA_ID, mcpServers: mcp.mcpServers },
        null,
        2,
      )}\n`,
    );
  }

  const extensionEntries: string[] = [];
  for (const entry of EXTENSION_ENTRIES) {
    const src = join(repoRoot, entry);
    if (!existsSync(src)) continue;
    copyEntry(src, join(outDir, OMA_EXTENSION_NAMESPACE, basename(entry)));
    extensionEntries.push(entry);
  }

  const manifest = buildPluginManifest(repoRoot, extensionEntries);
  const manifestPath = join(outDir, "plugin.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const passCount = skills.filter((s) => s.validation.valid).length;
  return {
    target: "agent-plugin",
    outDir,
    manifestPath,
    skills,
    passCount,
    failCount: skills.length - passCount,
    mcp: {
      emitted: mcp !== undefined,
      servers: mcp?.servers ?? [],
      skipped: mcp?.skipped ?? [],
    },
    extensionEntries,
  };
}
