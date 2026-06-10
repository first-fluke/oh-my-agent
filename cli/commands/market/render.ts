/**
 * `oma market render` — Produce a market research brief from ClusterOutput.
 *
 * Architecture: runRender (CLI) → render (business logic) → LAW self-check → write file
 *
 * LAW execution order (output-laws.md):
 *   1. LAW 8  badge        — prepend if missing (auto-fix)
 *   2. LAW 2  body opener  — verify "What we learned:" (violation if absent)
 *   3. LAW 4  forbidden ## — flag unfixable headers (violation)
 *   4. LAW 6  evidence dump — flag raw cluster pattern (violation)
 *   5. LAW 7  citations    — rewrite bare URLs, unwrap empty links (auto-fix)
 *   6. LAW 3  em-dash      — replace outside code blocks (auto-fix)
 *   7. LAW 1  Sources block — strip trailing sources list (auto-fix)
 *   8. LAW 5  footer       — verify ENGINE FOOTER present (auto-fix if missing)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { AGENTS_RESULTS_DIR } from "../../constants/paths.js";
import {
  buildClusterBank,
  buildComparisonBody,
  buildFooter,
  buildPainTrendBody,
} from "./render/body.js";
import { hasFlag, packArgv, parseFlag } from "./render/cli-flags.js";
import {
  extractVsEntities,
  getPackageVersion,
  isComparisonIntent,
  slugify,
  utcDate,
  utcDateCompact,
} from "./render/helpers.js";
import { runSelfCheck } from "./render/self-check.js";
import type { RenderOptions, RenderResult } from "./render/types.js";
import {
  renderFrameworkSkeleton,
  resolveFrameworks,
} from "./shared/frameworks.js";
import type { Cluster } from "./shared/schema.js";
import { ClusterOutputSchema } from "./shared/schema.js";

export type { RenderOptions, RenderResult } from "./render/types.js";
export { packArgv };

const DEFAULT_OUTPUT_DIR = `${AGENTS_RESULTS_DIR}/market/`;

// ---------------------------------------------------------------------------
// Core render function
// ---------------------------------------------------------------------------

export async function render(
  clusters: Cluster[],
  opts: RenderOptions,
  repoRoot: string,
): Promise<RenderResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const version = opts.version ?? getPackageVersion();
  const selfCheck = opts.selfCheck !== false;
  const isComparison = isComparisonIntent(opts);
  const [entityA, entityB] = isComparison
    ? extractVsEntities(opts.topic, opts.vs)
    : [opts.topic, ""];

  // Build badge
  const badge = `🔎 oma-market v${version} · synced ${utcDate(nowMs)}`;

  // Build body
  let bodyContent: string;
  if (isComparison) {
    bodyContent = buildComparisonBody(clusters, entityA, entityB);
  } else {
    bodyContent = buildPainTrendBody(clusters, opts.intent);
  }

  // Cluster Bank: raw evidence dump for the analyst (host LLM) to consume
  // when filling SWOT / 5F / PESTEL slots. Sorted by (cross_source_count DESC,
  // member count DESC, top representative rrf_score DESC).
  const clusterBank = buildClusterBank(clusters);

  // Resolve framework sections (skeletons only — no auto-classification)
  const frameworkOverride = opts.frameworks ?? "auto";
  const specs = resolveFrameworks(opts.intent, frameworkOverride);
  const frameworkSections = specs.map((spec) => renderFrameworkSkeleton(spec));

  // Append cluster bank + framework skeletons at the right position
  const analystBlock = [clusterBank, ...frameworkSections].join("\n");
  if (isComparison) {
    const marker = "## The Bottom Line";
    const markerIdx = bodyContent.lastIndexOf(marker);
    if (markerIdx !== -1) {
      const afterMarker = bodyContent.indexOf(
        "\n\n",
        markerIdx + marker.length,
      );
      const insertAt =
        afterMarker !== -1 ? afterMarker + 2 : bodyContent.length;
      bodyContent = `${bodyContent.slice(0, insertAt)}${analystBlock}\n${bodyContent.slice(insertAt)}`;
    } else {
      bodyContent += `\n${analystBlock}`;
    }
  } else {
    bodyContent += `\n${analystBlock}`;
  }

  // Build footer
  const footer = buildFooter(clusters, opts);

  // Assemble full document
  let fullDoc = `${badge}\n\n${bodyContent}\n${footer}`;

  // LAW self-check
  let violations: string[] = [];
  let selfCheckPassed = true;

  if (selfCheck) {
    const result = runSelfCheck(fullDoc, isComparison, entityA, entityB, badge);
    fullDoc = result.body;
    violations = result.violations;
    selfCheckPassed = violations.length === 0;

    if (!selfCheckPassed) {
      // Append LAW VIOLATIONS comment before closing footer
      const footerMarker = "<!-- ENGINE FOOTER -->";
      const footerIdx = fullDoc.lastIndexOf(footerMarker);
      const violationComment = `<!-- LAW VIOLATIONS: ${violations.join(" | ")} -->`;
      if (footerIdx !== -1) {
        fullDoc =
          fullDoc.slice(0, footerIdx) +
          violationComment +
          "\n" +
          fullDoc.slice(footerIdx);
      } else {
        fullDoc += `\n${violationComment}`;
      }
    }
  }

  // Write output file (markdown). JSON format is emitted by the CLI runner
  // from the returned `markdown`/`clusters` payload, so skip the file here.
  const slug = slugify(opts.topic);
  const dateCompact = utcDateCompact(nowMs);
  const filename = `${slug}-${dateCompact}.md`;

  const outputDir = resolve(repoRoot, opts.outputDir ?? DEFAULT_OUTPUT_DIR);
  let outputPath = "";
  if (opts.format !== "json") {
    mkdirSync(outputDir, { recursive: true });
    outputPath = join(outputDir, filename);
    writeFileSync(outputPath, fullDoc, "utf8");
  }

  return {
    markdown: fullDoc,
    outputPath,
    selfCheckPassed,
    violations,
  };
}

// ---------------------------------------------------------------------------
// CLI runner
// ---------------------------------------------------------------------------

export async function runRender(argv: string[]): Promise<number> {
  try {
    // Read stdin
    const chunks: Uint8Array[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Uint8Array);
    }
    const rawInput = Buffer.concat(chunks).toString("utf8");

    let stdinJson: Record<string, unknown>;
    try {
      stdinJson = JSON.parse(rawInput) as Record<string, unknown>;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(
        `[oma market render] invalid JSON on stdin: ${msg}\n`,
      );
      return 4;
    }

    // Validate with ClusterOutput schema (loosely - allow extra metadata fields)
    let parsed: ReturnType<typeof ClusterOutputSchema.parse>;
    try {
      parsed = ClusterOutputSchema.parse(stdinJson);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(
        `[oma market render] schema validation error: ${msg}\n`,
      );
      return 4;
    }

    // Flags override stdin values
    const topicFlag = parseFlag(argv, "--topic");
    const intentFlag = parseFlag(argv, "--intent");
    const formatFlag = parseFlag(argv, "--format") as "md" | "json" | undefined;
    const frameworksFlag = parseFlag(argv, "--frameworks");
    const vsFlag = parseFlag(argv, "--vs");
    const minTrustFlag = parseFlag(argv, "--min-trust") as
      | "verified"
      | "community"
      | "external"
      | undefined;
    const selfCheck = !hasFlag(argv, "--no-self-check");
    const outputDir = parseFlag(argv, "--output-dir");
    const nowMsStr = parseFlag(argv, "--now-ms");
    const versionOverride = parseFlag(argv, "--version-override");

    const topic = topicFlag ?? parsed.topic;
    const rawIntent = intentFlag ?? parsed.intent;

    const validIntents = ["pain", "trend", "competitor", "discovery"] as const;
    type IntentType = (typeof validIntents)[number];
    if (!validIntents.includes(rawIntent as IntentType)) {
      process.stderr.write(
        `[oma market render] invalid intent: '${rawIntent}'. Use pain|trend|competitor|discovery.\n`,
      );
      return 4;
    }
    const intent = rawIntent as IntentType;

    if (!topic) {
      process.stderr.write(
        "[oma market render] --topic required (or provide topic in stdin JSON)\n",
      );
      return 4;
    }

    const opts: RenderOptions = {
      topic,
      intent,
      format: formatFlag,
      frameworks: frameworksFlag,
      vs: vsFlag ?? null,
      minTrust: minTrustFlag,
      selfCheck,
      outputDir,
      nowMs: nowMsStr != null ? parseInt(nowMsStr, 10) : undefined,
      version: versionOverride,
      sourcesUsed: parsed.sources_used,
      sourcesFailed: parsed.sources_failed,
      cacheHit: false,
      latencyMs: 0,
    };

    // Walk up looking for the skill marker. Robust across source-tree runs
    // and the bundled cli/bin/cli.js binary.
    const { findRepoRoot } = await import("./shared/repo-root.js");
    const repoRoot = findRepoRoot();

    const result = await render(parsed.clusters, opts, repoRoot);

    if (opts.format === "json") {
      // Emit structured JSON to stdout; do not write the markdown brief.
      const payload = {
        topic: opts.topic,
        intent: opts.intent,
        vs: opts.vs ?? null,
        version: opts.version,
        clusters: parsed.clusters,
        markdown: result.markdown,
        violations: result.violations,
        self_check_passed: result.selfCheckPassed,
      };
      process.stdout.write(`${JSON.stringify(payload)}\n`);
    } else {
      // Stdout: first 50 lines preview of markdown brief
      const previewLines = result.markdown.split("\n").slice(0, 50).join("\n");
      process.stdout.write(`${previewLines}\n`);
      process.stderr.write(
        `[oma market render] written: ${result.outputPath}\n`,
      );
    }

    if (result.violations.length > 0) {
      process.stderr.write(
        `[oma market render] LAW violations:\n${result.violations.map((v) => `  - ${v}`).join("\n")}\n`,
      );
    }

    return result.selfCheckPassed ? 0 : 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[oma market render] error: ${msg}\n`);
    return 4;
  }
}
