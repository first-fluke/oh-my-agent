/**
 * T6 — resolve.ts
 *
 * Resolves L2 references from a DocRefsIndex and returns a DriftReport.
 * Pure function — no side effects, no file writes.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Resolver
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pMap from "p-map";
import { http } from "../../io/http.js";
import type { DocRef, DocRefsIndex } from "../../types/docs.js";

// ---------------------------------------------------------------------------
// DriftReport types
// ---------------------------------------------------------------------------

export interface BrokenRef {
  doc: string;
  line: number;
  kind: DocRef["kind"];
  target: string;
  reason: string;
}

export interface SkippedRef {
  doc: string;
  line: number;
  kind: DocRef["kind"];
  target: string;
  reason: string;
}

export interface DriftReport {
  scannedDocs: number;
  totalRefs: number;
  broken: BrokenRef[];
  skipped: SkippedRef[];
}

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

async function resolveFile(
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

  // Both failed
  const attempted1 = path.relative(repoRoot, docRelPath);
  const attempted2 = path.relative(repoRoot, repoRelPath);
  return {
    ok: false,
    reason: `file_missing (tried: ${attempted1}, ${attempted2})`,
  };
}

// ---------------------------------------------------------------------------
// URL resolution
// ---------------------------------------------------------------------------

const RFC1918_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
const LOCALHOST_RE = /^(localhost|127\.|0\.0\.0\.0)/;
const INTERNAL_HOST_RE = /\.(local|internal)$/;

function isInternalUrl(urlStr: string): boolean {
  let host: string;
  try {
    host = new URL(urlStr).hostname;
  } catch {
    return false;
  }
  return (
    LOCALHOST_RE.test(host) ||
    RFC1918_RE.test(host) ||
    INTERNAL_HOST_RE.test(host)
  );
}

async function resolveUrl(
  target: string,
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  if (isInternalUrl(target)) {
    return { ok: false, skipped: true, reason: "internal-host" };
  }

  try {
    const response = await http.head(target, {
      timeout: 5_000,
      maxRedirects: 5,
      validateStatus: () => true, // handle all status codes manually
    });

    const status = response.status;
    if (status === 200 || (status >= 300 && status < 400)) {
      return { ok: true };
    }
    if (status === 404 || status === 410) {
      return { ok: false, reason: `url_${status}` };
    }
    if (status === 401 || status === 403) {
      return { ok: false, skipped: true, reason: "auth-required" };
    }
    // 5xx or unexpected
    return { ok: false, skipped: true, reason: `unreachable (HTTP ${status})` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("timeout") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ENOTFOUND")
    ) {
      return { ok: false, skipped: true, reason: "unreachable" };
    }
    return { ok: false, skipped: true, reason: `unreachable (${message})` };
  }
}

// ---------------------------------------------------------------------------
// CLI binary resolution
// ---------------------------------------------------------------------------

function resolveCli(target: string): {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
} {
  const firstToken = target.trim().split(/\s+/)[0] ?? "";
  if (!firstToken) return { ok: false, reason: "cli_empty" };

  try {
    const which = process.platform === "win32" ? "where" : "which";
    execSync(`${which} ${firstToken}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    });
    return { ok: true };
  } catch {
    return { ok: false, skipped: true, reason: "cli-unavailable" };
  }
}

// ---------------------------------------------------------------------------
// Script resolution
// ---------------------------------------------------------------------------

function resolveScript(
  scriptName: string,
  docPath: string,
  repoRoot: string,
): { ok: boolean; reason?: string } {
  // Walk up from the doc's directory to find the nearest package.json
  let current = path.dirname(path.join(repoRoot, docPath));
  const root = path.parse(current).root;

  while (current !== root && current.startsWith(repoRoot)) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
          scripts?: Record<string, string>;
        };
        if (pkg.scripts && Object.hasOwn(pkg.scripts, scriptName)) {
          return { ok: true };
        }
        return {
          ok: false,
          reason: `script_not_in_package_json (${path.relative(repoRoot, pkgPath)})`,
        };
      } catch {
        return { ok: false, reason: "package_json_parse_error" };
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return { ok: false, reason: "package_json_not_found" };
}

// ---------------------------------------------------------------------------
// Env var resolution
// ---------------------------------------------------------------------------

// Detect ripgrep availability once per process. ripgrep (`rg`) is 5-10x
// faster than `git grep` on large repos, ships with VS Code and many dev
// distros. Falls back to `git grep` when unavailable so we don't add a
// hard dependency.
let _hasRipgrep: boolean | null = null;
function hasRipgrep(): boolean {
  if (_hasRipgrep !== null) return _hasRipgrep;
  try {
    execSync("rg --version", { stdio: ["ignore", "ignore", "ignore"] });
    _hasRipgrep = true;
  } catch {
    _hasRipgrep = false;
  }
  return _hasRipgrep;
}

function resolveEnv(
  varName: string,
  repoRoot: string,
): { ok: boolean; skipped?: boolean; reason?: string } {
  // Simple grep for process.env.X or import.meta.env.X
  const patterns = [
    `process\\.env\\.${varName}`,
    `import\\.meta\\.env\\.${varName}`,
  ];

  try {
    for (const pattern of patterns) {
      try {
        // ripgrep first (fast); fall back to git grep when rg is absent.
        // Both honor .gitignore so we don't maintain a manual exclude list.
        const cmd = hasRipgrep()
          ? `rg -l --type ts --type js "${pattern}"`
          : `git grep -l "${pattern}" -- "*.ts" "*.js" "*.mjs" "*.tsx" "*.jsx"`;
        execSync(cmd, {
          cwd: repoRoot,
          stdio: ["ignore", "pipe", "ignore"],
          encoding: "utf-8",
        });
        return { ok: true };
      } catch {
        // grep exits non-zero if no matches
      }
    }

    // Check .env.example
    const envExample = path.join(repoRoot, ".env.example");
    if (fs.existsSync(envExample)) {
      const content = fs.readFileSync(envExample, "utf-8");
      if (new RegExp(`^${varName}=`, "m").test(content)) {
        return { ok: true };
      }
    }

    // Not found — warn-only (not broken, external injection possible)
    return { ok: false, skipped: true, reason: "env-not-found-locally" };
  } catch {
    return { ok: false, skipped: true, reason: "env-check-error" };
  }
}

// ---------------------------------------------------------------------------
// Config key resolution
// ---------------------------------------------------------------------------

function getOmaConfigDeepPaths(): Set<string> {
  // Build a set of all valid deep dot-paths from OmaConfig zod schema.
  // We enumerate known paths from the design and agent-config schema.
  const paths = new Set<string>([
    "language",
    "model_preset",
    "date_format",
    "timezone",
    "auto_update_cli",
    "agents",
    "models",
    "custom_presets",
    "vendors",
    "session",
    "docs",
    "docs.auto_verify",
    "docs.check_urls",
    "default_cli",
    "agents.orchestrator",
    "agents.architecture",
    "agents.qa",
    "agents.pm",
    "agents.backend",
    "agents.frontend",
    "agents.mobile",
    "agents.db",
    "agents.debug",
    "agents.tf-infra",
    "agents.retrieval",
    "session.quota_cap",
  ]);
  return paths;
}

const OMA_CONFIG_PATHS = getOmaConfigDeepPaths();

function resolveConfig(target: string): { ok: boolean; reason?: string } {
  if (OMA_CONFIG_PATHS.has(target)) {
    return { ok: true };
  }
  return { ok: false, reason: "config_key_not_found" };
}

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
  dirListingCache.clear();

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
