import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { ensureGitignored } from "../../io/gitignore.js";
import { runAction } from "../../utils/cli-framework.js";
import {
  countUrlRefs,
  hasLychee,
  lycheeArgs,
  readCheckUrlsConfig,
  runLycheeSync,
  spawnLycheeBackground,
  urlReportPath,
} from "./command/url-check.js";
import { extractDocRefs, writeDocRefsIndex } from "./extract.js";
import { detectI18nDrift, summarizeDrift } from "./i18n-drift.js";
import { lintI18nStyle, summarizeStyleIssues } from "./lint-i18n.js";
import { renderJson, renderMarkdown } from "./reporter.js";
import { resolveRefs } from "./resolve.js";
import { proposeSyncPatches } from "./sync-propose.js";

/**
 * Register the `oma docs` command group with two subcommands:
 *
 * - `oma docs verify [path]`  — extract L2 refs from docs and report broken targets
 * - `oma docs sync [diff-range]` — find drift-affected docs after a git change and
 *   propose LLM-generated patches (never auto-applied)
 *
 * Design reference: docs/plans/designs/008-oma-docs.md § SKILL.md Interface § Mode contracts
 */
export function registerDocsCommands(program: Command): void {
  const docs = program
    .command("docs")
    .description(
      "Documentation drift detection: verify references and propose updates for diff-affected docs",
    );

  docs
    .command("verify [path]")
    .description(
      "Extract L2 references from docs and report broken targets. " +
        "Regenerates docs/generated/doc-refs.json as a side effect. " +
        "Exit code: 0 = clean, 1 = broken refs found. " +
        "URL link checking is delegated to `lychee` (install: brew install lychee).",
    )
    .option(
      "--json",
      "Output results as JSON instead of a human-readable markdown report",
    )
    .option(
      "--report-file <path>",
      "Write the full markdown report to this file path (stdout receives a summary)",
    )
    .option(
      "--no-urls",
      "Skip URL link checking even if docs.check_urls=true in oma-config.yaml",
    )
    .option(
      "--urls-sync",
      "Wait for lychee to finish before exiting (default is background spawn). Use in CI when complete URL data is required.",
    )
    .action(
      runAction(async (pathArg: string | undefined, _options, command) => {
        const opts = command.opts() as {
          json?: boolean;
          reportFile?: string;
          urls?: boolean; // commander auto-negation: --no-urls => urls: false
          urlsSync?: boolean;
        };
        const repoRoot = process.cwd();

        // Resolve URL-checking policy:
        // - --no-urls always wins (user override)
        // - else: oma-config.yaml docs.check_urls (default true)
        const cfgEnabled = readCheckUrlsConfig(repoRoot);
        const urlsEnabled = opts.urls === false ? false : cfgEnabled;
        const urlsSync = !!opts.urlsSync;

        // Extract doc refs
        const index = await extractDocRefs(repoRoot, pathArg);

        // Write doc-refs.json (URL refs are recorded for downstream tools
        // even when we delegate the actual checking to lychee).
        writeDocRefsIndex(index, repoRoot);

        // Foreground: core kinds only — file/cli/script/env/config.
        // URL kind is always handled separately (delegated to lychee or skipped).
        const report = await resolveRefs(index, repoRoot, {
          kinds: ["file", "cli", "script", "env", "config"],
        });

        // Render core results to stdout (or JSON / file)
        if (opts.json) {
          console.log(renderJson(report));
        } else {
          const markdown = renderMarkdown(report);
          console.log(markdown);

          if (opts.reportFile) {
            const reportPath = path.resolve(repoRoot, opts.reportFile);
            const reportDir = path.dirname(reportPath);
            fs.mkdirSync(reportDir, { recursive: true });
            fs.writeFileSync(reportPath, markdown, "utf-8");
          }
        }

        // Exit code reflects core-pass broken refs only.
        // URL link rot is a different class of issue (delegated to lychee)
        // and doesn't affect this exit code.
        if (report.broken.length > 0) {
          process.exitCode = 1;
        }

        // URL handling — delegated to lychee.
        if (urlsEnabled && countUrlRefs(index) > 0) {
          if (!hasLychee()) {
            if (!opts.json) {
              console.warn(
                "\n[oma-docs] URL link checking is enabled (docs.check_urls=true) but `lychee` is not on PATH.",
              );
              console.warn("[oma-docs] Install lychee to enable URL checks:");
              console.warn("[oma-docs]   macOS:  brew install lychee");
              console.warn(
                "[oma-docs]   other:  https://github.com/lycheeverse/lychee#installation",
              );
              console.warn(
                "[oma-docs] Or set docs.check_urls=false in oma-config.yaml to silence this warning.",
              );
            }
          } else {
            const out = urlReportPath(repoRoot);
            ensureGitignored(repoRoot, ["docs/generated/"], {
              header: "# oma docs generated artifacts",
            });
            if (urlsSync) {
              runLycheeSync(repoRoot, pathArg, out);
              if (!opts.json) {
                console.log(
                  `\nURL link check (lychee) complete; report at ${path.relative(repoRoot, out)}.`,
                );
              }
            } else {
              spawnLycheeBackground(repoRoot, pathArg, out);
              if (!opts.json) {
                console.log(
                  `\nURL link check (lychee) running in the background; report will be written to ${path.relative(repoRoot, out)}.`,
                );
              }
            }
          }
        }
      }),
    );

  docs
    .command("sync [diff-range]")
    .description(
      "Given a git diff, list docs that reference changed files. The host " +
        "LLM (skill runtime) is expected to read this list plus the diff and " +
        "propose patches per the SKILL.md contract — the CLI never auto-edits docs. " +
        "Default diff-range: --cached (staged changes), fallback to HEAD~1..HEAD.",
    )
    .option(
      "--json",
      "Output candidate docs as JSON instead of human-readable markdown",
    )
    .action(
      runAction(async (diffRangeArg: string | undefined, _options, command) => {
        const opts = command.opts() as { json?: boolean };
        const repoRoot = process.cwd();

        // T12-1: Load or rebuild DocRefsIndex
        const indexPath = path.join(
          repoRoot,
          "docs",
          "generated",
          "doc-refs.json",
        );
        let index = await extractDocRefs(repoRoot);

        // Use cached index if it exists and is recent (within 5 minutes)
        if (fs.existsSync(indexPath)) {
          try {
            const stat = fs.statSync(indexPath);
            const ageMs = Date.now() - stat.mtimeMs;
            if (ageMs < 5 * 60 * 1000) {
              const raw = fs.readFileSync(indexPath, "utf-8");
              index = JSON.parse(raw);
            } else {
              // Stale — regenerate
              writeDocRefsIndex(index, repoRoot);
            }
          } catch {
            // Fallback: use freshly extracted index
            writeDocRefsIndex(index, repoRoot);
          }
        } else {
          writeDocRefsIndex(index, repoRoot);
        }

        // Find candidate docs that reference the changed files.
        const proposals = await proposeSyncPatches({
          repoRoot,
          diffRange: diffRangeArg,
          index,
        });

        if (opts.json) {
          console.log(JSON.stringify({ proposals }, null, 2));
          return;
        }

        if (proposals.length === 0) {
          console.log("No docs reference the changed files.");
          return;
        }

        // Print the candidate set as structured markdown. The host LLM
        // (skill runtime that invoked this command) reads this output plus
        // the relevant git diff and proposes patches per doc — no LLM
        // call from the CLI itself.
        const docWord = proposals.length === 1 ? "doc" : "docs";
        console.log(
          `\n${proposals.length} ${docWord} reference the changed files.`,
        );
        console.log(
          "Inspect each doc, compare against the diff, and edit as needed.\n",
        );

        for (let i = 0; i < proposals.length; i++) {
          const p = proposals[i];
          if (!p) continue;
          console.log(`${i + 1}. ${p.doc}`);
          console.log(`   changed files: ${p.changedFiles.join(", ")}`);
          for (const ref of p.matchedRefs) {
            console.log(`   - L${ref.line} [${ref.kind}] \`${ref.target}\``);
          }
          console.log();
        }
      }),
    );

  docs
    .command("i18n")
    .description(
      "Detect drift between English source docs (web/docs) and i18n " +
        "translations (web/i18n/{lang}/...). Emits structural signals " +
        "(line count, heading count, last-commit timestamp) per pair so " +
        "the host LLM can decide which translations need a diff-sync patch. " +
        "The CLI never edits translations.",
    )
    .option(
      "--json",
      "Output drift pairs as JSON instead of human-readable markdown",
    )
    .option(
      "--min-severity <level>",
      "Filter: only emit pairs at-or-above this severity (CRITICAL, HIGH, MEDIUM, LOW)",
      "MEDIUM",
    )
    .action(
      runAction(async (_options, command) => {
        const opts = command.opts() as {
          json?: boolean;
          minSeverity?: string;
        };
        const repoRoot = process.cwd();
        const minSeverity = (opts.minSeverity ?? "MEDIUM").toUpperCase() as
          | "CRITICAL"
          | "HIGH"
          | "MEDIUM"
          | "LOW";

        const pairs = detectI18nDrift({ repoRoot, minSeverity });

        if (opts.json) {
          console.log(JSON.stringify({ pairs }, null, 2));
          return;
        }

        if (pairs.length === 0) {
          console.log(
            `No i18n drift at severity ≥ ${minSeverity}. All translations in sync.`,
          );
          return;
        }

        const summary = summarizeDrift(pairs);
        console.log(
          `\n${summary.total} translation pair(s) drifting at severity ≥ ${minSeverity}.\n`,
        );
        console.log(
          `By severity: CRITICAL=${summary.bySeverity.CRITICAL} HIGH=${summary.bySeverity.HIGH} MEDIUM=${summary.bySeverity.MEDIUM} LOW=${summary.bySeverity.LOW}\n`,
        );
        console.log("Top 10 drifting pairs:");
        for (let i = 0; i < summary.topPairs.length; i++) {
          const p = summary.topPairs[i];
          if (!p) continue;
          const en = p.tgtLines === -1 ? "MISSING" : `${p.tgtLines}L`;
          console.log(
            `  ${i + 1}. [${p.severity}] ${p.lang}  ` +
              `EN=${p.enLines}L TGT=${en} drift=${p.linesDiffPct}% ` +
              `headings±${p.headingCountDiff}` +
              `${p.enNewerThanTgt ? " EN-newer" : ""}`,
          );
          console.log(`      ${p.target}`);
        }
        console.log();
        console.log(
          "Pass each pair to `oma-translator` in diff-sync mode (see SKILL.md § Diff-Sync Mode).",
        );
      }),
    );

  docs
    .command("lint")
    .description(
      "Lint translated docs for content-level anti-patterns (em-dashes in " +
        "CJK targets, etc.). Complements `oma docs i18n` (structural drift) " +
        "with style/anti-pattern checks per oma-translator SKILL.md § Stage 4. " +
        "The CLI never auto-fixes — it only reports issues for the host LLM " +
        "to restructure.",
    )
    .option(
      "--json",
      "Output issues as JSON instead of human-readable markdown",
    )
    .option(
      "--locales <list>",
      "Comma-separated CJK locales to lint (default: ko,ja,zh)",
    )
    .action(
      runAction(async (_options, command) => {
        const opts = command.opts() as {
          json?: boolean;
          locales?: string;
        };
        const repoRoot = process.cwd();
        const cjkLocales = opts.locales
          ? opts.locales
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;

        const issues = lintI18nStyle({ repoRoot, cjkLocales });

        if (opts.json) {
          console.log(JSON.stringify({ issues }, null, 2));
          return;
        }

        if (issues.length === 0) {
          console.log("No i18n style issues found.");
          return;
        }

        const summary = summarizeStyleIssues(issues);
        console.log(`\n${summary.total} style issue(s) found.\n`);
        console.log(
          `By rule: ${Object.entries(summary.byRule)
            .map(([r, n]) => `${r}=${n}`)
            .join(" ")}`,
        );
        console.log(
          `By lang: ${Object.entries(summary.byLang)
            .map(([l, n]) => `${l}=${n}`)
            .join(" ")}\n`,
        );
        console.log("Top files:");
        for (const f of summary.byFile.slice(0, 10)) {
          console.log(
            `  ${f.count.toString().padStart(4)}  [${f.lang}] ${f.file}`,
          );
        }
        console.log();
        console.log(
          "Pass each issue to `oma-translator` for restructuring (see SKILL.md § Stage 4-A em-dash rule).",
        );
      }),
    );
}

// ---------------------------------------------------------------------------
// @internal — exposed for testing only (prefixed with _ per project convention)
// ---------------------------------------------------------------------------

/** @internal — exposed for testing */
export const _readCheckUrlsConfig = readCheckUrlsConfig;

/** @internal — exposed for testing */
export const _countUrlRefs = countUrlRefs;

/** @internal — exposed for testing */
export const _lycheeArgs = lycheeArgs;

/** @internal — exposed for testing */
export const _hasLychee = hasLychee;
