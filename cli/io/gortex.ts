import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";

/**
 * Gortex project setup — the Gortex counterpart of `ensureSerenaProject`.
 *
 * When Gortex is the selected code-intelligence provider, `oma install` and
 * `oma update` (project mode only) make the project usable by the Gortex
 * daemon without the user learning any Gortex configuration:
 *
 *   1. Register the project root in the daemon's tracked set (`gortex track`)
 *      when it is not already there. An untracked root makes every graph tool
 *      answer `repo_not_tracked`, which agents cannot recover from.
 *   2. Maintain the project's exclude list in Gortex's per-repo config layer
 *      (`gortex config exclude add --repo <name>`), so OMA-generated churn
 *      (`.agents/results/`, `.agents/state/`, …) and tool caches the builtin
 *      baseline lacks never reach the watcher. Every deferred watcher patch
 *      holds the daemon's writer gate, and a saturated gate makes every graph
 *      query time out — for every tracked repo.
 *
 * Everything goes through the Gortex CLI, which owns `~/.gortex/config.yaml`
 * and reloads the daemon itself; OMA never writes that file directly and
 * never leaves a file in the user's project. Both steps are idempotent and
 * best-effort: a missing binary or an unresponsive daemon degrades to
 * "skipped"/"unknown" and never fails the install. Agent sessions must still
 * never track additional repositories; this module only ever touches the
 * project root the user installed into.
 */

const PROBE_TIMEOUT_MS = 5_000;
const REPOS_TIMEOUT_MS = 10_000;
/**
 * `gortex track` blocks while the daemon runs the initial index (minutes on
 * a large repo) even though the registration itself is written up front. Give
 * it a short budget, then confirm registration via `gortex repos` instead.
 */
const TRACK_TIMEOUT_MS = 15_000;
/** `config exclude add` reloads the daemon; allow for a busy one. */
const EXCLUDE_TIMEOUT_MS = 30_000;

/**
 * Patterns OMA adds to the project's exclude layer. Gortex's builtin baseline
 * already covers `node_modules/`, `__pycache__/`, `.next/`, `dist/`, `build/`
 * and VCS metadata; these are the gaps that generate watcher churn in
 * practice. Patterns follow .gitignore semantics.
 */
export const OMA_GORTEX_EXCLUDES: readonly string[] = [
  // OMA-owned generated artifacts (rewritten on every workflow run).
  ".agents/results/",
  ".agents/state/",
  ".agents/backup/",
  // Tool caches missing from Gortex's builtin list.
  ".ruff_cache/",
  ".pytest_cache/",
  ".turbo/",
  "coverage/",
];

export type GortexRepo = { name: string; path: string };

export type GortexExcludesOutcome = {
  status:
    | "reconciled" // at least one pattern was added
    | "unchanged" // every pattern was already present
    | "unknown" // the current list could not be read; nothing was written
    | "skipped"; // no tracked repo entry to attach excludes to
  added: string[];
};

export type GortexTrackOutcome =
  | "already" // root was already in the tracked set
  | "tracked" // registered and confirmed via `gortex repos`
  | "started" // `gortex track` accepted but confirmation was not available
  | "failed" // `gortex track` exited non-zero
  | "unknown" // could not read the tracked set (daemon/binary unavailable)
  | "skipped"; // binary missing or root refused

export type GortexProjectOutcome = {
  binaryAvailable: boolean;
  tracked: GortexTrackOutcome;
  excludes: GortexExcludesOutcome;
};

/**
 * Backstop mirroring {@link isForbiddenSerenaProjectRoot}: `$HOME` is never a
 * codebase, and tracking it would crawl the whole home directory. Callers in
 * global mode skip the setup earlier; this keeps future callers safe.
 */
export function isForbiddenGortexProjectRoot(cwd: string): boolean {
  return resolve(cwd) === resolve(homedir());
}

function runGortex(args: string[], timeout: number): string {
  return execFileSync("gortex", args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout,
  });
}

