import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  captureCodeFingerprint,
  sameCodeFingerprint,
} from "../../.agents/hooks/core/code-fingerprint.ts";

let projectDir: string;

function git(...args: string[]): string {
  return execFileSync("git", args, {
    cwd: projectDir,
    encoding: "utf-8",
  }).trim();
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "oma-fingerprint-"));
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

function initGit(): void {
  writeFileSync(join(projectDir, "tracked.txt"), "original");
  git("init", "-q");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-qm",
    "initial",
  );
}

describe("code fingerprint", () => {
  it("returns unavailable identifiers outside Git", async () => {
    expect(await captureCodeFingerprint(projectDir)).toEqual({
      head: null,
      dirty: false,
      treeHash: null,
    });
  });

  it("is stable across repeated reads and subdirectory callers", async () => {
    initGit();
    mkdirSync(join(projectDir, "nested"));
    writeFileSync(join(projectDir, "tracked.txt"), "edited");
    const snapshot = await captureCodeFingerprint(projectDir);
    expect(snapshot).toMatchObject({
      head: git("rev-parse", "HEAD"),
      dirty: true,
    });
    expect(
      sameCodeFingerprint(snapshot, await captureCodeFingerprint(projectDir)),
    ).toBe(true);
    expect(await captureCodeFingerprint(join(projectDir, "nested"))).toEqual(
      snapshot,
    );
  });

  it("detects further edits while the tree is already dirty", async () => {
    initGit();
    writeFileSync(join(projectDir, "tracked.txt"), "first edit");
    const first = await captureCodeFingerprint(projectDir);
    writeFileSync(join(projectDir, "tracked.txt"), "second edit");
    const second = await captureCodeFingerprint(projectDir);
    expect(first.dirty).toBe(true);
    expect(second.dirty).toBe(true);
    expect(sameCodeFingerprint(first, second)).toBe(false);
  });

  it("includes staged and binary changes", async () => {
    initGit();
    const clean = await captureCodeFingerprint(projectDir);
    writeFileSync(join(projectDir, "tracked.txt"), Buffer.from([0, 1, 2, 3]));
    git("add", "tracked.txt");
    const staged = await captureCodeFingerprint(projectDir);
    expect(staged.dirty).toBe(true);
    expect(staged.treeHash).not.toBe(clean.treeHash);
    writeFileSync(join(projectDir, "tracked.txt"), Buffer.from([0, 1, 2, 4]));
    expect((await captureCodeFingerprint(projectDir)).treeHash).not.toBe(
      staged.treeHash,
    );
  });

  it("includes untracked names and ignores their contents", async () => {
    initGit();
    const clean = await captureCodeFingerprint(projectDir);
    const path = join(projectDir, "new\nfile.txt");
    writeFileSync(path, "first");
    const added = await captureCodeFingerprint(projectDir);
    expect(added.dirty).toBe(true);
    expect(added.treeHash).not.toBe(clean.treeHash);
    writeFileSync(path, "second");
    expect(await captureCodeFingerprint(projectDir)).toEqual(added);
    rmSync(path);
    expect(await captureCodeFingerprint(projectDir)).toEqual(clean);
  });

  it("detects a new commit even when the worktree is clean", async () => {
    initGit();
    const before = await captureCodeFingerprint(projectDir);
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "--allow-empty",
      "-qm",
      "next",
    );
    const after = await captureCodeFingerprint(projectDir);
    expect(after.dirty).toBe(false);
    expect(after.treeHash).toBe(before.treeHash);
    expect(sameCodeFingerprint(before, after)).toBe(false);
  });
});
