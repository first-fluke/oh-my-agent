/**
 * sync-propose.ts
 *
 * Reads git diff and builds a reverse lookup from DocRefsIndex to identify
 * documentation files that reference changed code. Returns a list of
 * candidate docs with their matched refs.
 *
 * **No LLM calls.** Per the OMA skill pattern (mirrored from oma-scholar):
 * the CLI only emits structured candidates; the host LLM (agent runtime
 * that invoked the skill) reads those candidates plus the diff and drafts
 * patches following the SKILL.md instructions.
 *
 * Returned files exclude obvious-secret paths (`.env*`, `*.pem`, `*.key`,
 * `id_rsa*`) and gitignored entries so downstream consumers (host LLM
 * included) never see those files. Content sanitizers are not applied
 * here because no content leaves this function — only file paths and the
 * doc-side ref metadata.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Sync pipeline
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { minimatch } from "minimatch";
import type { DocEntry, DocRef, DocRefsIndex } from "../../types/docs.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SyncProposal {
  /** Relative path of the doc that references one or more changed files. */
  doc: string;
  /** Changed files that this doc references. */
  changedFiles: string[];
  /** Matched DocRef entries from the index. */
  matchedRefs: DocRef[];
}

// ---------------------------------------------------------------------------
// Secret-pattern redaction
// ---------------------------------------------------------------------------

/**
 * Glob patterns for files that are excluded entirely from LLM input.
 * Matched against the file's basename (not full path).
 */
const EXCLUDED_FILE_PATTERNS = [
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "id_rsa",
  "id_rsa*",
];

/**
 * Regex for secret-like literal values that must be redacted from file content.
 * Matches: api_key, api-key, secret, password, token followed by = or : and a
 * 16+ character value.  Preserves the key name and operator; replaces only the value.
 */
function isExcludedByPattern(filePath: string): boolean {
  const basename = path.basename(filePath);
  return EXCLUDED_FILE_PATTERNS.some(
    (pattern) =>
      minimatch(basename, pattern, { nocase: true }) ||
      minimatch(filePath, pattern, { nocase: true }),
  );
}

