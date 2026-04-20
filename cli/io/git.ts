import { execSync } from "node:child_process";

export function getGitStats(cwd: string): {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
} {
  try {
    const diffStat = execSync(
      "git diff --stat HEAD~10 2>/dev/null || git diff --stat",
      {
        cwd,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      },
    );

    const lines = diffStat.trim().split("\n");
    const summaryLine = lines[lines.length - 1] || "";

    const filesMatch = summaryLine.match(/(\d+) files? changed/);
    const addMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
    const removeMatch = summaryLine.match(/(\d+) deletions?\(-\)/);

    return {
      filesChanged: filesMatch?.[1] ? parseInt(filesMatch[1], 10) : 0,
      linesAdded: addMatch?.[1] ? parseInt(addMatch[1], 10) : 0,
      linesRemoved: removeMatch?.[1] ? parseInt(removeMatch[1], 10) : 0,
    };
  } catch {
    return { filesChanged: 0, linesAdded: 0, linesRemoved: 0 };
  }
}

export function getRecentGitCommits(cwd: string, limit = 5): string[] {
  try {
    const logs = execSync(`git log --oneline -${limit} 2>/dev/null`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return logs.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function getRecentChangedFiles(cwd: string): string[] {
  try {
    const files = execSync(
      "git diff --name-only HEAD~5 2>/dev/null || git diff --name-only",
      {
        cwd,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
    return files.trim().split("\n").filter(Boolean).slice(0, 10);
  } catch {
    return [];
  }
}

export function getGitDiffSummary(cwd: string): string {
  try {
    return execSync("git diff --stat HEAD~5 2>/dev/null || git diff --stat", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function getCommitMessages(cwd: string, limit = 10): string[] {
  try {
    const logs = execSync(`git log --format="%s" -${limit} 2>/dev/null`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return logs.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
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
    const retroDir = `${cwd}/.serena/retrospectives`;
    const files = execSync(`ls -t "${retroDir}"/*.json 2>/dev/null | head -1`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (!files) return null;

    const content = execSync(`cat "${files}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    const retro = JSON.parse(content) as { date?: string };
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

    const logs = execSync(
      `git log --format="%s" --since="${isoDate}" 2>/dev/null`,
      {
        cwd,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      },
    );

    return logs.trim().split("\n").filter(Boolean);
  } catch {
    return getCommitMessages(cwd, 10);
  }
}
