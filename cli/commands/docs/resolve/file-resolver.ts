/**
 * File reference resolution for the docs resolver.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Resolver
 */

import fs from "node:fs";
import path from "node:path";
import { toPosixPath } from "../../../utils/fs-utils.js";

// ---------------------------------------------------------------------------
// Internal helpers — file resolution
// ---------------------------------------------------------------------------

/**
 * Case-sensitive file existence check using fs.readdir (not fs.access).
 * Required because macOS is case-insensitive but git is not.
 *
 * Per-directory listing cache. Same directory queried for multiple file refs
 * (extremely common — `src/`, `cli/commands/`, etc. each accumulate hundreds
 * of refs) reuses one readdir call. Without this cache, full-repo verify
 * does ~12k readdir syscalls; with the cache, typically under 200.
 */
const dirListingCache = new Map<string, Set<string> | null>();

function existsCaseSensitive(absPath: string): boolean {
  const dir = path.dirname(absPath);
  const base = path.basename(absPath);
  let entries = dirListingCache.get(dir);
  if (entries === undefined) {
    try {
      entries = new Set(fs.readdirSync(dir));
    } catch {
      entries = null;
    }
    dirListingCache.set(dir, entries);
  }
  return entries?.has(base) ?? false;
}

/**
 * Reset the directory listing cache. Tests call this between fixtures to
 * avoid stale entries; production callers don't need to.
 */
export function _clearDirListingCache(): void {
  dirListingCache.clear();
}

// Convention prefixes searched when both doc-relative and repo-root
// resolution fail. Many OMA docs reference well-known files (e.g.
// `oma-config.yaml`, `mcp.json`) that actually live under `.agents/`,
// or skill resources under `.agents/skills/`. Adding these search roots
// catches the common case without requiring docs to write the full path.
const FALLBACK_PREFIXES = [".agents", "cli", "docs"];

export async function resolveFile(
  target: string,
  docPath: string,
  repoRoot: string,
): Promise<{ ok: boolean; reason?: string }> {
  // 1. Doc-relative resolution
  const docDir = path.dirname(path.join(repoRoot, docPath));
  const docRelPath = path.resolve(docDir, target);
  if (existsCaseSensitive(docRelPath)) {
    return { ok: true };
  }

  // 2. Repo-root resolution
  const repoRelPath = path.resolve(repoRoot, target);
  if (existsCaseSensitive(repoRelPath)) {
    return { ok: true };
  }

  // 3. Fallback prefixes (.agents/, cli/, docs/)
  for (const prefix of FALLBACK_PREFIXES) {
    const prefixedPath = path.resolve(repoRoot, prefix, target);
    if (existsCaseSensitive(prefixedPath)) {
      return { ok: true };
    }
  }

  // All failed
  const attempted1 = toPosixPath(path.relative(repoRoot, docRelPath));
  const attempted2 = toPosixPath(path.relative(repoRoot, repoRelPath));
  return {
    ok: false,
    reason: `file_missing (tried: ${attempted1}, ${attempted2}, ${FALLBACK_PREFIXES.map((p) => `${p}/${target}`).join(", ")})`,
  };
}
