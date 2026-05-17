/**
 * Unit tests: worktree.ts
 *
 * Covers createWorktree against a real git repo created in a tempdir, plus
 * formatWorktreeSummary output shape. Real git is used here because the
 * module shells out to git; mocking it would not test the integration.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWorktree, formatWorktreeSummary } from "./worktree.js";

let repoDir: string;

beforeEach(() => {
  repoDir = mkdtempSync(path.join(tmpdir(), "oma-worktree-test-"));
  execSync("git init -b main", { cwd: repoDir, stdio: "pipe" });
  execSync('git config user.email "test@example.com"', {
    cwd: repoDir,
    stdio: "pipe",
  });
  execSync('git config user.name "Test"', { cwd: repoDir, stdio: "pipe" });
  execSync("git commit --allow-empty -m init", {
    cwd: repoDir,
    stdio: "pipe",
  });
});

afterEach(() => {
  // Clean up any worktrees created off the test repo before deleting it
  try {
    const list = execSync("git worktree list --porcelain", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    for (const line of list.split("\n")) {
      const match = line.match(/^worktree (.+)$/);
      if (match?.[1] && match[1] !== repoDir) {
        try {
          execSync(`git worktree remove ${JSON.stringify(match[1])} --force`, {
            cwd: repoDir,
            stdio: "pipe",
          });
        } catch {
          // ignore — best effort
        }
      }
    }
  } catch {
    // ignore — repo may already be torn down
  }
  if (existsSync(repoDir)) {
    rmSync(repoDir, { recursive: true, force: true });
  }
});

describe("createWorktree", () => {
  it("creates a worktree + branch from the current HEAD", () => {
    const handle = createWorktree("sess-001", "oma-backend", repoDir);
    expect(existsSync(handle.path)).toBe(true);
    expect(handle.branch).toBe("oma/sess-001/oma-backend");
    expect(handle.base).toBe("main");

    // The branch should be checked out at the new path
    const headBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: handle.path,
      encoding: "utf-8",
    }).trim();
    expect(headBranch).toBe(handle.branch);
  });

  it("sanitizes unsafe characters in sessionId / agentId for the branch", () => {
    const handle = createWorktree("sess with space", "agent$weird", repoDir);
    expect(handle.branch).toMatch(/^oma\/sess-with-space\/agent-weird$/);
  });

  it("throws when source is not a git repo", () => {
    const nonRepo = mkdtempSync(path.join(tmpdir(), "oma-non-git-"));
    expect(() => createWorktree("a", "b", nonRepo)).toThrow(
      /requires a git repository/,
    );
    rmSync(nonRepo, { recursive: true, force: true });
  });

  it("throws when the target worktree path already exists", () => {
    createWorktree("dup-session", "agent", repoDir);
    expect(() => createWorktree("dup-session", "agent", repoDir)).toThrow(
      /Worktree path already exists/,
    );
  });
});

describe("formatWorktreeSummary", () => {
  it("returns a multi-line summary with merge and discard commands", () => {
    const summary = formatWorktreeSummary({
      path: "/tmp/wt/foo",
      branch: "oma/s/a",
      base: "main",
    });
    expect(summary).toContain("worktree: /tmp/wt/foo");
    expect(summary).toContain("branch: oma/s/a (from main)");
    expect(summary).toContain("git merge oma/s/a");
    expect(summary).toContain("git worktree remove");
    expect(summary).toContain("git branch -D oma/s/a");
  });
});
