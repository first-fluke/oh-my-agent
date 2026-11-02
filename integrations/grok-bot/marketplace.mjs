import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { parse: parseYaml } = createRequire(
  new URL("../../cli/package.json", import.meta.url),
)("yaml");
const DEFAULT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DEFAULT_CONFIG = join(
  DEFAULT_ROOT,
  "web/src/data/grok-bot-marketplace.json",
);

/** Inspect the files Cursor will index, without building or modifying them. */
export function inspectMarketplacePackage(repoRoot = DEFAULT_ROOT) {
  const root = realpathSync(repoRoot);
  function localPath(value) {
    if (typeof value !== "string" || isAbsolute(value))
      throw new Error(`Expected a relative plugin path: ${value}`);
    const path = resolve(root, value);
    const inside = relative(root, path);
    if (inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside))
      throw new Error(`Plugin path escapes repository: ${value}`);
    if (!existsSync(path)) throw new Error(`Missing plugin asset: ${value}`);
    const actual = relative(root, realpathSync(path));
    if (actual === ".." || actual.startsWith(`..${sep}`) || isAbsolute(actual))
      throw new Error(`Plugin asset resolves outside repository: ${value}`);
    if (lstatSync(path).isSymbolicLink())
      throw new Error(`Plugin assets must be real files: ${value}`);
    return path;
  }
  const manifest = JSON.parse(
    readFileSync(localPath(".cursor-plugin/plugin.json"), "utf8"),
  );
  for (const field of [
    "name",
    "description",
    "version",
    "repository",
    "homepage",
    "logo",
  ]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim())
      throw new Error(`Missing plugin manifest field: ${field}`);
  }
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(manifest.name))
    throw new Error("Invalid plugin name");
  if (!manifest.author?.name || !manifest.author?.email)
    throw new Error("Public author name and email are required for submission");
  const repository = new URL(manifest.repository);
  if (
    repository.origin !== "https://github.com" ||
    repository.pathname.split("/").filter(Boolean).length !== 2
  )
    throw new Error("Expected a public GitHub repository URL");
  const logo = localPath(manifest.logo);
  if (!lstatSync(logo).isFile()) throw new Error("Plugin logo must be a file");
  const componentPaths = (value) =>
    (Array.isArray(value) ? value : [value]).map(localPath);
  const skillRoots = componentPaths(manifest.skills);
  const seen = new Set();
  for (const skillRoot of skillRoots) {
    if (!lstatSync(skillRoot).isDirectory())
      throw new Error(`Skill root must be a directory: ${skillRoot}`);
    for (const entry of readdirSync(skillRoot, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      if (!entry.isDirectory())
        throw new Error(
          `Skill folders must be real directories: ${entry.name}`,
        );
      const skillFile = localPath(
        relative(root, join(skillRoot, entry.name, "SKILL.md")),
      );
      const match = readFileSync(skillFile, "utf8").match(
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
      );
      if (!match) throw new Error(`Missing skill frontmatter: ${entry.name}`);
      const metadata = parseYaml(match[1]);
      if (
        metadata?.name !== entry.name ||
        typeof metadata.description !== "string" ||
        !metadata.description.trim()
      )
        throw new Error(`Invalid skill name or description: ${entry.name}`);
      if (seen.has(entry.name))
        throw new Error(`Duplicate marketplace skill: ${entry.name}`);
      seen.add(entry.name);
    }
  }
  if (!seen.size) throw new Error("Marketplace plugin contains no skills");
  function countMarkdown(paths) {
    let count = 0;
    function visit(path) {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink())
        throw new Error(`Plugin component must not be a symlink: ${path}`);
      if (stat.isDirectory())
        for (const entry of readdirSync(path))
          visit(localPath(relative(root, join(path, entry))));
      else if (/\.(?:md|mdc|markdown)$/.test(path)) count++;
    }
    for (const path of paths) visit(path);
    return count;
  }
  const agents = countMarkdown(componentPaths(manifest.agents));
  const rules = countMarkdown(componentPaths(manifest.rules));
  for (const root of skillRoots) countMarkdown([root]);
  const mcp = JSON.parse(readFileSync(localPath(manifest.mcpServers), "utf8"));
  if (!mcp.mcpServers || typeof mcp.mcpServers !== "object")
    throw new Error("Invalid plugin MCP configuration");
  return {
    package: {
      name: manifest.name,
      displayName: manifest.displayName ?? manifest.name,
      version: manifest.version,
      skills: [...seen].sort(),
      agents,
      rules,
      mcpServers: Object.keys(mcp.mcpServers),
    },
    submission: {
      organizationName: manifest.author.name,
      organizationHandle: repository.pathname.split("/")[1],
      contactEmail: manifest.author.email,
      logotypeUrl: `https://raw.githubusercontent.com${repository.pathname.replace(/\.git$/, "")}/main/${manifest.logo.replace(/^\.\//, "")}`,
      description: manifest.description,
      githubRepository: manifest.repository,
      websiteUrl: manifest.homepage,
      publishUrl: "https://cursor.com/marketplace/publish",
    },
  };
}