/** True when the `gortex` binary is invokable on PATH. */
export function isGortexBinaryAvailable(): boolean {
  try {
    runGortex(["version"], PROBE_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every repository registered with Gortex (name + absolute path), or `null`
 * when the tracked set cannot be read (binary missing, daemon unresponsive, …).
 */
export function listGortexTrackedRepos(): GortexRepo[] | null {
  try {
    const raw = runGortex(["repos", "--json"], REPOS_TIMEOUT_MS);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const repos: GortexRepo[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const { name, path } = entry as { name?: unknown; path?: unknown };
      if (typeof path !== "string" || path.length === 0) continue;
      repos.push({
        name: typeof name === "string" && name.length > 0 ? name : path,
        path: resolve(path),
      });
    }
    return repos;
  } catch {
    return null;
  }
}

/** The tracked repo entry covering `cwd`, `undefined` if none, `null` if unknown. */
export function findGortexRepo(cwd: string): GortexRepo | undefined | null {
  const repos = listGortexTrackedRepos();
  if (repos === null) return null;
  const root = resolve(cwd);
  return repos.find((repo) => repo.path === root);
}

/** Whether `cwd` is in Gortex's tracked set; `null` when that is unknown. */
export function isGortexTracked(cwd: string): boolean | null {
  const repo = findGortexRepo(cwd);
  return repo === null ? null : repo !== undefined;
}

function isTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; signal?: unknown; killed?: unknown };
  return e.code === "ETIMEDOUT" || e.killed === true || e.signal === "SIGTERM";
}

/**
 * Register `cwd` with the Gortex daemon when it is not already tracked.
 * Never re-runs `gortex track` for a tracked root: that call blocks until the
 * daemon's control budget expires without doing anything useful.
 */
export function ensureGortexTracked(cwd: string): GortexTrackOutcome {
  const root = resolve(cwd);
  if (isForbiddenGortexProjectRoot(root)) return "skipped";
  const tracked = isGortexTracked(root);
  if (tracked === null) return "unknown";
  if (tracked) return "already";
  try {
    runGortex(["track", root], TRACK_TIMEOUT_MS);
    return "tracked";
  } catch (error) {
    if (!isTimeout(error)) return "failed";
    // The registration is written before the initial index runs; the CLI
    // merely stayed attached to that index. Confirm via the tracked set.
    return isGortexTracked(root) === true ? "tracked" : "started";
  }
}

/**
 * Parse `gortex config exclude list` (`[repo:<name>] <pattern>` lines) for
 * the patterns already attached to the named repo entry. Pure.
 */
export function parseGortexRepoExcludes(
  listing: string,
  repoName: string,
): string[] {
  const patterns: string[] = [];
  for (const line of listing.split(/\r?\n/)) {
    const match = /^\[repo:([^\]]*?)\s*\]\s+(.+?)\s*$/.exec(line);
    if (match && match[1] === repoName) patterns.push(match[2] as string);
  }
  return patterns;
}

/** Patterns currently attached to `repoName`, or `null` when unreadable. */
export function listGortexRepoExcludes(repoName: string): string[] | null {
  try {
    const raw = runGortex(["config", "exclude", "list"], EXCLUDE_TIMEOUT_MS);
    return parseGortexRepoExcludes(raw, repoName);
  } catch {
    return null;
  }
}

/**
 * Ensure the tracked repo entry `repoName` excludes
 * {@link OMA_GORTEX_EXCLUDES}. Only missing patterns are added, each through
 * `gortex config exclude add --repo` (which also reloads the daemon), so
 * user-added patterns and the rest of `~/.gortex/config.yaml` stay untouched.
 */
export function ensureGortexRepoExcludes(
  repoName: string,
  patterns: readonly string[] = OMA_GORTEX_EXCLUDES,
): GortexExcludesOutcome {
  const current = listGortexRepoExcludes(repoName);
  if (current === null) return { status: "unknown", added: [] };
  const present = new Set(current);
  const added: string[] = [];
  for (const pattern of patterns) {
    if (present.has(pattern)) continue;
    try {
      runGortex(
        ["config", "exclude", "add", "--repo", repoName, pattern],
        EXCLUDE_TIMEOUT_MS,
      );
      added.push(pattern);
    } catch {
      // Best-effort: leave the remaining patterns for the next `oma update`.
      break;
    }
  }
  return { status: added.length > 0 ? "reconciled" : "unchanged", added };
}

/**
 * Ensure the project is set up for Gortex:
 *   1. the project root is tracked by the daemon
 *   2. the tracked entry excludes OMA churn directories
 *
 * Nothing is written into the project itself. Callers in global mode must
 * skip this entirely; `$HOME` is refused here as a backstop and yields an
 * all-"skipped" outcome.
 */
export function ensureGortexProject(cwd: string): GortexProjectOutcome {
  const skipped: GortexProjectOutcome = {
    binaryAvailable: false,
    tracked: "skipped",
    excludes: { status: "skipped", added: [] },
  };
  if (isForbiddenGortexProjectRoot(cwd)) return skipped;
  if (!isGortexBinaryAvailable()) return skipped;
  const tracked = ensureGortexTracked(cwd);
  // A fresh `track` writes the entry before indexing, so it is visible now.
  const repo =
    tracked === "already" || tracked === "tracked"
      ? findGortexRepo(cwd)
      : undefined;
  const excludes = repo
    ? ensureGortexRepoExcludes(repo.name)
    : { status: "skipped" as const, added: [] };
  return { binaryAvailable: true, tracked, excludes };
}
