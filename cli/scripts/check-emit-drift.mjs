#!/usr/bin/env node
// Re-runs `oma emit --target all` into a scratch base directory and fails if
// the result differs from the committed artifacts at the repo root.
//
// Only artifacts that something actually reads are gated: the Claude plugin
// marketplace at `.claude-plugin/marketplace.json`, the generated vendor
// docs `cli/{CLAUDE,AGENTS}.md`, and the Agent Plugins 1.0.0 package at the
// repo root (`plugin.json`, `skills/`, `mcp.json`, `com.firstfluke.oma/`) —
// conformant clients discover those files at the package root, so a git
// clone of this repo is the installable package. The agent-skills/agents-md
// trees that `oma emit` also writes under `generated/` are NOT committed
// here — they were a near-verbatim copy of `.agents/skills/` whose
// `../_shared/...` references did not survive the copy, so the
// drop-in-distribution purpose they existed for never actually held.
// `oma emit --target agent-skills` still works for users emitting into their
// own projects; this repo just doesn't vendor its own output. See
// cli/commands/emit/command.ts and cli/platform/emit/*.ts.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_ROOT = join(CLI_DIR, "..");
const MARKETPLACE_REL = join(".claude-plugin", "marketplace.json");
// Generated cli/-scoped vendor docs (emit --target cli-docs). Hand-editing
// these reintroduces the drift this gate exists to prevent.
const CLI_DOC_RELS = [join("cli", "CLAUDE.md"), join("cli", "AGENTS.md")];
// Agent Plugins package artifacts at the repo root (emit --target
// agent-plugin). `plugin.json` is version-normalized like the marketplace.
const AGENT_PLUGIN_FILE_RELS = ["mcp.json"];
const AGENT_PLUGIN_TREE_RELS = ["skills", "com.firstfluke.oma"];

// The marketplace manifest's `version` tracks package.json, which
// release-please bumps on every release — that bump alone must not count as
// drift (the gate would fail on the first push after every release).
// Substantive changes still fail the check.
function stripVersion(content) {
  try {
    return JSON.stringify(JSON.parse(content), (key, value) =>
      key === "version" ? "<version-normalized>" : value,
    );
  } catch {
    return content;
  }
}

function diffMarketplace(scratchDir) {
  const fresh = join(scratchDir, MARKETPLACE_REL);
  const committed = join(REPO_ROOT, MARKETPLACE_REL);
  if (!existsSync(fresh))
    return [`fresh emit did not produce ${MARKETPLACE_REL}`];
  if (!existsSync(committed))
    return [
      `missing committed ${MARKETPLACE_REL} — run \`oma emit\` and commit it`,
    ];
  const freshContent = stripVersion(readFileSync(fresh, "utf-8"));
  const committedContent = stripVersion(readFileSync(committed, "utf-8"));
  return freshContent === committedContent
    ? []
    : [`changed: ${MARKETPLACE_REL}`];
}

/** Relative paths of every regular file under `dir`, sorted. */
function listFilesRecursive(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files.sort();
}

function diffTree(scratchDir, rel) {
  const fresh = join(scratchDir, rel);
  const committed = join(REPO_ROOT, rel);
  if (!existsSync(fresh)) return [`fresh emit did not produce ${rel}/`];
  if (!existsSync(committed))
    return [`missing committed ${rel}/ — run \`oma emit\` and commit it`];

  const problems = [];
  const freshFiles = listFilesRecursive(fresh);
  const committedFiles = listFilesRecursive(committed);
  const freshSet = new Set(freshFiles);
  const committedSet = new Set(committedFiles);

  for (const file of freshFiles) {
    if (!committedSet.has(file)) problems.push(`missing: ${join(rel, file)}`);
  }
  for (const file of committedFiles) {
    if (!freshSet.has(file)) problems.push(`stale: ${join(rel, file)}`);
  }
  for (const file of freshFiles) {
    if (!committedSet.has(file)) continue;
    const freshContent = readFileSync(join(fresh, file));
    const committedContent = readFileSync(join(committed, file));
    if (!freshContent.equals(committedContent)) {
      problems.push(`changed: ${join(rel, file)}`);
    }
  }
  return problems;
}

