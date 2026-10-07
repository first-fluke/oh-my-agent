#!/usr/bin/env node
// Verifies that commands/<x> files never import from commands/<y>.
// See cli/ARCHITECTURE.md.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const CLI_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");

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
    else if (/\.(ts|tsx|mjs|js)$/.test(name) && !name.endsWith(".d.ts")) {
      entries.push(full);
    }
  }
  return entries;
}

/** Slice name (top-level dir under commands/) for an absolute path, or null. */
function sliceNameOf(commandsDir, absPath) {
  const rel = relative(commandsDir, absPath);
  if (rel.startsWith("..")) return null;
  const head = rel.split(sep)[0] ?? null;
  return head?.includes(".") ? null : head;
}

function moduleSpecifierOf(node) {
  switch (node.type) {
    case "ImportDeclaration":
    case "ExportNamedDeclaration":
    case "ExportAllDeclaration":
    case "ImportExpression":
      return node.source;
    case "TSImportEqualsDeclaration":
      return node.moduleReference.type === "TSExternalModuleReference"
        ? node.moduleReference.expression
        : undefined;
    case "TSImportType":
      return node.argument;
    case "CallExpression":
      return node.callee.type === "Import" ||
        (node.callee.type === "Identifier" && node.callee.name === "require")
        ? node.arguments[0]
        : undefined;
  }
  return undefined;
}

function literalModuleSpecifier(node) {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked;
  }
  return undefined;
}

export function collectImports(files, parseSource = parse) {
  const imports = new Map();
  // Parse one file at a time in-process. No compiler worker, project graph,
  // emitted code, or IPC lifetime is needed to inspect module specifiers.
  for (const file of files) {
    const extension = extname(file);
    const plugins = [];
    if (extension === ".ts" || extension === ".tsx") plugins.push("typescript");
    if (extension === ".tsx" || extension === ".jsx") plugins.push("jsx");
    let sourceFile;
    try {
      sourceFile = parseSource(readFileSync(file, "utf8"), {
        sourceType: "unambiguous",
        sourceFilename: file,
        plugins,
        createImportExpressions: true,
        attachComment: false,
      });
    } catch (error) {
      throw new Error(`Could not parse ${file}: ${error.message}`, {
        cause: error,
      });
    }
    const specifiers = [];
    const visit = (node) => {
      if (!node || typeof node !== "object" || typeof node.type !== "string")
        return;
      const specifier = literalModuleSpecifier(moduleSpecifierOf(node));
      if (specifier !== undefined) specifiers.push(specifier);
      for (const child of Object.values(node)) {
        if (Array.isArray(child)) {
          for (const element of child) visit(element);
        } else {
          visit(child);
        }
      }
    };
    visit(sourceFile);
    imports.set(file, specifiers);
  }
  return imports;
}

export function findBoundaryViolations({
  cliDir = CLI_DIR,
  commandsDir = join(cliDir, "commands"),
} = {}) {
  const violations = [];
  const files = walk(commandsDir);
  const imports = collectImports(files);

  for (const file of files) {
    const slice = sliceNameOf(commandsDir, file);
    if (!slice) continue;
    for (const imp of imports.get(file) ?? []) {
      // Resolve the import to an absolute path: relative specifiers against the
      // importing file's directory, @cli/* against CLI_DIR. Bare specifiers
      // (node:fs, npm packages) are ignored.
      let resolved = null;
      if (imp.startsWith(".")) {
        resolved = resolve(dirname(file), imp);
      } else if (imp.startsWith("@cli/")) {
        resolved = resolve(cliDir, imp.slice("@cli/".length));
      }
      if (!resolved) continue;

      const otherSlice = sliceNameOf(commandsDir, resolved);
      if (
        otherSlice &&
        otherSlice !== slice &&
        !ALLOWED_SHARED.has(otherSlice) &&
        !ALLOWED_EDGES.has(`${slice}->${otherSlice}`)
      ) {
        violations.push(`${relative(cliDir, file)} -> commands/${otherSlice}`);
      }
    }
  }

  return violations;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const violations = findBoundaryViolations();
  if (violations.length) {
    console.error("cross-slice imports detected:");
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }
  console.log("boundaries ok");
}
