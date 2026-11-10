/**
 * Reference-pattern constants and pure text extractors for oma-docs extract.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Extractor
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const KNOWN_CLI_BINARIES = new Set([
  "oma",
  "bun",
  "pnpm",
  "npm",
  "git",
  "node",
]);

export const SHELL_LANGS = new Set(["bash", "sh", "shell", "console", "zsh"]);

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
  "telemetry",
  "agents",
  "models",
  "custom_presets",
  "vendors",
  "session",
  "docs",
  "default_cli",
  "providers",
  "free",
]);

// ---------------------------------------------------------------------------
// Path detection helpers
// ---------------------------------------------------------------------------

const KNOWN_EXT_RE =
  /\.(?:ts|js|mjs|cjs|tsx|jsx|json|yaml|yml|toml|md|sh|py|rs|go|java|kt|swift|dart|tf|env|lock|gitignore|npmrc|nvmrc|tool-versions|editorconfig|prettierrc|eslintrc|babelrc|html|css|scss|sass|svg|png|jpg|gif|webp|woff|woff2|ttf|eot)$/;

const FILE_PATH_RE = new RegExp(`^\\.{0,2}/|^[\\w-]+/|${KNOWN_EXT_RE.source}`);

export function looksLikeFilePath(str: string): boolean {
  if (
    !str ||
    str.includes(" ") ||
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    // Home-relative paths (`~/.gemini/settings.json`) point outside the
    // repo and can never be verified against the working tree.
    str.startsWith("~") ||
    // Slash-prefixed tokens (`/plan`, `/work`, `/orchestrate`) are workflow
    // names in OMA prose, not absolute file paths. Excluding them eliminates
    // the largest class of v1 false positives (~1,500 in the source repo).
    /^\/[a-z][\w-]*$/i.test(str) ||
    // Template-placeholder paths like `plan-{sessionId}.json`,
    // `progress-{agent}.md`, or `data/<id>/INFO.md` are documentation
    // patterns, not real files.
    /\{[^}]+\}|<[^>]+>/.test(str) ||
    // Glob patterns (`*.ts`, `src/**/*.tsx`, `file?.md`) describe sets of
    // files, not a single verifiable path.
    /[*?[\]]/.test(str) ||
    // Trailing-slash refs (`stack/`, `resources/`, `examples/`) are
    // directory references in prose, not file paths. v1 has no notion of
    // directory existence, so excluding them avoids false positives.
    str.endsWith("/")
  ) {
    return false;
  }
  return FILE_PATH_RE.test(str);
}

/**
 * Stricter path test for inline-code spans. A backtick span is a claim that
 * a file exists only when it is unambiguously path-like: an explicit
 * relative prefix (`./`, `../`), or a directory component AND a known file
 * extension. This excludes package specifiers (`shadcn/ui`), bare-filename
 * prose mentions (`DESIGN.md`), branch names, and timezone identifiers,
 * which dominated v1 false positives (~5,300 in the source repo).
 *
 * Markdown link/image targets keep the looser `looksLikeFilePath` check —
 * a link is always an explicit reference, never a prose mention.
 */
export function looksLikeInlineFileRef(str: string): boolean {
  if (!looksLikeFilePath(str)) return false;
  if (str.startsWith("./") || str.startsWith("../")) return true;
  return str.includes("/") && KNOWN_EXT_RE.test(str);
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

export function extractEnvVars(text: string): string[] {
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

// Only explicit `<pm> run <script>` forms assert a package.json script.
// Bare-binary forms (`pnpm install`, `pnpm deepsec`) invoke builtins or
// external bins and must not be resolved against local package.json.
const SCRIPT_PATTERNS = [/(?:bun|npm|pnpm)\s+run\s+([a-zA-Z][a-zA-Z0-9:_-]*)/g];

export function extractScripts(text: string): string[] {
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

// Dotted tokens whose final segment is a file extension (`session.md`) or
// a TLD (`telemetry.istio.io`) are filenames and domains, not config keys.
const FILE_EXT_SEGMENTS = new Set([
  "md",
  "ts",
  "js",
  "json",
  "yaml",
  "yml",
  "toml",
  "sh",
  "py",
  "txt",
  "html",
  "css",
]);
const TLD_SEGMENTS = new Set([
  "io",
  "com",
  "org",
  "net",
  "dev",
  "ai",
  "co",
  "app",
  "sh",
  "edu",
  "gov",
]);

export function extractConfigKeys(text: string): string[] {
  const found = new Set<string>();
  CONFIG_PATH_RE.lastIndex = 0;
  let m = CONFIG_PATH_RE.exec(text);
  while (m !== null) {
    const dotPath = m[1];
    if (dotPath) {
      const segments = dotPath.split(".");
      const topKey = segments[0];
      const lastKey = segments[segments.length - 1] ?? "";
      if (
        topKey &&
        OMA_CONFIG_TOP_KEYS.has(topKey) &&
        !FILE_EXT_SEGMENTS.has(lastKey) &&
        !TLD_SEGMENTS.has(lastKey)
      ) {
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

export function extractUrls(text: string): string[] {
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
