/**
 * T5 — extract.ts
 *
 * Extracts L2 references from markdown documents and builds a DocRefsIndex.
 * Uses remark + unified for AST parsing, supports block-level and file-level
 * escape hatches, excludes gitignored / symlink / oversized files.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Extractor
 */

import fs from "node:fs";
import path from "node:path";
import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { ensureGitignored, listGitIgnoredPaths } from "../../io/gitignore.js";
import type { DocEntry, DocRef, DocRefsIndex } from "../../types/docs.js";
import { toPosixPath } from "../../utils/fs-utils.js";
import { extractProseRefs, extractRefsFromAst } from "./extract/ast-refs.js";
import { globToMdFiles } from "./extract/file-walker.js";
import {
  extractFrontmatterSkip,
  parseIgnoreRanges,
} from "./extract/ignore-ranges.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GENERATOR = "oma-docs/0.1.0";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
  const relPath = toPosixPath(path.relative(repoRoot, absPath));

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
  const ignoredSet = listGitIgnoredPaths(repoRoot);
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
 *
 * Also ensures `docs/generated/` is in the project .gitignore so the
 * generated artifact is not accidentally committed. No-op outside a git
 * repo.
 */
export function writeDocRefsIndex(index: DocRefsIndex, repoRoot: string): void {
  ensureGitignored(repoRoot, ["docs/generated/"], {
    header: "# oma docs generated artifacts",
  });
  const outDir = path.join(repoRoot, "docs", "generated");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "doc-refs.json");
  fs.writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}
