#!/usr/bin/env node
// Anthropic's plugin directory downloads the GitHub archive of the whole
// repository before it reads `.claude-plugin/directory`, and stops validating
// above 50 MiB compressed or 10,000 files and folders. It validates again on
// every new commit, so keep headroom below both limits.
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export const MAX_COMPRESSED_BYTES = 45 * 1024 * 1024;
export const MAX_ENTRIES = 9000;

/** Return one message per limit the archive exceeds. */
export function checkRepoArchive({ compressedBytes, entries }) {
  const issues = [];
  const mib = (bytes) => (bytes / 1024 / 1024).toFixed(1);
  if (compressedBytes > MAX_COMPRESSED_BYTES) {
    issues.push(
      `compressed archive is ${mib(compressedBytes)} MiB, above the ${mib(MAX_COMPRESSED_BYTES)} MiB budget (directory limit 50 MiB)`,
    );
  }
  if (entries > MAX_ENTRIES) {
    issues.push(
      `archive has ${entries} files and folders, above the ${MAX_ENTRIES} budget (directory limit 10,000)`,
    );
  }
  return issues;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const git = (args) =>
    execFileSync("git", args, { cwd: root, maxBuffer: 1024 * 1024 * 1024 });
  const compressedBytes = gzipSync(
    git(["archive", "--format=tar", "HEAD"]),
  ).length;
  const entries = git(["ls-tree", "-r", "-t", "--name-only", "HEAD"])
    .toString()
    .split("\n")
    .filter(Boolean).length;
  const issues = checkRepoArchive({ compressedBytes, entries });
  if (issues.length) {
    console.error("Repository archive is too large for the plugin directory:");
    for (const issue of issues) console.error(`  ${issue}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Repository archive fits the plugin directory: ${(compressedBytes / 1024 / 1024).toFixed(1)} MiB, ${entries} entries.`,
    );
  }
}
