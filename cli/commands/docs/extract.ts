/**
 * T5 — extract.ts
 *
 * Extracts L2 references from markdown documents and builds a DocRefsIndex.
 * Uses remark + unified for AST parsing, supports block-level and file-level
 * escape hatches, excludes gitignored / symlink / oversized files.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Extractor
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Code, Html, Image, InlineCode, Link, Node, Root } from "mdast";
import { minimatch } from "minimatch";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type {
  DocEntry,
  DocRef,
  DocRefsIndex,
  RefKind,
} from "../../types/docs.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GENERATOR = "oma-docs/0.1.0";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const KNOWN_CLI_BINARIES = new Set([
  "oma",
  "bun",
  "pnpm",
  "npm",
  "git",
  "node",
]);

const SHELL_LANGS = new Set(["bash", "sh", "shell", "console", "zsh"]);

// Config key pattern matching oma-config.yaml top-level and nested keys.
// Matches dot-paths like "docs.auto_verify" or "model_preset".
const CONFIG_PATH_RE = /\b([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)\b/g;

// Known top-level OmaConfig keys used to validate config refs.
const OMA_CONFIG_TOP_KEYS = new Set([
  "language",
  "model_preset",
  "date_format",
  "timezone",
  "auto_update_cli",
  "agents",
  "models",
  "custom_presets",
  "vendors",
  "session",
  "docs",
  "default_cli",
]);

// ---------------------------------------------------------------------------
// Gitignore helper
// ---------------------------------------------------------------------------

function buildGitIgnoreSet(repoRoot: string): Set<string> {
  try {
    const output = execSync(
      "git ls-files --others --ignored --exclude-standard --directory -z",
      {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
    const paths = output.split("\0").filter(Boolean);
    return new Set(paths.map((p) => path.resolve(repoRoot, p)));
  } catch {
    return new Set();
  }
}

function isGitIgnored(absPath: string, ignoredSet: Set<string>): boolean {
  // Check exact match or prefix (directory entries end with /)
  if (ignoredSet.has(absPath)) return true;
  for (const ignored of ignoredSet) {
    const normalized = ignored.endsWith("/") ? ignored.slice(0, -1) : ignored;
    if (
      absPath === normalized ||
      absPath.startsWith(`${normalized}${path.sep}`)
    ) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Markdown file walker
// ---------------------------------------------------------------------------

function walkMarkdownFiles(
  dir: string,
  repoRoot: string,
  ignoredSet: Set<string>,
): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absPath = path.join(current, entry.name);

      // Skip symlinks silently
      if (entry.isSymbolicLink()) continue;

      // Skip gitignored paths
      if (isGitIgnored(absPath, ignoredSet)) continue;

      if (entry.isDirectory()) {
        // Exclude docs/generated/** output dir
        const relDir = path.relative(repoRoot, absPath);
        if (
          relDir === "docs/generated" ||
          relDir.startsWith(`docs/generated${path.sep}`)
        ) {
          continue;
        }
        walk(absPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(absPath);
      }
    }
  }

  walk(dir);
  return results;
}

function globToMdFiles(
  repoRoot: string,
  globPattern: string,
  ignoredSet: Set<string>,
): string[] {
  const trimmed = globPattern.trim();
  if (trimmed === "" || trimmed === "**/*.md") {
    return walkMarkdownFiles(repoRoot, repoRoot, ignoredSet);
  }

  // Single-file path
  const absInput = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(repoRoot, trimmed);

  try {
    const stat = fs.statSync(absInput);
    if (stat.isFile() && absInput.endsWith(".md")) {
      return [absInput];
    }
    if (stat.isDirectory()) {
      return walkMarkdownFiles(absInput, repoRoot, ignoredSet);
    }
  } catch {
    // Falls through to glob handling
  }

  // Generic glob: walk full tree, filter by minimatch against relative path.
  const allFiles = walkMarkdownFiles(repoRoot, repoRoot, ignoredSet);
  return allFiles.filter((abs) =>
    minimatch(path.relative(repoRoot, abs), trimmed),
  );
}

// ---------------------------------------------------------------------------
// Frontmatter extraction
// ---------------------------------------------------------------------------

function extractFrontmatterSkip(content: string): boolean {
  // Check for YAML frontmatter with oma-docs: skip
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch || fmMatch[1] === undefined) return false;
  return /^oma-docs\s*:\s*skip\s*$/m.test(fmMatch[1]);
}

// ---------------------------------------------------------------------------
// Ignore block tracking
// ---------------------------------------------------------------------------

interface IgnoreRange {
  startLine: number;
  endLine: number | null; // null = EOF
}

