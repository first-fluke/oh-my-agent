/**
 * T6 — resolve.ts
 *
 * Resolves L2 references from a DocRefsIndex and returns a DriftReport.
 * Pure function — no side effects, no file writes.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Resolver
 */

import pMap from "p-map";
import type { DocRef, DocRefsIndex } from "../../types/docs.js";
import { _clearDirListingCache, resolveFile } from "./resolve/file-resolver.js";
import {
  resolveCli,
  resolveConfig,
  resolveEnv,
  resolveScript,
} from "./resolve/local-resolvers.js";
import type { BrokenRef, DriftReport, SkippedRef } from "./resolve/types.js";
import { resolveUrl } from "./resolve/url-resolver.js";

export { _clearDirListingCache } from "./resolve/file-resolver.js";
export type { BrokenRef, DriftReport, SkippedRef } from "./resolve/types.js";

// ---------------------------------------------------------------------------
// Main resolve function
// ---------------------------------------------------------------------------

/**
 * Resolve all L2 references in the index and return a DriftReport.
 * Pure function — no side effects.
 *
 * @param index - The DocRefsIndex to resolve.
 * @param repoRoot - Absolute path to the repository root.
 */
/**
 * Maximum concurrent URL HEAD requests. Higher values speed up large-doc
 * verification at the cost of more burst load on external hosts. 24 is a
 * pragmatic compromise that keeps full-repo verify under a minute on
 * typical doc-heavy repos while staying polite to upstream services.
 */
const URL_CONCURRENCY = 24;

export interface ResolveOptions {
  /**
   * If specified, only these ref kinds are checked. Refs of other kinds
   * pass through with `ok: true` (treated as not-checked, contributing
   * nothing to the report). Default: all kinds.
   *
   * Use cases:
   * - `["url"]`: URL-only check, run as detached background process
   * - `["file", "cli", "script", "env", "config"]`: fast core check that
   *   skips URL HEAD requests (the dominant latency source)
   */
  kinds?: readonly DocRef["kind"][];
}

export async function resolveRefs(
  index: DocRefsIndex,
  repoRoot: string,
  options?: ResolveOptions,
): Promise<DriftReport> {
  // Reset per-process caches so callers see fresh filesystem state on each
  // run (e.g. when sync mode regenerates docs/generated/doc-refs.json after
  // an apply, the next verify call must observe the new file).
  _clearDirListingCache();

  const kindFilter = options?.kinds ? new Set(options.kinds) : null;
  const checkKind = (k: DocRef["kind"]) =>
    kindFilter === null || kindFilter.has(k);

  type ResolveResult = { ok: boolean; skipped?: boolean; reason?: string };

  // Phase 1: URL refs (parallel via p-map) — only when URL kind is included.
  const urlCache = new Map<string, ResolveResult>();
  if (checkKind("url")) {
    const urlTargets = new Set<string>();
    for (const doc of index.docs) {
      for (const ref of doc.refs) {
        if (ref.kind === "url") urlTargets.add(ref.target);
      }
    }
    const urlList = [...urlTargets];
    const urlResults = await pMap(urlList, (u) => resolveUrl(u), {
      concurrency: URL_CONCURRENCY,
    });
    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      const result = urlResults[i];
      if (url !== undefined && result !== undefined) {
        urlCache.set(url, result);
      }
    }
  }

  // Target-only caches for kinds whose resolution depends on the target alone
  // (not the calling doc): cli, env, config. Without these caches, full-repo
  // verify spawns one `which` subprocess per cli ref and one `grep -r` per env
  // ref — typically thousands of duplicates that dominate runtime.
  const cliCache = new Map<string, ResolveResult>();
  const envCache = new Map<string, ResolveResult>();
  const configCache = new Map<string, ResolveResult>();

  // Phase 2: walk all refs in deterministic order; cached kinds reuse results.
  const broken: BrokenRef[] = [];
  const skipped: SkippedRef[] = [];
  let totalRefs = 0;

  for (const doc of index.docs) {
    for (const ref of doc.refs) {
      // Skip refs whose kind isn't in the filter — they're left unchecked
      // and don't count toward totalRefs (which reports verified count).
      if (!checkKind(ref.kind)) continue;
      totalRefs++;

      let result: ResolveResult;

      switch (ref.kind) {
        case "file":
          result = await resolveFile(ref.target, doc.path, repoRoot);
          break;
        case "url":
          result = urlCache.get(ref.target) ?? { ok: true };
          break;
        case "cli": {
          // Cache by first-token (binary name) since resolveCli only checks
          // that the binary exists on PATH. Full command strings are usually
          // unique per ref but their first tokens are a tiny set.
          const firstToken = ref.target.trim().split(/\s+/)[0] ?? "";
          let cached = cliCache.get(firstToken);
          if (!cached) {
            cached = resolveCli(ref.target);
            cliCache.set(firstToken, cached);
          }
          result = cached;
          break;
        }
        case "script":
          result = resolveScript(ref.target, doc.path, repoRoot);
          break;
        case "env": {
          let cached = envCache.get(ref.target);
          if (!cached) {
            cached = resolveEnv(ref.target, repoRoot);
            envCache.set(ref.target, cached);
          }
          result = cached;
          break;
        }
        case "config": {
          let cached = configCache.get(ref.target);
          if (!cached) {
            cached = resolveConfig(ref.target);
            configCache.set(ref.target, cached);
          }
          result = cached;
          break;
        }
        default:
          result = { ok: true };
      }

      if (result.ok) continue;

      if (result.skipped) {
        skipped.push({
          doc: doc.path,
          line: ref.line,
          kind: ref.kind,
          target: ref.target,
          reason: result.reason ?? "skipped",
        });
      } else {
        broken.push({
          doc: doc.path,
          line: ref.line,
          kind: ref.kind,
          target: ref.target,
          reason: result.reason ?? "unknown",
        });
      }
    }
  }

  return {
    scannedDocs: index.docs.length,
    totalRefs,
    broken,
    skipped,
  };
}
