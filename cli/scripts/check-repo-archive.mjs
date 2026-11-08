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

/**
 * Count the files and folders in a (uncompressed) tar archive.
 *
 * Measured on the tar itself rather than `git ls-tree`, because that is what
 * GitHub serves and the plugin directory counts: `git archive` honors the
 * `export-ignore` attributes in .gitattributes, which keep the emitted plugin
 * packages that hosts only ever clone or copy from a local path
 * (pi-package/, antigravity-plugin/, commandcode-mod/) out of the archive.
 * Metadata records (pax `x`/`g`, GNU long-name `L`/`K`) describe the entry
 * that follows and are not entries themselves.
 */
export function countArchiveEntries(tar) {
  let entries = 0;
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    if (header[0] === 0) break; // end-of-archive zero block
    const size = Number.parseInt(
      header
        .subarray(124, 136)
        .toString("ascii")
        .replace(/\0.*$/s, "")
        .trim() || "0",
      8,
    );
    const type = String.fromCharCode(header[156]);
    if (!"xgLK".includes(type)) entries += 1;
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

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
  const tar = git(["archive", "--format=tar", "HEAD"]);
  const compressedBytes = gzipSync(tar).length;
  const entries = countArchiveEntries(tar);
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
