// Provider exclusions, not package directory names, define native-search scope.
// Keep this module dependency-free for standalone hook installations. Unknown
// configuration syntax never grants an exemption; the explicit fallback remains.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import {
  dirname,
  isAbsolute,
  join,
  matchesGlob,
  relative,
  resolve,
} from "node:path";
import type { CodeIntelligenceProvider } from "./code-intelligence-primer.ts";

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Read simple YAML string lists; aliases, tags and complex YAML stay unknown. */
function stringList(yaml: string, key: string): string[] | null {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (start < 0) return [];
  const inline = lines[start]
    ?.slice(key.length + 1)
    .replace(/\s+#.*$/, "")
    .trim();
  if (inline === "[]" || inline === "null") return [];
  let values: string[];
  if (inline) {
    // JSON lists are also YAML. Other flow styles use the explicit fallback.
    try {
      const parsed: unknown = JSON.parse(inline);
      return Array.isArray(parsed) && parsed.every((p) => typeof p === "string")
        ? parsed
        : null;
    } catch {
      return null;
    }
  } else {
    values = [];
    for (const line of lines.slice(start + 1)) {
      if (/^\s*(#|$)/.test(line)) continue;
      if (/^[^\s-]/.test(line)) break;
      const match = /^\s*-\s+(.+?)\s*$/.exec(line);
      if (!match) return null;
      values.push(match[1] ?? "");
    }
  }
  const result: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+#.*$/, "").trim();
    if (clean.startsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(clean);
        if (typeof parsed !== "string") return null;
        result.push(parsed);
      } catch {
        return null;
      }
    } else if (/^'[^']*'$/.test(clean)) {
      result.push(clean.slice(1, -1));
    } else if (/^[^!&*[{>|'"#][^\s]*$/.test(clean)) {
      result.push(clean);
    } else {
      return null;
    }
  }
  return result;
}

/** Literal directory prefix of a search glob; leading wildcards give no scope. */
export function searchPathRoot(path: string): string | null {
  if (!path || /[$`\n\r\\{}()!]/.test(path)) return null;
  const parts = path.split("/");
  const wildcard = parts.findIndex((part) => /[*?[]/.test(part));
  if (wildcard < 0) return path;
  if (parts.slice(wildcard).includes("..")) return null;
  return parts.slice(0, wildcard).join("/") || null;
}

function excludedByPatterns(
  path: string,
  patterns: string[],
  directory = true,
): boolean {
  // A re-inclusion can make a subtree only partly excluded. Do not broaden the
  // exemption when proving full containment would require a directory walk.
  if (patterns.some((p) => p.startsWith("!"))) return false;
  const ancestors = path
    .split("/")
    .map((_, i, parts) => parts.slice(0, i + 1).join("/"));
  return patterns.some((raw) => {
    // Restrict to the shared gitignore/glob subset; extglobs and escapes differ.
    if (!raw || /[\\{}()[\]!#\s]/.test(raw)) return false;
    const rooted = raw.startsWith("/");
    const pattern = raw.replace(/^\//, "").replace(/\/(?:\*\*)?$/, "");
    if (!pattern) return false;
    const glob = rooted || pattern.includes("/") ? pattern : `**/${pattern}`;
    return ancestors.some(
      (ancestor, index) =>
        (!raw.endsWith("/") || index < ancestors.length - 1 || directory) &&
        matchesGlob(ancestor, glob),
    );
  });
}

function hasReincludedPaths(
  projectDir: string,
  paths: string[],
  names: string[],
): boolean {
  const root = resolve(projectDir);
  for (const path of paths) {
    const target = resolve(root, path);
    let current = target;
    while (current === root || current.startsWith(`${root}/`)) {
      for (const name of names) {
        for (const line of read(join(current, name)).split(/\r?\n/)) {
          if (!line.startsWith("!")) continue;
          const pattern = line.slice(1).trim().replace(/^\//, "");
          const scope = relative(current, target);
          const anchor = searchPathRoot(pattern);
          if (
            !scope ||
            !anchor ||
            !pattern.includes("/") ||
            anchor.startsWith(`${scope}/`) ||
            anchor === scope ||
            excludedByPatterns(scope, [pattern])
          )
            return true;
        }
      }
      if (current === root) break;
      current = dirname(current);
    }
  }
  return false;
}

function serenaExcluded(projectDir: string, paths: string[]): boolean {
  const config = read(join(projectDir, ".serena", "project.yml"));
  if (!config) return false;
  const global = read(
    join(
      process.env.SERENA_HOME || join(homedir(), ".serena"),
      "serena_config.yml",
    ),
  );
  const globalPatterns = stringList(global, "ignored_paths");
  const localPatterns = stringList(config, "ignored_paths");
  if (!globalPatterns || !localPatterns) return false;
  if (/^<<\s*:/m.test(config) || /^<<\s*:/m.test(global)) return false;
  const patterns = [...globalPatterns, ...localPatterns];
  if (patterns.some((p) => p.startsWith("!"))) return false;
  const gitignoreSetting = /^ignore_all_files_in_gitignore:[ \t]*([^#\r\n]*)/m
    .exec(config)?.[1]
    ?.trim()
    .toLowerCase();
  if (
    gitignoreSetting !== undefined &&
    gitignoreSetting !== "true" &&
    gitignoreSetting !== "false"
  )
    return false;
  const respectsGitignore = gitignoreSetting !== "false";
  if (
    respectsGitignore &&
    hasReincludedPaths(projectDir, paths, [".gitignore"])
  )
    return false;
  const remaining = paths.filter((path) => {
    const directory = isDirectory(resolve(projectDir, path));
    // Virtualenv tools often put `*` in the environment's own .gitignore
    // instead of adding the environment name to the parent repository.
    const ignoresContents =
      respectsGitignore &&
      directory &&
      read(join(projectDir, path, ".gitignore"))
        .split(/\r?\n/)
        .some((line) => ["*", "**", "/*", "/**"].includes(line.trim()));
    return !ignoresContents && !excludedByPatterns(path, patterns, directory);
  });
  if (remaining.length === 0) return true;
  if (!respectsGitignore) return false;
  try {
    const output = execFileSync(
      "git",
      ["check-ignore", "--no-index", "--verbose", "-z", "--stdin"],
      {
        cwd: projectDir,
        input: remaining.map((path) => `${path}\0`).join(""),
        encoding: "utf8",
        timeout: 500,
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
    const fields = output.split("\0");
    const ignored = new Set<string>();
    for (let i = 0; i + 3 < fields.length; i += 4) {
      // Serena reads .gitignore files, not Git's global/info exclude files.
      const source = fields[i] ?? "";
      if (
        (source === ".gitignore" || source.endsWith("/.gitignore")) &&
        !fields[i + 2]?.startsWith("!")
      ) {
        ignored.add((fields[i + 3] ?? "").replace(/\/$/, ""));
      }
    }
    return remaining.every((path) => ignored.has(path));
  } catch {
    return false;
  }
}

function gortexExcluded(projectDir: string, paths: string[]): boolean {
  // Use the provider's own layered list rather than copying its builtins or
  // guessing where its global config lives. The CLI read is bounded and read-only.
  // Current list output omits `include`; conservatively reject that override.
  let dir = resolve(projectDir);
  while (true) {
    if (/^include\s*:/m.test(read(join(dir, ".gortex.yaml")))) return false;
    if (dirname(dir) === dir) break;
    dir = dirname(dir);
  }
  try {
    const output = execFileSync("gortex", ["config", "exclude", "list"], {
      cwd: projectDir,
      encoding: "utf8",
      timeout: 500,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const patterns: string[] = [];
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const match =
        /^\[(?:builtin|global|repo:[^\]]+|workspace(?: \(legacy (?:index|watch)\.exclude\))?)\s*\]\s+(.+?)\s*$/.exec(
          line,
        );
      if (!match?.[1]) return false;
      patterns.push(match[1]);
    }
    // Per-directory overrides can re-include descendants of an excluded root.
    // Without a provider path-level query those cases need the explicit fallback.
    if (
      hasReincludedPaths(projectDir, paths, [
        ".gortexignore",
        ".ignore",
        ".rgignore",
        ".gitignore",
      ])
    )
      return false;
    return paths.every((path) =>
      excludedByPatterns(
        path,
        patterns,
        isDirectory(resolve(projectDir, path)),
      ),
    );
  } catch {
    return false;
  }
}

export function isExcludedSearchScope(
  provider: CodeIntelligenceProvider,
  projectDir: string,
  roots: string[],
): boolean {
  if (roots.length === 0) return false;
  const paths: string[] = [];
  for (const root of roots) {
    const literal = searchPathRoot(root);
    if (!literal) return false;
    const path = relative(projectDir, resolve(projectDir, literal));
    if (!path) return false;
    // Explicit external paths, such as uv's cache, are outside this project.
    if (path === ".." || path.startsWith(`../`) || isAbsolute(path)) continue;
    paths.push(path);
  }
  return (
    paths.length === 0 ||
    (provider === "serena"
      ? serenaExcluded(projectDir, paths)
      : gortexExcluded(projectDir, paths))
  );
}
