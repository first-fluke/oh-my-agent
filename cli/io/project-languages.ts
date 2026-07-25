import { type Dirent, existsSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

/**
 * Project-content-based language detection for Serena's language server list.
 *
 * Before this module, oma derived Serena languages purely from the *installed
 * skill set* (`oma-mobile` → dart, `oma-tf-infra` → terraform, …). That boots a
 * language server per skill regardless of whether the project contains a single
 * file of that language — a Dart LSP (~15 MB) and terraform-ls start in every
 * session of a TypeScript-only repo. Since every concurrent agent session spawns
 * its own Serena process tree, that cost multiplies by the number of open
 * sessions.
 *
 * Detection here answers a narrower, verifiable question: does this project
 * actually contain files of language X? Only languages listed in
 * {@link LANGUAGE_EXTENSIONS} are detectable, and — importantly — only those are
 * ever pruned from an existing config. Languages oma cannot detect (bash, or
 * anything a user added by hand) are left untouched.
 */

/**
 * Serena language server id → source file extensions that imply it.
 *
 * DELIBERATE EXCLUSION: "bash". oma never auto-adds bash-language-server
 * (~40 MB, low value for the projects oma manages — see SKILL_LANGUAGE_MAP in
 * `serena.ts`). Keeping it out of this map also keeps it out of the prunable
 * set, so a manually added `- bash` survives reconcile.
 */
export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
  python: [".py", ".pyi"],
  dart: [".dart"],
  terraform: [".tf", ".tfvars"],
  rust: [".rs"],
  go: [".go"],
  swift: [".swift"],
  kotlin: [".kt", ".kts"],
  java: [".java"],
  ruby: [".rb"],
  php: [".php"],
  csharp: [".cs"],
  cpp: [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".c", ".h"],
  elixir: [".ex", ".exs"],
  lua: [".lua"],
  zig: [".zig"],
  scala: [".scala"],
};

/**
 * Marker files that establish a language on their own, without meeting the
 * source-file threshold. A repo scaffolded with `pubspec.yaml` but no `.dart`
 * file yet is still a Dart project.
 */
export const LANGUAGE_MARKER_FILES: Record<string, string[]> = {
  typescript: ["package.json", "tsconfig.json", "deno.json"],
  python: ["pyproject.toml", "requirements.txt", "setup.py", "Pipfile"],
  dart: ["pubspec.yaml"],
  terraform: ["main.tf", "versions.tf", "terraform.tf"],
  rust: ["Cargo.toml"],
  go: ["go.mod"],
  swift: ["Package.swift"],
  kotlin: ["build.gradle.kts", "settings.gradle.kts"],
  java: ["pom.xml", "build.gradle", "settings.gradle"],
  ruby: ["Gemfile", ".ruby-version"],
  php: ["composer.json"],
  elixir: ["mix.exs"],
};

/** Directories never worth scanning — build output, caches, vendored deps. */
const IGNORED_DIRS = new Set([
  ".git",
  ".serena",
  ".agents",
  ".dart_tool",
  ".gradle",
  ".idea",
  ".next",
  ".nuxt",
  ".pytest_cache",
  ".svelte-kit",
  ".terraform",
  ".tox",
  ".venv",
  "__pycache__",
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "out",
  "Pods",
  "target",
  "venv",
  "vendor",
]);

/**
 * Source files of a language required to claim it, absent a marker file.
 * A single stray `.py` script in a TypeScript repo must not boot a Python LSP.
 */
const MIN_SOURCE_FILES = 3;

/** Directory depth to descend. Deep enough for nested monorepo source dirs. */
const MAX_DEPTH = 6;

/** Upper bound on files examined, so detection stays fast on huge trees. */
const MAX_FILES_SCANNED = 20_000;

/** Extension → language, inverted from {@link LANGUAGE_EXTENSIONS} once. */
const EXTENSION_TO_LANGUAGE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    for (const ext of extensions) map[ext] = language;
  }
  return map;
})();

/** Marker filename → language, inverted from {@link LANGUAGE_MARKER_FILES}. */
const MARKER_TO_LANGUAGE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [language, files] of Object.entries(LANGUAGE_MARKER_FILES)) {
    for (const file of files) map[file] = language;
  }
  return map;
})();

/**
 * Languages this module is able to detect, and therefore the only ones that may
 * be pruned from an existing `project.yml`. Anything outside this set (bash, an
 * exotic language, a manual user entry) is preserved untouched.
 */
export function detectableLanguages(): Set<string> {
  return new Set(Object.keys(LANGUAGE_EXTENSIONS));
}

/**
 * Scan `cwd` and return the Serena language server ids the project's own files
 * justify, sorted for deterministic output.
 *
 * A language qualifies when it has a marker file (`pubspec.yaml`, `go.mod`, …)
 * or at least {@link MIN_SOURCE_FILES} source files. Returns an empty array for
 * an empty/unreadable tree — callers decide the fallback.
 */
export function detectProjectLanguages(cwd: string): string[] {
  if (!existsSync(cwd)) return [];

  const counts: Record<string, number> = {};
  const markerHits = new Set<string>();
  let scanned = 0;

  const walk = (dir: string, depth: number): void => {
    if (depth > MAX_DEPTH || scanned >= MAX_FILES_SCANNED) return;

    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory (permissions, broken symlink) — skip
    }

    for (const entry of entries) {
      if (scanned >= MAX_FILES_SCANNED) return;

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name), depth + 1);
        continue;
      }
      if (!entry.isFile()) continue; // symlinks, sockets, …

      scanned++;

      const marker = MARKER_TO_LANGUAGE[entry.name];
      if (marker) markerHits.add(marker);

      const language = EXTENSION_TO_LANGUAGE[extname(entry.name).toLowerCase()];
      if (language) counts[language] = (counts[language] ?? 0) + 1;
    }
  };

  walk(cwd, 0);

  const detected = new Set(markerHits);
  for (const [language, count] of Object.entries(counts)) {
    if (count >= MIN_SOURCE_FILES) detected.add(language);
  }

  return [...detected].sort();
}
