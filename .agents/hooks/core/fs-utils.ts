import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

/**
 * Normalize a filesystem path to POSIX (forward-slash) form so output
 * shown to the model and string comparisons stay platform-independent
 * on Windows. Mirrors `cli/utils/fs-utils.ts#toPosixPath`.
 */
export function toPosixPath(p: string): string {
  return sep === "/" ? p : p.split(sep).join("/");
}

const MAX_DEPTH = 20;

/**
 * Walk up from startDir to find the git repository root.
 * This prevents CLAUDE_PROJECT_DIR pointing to a subdirectory
 * (e.g. packages/i18n during a build) from creating state files
 * in the wrong location.
 */
export function resolveGitRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < MAX_DEPTH; i++) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
  return startDir;
}

/**
 * Files under `<dir>/.agents/` that mark an OMA install. A bare `.agents/`
 * holding only runtime output (a stray `state/` or `backup/` tree written from
 * a sub-directory) is not an install and never becomes the project root.
 */
export const OMA_INSTALL_MARKERS = [
  "oma-config.yaml",
  "oma-config.cue",
  "oma-config.local.yaml",
  "oma-config.local.cue",
  join("skills", "_version.json"),
] as const;

export function hasOmaInstall(dir: string): boolean {
  const agentsDir = join(dir, ".agents");
  return OMA_INSTALL_MARKERS.some((marker) =>
    existsSync(join(agentsDir, marker)),
  );
}

function homeDirectory(): string | null {
  try {
    return resolve(homedir());
  } catch {
    return null;
  }
}

/**
 * Resolve the OMA project root. Shared by the hooks (standalone and
 * `oma hook run`) and the CLI so state and config always land in the same
 * place for a given working directory.
 *
 * Walks up from `startDir` and returns the nearest directory whose `.agents/`
 * holds an install marker, without crossing the enclosing git root; otherwise
 * that git root; otherwise `startDir`. A sub-package with its own install
 * (`apps/api/.agents/oma-config.yaml`) is its own root, while a nested
 * directory without one resolves to the repository. Outside a repository the
 * walk stops at the home directory, whose `.agents/` is the global install
 * rather than a project.
 */
export function resolveProjectRoot(startDir: string): string {
  const start = resolve(startDir);
  const home = homeDirectory();
  let dir = start;
  for (let i = 0; i < MAX_DEPTH; i++) {
    const isGitRoot = existsSync(join(dir, ".git"));
    if (dir === home && !isGitRoot) break;
    if (isGitRoot || hasOmaInstall(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}