function isGitIgnored(filePath: string, repoRoot: string): boolean {
  try {
    execSync(`git check-ignore -q "${filePath}"`, {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true; // exit 0 means ignored
  } catch {
    return false; // exit 1 means not ignored
  }
}

// ---------------------------------------------------------------------------
// Git diff helpers
// ---------------------------------------------------------------------------

/**
 * Get changed file paths for the given diff range.
 * Default: --cached (staged files). If cached is empty, fallback to HEAD~1..HEAD.
 */
function getChangedFiles(repoRoot: string, diffRange?: string): string[] {
  if (diffRange) {
    try {
      const output = execSync(`git diff --name-only ${diffRange}`, {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      return output
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  // Default: try --cached first
  try {
    const cached = execSync("git diff --name-only --cached", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const files = cached
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // fall through
  }

  // Fallback: HEAD~1..HEAD
  try {
    const head = execSync("git diff --name-only HEAD~1..HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return head
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Reverse map builder
// ---------------------------------------------------------------------------

/**
 * Build an in-memory reverse map: changedFile -> DocEntry[]
 * from the DocRefsIndex. Only 'file' kind refs are used for matching
 * (file paths are the direct link between code changes and docs).
 */
function buildReverseMap(
  index: DocRefsIndex,
  changedFiles: string[],
): Map<string, DocEntry[]> {
  const reverseMap = new Map<string, DocEntry[]>();

  for (const changedFile of changedFiles) {
    reverseMap.set(changedFile, []);
  }

  for (const docEntry of index.docs) {
    for (const ref of docEntry.refs) {
      if (ref.kind !== "file") continue;

      // Normalize the ref target (strip leading ./ if present)
      const normalizedTarget = ref.target.replace(/^\.\//, "");

      for (const changedFile of changedFiles) {
        const normalizedChanged = changedFile.replace(/^\.\//, "");

        // Match: exact path, or doc-relative suffix match
        if (
          normalizedTarget === normalizedChanged ||
          normalizedChanged.endsWith(`/${normalizedTarget}`) ||
          normalizedTarget.endsWith(`/${normalizedChanged}`)
        ) {
          const existing = reverseMap.get(changedFile) ?? [];
          if (!existing.some((e) => e.path === docEntry.path)) {
            existing.push(docEntry);
            reverseMap.set(changedFile, existing);
          }
        }
      }
    }
  }

  return reverseMap;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Propose sync patches for docs that reference files changed in the given diff.
 *
 * @param opts.repoRoot - Absolute path to the repository root.
 * @param opts.diffRange - Git diff range (e.g. "HEAD~1..HEAD", "--cached"). Default: auto-detect.
 * @param opts.index - DocRefsIndex from extract.ts (passed in; caller decides freshness).
 * @returns Array of SyncProposal, one per candidate doc. Empty if no docs reference changed files.
 */
export async function proposeSyncPatches(opts: {
  repoRoot: string;
  diffRange?: string;
  index: DocRefsIndex;
}): Promise<SyncProposal[]> {
  const { repoRoot, diffRange, index } = opts;

  // Step 1: Get changed files from git diff
  const changedFiles = getChangedFiles(repoRoot, diffRange);
  if (changedFiles.length === 0) {
    return [];
  }

  // Step 2: Build reverse map (changedFile -> docs that reference it)
  const reverseMap = buildReverseMap(index, changedFiles);

  // Step 3: Gather candidate docs (docs with at least one matched changed file)
  const docCandidateMap = new Map<
    string,
    { docEntry: DocEntry; changedFiles: string[]; matchedRefs: DocRef[] }
  >();

  for (const [changedFile, docEntries] of reverseMap) {
    for (const docEntry of docEntries) {
      const existing = docCandidateMap.get(docEntry.path);
      // Collect matched refs for this doc (file-kind refs pointing to changedFile)
      const normalizedChanged = changedFile.replace(/^\.\//, "");
      const matchedRefs = docEntry.refs.filter((ref) => {
        if (ref.kind !== "file") return false;
        const normalizedTarget = ref.target.replace(/^\.\//, "");
        return (
          normalizedTarget === normalizedChanged ||
          normalizedChanged.endsWith(`/${normalizedTarget}`) ||
          normalizedTarget.endsWith(`/${normalizedChanged}`)
        );
      });

      if (existing) {
        // Merge without duplicates
        for (const cf of [changedFile]) {
          if (!existing.changedFiles.includes(cf)) {
            existing.changedFiles.push(cf);
          }
        }
        for (const ref of matchedRefs) {
          const key = `${ref.kind}:${ref.target}:${ref.line}`;
          if (
            !existing.matchedRefs.some(
              (r) => `${r.kind}:${r.target}:${r.line}` === key,
            )
          ) {
            existing.matchedRefs.push(ref);
          }
        }
      } else {
        docCandidateMap.set(docEntry.path, {
          docEntry,
          changedFiles: [changedFile],
          matchedRefs,
        });
      }
    }
  }

  if (docCandidateMap.size === 0) {
    return [];
  }

  // Build candidate proposals — secret-redacted file lists only.
  // No LLM call: the host LLM (skill runtime) reads these candidates plus
  // git diff and proposes patches per the SKILL.md contract.
  const proposals: SyncProposal[] = [];
  for (const [
    docPath,
    { changedFiles: docChangedFiles, matchedRefs },
  ] of docCandidateMap) {
    const safeChangedFiles = docChangedFiles.filter(
      (f) => !isExcludedByPattern(f) && !isGitIgnored(f, repoRoot),
    );

    proposals.push({
      doc: docPath,
      changedFiles: safeChangedFiles,
      matchedRefs,
    });
  }

  // Sort by doc path for deterministic output
  proposals.sort((a, b) => a.doc.localeCompare(b.doc));

  return proposals;
}

// ---------------------------------------------------------------------------
// Re-export excluded files tracker for use in command handler
// ---------------------------------------------------------------------------

/**
 * Determine which files in the changed set would be excluded by secret-redaction rules.
 * Used by command handler (T12) to notify users before interactive session.
 */
export function getExcludedFiles(
  changedFiles: string[],
  repoRoot: string,
): string[] {
  const excluded: string[] = [];
  for (const file of changedFiles) {
    if (isExcludedByPattern(file) || isGitIgnored(file, repoRoot)) {
      excluded.push(file);
    }
  }
  return excluded;
}
