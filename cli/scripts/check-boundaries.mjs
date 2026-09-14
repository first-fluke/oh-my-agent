#!/usr/bin/env node
// Verifies that commands/<x> files never import from commands/<y>.
// See cli/ARCHITECTURE.md.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const COMMANDS_DIR = join(CLI_DIR, "commands");

// Real shared dirs under commands/ that every slice may import.
const ALLOWED_SHARED = new Set(["migrations"]);

// Sanctioned cross-slice edges, frozen as of 2026-06. Each entry documents an
// intentional command-to-command dependency; do NOT add edges to silence a
// failure — move the shared code to utils/, io/, or platform/ instead.
//
//   doctor -> skills|memory|hook : doctor is the cross-cutting diagnostic
//     surface and reads other slices' check/report APIs (auditSkills,
//     MIN_TASKS, memory status, VARIANT_ROUTES).
//   install -> link, update -> link : install/update finish by running the
//     link flow; link.ts is the single owner of symlink reconciliation.
//   memory -> recap : `oma memory import` reuses recap's vendor conversation
//     parsers (registry + parser side-effect imports).
//   market -> search : market MUST route fetches through oma-search per
//     .claude/rules/market.md ("Reuse oma-search") — apiKeywordSearch and
//     FetchContext are that contract.
//   harness -> skills : the harness runner reuses the skill evaluator's
//     dispatch envelope and judge, and the deployment-feedback loop turns
//     captured incidents into skill regression fixtures and runs the skill
//     optimizer (incident-promote, incident-scan, feedback).
//   doctor -> harness : doctor's Evolution note reports the feedback backlog
//     (captured incidents without a fixture, uncaptured failed runs).
const ALLOWED_EDGES = new Set([
  "doctor->skills",
  "doctor->memory",
  "doctor->hook",
  "doctor->harness",
  "harness->skills",
  "install->link",
  "update->link",
  "memory->recap",
  "market->search",
]);

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

/** Slice name (top-level dir under commands/) for an absolute path, or null. */
function sliceNameOf(absPath) {
  const rel = relative(COMMANDS_DIR, absPath);
  if (rel.startsWith("..")) return null;
  const head = rel.split(sep)[0] ?? null;
  return head?.includes(".") ? null : head;
}

const violations = [];
const files = walk(COMMANDS_DIR);
const importRe = /(?:from|require\()\s*["']([^"']+)["']/g;

for (const file of files) {
  const slice = sliceNameOf(file);
  if (!slice) continue;
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(importRe)) {
    const imp = match[1];

    // Resolve the import to an absolute path: relative specifiers against the
    // importing file's directory, @cli/* against CLI_DIR. Bare specifiers
    // (node:fs, npm packages) are ignored.
    let resolved = null;
    if (imp.startsWith(".")) {
      resolved = resolve(dirname(file), imp);
    } else if (imp.startsWith("@cli/")) {
      resolved = resolve(CLI_DIR, imp.slice("@cli/".length));
    }
    if (!resolved) continue;

    const otherSlice = sliceNameOf(resolved);
    if (
      otherSlice &&
      otherSlice !== slice &&
      !ALLOWED_SHARED.has(otherSlice) &&
      !ALLOWED_EDGES.has(`${slice}->${otherSlice}`)
    ) {
      violations.push(`${relative(CLI_DIR, file)} -> commands/${otherSlice}`);
    }
  }
}

if (violations.length) {
  console.error("cross-slice imports detected:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log("boundaries ok");