function diffAgentPlugin(scratchDir) {
  const problems = [];

  // plugin.json tracks package.json's version, which release-please bumps —
  // normalize it like the marketplace manifest so releases don't trip the gate.
  const manifestRel = "plugin.json";
  const freshManifest = join(scratchDir, manifestRel);
  const committedManifest = join(REPO_ROOT, manifestRel);
  if (!existsSync(freshManifest)) {
    problems.push(`fresh emit did not produce ${manifestRel}`);
  } else if (!existsSync(committedManifest)) {
    problems.push(
      `missing committed ${manifestRel} — run \`oma emit\` and commit it`,
    );
  } else if (
    stripVersion(readFileSync(freshManifest, "utf-8")) !==
    stripVersion(readFileSync(committedManifest, "utf-8"))
  ) {
    problems.push(`changed: ${manifestRel}`);
  }

  for (const rel of AGENT_PLUGIN_FILE_RELS) {
    const fresh = join(scratchDir, rel);
    const committed = join(REPO_ROOT, rel);
    if (!existsSync(fresh)) {
      // Emit writes mcp.json only when the SSOT has one; a committed copy
      // without a fresh counterpart is stale, and vice versa.
      if (existsSync(committed)) problems.push(`stale: ${rel}`);
      continue;
    }
    if (!existsSync(committed)) {
      problems.push(
        `missing committed ${rel} — run \`oma emit\` and commit it`,
      );
      continue;
    }
    if (readFileSync(fresh, "utf-8") !== readFileSync(committed, "utf-8")) {
      problems.push(`changed: ${rel}`);
    }
  }

  for (const rel of AGENT_PLUGIN_TREE_RELS) {
    problems.push(...diffTree(scratchDir, rel));
  }
  return problems;
}

function diffCliDocs(scratchDir) {
  const problems = [];
  for (const rel of CLI_DOC_RELS) {
    const fresh = join(scratchDir, rel);
    const committed = join(REPO_ROOT, rel);
    if (!existsSync(fresh)) {
      problems.push(`fresh emit did not produce ${rel}`);
      continue;
    }
    if (!existsSync(committed)) {
      problems.push(
        `missing committed ${rel} — run \`oma emit\` and commit it`,
      );
      continue;
    }
    if (readFileSync(fresh, "utf-8") !== readFileSync(committed, "utf-8")) {
      problems.push(`changed: ${rel}`);
    }
  }
  return problems;
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

  const marketplaceIssues = diffMarketplace(scratchDir);
  const cliDocIssues = diffCliDocs(scratchDir);
  const agentPluginIssues = diffAgentPlugin(scratchDir);

  if (
    marketplaceIssues.length === 0 &&
    cliDocIssues.length === 0 &&
    agentPluginIssues.length === 0
  ) {
    console.log(
      "emit drift: none — .claude-plugin/marketplace.json, " +
        "cli/{CLAUDE,AGENTS}.md, and the root Agent Plugins package " +
        "(plugin.json, skills/, mcp.json, com.firstfluke.oma/) match a " +
        "fresh `oma emit`",
    );
    process.exit(0);
  }

  console.error(
    "emit drift detected between a fresh `oma emit` and committed output:",
  );
  for (const issue of marketplaceIssues) console.error(`  ${issue}`);
  for (const issue of cliDocIssues) console.error(`  ${issue}`);
  for (const issue of agentPluginIssues) console.error(`  ${issue}`);
  console.error(
    "Run `oma emit --target all` at the repo root and commit the changes to " +
      ".claude-plugin/, cli/, and the root package artifacts " +
      "(generated/ is gitignored).",
  );
  process.exit(1);
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
