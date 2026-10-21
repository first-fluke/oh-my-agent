import { execFile } from "node:child_process";
import { createHash } from "node:crypto";

export interface CodeFingerprint {
  head: string | null;
  dirty: boolean;
  treeHash: string | null;
}

/** Snapshot tracked changes and untracked names; never read untracked contents. */
export async function captureCodeFingerprint(
  projectDir: string,
): Promise<CodeFingerprint> {
  const unavailable: CodeFingerprint = {
    head: null,
    dirty: false,
    treeHash: null,
  };
  // Run both reads together, bounded to one second for the whole snapshot.
  const git = (args: string[]): Promise<string | null> =>
    new Promise((resolve) => {
      try {
        execFile(
          "git",
          args,
          {
            cwd: projectDir,
            encoding: "utf-8",
            env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
            timeout: 1_000,
            killSignal: "SIGKILL",
            maxBuffer: 16 * 1024 * 1024,
            windowsHide: true,
          },
          (error, stdout) => resolve(error ? null : stdout),
        );
      } catch {
        resolve(null);
      }
    });
  const [status, diff] = await Promise.all([
    git([
      "status",
      "--porcelain=v2",
      "--branch",
      "--no-ahead-behind",
      "-z",
      "--untracked-files=all",
      "--no-renames",
    ]),
    git([
      "diff",
      "HEAD",
      "--binary",
      "--no-ext-diff",
      "--no-textconv",
      "--ignore-submodules=none",
    ]),
  ]);
  if (status === null) return unavailable;
  const entries = status.split("\0").filter(Boolean);
  const head = entries
    .find((entry) => entry.startsWith("# branch.oid "))
    ?.slice(13);
  if (!head || head === "(initial)") return unavailable;
  if (diff === null) return unavailable;
  const untracked = entries.filter((entry) => entry.startsWith("? "));
  return {
    head,
    dirty: entries.some((entry) => !entry.startsWith("# ")),
    treeHash: createHash("sha256")
      .update(diff)
      .update("\0")
      .update(untracked.join("\0"))
      .digest("hex"),
  };
}

export function sameCodeFingerprint(
  a: CodeFingerprint,
  b: CodeFingerprint,
): boolean {
  return a.head === b.head && a.dirty === b.dirty && a.treeHash === b.treeHash;
}
