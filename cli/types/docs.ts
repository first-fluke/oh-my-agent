/**
 * TypeScript types for the doc-refs.json index produced by oma-docs.
 *
 * Schema version: 1
 * Design reference: docs/plans/designs/008-oma-docs.md § doc-refs.json Schema
 */

// ---------------------------------------------------------------------------
// RefKind — L2 reference categories extracted from markdown
// ---------------------------------------------------------------------------

export type RefKind = "file" | "url" | "cli" | "script" | "env" | "config";

// ---------------------------------------------------------------------------
// DocRef — a single reference extracted from a doc at a given line
// ---------------------------------------------------------------------------

export interface DocRef {
  /** Category of the reference. */
  kind: RefKind;
  /**
   * Normalized target string.
   * - file: relative path as written in the doc
   * - url: full URL string
   * - cli: raw command string (e.g. "oma docs verify")
   * - script: npm/bun script name (e.g. "test")
   * - env: environment variable name (e.g. "OPENAI_API_KEY")
   * - config: dot-path config key (e.g. "docs.auto_verify")
   */
  target: string;
  /** 1-based source line number in the doc where the reference was found. */
  line: number;
}

// ---------------------------------------------------------------------------
// DocEntry — a single doc file and all its extracted references
// ---------------------------------------------------------------------------

export interface DocEntry {
  /**
   * Path to the doc file, relative to the repository root.
   * Docs are sorted alphabetically by path in the index.
   */
  path: string;
  /**
   * All L2 references extracted from this doc, sorted by line (ascending).
   * Docs containing zero refs are still emitted with an empty array.
   */
  refs: DocRef[];
}

// ---------------------------------------------------------------------------
// DocRefsIndex — root shape of docs/generated/doc-refs.json
// ---------------------------------------------------------------------------

export interface DocRefsIndex {
  /** Schema version; increments on breaking changes. Always 1 for v1. */
  schemaVersion: 1;
  /**
   * Extractor version string.
   * Distinguishes index drift caused by generator changes vs. ref changes.
   * Example: "oma-docs/0.1.0"
   */
  generator: string;
  /**
   * All scanned doc files sorted alphabetically by path.
   * Files matching excluded patterns (docs/generated/**, >10MB, gitignored)
   * are omitted. Files with frontmatter `oma-docs: skip` are also omitted.
   */
  docs: DocEntry[];
}
