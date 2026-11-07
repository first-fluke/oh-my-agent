import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Run git with an explicit argument array via execFileSync so no shell ever
 * interprets the arguments (model: cli/commands/retro/internal/git.ts).
 * The old shell strings used `2>/dev/null`, which cmd.exe does not understand
 * on Windows — every call silently failed and returned empty stats.
 * Returns trimmed stdout, or null when git fails (non-zero exit / missing).
 */
function execGit(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

export function getGitStats(cwd: string): {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
} {
  // Old shell: `git diff --stat HEAD~10 2>/dev/null || git diff --stat`.
  // The fallback covers shallow history (<10 commits) and detached states.
  const diffStat =
    execGit(cwd, ["diff", "--stat", "HEAD~10"]) ??
    execGit(cwd, ["diff", "--stat"]);

  if (diffStat) {
    const lines = diffStat.split("\n");
    const summaryLine = lines[lines.length - 1] || "";

    const filesMatch = summaryLine.match(/(\d+) files? changed/);
    const addMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
    const removeMatch = summaryLine.match(/(\d+) deletions?\(-\)/);

    return {
      filesChanged: filesMatch?.[1] ? parseInt(filesMatch[1], 10) : 0,
      linesAdded: addMatch?.[1] ? parseInt(addMatch[1], 10) : 0,
      linesRemoved: removeMatch?.[1] ? parseInt(removeMatch[1], 10) : 0,
    };
  }
  return { filesChanged: 0, linesAdded: 0, linesRemoved: 0 };
}

export function getRecentGitCommits(cwd: string, limit = 5): string[] {
  const logs = execGit(cwd, ["log", "--oneline", `-${limit}`]);
  if (logs === null) return [];
  return logs.split("\n").filter(Boolean);
}

export function getRecentChangedFiles(cwd: string): string[] {
  const files =
    execGit(cwd, ["diff", "--name-only", "HEAD~5"]) ??
    execGit(cwd, ["diff", "--name-only"]);
  if (files === null) return [];
  return files.split("\n").filter(Boolean).slice(0, 10);
}

export function getGitDiffSummary(cwd: string): string {
  return (
    execGit(cwd, ["diff", "--stat", "HEAD~5"]) ??
    execGit(cwd, ["diff", "--stat"]) ??
    ""
  );
}

export function getCommitMessages(cwd: string, limit = 10): string[] {
  const logs = execGit(cwd, ["log", "--format=%s", `-${limit}`]);
  if (logs === null) return [];
  return logs.split("\n").filter(Boolean);
}

export function getCommitTypes(commits: string[]): Record<string, number> {
  const types: Record<string, number> = {};
  const typePattern =
    /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf)(\(.+\))?:/;

  for (const commit of commits) {
    const match = commit.match(typePattern);
    if (match) {
      const type = match[1];
      if (type) {
        types[type] = (types[type] || 0) + 1;
      }
    }
  }

  return types;
}

export function getLastRetroDate(cwd: string): string | null {
  try {
    const retroDir = join(cwd, ".serena", "retrospectives");
    if (!existsSync(retroDir)) return null;

    let newestPath: string | null = null;
    let newestMtime = -Infinity;
    for (const entry of readdirSync(retroDir)) {
      if (!entry.endsWith(".json")) continue;
      const full = join(retroDir, entry);
      const mtime = statSync(full).mtimeMs;
      if (mtime > newestMtime) {
        newestMtime = mtime;
        newestPath = full;
      }
    }
    if (!newestPath) return null;

    const retro = JSON.parse(readFileSync(newestPath, "utf-8")) as {
      date?: string;
    };
    return retro.date || null;
  } catch {
    return null;
  }
}

export function getCommitsSince(
  cwd: string,
  sinceDate: string | null,
): string[] {
  if (!sinceDate) {
    return getCommitMessages(cwd, 10);
  }

  try {
    const date = new Date(sinceDate);
    const isoDate = date.toISOString().split("T")[0];

    const logs = execGit(cwd, ["log", "--format=%s", `--since=${isoDate}`]);
    if (logs === null) return getCommitMessages(cwd, 10);
    return logs.split("\n").filter(Boolean);
  } catch {
    return getCommitMessages(cwd, 10);
  }
}
