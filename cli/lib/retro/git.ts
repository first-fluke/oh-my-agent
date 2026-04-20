import { execSync } from "node:child_process";
import type { TimeWindow } from "../../cli-kit/time-window.js";
import type { RetroCommit, RetroFileChange } from "./types.js";

function execGit(cwd: string, cmd: string): string {
  try {
    return execSync(cmd, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

export function fetchOrigin(cwd: string): void {
  execGit(cwd, "git fetch origin --quiet 2>/dev/null || true");
}

export function getDefaultBranch(cwd: string): string {
  const branch = execGit(
    cwd,
    "git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'",
  );
  return branch || "main";
}

export function getGitUserName(cwd: string): string {
  return execGit(cwd, "git config user.name") || "Unknown";
}

export function getCommitsWithStats(
  cwd: string,
  window: TimeWindow,
  branch: string,
): RetroCommit[] {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="COMMIT:%H|%aN|%ae|%at|%s" --shortstat`,
  );
  if (!raw) return [];

  const commits: RetroCommit[] = [];
  let current: Partial<RetroCommit> | null = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("COMMIT:")) {
      if (current?.hash) {
        commits.push({
          hash: current.hash,
          author: current.author || "",
          email: current.email || "",
          timestamp: current.timestamp || 0,
          subject: current.subject || "",
          insertions: current.insertions || 0,
          deletions: current.deletions || 0,
        });
      }
      const parts = line.slice(7).split("|");
      current = {
        hash: parts[0],
        author: parts[1],
        email: parts[2],
        timestamp: Number.parseInt(parts[3] || "0", 10),
        subject: parts.slice(4).join("|"),
        insertions: 0,
        deletions: 0,
      };
    } else if (current && line.trim()) {
      const insMatch = line.match(/(\d+) insertions?\(\+\)/);
      const delMatch = line.match(/(\d+) deletions?\(-\)/);
      if (insMatch)
        current.insertions = Number.parseInt(insMatch[1] || "0", 10);
      if (delMatch) current.deletions = Number.parseInt(delMatch[1] || "0", 10);
    }
  }

  if (current?.hash) {
    commits.push({
      hash: current.hash,
      author: current.author || "",
      email: current.email || "",
      timestamp: current.timestamp || 0,
      subject: current.subject || "",
      insertions: current.insertions || 0,
      deletions: current.deletions || 0,
    });
  }

  return commits;
}

export function getFileChanges(
  cwd: string,
  window: TimeWindow,
  branch: string,
): RetroFileChange[] {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="COMMIT:%H|%aN" --numstat`,
  );
  if (!raw) return [];

  const changes: RetroFileChange[] = [];
  let currentAuthor = "";

  for (const line of raw.split("\n")) {
    if (line.startsWith("COMMIT:")) {
      const parts = line.slice(7).split("|");
      currentAuthor = parts[1] || "";
    } else if (line.trim() && currentAuthor) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const ins = Number.parseInt(parts[0] || "0", 10);
        const del = Number.parseInt(parts[1] || "0", 10);
        if (!Number.isNaN(ins) && !Number.isNaN(del) && parts[2]) {
          changes.push({
            file: parts[2],
            insertions: ins,
            deletions: del,
            author: currentAuthor,
          });
        }
      }
    }
  }

  return changes;
}

export function getFileHotspots(
  cwd: string,
  window: TimeWindow,
  branch: string,
  limit = 10,
): Array<{ file: string; count: number }> {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -${limit}`,
  );
  if (!raw) return [];

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
      if (!match) return null;
      return {
        count: Number.parseInt(match[1] || "0", 10),
        file: match[2] || "",
      };
    })
    .filter((item): item is { file: string; count: number } => item !== null);
}

export function getShippingStreak(
  cwd: string,
  branch: string,
  author?: string,
): number {
  const authorArg = author ? ` --author="${author}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch}${authorArg} --format="%ad" --date=format:"%Y-%m-%d" | sort -u`,
  );
  if (!raw) return 0;

  const dates = raw.split("\n").filter(Boolean).sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);

  for (const dateStr of dates) {
    const [y = 0, m = 0, d = 0] = dateStr.split("-").map(Number);
    const commitDate = new Date(y, m - 1, d);
    commitDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (checkDate.getTime() - commitDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diffDays === 1 && streak === 0) {
      streak++;
      checkDate.setTime(commitDate.getTime());
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function countAIAssistedCommits(
  cwd: string,
  window: TimeWindow,
  branch: string,
): number {
  const untilArg = window.until ? ` --until="${window.until}"` : "";
  const raw = execGit(
    cwd,
    `git log ${branch} --since="${window.since}"${untilArg} --format="%b" | grep -ci "co-authored-by.*noreply@anthropic\\.com\\|co-authored-by.*copilot\\|co-authored-by.*openai" 2>/dev/null || echo 0`,
  );
  return Number.parseInt(raw || "0", 10);
}
