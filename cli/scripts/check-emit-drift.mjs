#!/usr/bin/env node
// Re-runs `oma emit --target all` into a scratch base directory and fails if
// the result differs from the committed artifacts at the repo root.
//
// Only artifacts that something actually reads are gated: the Claude plugin
// marketplace at `.claude-plugin/marketplace.json`, and the generated vendor
// docs `cli/{CLAUDE,AGENTS}.md`. The agent-skills/agents-md trees that
// `oma emit` also writes under `generated/` are NOT committed here — they were
// a near-verbatim copy of `.agents/skills/` whose `../_shared/...` references
// did not survive the copy, so the drop-in-distribution purpose they existed
// for never actually held. `oma emit --target agent-skills` still works for
// users emitting into their own projects; this repo just doesn't vendor its
// own output. See cli/commands/emit/command.ts and cli/platform/emit/*.ts.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_ROOT = join(CLI_DIR, "..");
const MARKETPLACE_REL = join(".claude-plugin", "marketplace.json");
// Generated cli/-scoped vendor docs (emit --target cli-docs). Hand-editing
// these reintroduces the drift this gate exists to prevent.
const CLI_DOC_RELS = [join("cli", "CLAUDE.md"), join("cli", "AGENTS.md")];

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

  if (marketplaceIssues.length === 0 && cliDocIssues.length === 0) {
    console.log(
      "emit drift: none — .claude-plugin/marketplace.json and " +
        "cli/{CLAUDE,AGENTS}.md match a fresh `oma emit`",
    );
    process.exit(0);
  }

  console.error(
    "emit drift detected between a fresh `oma emit` and committed output:",
  );
  for (const issue of marketplaceIssues) console.error(`  ${issue}`);
  for (const issue of cliDocIssues) console.error(`  ${issue}`);
  console.error(
    "Run `oma emit --target all` at the repo root and commit the changes to " +
      ".claude-plugin/ and cli/ (generated/ is gitignored).",
  );
  process.exit(1);
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
