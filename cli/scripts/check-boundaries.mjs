#!/usr/bin/env node
// Verifies that commands/<x> files never import from commands/<y>.
// See cli/ARCHITECTURE.md.

import { readdirSync, readFileSync, statSync } from "node:fs";
import {
  dirname,
  extname,
  join,
  posix,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript/unstable/ast";
import { createVirtualFileSystem } from "typescript/unstable/fs";
import { API } from "typescript/unstable/sync";

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
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier;
  }
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference)
  ) {
    return node.moduleReference.expression;
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return node.argument.literal;
  }
  if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require"))
  ) {
    return node.arguments[0];
  }
  return undefined;
}

function isLiteralModuleSpecifier(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function collectImportsFromBatch(files) {
  // The TypeScript virtual filesystem canonicalizes paths with `/` even on
  // Windows. These are virtual paths only; source files keep their native paths.
  const configPath = "/oma-boundary-check/tsconfig.json";
  const sourceRoot = "/oma-boundary-check/files";
  const virtualPaths = new Map(
    files.map((file, index) => [
      file,
      posix.join(sourceRoot, `${index}${extname(file)}`),
    ]),
  );
  const virtualFiles = Object.fromEntries(
    files.map((file) => [virtualPaths.get(file), readFileSync(file, "utf8")]),
  );
  virtualFiles[configPath] = JSON.stringify({
    compilerOptions: {
      allowJs: true,
      noEmit: true,
      noLib: true,
      noResolve: true,
    },
    files: [...virtualPaths.values()],
  });

  const api = new API({
    cwd: process.cwd(),
    fs: createVirtualFileSystem(virtualFiles),
  });
  try {
    const snapshot = api.updateSnapshot({ openProjects: [configPath] });
    try {
      const project = snapshot.getProject(configPath);
      if (!project) {
        throw new Error(
          `Could not open virtual boundary-check project at ${configPath}`,
        );
      }
      const program = project.program;
      const imports = new Map();
      for (const file of files) {
        const sourceFile = program.getSourceFile(virtualPaths.get(file));
        if (!sourceFile) throw new Error(`Could not parse ${file}`);
        const specifiers = [];
        const visit = (node) => {
          const specifier = moduleSpecifierOf(node);
          if (specifier && isLiteralModuleSpecifier(specifier)) {
            specifiers.push(specifier.text);
          }
          node.forEachChild(visit);
        };
        visit(sourceFile);
        imports.set(file, specifiers);
      }
      return imports;
    } finally {
      snapshot.dispose();
    }
  } finally {
    api.close();
  }
}

function isTransientCompilerExit(error) {
  return (
    error instanceof Error &&
    error.message.includes("Unexpected EOF while reading from child process")
  );
}

export function collectImports(files, parseBatch = collectImportsFromBatch) {
  const imports = new Map();
  // Bound TS 7 snapshots and retry a transient native-worker EOF. Other
  // parser errors still fail immediately; no code is emitted.
  for (let start = 0; start < files.length; start += 20) {
    const batch = files.slice(start, start + 20);
    let parsed;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        parsed = parseBatch(batch);
        break;
      } catch (error) {
        if (!isTransientCompilerExit(error) || attempt === 2) throw error;
      }
    }
    for (const [file, specifiers] of parsed) {
      imports.set(file, specifiers);
    }
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
