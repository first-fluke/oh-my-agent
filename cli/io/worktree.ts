/**
 * worktree.ts
 *
 * Git worktree isolation for `oma agent spawn --isolation=worktree`.
 *
 * Creates a fresh worktree + branch per spawn so parallel agents do not
 * step on each other's working tree. Cleanup is intentionally manual:
 * after the agent exits we surface the path + branch and let the user
 * merge or discard via the regular git/scm workflow. Auto-merge is
 * out of scope because it would re-introduce the LLM-judgment failure
 * mode that `oma verify` was built to avoid.
 *
 * Requires the host repo to be a git checkout. Non-git directories
 * error out instead of silently falling back to in-place execution.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export interface WorktreeHandle {
  path: string;
  branch: string;
  base: string;
}

/** Sanitize an arbitrary identifier for safe inclusion in a branch name. */
function sanitize(input: string): string {
  return input.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 64);
}

function runGit(args: string[], cwd: string): string {
  return execSync(`git ${args.map((a) => JSON.stringify(a)).join(" ")}`, {
    cwd,
    encoding: "utf-8",
  }).trim();
}

function isGitRepo(cwd: string): boolean {
  try {
    runGit(["rev-parse", "--is-inside-work-tree"], cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create an isolated git worktree for a spawn.
 *
 * Path:   ${tmpdir}/oma-worktrees/{sessionId}/{agentId}
 * Branch: oma/{sessionId}/{agentId} (created off the current HEAD)
 *
 * Throws when:
 *   - the source repo is not a git checkout
 *   - the target worktree path already exists
 *   - git worktree add fails (e.g., branch name already taken)
 */
export function createWorktree(
  sessionId: string,
  agentId: string,
  sourceRepo: string = process.cwd(),
): WorktreeHandle {
  if (!isGitRepo(sourceRepo)) {
    throw new Error(
      `--isolation=worktree requires a git repository; ${sourceRepo} is not one.`,
    );
  }

  const safeSession = sanitize(sessionId);
  const safeAgent = sanitize(agentId);
  const wtRoot = path.join(tmpdir(), "oma-worktrees", safeSession);
  const wtPath = path.join(wtRoot, safeAgent);
  const branch = `oma/${safeSession}/${safeAgent}`;
  const base = runGit(["rev-parse", "--abbrev-ref", "HEAD"], sourceRepo);

  if (existsSync(wtPath)) {
    throw new Error(
      `Worktree path already exists: ${wtPath}. Remove it or pick a unique sessionId.`,
    );
  }

  mkdirSync(wtRoot, { recursive: true });
  runGit(["worktree", "add", "-b", branch, wtPath], sourceRepo);

  return { path: wtPath, branch, base };
}

/**
 * Format a one-line summary the spawner can print after the child exits.
 * Intentionally does NOT remove the worktree; the user merges or discards.
 */
export function formatWorktreeSummary(handle: WorktreeHandle): string {
  return (
    `worktree: ${handle.path}\n` +
    `branch: ${handle.branch} (from ${handle.base})\n` +
    `merge:  git -C ${JSON.stringify(handle.path)} log --oneline; ` +
    `git merge ${handle.branch}\n` +
    `discard: git worktree remove ${JSON.stringify(handle.path)} --force && ` +
    `git branch -D ${handle.branch}`
  );
}
