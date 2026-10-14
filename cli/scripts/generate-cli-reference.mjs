import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Regenerates the public command registry in the CLI options reference from
// `oma describe`, the canonical command tree. Only the text between the two
// marker lines is rewritten, in the English page and in every translated copy
// that carries both markers. `--check` reports stale blocks without writing.

export const START_MARKER = "<!-- oma:generated cli-registry:start -->";
export const END_MARKER = "<!-- oma:generated cli-registry:end -->";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cliDir = resolve(scriptDir, "..");
const repoRoot = resolve(cliDir, "..");

const OPTIONS_DOC = "cli-interfaces/options.md";
const ENGLISH_DOC = `web/docs/${OPTIONS_DOC}`;
const I18N_DIR = "web/i18n";
const I18N_DOC = `docusaurus-plugin-content-docs/current/${OPTIONS_DOC}`;

// A table cell cannot hold a raw pipe or a line break. GFM requires `\|` even
// inside code spans, so pipes are escaped everywhere.
export function escapeCell(text) {
  return String(text).replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

// Prose cells are rendered as Markdown, where a bare `<name>` would be read as
// an HTML tag and disappear. Angle brackets are escaped outside code spans.
export function escapeProse(text) {
  return escapeCell(text)
    .split(/(`[^`]*`)/)
    .map((part, index) =>
      index % 2 === 1 ? part : part.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    )
    .join("");
}

function code(text) {
  return `\`${escapeCell(text)}\``;
}

export function formatArguments(args = []) {
  if (args.length === 0) return "—";
  const spelled = args.map((arg) => {
    const name = arg.variadic ? `${arg.name}...` : arg.name;
    return arg.required ? `<${name}>` : `[${name}]`;
  });
  return code(spelled.join(" "));
}

// Defaults that are absolute paths come from the machine that ran `describe`
// (usually its working directory), so they are reported generically instead of
// leaking one checkout's path into the docs.
export function formatDefault(value, context = {}) {
  if (value === undefined || value === null || value === false) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  const text = Array.isArray(value) ? value.join(",") : String(value);
  if (text === "") return null;
  if (context.cwd && text === context.cwd) return "current directory";
  if (isAbsolute(text) || /^[A-Za-z]:[\\/]/.test(text)) return null;
  return code(text);
}

export function formatOptions(options = [], context = {}) {
  if (options.length === 0) return "—";
  return options
    .map((option) => {
      const fallback = formatDefault(option.defaultValue, context);
      return fallback
        ? `${code(option.flags)} (default: ${fallback})`
        : code(option.flags);
    })
    .join(", ");
}

// A path is runnable when it is a leaf, or when it is a group that takes its
// own arguments or options (for example `update` or `home`). Bare groups only
// print help, so they get no row of their own.
function isRunnable(node) {
  const children = node.subcommands ?? [];
  if (children.length === 0) return true;
  return (node.arguments ?? []).length > 0 || (node.options ?? []).length > 0;
}

export function collectRows(describe, context = {}) {
  const rows = [];
  const visit = (node) => {
    if (node.path && isRunnable(node)) {
      rows.push({
        path: node.path,
        args: formatArguments(node.arguments),
        options: formatOptions(node.options, context),
        description: node.description ? escapeProse(node.description) : "—",
      });
    }
    for (const child of node.subcommands ?? []) visit(child);
  };
  visit(describe.command ?? describe);
  return rows.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function renderRegistry(describe, context = {}) {
  const lines = [
    "| Command | Arguments | Options | Description |",
    "|:--|:--|:--|:--|",
  ];
  for (const row of collectRows(describe, context)) {
    lines.push(
      `| ${code(row.path)} | ${row.args} | ${row.options} | ${row.description} |`,
    );
  }
  return lines.join("\n");
}

// Returns the content with the marked block replaced, or null when either
// marker is missing or they are out of order.
export function replaceMarkedBlock(content, body) {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim() === START_MARKER);
  const end = lines.findIndex((line) => line.trim() === END_MARKER);
  if (start === -1 || end === -1 || end < start) return null;
  return [...lines.slice(0, start + 1), "", body, "", ...lines.slice(end)].join(
    "\n",
  );
}

export function hasMarkers(content) {
  return replaceMarkedBlock(content, "") !== null;
}

// The English page is always a target; translated copies are targets only
// once they carry both markers.
export function findTargets(root = repoRoot) {
  const targets = [resolve(root, ENGLISH_DOC)];
  const i18nRoot = resolve(root, I18N_DIR);
  if (!existsSync(i18nRoot)) return targets;
  const locales = readdirSync(i18nRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const locale of locales) {
    const file = resolve(i18nRoot, locale, I18N_DOC);
    if (existsSync(file) && hasMarkers(readFileSync(file, "utf8"))) {
      targets.push(file);
    }
  }
  return targets;
}

export function runDescribe(cwd = cliDir) {
  const result = spawnSync("bun", ["cli.ts", "describe"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `bun cli.ts describe exited with ${result.status}: ${result.stderr}`,
    );
  }
  return JSON.parse(result.stdout);
}

// Rewrites (or, with check, only compares) every target. Returns the files
// whose block changed, so the caller can report them.
export function generateCliReference({
  describe,
  context = {},
  targets,
  check = false,
}) {
  const body = renderRegistry(describe, context);
  const changed = [];
  for (const file of targets) {
    const current = readFileSync(file, "utf8");
    const next = replaceMarkedBlock(current, body);
    if (next === null) {
      throw new Error(`${file} is missing ${START_MARKER} / ${END_MARKER}`);
    }
    if (next === current) continue;
    changed.push(file);
    if (!check) writeFileSync(file, next);
  }
  return changed;
}

function main(argv) {
  const check = argv.includes("--check");
  const describe = runDescribe(cliDir);
  const changed = generateCliReference({
    describe,
    context: { cwd: cliDir },
    targets: findTargets(repoRoot),
    check,
  });
  const names = changed.map((file) => relative(repoRoot, file));
  if (check) {
    if (names.length > 0) {
      console.error(
        `CLI registry is stale in:\n${names.map((name) => `  ${name}`).join("\n")}\nRun: node cli/scripts/generate-cli-reference.mjs`,
      );
      return 1;
    }
    console.log("CLI registry is up to date.");
    return 0;
  }
  console.log(
    names.length > 0
      ? `Updated CLI registry in:\n${names.map((name) => `  ${name}`).join("\n")}`
      : "CLI registry already up to date.",
  );
  return 0;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
