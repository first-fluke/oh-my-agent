#!/usr/bin/env node
// Re-runs `oma emit --target all` into a scratch base directory and fails if
// the result differs from the committed artifacts at the repo root.
//
// Only artifacts that something actually reads are gated: the Claude plugin
// marketplace at `.claude-plugin/marketplace.json`, the generated
// `cli/AGENTS.md`, and the Agent Plugins 1.0.0 package at the
// repo root (`plugin.json`, `skills/`, `mcp.json`, `com.firstfluke.oma/`,
// `com.github.copilot/`) — conformant clients (Copilot CLI, Kiro, Qwen Code,
// Hermes, Codex) discover those files at the package root, so a git
// clone of this repo is the installable package. The same applies to the
// `.grok-plugin/`, `.zcode-plugin/`, `.kimi-plugin/` manifests the Grok,
// ZCode, and Kimi hosts read at the repo root, and to the committed
// `opencode-package/` npm plugin. The packages hosts only install from a
// local path (`codex-plugin/`, `pi-package/`, `antigravity-plugin/`,
// `commandcode-mod/`) are gitignored: the release workflow emits them and
// publishes them to npm or as release assets, and their emitters are covered
// by unit tests. The agent-skills/agents-md trees that `oma emit` also
// writes under `generated/` are NOT committed here — the portable skills are
// already included in the root package. `oma emit --target agent-skills`
// also emits standalone skills for users' own projects. See
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
import { checkPluginVersions } from "./check-plugin-versions.mjs";

const CLI_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_ROOT = join(CLI_DIR, "..");
const MARKETPLACE_REL = join(".claude-plugin", "marketplace.json");
// Generated cli/AGENTS.md (emit --target cli-docs). Hand-editing this file
// reintroduces the drift this gate exists to prevent.
const CLI_DOC_RELS = [join("cli", "AGENTS.md")];
// Agent Plugins package artifacts at the repo root (emit --target
// agent-plugin). `plugin.json` is version-normalized like the marketplace.
const AGENT_PLUGIN_FILE_RELS = ["mcp.json"];
const AGENT_PLUGIN_TREE_RELS = [
  "skills",
  "com.firstfluke.oma",
  "com.github.copilot",
];
// Claude-compatible native-manifest hosts: Grok/ZCode/Kimi read a
// dot-directory manifest at the repo root (emit --target grok-plugin |
// zcode-plugin | kimi-plugin). Manifests track package.json's version.
const NATIVE_MANIFEST_TREE_RELS = [
  ".grok-plugin",
  ".zcode-plugin",
  ".kimi-plugin",
];
// OpenCode/Kilo npm plugin; package.json tracks the release version.
const OPENCODE_PACKAGE_TREE_REL = "opencode-package";

// The marketplace manifest's `version` tracks package.json, which
// release-please bumps on every release — that bump alone must not count as
// drift (the gate would fail on the first push after every release).
// Checked-in release versions are validated separately before emission, so
// normalization only avoids false differences from generated release metadata.
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
  const issues =
    freshContent === committedContent ? [] : [`changed: ${MARKETPLACE_REL}`];
  issues.push(...diffTree(scratchDir, join(".claude-plugin", "domains"), true));
  issues.push(
    ...diffTree(scratchDir, join(".claude-plugin", "directory"), true),
  );
  for (const rel of [
    join(".claude-plugin", "plugin.json"),
    join(".agents", "plugins", "marketplace.json"),
  ]) {
    const fresh = join(scratchDir, rel);
    const committed = join(REPO_ROOT, rel);
    if (
      !existsSync(fresh) ||
      !existsSync(committed) ||
      stripVersion(readFileSync(fresh, "utf8")) !==
        stripVersion(readFileSync(committed, "utf8"))
    )
      issues.push(`changed or missing: ${rel}`);
  }
  return issues;
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

function diffTree(scratchDir, rel, normalizeVersions = false) {
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
    if (
      normalizeVersions &&
      (file.endsWith("plugin.json") ||
        file.endsWith("marketplace.json") ||
        file === "package.json")
        ? stripVersion(freshContent.toString()) !==
          stripVersion(committedContent.toString())
        : !freshContent.equals(committedContent)
    ) {
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
  problems.push(...diffTree(scratchDir, OPENCODE_PACKAGE_TREE_REL, true));
  return problems;
}

function diffNativeManifestPlugins(scratchDir) {
  const problems = [];
  for (const rel of NATIVE_MANIFEST_TREE_RELS) {
    // marketplace.json entries also carry the release version (ZCode compares
    // it against the installed plugin.json), so normalize both files.
    problems.push(...diffTree(scratchDir, rel, true));
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

const versionIssues = checkPluginVersions(REPO_ROOT);
if (versionIssues.length > 0) {
  console.error("Plugin release version check failed:");
  for (const issue of versionIssues) console.error(`  ${issue}`);
  process.exit(1);
}

const scratchDir = mkdtempSync(join(tmpdir(), "oma-emit-drift-"));

try {
  // Run from REPO_ROOT (not CLI_DIR): `oma emit` resolves its project root
  // from the invocation's cwd, and CLI_DIR itself may contain a stray
  // `.agents/` (e.g. agent scratch state) that would shadow the real SSOT.
  execFileSync(
    "bun",
    [
      "cli/cli.ts",
      "emit",
      "--target",
      "all",
      "--output-dir",
      scratchDir,
      "--json",
    ],
    { cwd: REPO_ROOT, stdio: ["ignore", "ignore", "inherit"] },
  );

  const marketplaceIssues = diffMarketplace(scratchDir);
  const cliDocIssues = diffCliDocs(scratchDir);
  const agentPluginIssues = diffAgentPlugin(scratchDir);
  const nativeManifestIssues = diffNativeManifestPlugins(scratchDir);

  if (
    marketplaceIssues.length === 0 &&
    cliDocIssues.length === 0 &&
    agentPluginIssues.length === 0 &&
    nativeManifestIssues.length === 0
  ) {
    console.log(
      "emit drift: none — .claude-plugin/marketplace.json, " +
        "cli/AGENTS.md, the root Agent Plugins package " +
        "(plugin.json, skills/, mcp.json, com.firstfluke.oma/, " +
        "com.github.copilot/), opencode-package/, and " +
        "the .grok-plugin/, .zcode-plugin/, .kimi-plugin/ manifests match " +
        "a fresh `oma emit`",
    );
    process.exit(0);
  }

  console.error(
    "emit drift detected between a fresh `oma emit` and committed output:",
  );
  for (const issue of marketplaceIssues) console.error(`  ${issue}`);
  for (const issue of cliDocIssues) console.error(`  ${issue}`);
  for (const issue of agentPluginIssues) console.error(`  ${issue}`);
  for (const issue of nativeManifestIssues) console.error(`  ${issue}`);
  console.error(
    "Run `oma emit --target all` at the repo root and commit the changes to " +
      ".claude-plugin/, cli/, opencode-package/, .grok-plugin/, " +
      ".zcode-plugin/, .kimi-plugin/, and the root package artifacts " +
      "(generated/ and the local-path plugin trees are gitignored).",
  );
  process.exit(1);
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
