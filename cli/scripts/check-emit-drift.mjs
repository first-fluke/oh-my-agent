#!/usr/bin/env node
// Re-runs `oma emit --target all` into a scratch directory and fails if the
// result differs from the committed `generated/` directory at the repo
// root. Mirrors the wshobson/agents pattern: generated files are committed,
// CI fails on drift. See cli/commands/emit/command.ts (the `oma emit` CLI
// surface) and cli/platform/emit/*.ts (the actual generators).

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_ROOT = join(CLI_DIR, "..");
const COMMITTED_DIR = join(REPO_ROOT, "generated");

function listFilesRecursive(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

function diffDirs(freshDir, committedDir) {
  const freshFiles = new Set(
    listFilesRecursive(freshDir).map((f) => relative(freshDir, f)),
  );
  const committedFiles = new Set(
    listFilesRecursive(committedDir).map((f) => relative(committedDir, f)),
  );

  const missing = [...freshFiles].filter((f) => !committedFiles.has(f));
  const extra = [...committedFiles].filter((f) => !freshFiles.has(f));
  const changed = [];

  for (const rel of freshFiles) {
    if (!committedFiles.has(rel)) continue;
    const freshContent = readFileSync(join(freshDir, rel), "utf-8");
    const committedContent = readFileSync(join(committedDir, rel), "utf-8");
    if (freshContent !== committedContent) changed.push(rel);
  }

  return { missing, extra, changed };
}

const scratchDir = mkdtempSync(join(tmpdir(), "oma-emit-drift-"));

try {
  // Run from REPO_ROOT (not CLI_DIR): `oma emit` resolves its project root
  // from the invocation's cwd, and CLI_DIR itself may contain a stray
  // `.agents/` (e.g. agent scratch state) that would shadow the real SSOT.
  execFileSync(
    "bun",
    ["cli/cli.ts", "emit", "--target", "all", "--out", scratchDir, "--json"],
    { cwd: REPO_ROOT, stdio: ["ignore", "ignore", "inherit"] },
  );

  if (!existsSync(COMMITTED_DIR)) {
    console.error(
      `no committed ${relative(REPO_ROOT, COMMITTED_DIR)}/ directory found. ` +
        "Run `oma emit --target all` at the repo root and commit its output first.",
    );
    process.exit(1);
  }

  const { missing, extra, changed } = diffDirs(scratchDir, COMMITTED_DIR);

  if (missing.length === 0 && extra.length === 0 && changed.length === 0) {
    console.log("emit drift: none — generated/ matches a fresh `oma emit`");
    process.exit(0);
  }

  console.error(
    "emit drift detected between a fresh `oma emit` and generated/:",
  );
  for (const f of missing) console.error(`  missing from generated/: ${f}`);
  for (const f of extra)
    console.error(`  stale in generated/ (no longer emitted): ${f}`);
  for (const f of changed) console.error(`  changed: ${f}`);
  console.error(
    "Run `oma emit --target all` at the repo root and commit the result.",
  );
  process.exit(1);
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