// Markers must appear as standalone HTML comment lines, not inside backticks
// or fenced code blocks. This prevents false positives when oma-docs's own
// docs (SKILL.md, design doc) describe the marker syntax in prose.
const IGNORE_START_RE = /^<!--\s*oma-docs:ignore-start\s*-->$/;
const IGNORE_END_RE = /^<!--\s*oma-docs:ignore-end\s*-->$/;
const FENCE_RE = /^(```|~~~)/;

function parseIgnoreRanges(content: string): {
  ranges: IgnoreRange[];
  unmatched: boolean;
} {
  const lines = content.split("\n");
  const ranges: IgnoreRange[] = [];
  let unmatched = false;
  let currentStart: number | null = null;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine.trim();
    // Toggle fenced-code-block state — markers inside fences are ignored.
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // 1-based line number = i + 1
    if (IGNORE_START_RE.test(line) && currentStart === null) {
      currentStart = i + 1;
    } else if (IGNORE_END_RE.test(line) && currentStart !== null) {
      ranges.push({ startLine: currentStart, endLine: i + 1 });
      currentStart = null;
    }
  }

  if (currentStart !== null) {
    // Unmatched start — ignore until EOF
    ranges.push({ startLine: currentStart, endLine: null });
    unmatched = true;
  }

  return { ranges, unmatched };
}

function isLineIgnored(line: number, ranges: IgnoreRange[]): boolean {
  for (const range of ranges) {
    const end = range.endLine ?? Number.POSITIVE_INFINITY;
    if (line >= range.startLine && line <= end) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Node position helper
// ---------------------------------------------------------------------------

function nodeLine(node: Node): number {
  return node.position?.start.line ?? 1;
}

// ---------------------------------------------------------------------------
// Path detection helpers
// ---------------------------------------------------------------------------

const FILE_PATH_RE =
  /^\.{0,2}\/|^[\w-]+\/|\.(?:ts|js|mjs|cjs|tsx|jsx|json|yaml|yml|toml|md|sh|py|rs|go|java|kt|swift|dart|tf|env|lock|gitignore|npmrc|nvmrc|tool-versions|editorconfig|prettierrc|eslintrc|babelrc|html|css|scss|sass|svg|png|jpg|gif|webp|woff|woff2|ttf|eot)$/;

function looksLikeFilePath(str: string): boolean {
  if (
    !str ||
    str.includes(" ") ||
    str.startsWith("http://") ||
    str.startsWith("https://")
  ) {
    return false;
  }
  return FILE_PATH_RE.test(str);
}

// ---------------------------------------------------------------------------
// ENV var patterns
// ---------------------------------------------------------------------------

// Matches ALL_CAPS identifiers that look like env vars
const _ENV_VAR_IN_CODE_RE = /\b([A-Z][A-Z0-9_]{2,})\b/g;

// Patterns that signal env var context
const ENV_CONTEXT_PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]+)/g,
  /\$([A-Z][A-Z0-9_]+)\b/g,
  /Set\s+`([A-Z][A-Z0-9_]+)`\s+env/g,
  /`([A-Z][A-Z0-9_]+)`\s+(?:env(?:ironment)?\s+var|variable)/g,
];

function extractEnvVars(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of ENV_CONTEXT_PATTERNS) {
    pattern.lastIndex = 0;
    let m = pattern.exec(text);
    while (m !== null) {
      if (m[1]) found.add(m[1]);
      m = pattern.exec(text);
    }
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// Script pattern extraction
// ---------------------------------------------------------------------------

const SCRIPT_PATTERNS = [
  /(?:bun\s+run|npm\s+run|pnpm(?:\s+run)?)\s+([a-zA-Z][a-zA-Z0-9:_-]*)/g,
];

function extractScripts(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of SCRIPT_PATTERNS) {
    pattern.lastIndex = 0;
    let m = pattern.exec(text);
    while (m !== null) {
      if (m[1] && !KNOWN_CLI_BINARIES.has(m[1])) {
        found.add(m[1]);
      }
      m = pattern.exec(text);
    }
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// CLI extraction
// ---------------------------------------------------------------------------

function _extractCliFromText(text: string): string[] {
  const found = new Set<string>();
  const firstToken = text.trim().split(/\s+/)[0] ?? "";
  if (KNOWN_CLI_BINARIES.has(firstToken)) {
    found.add(text.trim());
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// Config key extraction
// ---------------------------------------------------------------------------

function extractConfigKeys(text: string): string[] {
  const found = new Set<string>();
  CONFIG_PATH_RE.lastIndex = 0;
  let m = CONFIG_PATH_RE.exec(text);
  while (m !== null) {
    const dotPath = m[1];
    if (dotPath) {
      const topKey = dotPath.split(".")[0];
      if (topKey && OMA_CONFIG_TOP_KEYS.has(topKey)) {
        found.add(dotPath);
      }
    }
    m = CONFIG_PATH_RE.exec(text);
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// URL extraction
// ---------------------------------------------------------------------------

function extractUrls(text: string): string[] {
  const found = new Set<string>();
  const urlRe = /https?:\/\/[^\s)>\]"'`]+/g;
  let m = urlRe.exec(text);
  while (m !== null) {
    // Strip anchors for storage
    const url = m[0].replace(/#[^#]*$/, "");
    found.add(url);
    m = urlRe.exec(text);
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// AST-based reference extractor
// ---------------------------------------------------------------------------

function extractRefsFromAst(tree: Root, ignoreRanges: IgnoreRange[]): DocRef[] {
  const refs: DocRef[] = [];

  function addRef(kind: RefKind, target: string, line: number): void {
    if (!target.trim()) return;
    if (isLineIgnored(line, ignoreRanges)) return;
    refs.push({ kind, target: target.trim(), line });
  }

  function visitNode(node: Node): void {
    const line = nodeLine(node);

    switch (node.type) {
      case "link": {
        const link = node as Link;
        const url = link.url ?? "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const stripped = url.replace(/#[^#]*$/, "");
          addRef("url", stripped, line);
        } else if (looksLikeFilePath(url)) {
          addRef("file", url, line);
        }
        break;
      }

      case "image": {
        const img = node as Image;
        const url = img.url ?? "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const stripped = url.replace(/#[^#]*$/, "");
          addRef("url", stripped, line);
        } else if (looksLikeFilePath(url)) {
          addRef("file", url, line);
        }
        break;
      }

      case "inlineCode": {
        const ic = node as InlineCode;
        const val = ic.value ?? "";

        // CLI: first token is known binary
        const firstToken = val.trim().split(/\s+/)[0] ?? "";
        if (KNOWN_CLI_BINARIES.has(firstToken)) {
          // Check if it's a script pattern first
          const scripts = extractScripts(val);
          for (const s of scripts) {
            addRef("script", s, line);
          }
          // Only add as cli if no script match consumed it OR there's remaining cli context
          const scriptPattern = /(?:bun\s+run|npm\s+run|pnpm(?:\s+run)?)\s+/;
          if (!scriptPattern.test(val)) {
            addRef("cli", val.trim(), line);
          } else if (scripts.length === 0) {
            addRef("cli", val.trim(), line);
          }
        } else if (looksLikeFilePath(val)) {
          addRef("file", val, line);
        } else if (val.startsWith("http://") || val.startsWith("https://")) {
          addRef("url", val.replace(/#[^#]*$/, ""), line);
        } else {
          // Config keys
          for (const k of extractConfigKeys(val)) {
            addRef("config", k, line);
          }
          // Env vars in backtick context
          for (const e of extractEnvVars(val)) {
            addRef("env", e, line);
          }
        }
        break;
      }

      case "code": {
        const code = node as Code;
        const lang = (code.lang ?? "").toLowerCase();
        const val = code.value ?? "";

        if (SHELL_LANGS.has(lang)) {
          // Extract CLI commands line by line
          for (const rawLine of val.split("\n")) {
            const stripped = rawLine.replace(/^[$#]\s*/, "").trim();
            if (!stripped) continue;

            // Scripts first
            for (const s of extractScripts(stripped)) {
              addRef("script", s, line);
            }

            // CLI — if first token is known binary and not a script pattern
            const firstTok = stripped.split(/\s+/)[0] ?? "";
            const scriptPat = /(?:bun\s+run|npm\s+run|pnpm(?:\s+run)?)\s+/;
            if (KNOWN_CLI_BINARIES.has(firstTok) && !scriptPat.test(stripped)) {
              addRef("cli", stripped, line);
            }
          }
        }

        // Always extract env vars from code blocks
        for (const e of extractEnvVars(val)) {
          addRef("env", e, line);
        }

        // Extract config keys from code blocks
        for (const k of extractConfigKeys(val)) {
          addRef("config", k, line);
        }

        break;
      }

      case "html": {
        const html = node as Html;
        // Extract URLs from raw HTML nodes
        for (const u of extractUrls(html.value ?? "")) {
          addRef("url", u, line);
        }
        break;
      }

      case "paragraph":
      case "blockquote":
      case "heading":
      case "listItem":
      case "tableCell": {
        // Traverse children
        const parent = node as { children?: Node[] };
        if (parent.children) {
          for (const child of parent.children) {
            visitNode(child);
          }
        }
        break;
      }

      default: {
        // Traverse any children
        const generic = node as { children?: Node[] };
        if (generic.children) {
          for (const child of generic.children) {
            visitNode(child);
          }
        }
        break;
      }
    }
  }

  for (const child of tree.children) {
    visitNode(child);
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Text extraction for prose env/config mentions
// ---------------------------------------------------------------------------

function extractProseRefs(
  content: string,
  ignoreRanges: IgnoreRange[],
): DocRef[] {
  const refs: DocRef[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    if (isLineIgnored(lineNum, ignoreRanges)) continue;
    const line = lines[i];
    if (line === undefined) continue;

    // ENV vars in prose: process.env.X, $X, "Set `X` env var"
    for (const e of extractEnvVars(line)) {
      refs.push({ kind: "env", target: e, line: lineNum });
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

/**
 * Parse a single markdown file and extract its L2 references.
 * Returns null if the file should be skipped (frontmatter oma-docs: skip).
 */
async function extractFromFile(
  absPath: string,
  repoRoot: string,
): Promise<DocEntry | null> {
  const relPath = path.relative(repoRoot, absPath).replace(/\\/g, "/");

  // Size check
  let stat: fs.Stats;
  try {
    stat = fs.statSync(absPath);
  } catch {
    return { path: relPath, refs: [] };
  }

  if (stat.size > MAX_FILE_SIZE) {
    console.warn(`[oma-docs] Skipping ${relPath}: file exceeds 10MB`);
    return { path: relPath, refs: [] };
  }

  let content: string;
  try {
    content = fs.readFileSync(absPath, "utf-8");
  } catch {
    console.warn(`[oma-docs] Skipping ${relPath}: unreadable`);
    return { path: relPath, refs: [] };
  }

  // File-level skip
  if (extractFrontmatterSkip(content)) {
    return null; // Fully omit from index
  }

  // Parse ignore ranges
  const { ranges: ignoreRanges, unmatched } = parseIgnoreRanges(content);
  if (unmatched) {
    console.warn(
      `[oma-docs] ${relPath}: unmatched <!-- oma-docs:ignore-start --> (ignoring until EOF)`,
    );
  }

  // Parse AST
  let tree: Root;
  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ["yaml", "toml"]);
    tree = processor.parse(content) as Root;
  } catch {
    console.warn(`[oma-docs] Skipping ${relPath}: markdown parse error`);
    return { path: relPath, refs: [] };
  }

  // Extract refs from AST
  const astRefs = extractRefsFromAst(tree, ignoreRanges);

  // Extract prose-level env refs
  const proseRefs = extractProseRefs(content, ignoreRanges);

  // Merge and deduplicate
  const allRefs = [...astRefs, ...proseRefs];
  const seen = new Set<string>();
  const dedupedRefs: DocRef[] = [];
  for (const ref of allRefs) {
    const key = `${ref.kind}:${ref.target}:${ref.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedRefs.push(ref);
    }
  }

  // Sort refs by line ascending (determinism)
  dedupedRefs.sort(
    (a, b) =>
      a.line - b.line ||
      a.kind.localeCompare(b.kind) ||
      a.target.localeCompare(b.target),
  );

  return { path: relPath, refs: dedupedRefs };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract L2 references from all markdown files under repoRoot.
 *
 * @param repoRoot - Absolute path to the repository root.
 * @param glob - Optional glob pattern (currently only **‌/*.md supported; other patterns walk full tree).
 * @returns A deterministic DocRefsIndex (no generatedAt).
 */
export async function extractDocRefs(
  repoRoot: string,
  glob?: string,
): Promise<DocRefsIndex> {
  const ignoredSet = buildGitIgnoreSet(repoRoot);
  const mdFiles = globToMdFiles(repoRoot, glob ?? "**/*.md", ignoredSet);

  // Sort files for determinism
  mdFiles.sort();

  const entries: DocEntry[] = [];
  for (const absPath of mdFiles) {
    const entry = await extractFromFile(absPath, repoRoot);
    if (entry !== null) {
      entries.push(entry);
    }
  }

  // Sort entries by path (already sorted from sorted files, but ensure it)
  entries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    schemaVersion: 1,
    generator: GENERATOR,
    docs: entries,
  };
}

/**
 * Write the DocRefsIndex to docs/generated/doc-refs.json.
 */
export function writeDocRefsIndex(index: DocRefsIndex, repoRoot: string): void {
  const outDir = path.join(repoRoot, "docs", "generated");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "doc-refs.json");
  fs.writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}
