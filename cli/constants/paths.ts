import { join } from "node:path";

/**
 * Canonical relative paths under an OMA project root.
 *
 * Values use POSIX `/` on purpose: `.gitignore`, git, YAML, and docs are
 * slash-based on every OS (including Windows). For `fs.*` / `path.*` under
 * `projectRoot`, use {@link agentsPathFromRoot} so Node emits native separators.
 *
 * Hooks under `.agents/hooks/` cannot import from `cli/`; mirror any
 * `AGENTS_*` / `ANTIGRAVITYCLI_*` values in hook scripts when they change.
 * Orchestrator YAML (`oma-orchestrator/config/cli-config.yaml`) uses the
 * same `results_dir` string — keep in sync manually.
 */

/** Project SSOT root (typically committed). */
export const AGENTS_DIR = ".agents";

export const AGENTS_SKILLS_DIR = `${AGENTS_DIR}/skills`;
export const AGENTS_RESULTS_DIR = `${AGENTS_DIR}/results`;
export const AGENTS_STATE_DIR = `${AGENTS_DIR}/state`;

export const AGENTS_STATE_SESSIONS_DIR = `${AGENTS_STATE_DIR}/sessions`;
export const AGENTS_STATE_RETRY_DIR = `${AGENTS_STATE_DIR}/retry`;
export const AGENTS_STATE_ARCHIVE_DIR = `${AGENTS_STATE_DIR}/archive`;

/** Antigravity CLI (agy) local project config symlink. */
export const ANTIGRAVITYCLI_DIR = ".antigravitycli";

/**
 * Canonical backup root — the single gitignored location for every on-disk
 * backup oma writes (migration snapshots, update stack copies, safe-write
 * siblings). See `cli/io/backup.ts` for the convention and helpers.
 */
export const AGENTS_BACKUP_DIR = `${AGENTS_DIR}/backup`;

/**
 * LEGACY backup dirs from pre-consolidation versions
 * (`<root>/.migration-backup/`, `<root>/.agents/.migration-backup/`). Nothing
 * writes these anymore; kept only so pre-existing artifacts stay gitignored
 * and so `oma update` can clean them up. The leading-slash-free gitignore
 * pattern covers both locations.
 */
export const MIGRATION_BACKUP_DIR = ".migration-backup";

/**
 * Local plan artifacts written by the /plan, /brainstorm, and /deepinit
 * workflows (designs/, work/, contracts/). Working notes by convention —
 * a file that committed docs must reference is promoted deliberately with
 * `git add -f` and stays tracked despite this ignore.
 */
export const DOCS_PLANS_DIR = "docs/plans";

/** Directory pattern for `.gitignore` (trailing slash). */
export function asGitignoreDir(relativeDir: string): string {
  return relativeDir.endsWith("/") ? relativeDir : `${relativeDir}/`;
}

export const AGENTS_RESULTS_GITIGNORE = asGitignoreDir(AGENTS_RESULTS_DIR);
export const AGENTS_STATE_GITIGNORE = asGitignoreDir(AGENTS_STATE_DIR);
export const ANTIGRAVITYCLI_GITIGNORE = asGitignoreDir(ANTIGRAVITYCLI_DIR);
export const AGENTS_BACKUP_GITIGNORE = asGitignoreDir(AGENTS_BACKUP_DIR);
export const MIGRATION_BACKUP_GITIGNORE = asGitignoreDir(MIGRATION_BACKUP_DIR);
export const DOCS_PLANS_GITIGNORE = asGitignoreDir(DOCS_PLANS_DIR);

/** Lines appended by `ensureOmaProjectGitignore()` during install / link / update. */
export const OMA_PROJECT_GITIGNORE_PATTERNS = [
  ANTIGRAVITYCLI_GITIGNORE,
  AGENTS_RESULTS_GITIGNORE,
  AGENTS_STATE_GITIGNORE,
  AGENTS_BACKUP_GITIGNORE,
  DOCS_PLANS_GITIGNORE,
  MIGRATION_BACKUP_GITIGNORE, // legacy artifacts (no longer written)
] as const;

/**
 * Resolve a POSIX-style relative path under `projectRoot` for filesystem I/O.
 * Example: `agentsPathFromRoot(cwd, AGENTS_RESULTS_DIR)` → native `.agents\\results` on win32.
 */
export function agentsPathFromRoot(
  projectRoot: string,
  relativePosixDir: string,
): string {
  const segments = relativePosixDir
    .split("/")
    .filter((part) => part.length > 0);
  return join(projectRoot, ...segments);
}
