#!/usr/bin/env node
// Verifies that commands/<x> files never import from commands/<y>.
// See cli/ARCHITECTURE.md.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const COMMANDS_DIR = join(CLI_DIR, "commands");

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) entries.push(...walk(full));
    else if (/\.(ts|tsx|mjs|js)$/.test(name) && !name.endsWith(".d.ts"))
      entries.push(full);
  }
  return entries;
}

function sliceNameOf(absPath) {
  const rel = relative(COMMANDS_DIR, absPath).split(/[\\/]/);
  return rel[0] ?? null;
}

const violations = [];
const files = walk(COMMANDS_DIR);
const importRe = /(?:from|require\()\s*["']([^"']+)["']/g;

for (const file of files) {
  const slice = sliceNameOf(file);
  if (!slice || slice.endsWith(".ts")) continue;
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(importRe)) {
    const imp = match[1];
    const crossSliceRel = imp.match(/^\.\.\/([^./][^/]*)\//);
    const crossSliceAlias = imp.match(/^@cli\/commands\/([^/]+)\//);
    const other = crossSliceRel?.[1] ?? crossSliceAlias?.[1];
    if (other && other !== slice) {
      violations.push(`${relative(CLI_DIR, file)} -> commands/${other}`);
    }
  }
}

if (violations.length) {
  console.error("cross-slice imports detected:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log("boundaries ok");