export function parseInstallUrl(value) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/bot\/plugin\/([1-9]\d*)\/?$/);
  if (
    url.origin !== "https://x.ai" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !match
  )
    throw new Error("Expected https://x.ai/bot/plugin/<numeric-id>");
  return { url: `https://x.ai/bot/plugin/${match[1]}`, pluginId: match[1] };
}

function visibleText(html) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|nbsp|quot|apos|#39|#x27);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A successful HTTP response alone is not evidence of a usable install link. */
export function verifyInstallPage(html, names, expectedPluginId) {
  const document = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const heading = document.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = heading
    ? visibleText(heading[1])
        .replace(/\s+for\s+Grok\s+Bot$/i, "")
        .toLowerCase()
    : "";
  if (!names.some((name) => name.toLowerCase() === title))
    throw new Error("Install page does not identify the Oh My Agent plugin");
  const text = visibleText(html);
  if (
    !/\bPublished by First Fluke on (?:the )?Cursor Marketplace\b/i.test(text)
  )
    throw new Error("Install page publisher is not First Fluke");
  if (!/^[1-9]\d*$/.test(expectedPluginId))
    throw new Error(
      "Expected a numeric plugin ID for the native installation action",
    );
  const expectedAction = `grokbot://app/v1/plugin/add?id=${expectedPluginId}`;
  const hasNativeAction = [
    ...document.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi),
  ].some((anchor) => {
    const href = anchor[1].match(
      /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );
    return (
      href &&
      (href[1] ?? href[2] ?? href[3]) === expectedAction &&
      /^Add to Grok Bot$/i.test(visibleText(anchor[2]))
    );
  });
  if (
    /plugin not found|page not found/i.test(text) ||
    !hasNativeAction ||
    !/Cursor Marketplace/i.test(text)
  )
    throw new Error(
      "Install page is missing the native Grok Bot installation flow",
    );
  return heading ? visibleText(heading[1]) : "";
}

export async function verifyMarketplaceLink(value, names, fetchImpl = fetch) {
  const parsed = parseInstallUrl(value);
  const response = await fetchImpl(parsed.url, {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(`Install page returned HTTP ${response.status}`);
  if (response.url && parseInstallUrl(response.url).url !== parsed.url)
    throw new Error("Install page redirected to a different plugin");
  const title = verifyInstallPage(
    await response.text(),
    names,
    parsed.pluginId,
  );
  return { ...parsed, title, status: "verified" };
}

/** Activate the stable website route only after the live native page is verified. */
export async function recordMarketplaceLink(
  value,
  names,
  { fetchImpl = fetch, configPath = DEFAULT_CONFIG } = {},
) {
  const result = await verifyMarketplaceLink(value, names, fetchImpl);
  const config = {
    pluginId: result.pluginId,
    verifiedAt: new Date().toISOString(),
  };
  mkdirSync(dirname(configPath), { recursive: true });
  const temporary = `${configPath}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, {
      flag: "wx",
    });
    renameSync(temporary, configPath);
  } finally {
    rmSync(temporary, { force: true });
  }
  return { ...result, recordedAt: config.verifiedAt, configPath };
}

async function main(args) {
  let root = DEFAULT_ROOT;
  let installUrl;
  let recordUrl;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === "--help") {
      console.log(
        "node integrations/grok-bot/marketplace.mjs [--repo <path>] [--install-url <url> | --record-install-url <url>]",
      );
      return;
    }
    const value = args[++index];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${flag}`);
    if (flag === "--repo") root = resolve(value);
    else if (flag === "--install-url") installUrl = value;
    else if (flag === "--record-install-url") recordUrl = value;
    else throw new Error(`Unknown option: ${flag}`);
  }
  if (installUrl && recordUrl)
    throw new Error("Choose --install-url or --record-install-url");
  const result = inspectMarketplacePackage(root);
  const names = [
    ...new Set([
      result.package.name,
      result.package.displayName,
      "Oh My Agent",
    ]),
  ];
  result.nativeInstall = recordUrl
    ? await recordMarketplaceLink(recordUrl, names)
    : installUrl
      ? await verifyMarketplaceLink(installUrl, names)
      : {
          status: "not-verified",
          reason: "No assigned marketplace install URL supplied",
        };
  console.log(JSON.stringify(result, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
