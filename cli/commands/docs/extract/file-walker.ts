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
      if (isInIgnoredSet(absPath, ignoredSet)) continue;

      if (entry.isDirectory()) {
        const relDir = toPosixPath(path.relative(repoRoot, absPath));
        if (
          relDir === "docs/generated" ||
          relDir.startsWith("docs/generated/")
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

export function globToMdFiles(
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
