import { execFileSync } from "node:child_process";

export interface GitContext {
  since: string;
  range: string;
  commitCount: number;
  log: string;
  diffStat: string;
  changedFiles: string[];
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}

export function collectGitContext(since: string = "1 week ago"): GitContext {
  const range = `--since=${since}`;
  const log = git([
    "log",
    range,
    "--pretty=format:%h %s%n%b%n---",
    "--no-merges",
  ]);
  const diffStat = git(["diff", "--stat", `@{${since}}`, "HEAD"]);
  const changedFilesRaw = git(["diff", "--name-only", `@{${since}}`, "HEAD"]);
  const changedFiles = changedFilesRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const commitCount = log
    .split("\n---\n")
    .map((entry) => entry.trim())
    .filter(Boolean).length;

  return {
    since,
    range,
    commitCount,
    log,
    diffStat,
    changedFiles,
  };
}

export function formatContextForPrompt(ctx: GitContext): string {
  return [
    `# Git context (since ${ctx.since})`,
    `Commits: ${ctx.commitCount}`,
    "",
    "## Log",
    ctx.log || "(empty)",
    "",
    "## Diff stat",
    ctx.diffStat || "(empty)",
    "",
    "## Changed files",
    ctx.changedFiles.length > 0 ? ctx.changedFiles.join("\n") : "(none)",
  ].join("\n");
}
