/**
 * Markdown file discovery for oma-docs extract: recursive walker with
 * gitignore / symlink / docs/generated exclusion, plus glob resolution.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Extractor
 */

import fs from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";
import { isInIgnoredSet } from "../../../io/gitignore.js";
import { toPosixPath } from "../../../utils/fs-utils.js";

// ---------------------------------------------------------------------------
// Markdown file walker
// ---------------------------------------------------------------------------

/**
 * True when `relPath` (repo-root-relative, POSIX) matches any of the user
 * `docs.exclude` glob patterns. `{ dot: true }` so patterns match dotfiles
 * and dot-dirs (e.g. `.agents/**`). Empty pattern list never excludes.
 */
function isExcluded(relPath: string, excludeGlobs: readonly string[]): boolean {
  return excludeGlobs.some((g) => minimatch(relPath, g, { dot: true }));
}

function walkMarkdownFiles(
  dir: string,
  repoRoot: string,
  ignoredSet: Set<string>,
  excludeGlobs: readonly string[] = [],
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
      if (isInIgnoredSet(absPath, ignoredSet)) continue;

      if (entry.isDirectory()) {
        // Test-fixture trees deliberately contain broken refs and must not
        // pollute full-repo verification.
        if (
          entry.name === "__fixtures__" ||
          entry.name === "__tests__" ||
          entry.name === "__mocks__" ||
          entry.name === "__snapshots__"
        ) {
          continue;
        }
        const relDir = toPosixPath(path.relative(repoRoot, absPath));
        if (
          relDir === "docs/generated" ||
          relDir.startsWith("docs/generated/")
        ) {
          continue;
        }
        // Prune whole subtrees matched by `docs.exclude`. Probe with a
        // hypothetical child file so dir-style globs (`benchmarks/**`,
        // `**/i18n/**`) prune the directory without descending into it.
        if (isExcluded(`${relDir}/__probe__.md`, excludeGlobs)) {
          continue;
        }
        walk(absPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const relFile = toPosixPath(path.relative(repoRoot, absPath));
        if (isExcluded(relFile, excludeGlobs)) continue;
        results.push(absPath);
      }
    }
  }

  walk(dir);
  return results;
}

export function globToMdFiles(
  repoRoot: string,
  globPattern: string,
  ignoredSet: Set<string>,
  excludeGlobs: readonly string[] = [],
): string[] {
  const trimmed = globPattern.trim();
  if (trimmed === "" || trimmed === "**/*.md") {
    return walkMarkdownFiles(repoRoot, repoRoot, ignoredSet, excludeGlobs);
  }

  // Single-file path
  const absInput = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(repoRoot, trimmed);

  try {
    const stat = fs.statSync(absInput);
    if (stat.isFile() && absInput.endsWith(".md")) {
      // An explicit single-file target bypasses `docs.exclude` — the user
      // asked for this exact file.
      return [absInput];
    }
    if (stat.isDirectory()) {
      return walkMarkdownFiles(absInput, repoRoot, ignoredSet, excludeGlobs);
    }
  } catch {
    // Falls through to glob handling
  }

  // Generic glob: walk full tree, filter by minimatch against relative path.
  const allFiles = walkMarkdownFiles(
    repoRoot,
    repoRoot,
    ignoredSet,
    excludeGlobs,
  );
  return allFiles.filter((abs) =>
    minimatch(path.relative(repoRoot, abs), trimmed),
  );
}
