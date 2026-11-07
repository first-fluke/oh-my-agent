import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCommitMessages,
  getCommitsSince,
  getCommitTypes,
  getGitDiffSummary,
  getGitStats,
  getLastRetroDate,
  getRecentChangedFiles,
  getRecentGitCommits,
} from "./git.js";

let repo: string;
let plainDir: string;

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "oma-git-test-"));
  plainDir = mkdtempSync(join(tmpdir(), "oma-git-plain-"));
  git(repo, ["init", "--quiet"]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "Test User"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  writeFileSync(join(repo, "a.txt"), "line one\n");
  git(repo, ["add", "a.txt"]);
  git(repo, ["commit", "--quiet", "-m", "feat: initial"]);
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(plainDir, { recursive: true, force: true });
});

describe("git helpers on a real repo (Windows regression: no 2>/dev/null)", () => {
  it("getRecentGitCommits returns oneline entries and honors limit", () => {
    git(repo, ["commit", "--quiet", "--allow-empty", "-m", "fix: second"]);
    const commits = getRecentGitCommits(repo);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toContain("fix: second");
    expect(commits[1]).toContain("feat: initial");
    expect(getRecentGitCommits(repo, 1)).toHaveLength(1);
  });

  it("getCommitMessages returns subjects only", () => {
    expect(getCommitMessages(repo)).toEqual(["feat: initial"]);
  });

  it("getGitStats falls back to plain diff on shallow history", () => {
    // HEAD~10 does not exist with a single commit; the old shell used
    // `|| git diff --stat` — the argv rewrite must keep that fallback.
    writeFileSync(join(repo, "a.txt"), "line one\nline two\n");
    const stats = getGitStats(repo);
    expect(stats.filesChanged).toBe(1);
    expect(stats.linesAdded).toBe(1);
    expect(stats.linesRemoved).toBe(0);
  });

  it("getRecentChangedFiles lists uncommitted changes via fallback", () => {
    writeFileSync(join(repo, "a.txt"), "changed\n");
    writeFileSync(join(repo, "b.txt"), "new file\n");
    const files = getRecentChangedFiles(repo);
    expect(files).toContain("a.txt");
  });

  it("getGitDiffSummary returns the stat summary text", () => {
    writeFileSync(join(repo, "a.txt"), "line one\nline two\n");
    const summary = getGitDiffSummary(repo);
    expect(summary).toContain("a.txt");
    expect(summary).toMatch(/1 file changed/);
  });

  it("getCommitsSince returns recent messages and applies a past --since cut", () => {
    expect(getCommitsSince(repo, null)).toEqual(["feat: initial"]);
    expect(getCommitsSince(repo, "2000-01-01")).toEqual(["feat: initial"]);
    // No future-date assertion: git's approxidate handling of --since values
    // beyond "now" is environment-dependent (some versions ignore them,
    // others filter), so asserting either outcome would be flaky.
  });

  it("getCommitTypes counts conventional-commit prefixes", () => {
    expect(
      getCommitTypes([
        "feat: a",
        "fix(scope): b",
        "feat(ui): c",
        "chore: d",
        "not conventional",
      ]),
    ).toEqual({ feat: 2, fix: 1, chore: 1 });
  });

  it("getLastRetroDate reads the newest retrospective json", () => {
    expect(getLastRetroDate(repo)).toBeNull();
    const retroDir = join(repo, ".serena", "retrospectives");
    mkdirSync(retroDir, { recursive: true });
    writeFileSync(
      join(retroDir, "r.json"),
      JSON.stringify({ date: "2026-01-02" }),
    );
    expect(getLastRetroDate(repo)).toBe("2026-01-02");
  });
});

describe("failure contracts outside a git repo", () => {
  it("returns empty/zero fallbacks instead of throwing", () => {
    expect(getGitStats(plainDir)).toEqual({
      filesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
    });
    expect(getRecentGitCommits(plainDir)).toEqual([]);
    expect(getRecentChangedFiles(plainDir)).toEqual([]);
    expect(getGitDiffSummary(plainDir)).toBe("");
    expect(getCommitMessages(plainDir)).toEqual([]);
    expect(getCommitsSince(plainDir, "2000-01-01")).toEqual([]);
    expect(getLastRetroDate(plainDir)).toBeNull();
  });
});
