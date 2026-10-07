import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { proposeSyncPatches } from "./sync-propose.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-docs-sync-security-"));
  execFileSync("git", ["init", "--quiet", root]);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it.each(["--cached", "HEAD"])(
  "does not execute shell commands appended to %s",
  async (revision) => {
    const marker = join(root, "injected");
    await expect(
      proposeSyncPatches({
        repoRoot: root,
        diffRange: `${revision}; touch '${marker}'`,
        index: { schemaVersion: 1, generator: "test", docs: [] },
      }),
    ).rejects.toThrow(/diff range|git diff/i);
    expect(existsSync(marker)).toBe(false);
  },
);

it("supports staged changes with filenames containing spaces", async () => {
  writeFileSync(join(root, "source file.ts"), "export const value = 1;\n");
  execFileSync("git", ["add", "--", "source file.ts"], { cwd: root });
  const proposals = await proposeSyncPatches({
    repoRoot: root,
    diffRange: "--cached",
    index: {
      schemaVersion: 1,
      generator: "test",
      docs: [
        {
          path: "README.md",
          refs: [{ kind: "file", target: "source file.ts", line: 1 }],
        },
      ],
    },
  });
  expect(proposals[0]?.changedFiles).toEqual(["source file.ts"]);
});

it("supports revision ranges with Unicode branch names", async () => {
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "--allow-empty",
      "--quiet",
      "-m",
      "initial",
    ],
    { cwd: root },
  );
  execFileSync("git", ["branch", "검증"], { cwd: root });
  await expect(
    proposeSyncPatches({
      repoRoot: root,
      diffRange: "검증..HEAD",
      index: { schemaVersion: 1, generator: "test", docs: [] },
    }),
  ).resolves.toEqual([]);
});

it("reports invalid revisions instead of treating them as an empty diff", async () => {
  await expect(
    proposeSyncPatches({
      repoRoot: root,
      diffRange: "missing-revision..HEAD",
      index: { schemaVersion: 1, generator: "test", docs: [] },
    }),
  ).rejects.toThrow(/git diff/i);
});
