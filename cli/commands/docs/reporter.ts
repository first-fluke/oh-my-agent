/**
 * T7 — reporter.ts
 *
 * Renders a DriftReport as either JSON or Markdown. Deterministic only —
 * the CLI emits raw, structured output. Any natural-language synthesis
 * (friendly summary, fix prioritization, severity tagging) is the host
 * LLM's responsibility per the SKILL.md instructions. The skill calls
 * `oma docs verify` for data, and the host agent runtime processes it.
 *
 * This mirrors the oma-scholar pattern: never shell out to an external
 * LLM SDK; the agent runtime that invokes this skill does the synthesis.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Output formats
 */

import type { BrokenRef, DriftReport } from "./resolve.js";

// ---------------------------------------------------------------------------
// JSON renderer
// ---------------------------------------------------------------------------

/**
 * Render a DriftReport as deterministic JSON.
 * Only the broken refs are included (skipped are omitted for --json output
 * per the design spec example).
 */
export function renderJson(report: DriftReport): string {
  const payload = {
    scannedDocs: report.scannedDocs,
    totalRefs: report.totalRefs,
    broken: report.broken,
  };
  return JSON.stringify(payload, null, 2);
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

/**
 * Group broken refs by doc path.
 */
function groupByDoc(broken: BrokenRef[]): Map<string, BrokenRef[]> {
  const map = new Map<string, BrokenRef[]>();
  for (const ref of broken) {
    const existing = map.get(ref.doc) ?? [];
    existing.push(ref);
    map.set(ref.doc, existing);
  }
  return map;
}

function renderDeterministicMarkdown(report: DriftReport): string {
  const lines: string[] = [];
  lines.push("# Doc verification report");
  lines.push("");

  if (report.broken.length === 0) {
    lines.push("All references verified. No broken refs found.");
  } else {
    const docCount = new Set(report.broken.map((r) => r.doc)).size;
    lines.push(
      `✗ ${report.broken.length} broken ${report.broken.length === 1 ? "ref" : "refs"} across ${docCount} ${docCount === 1 ? "doc" : "docs"}.`,
    );
  }

  lines.push("");

  if (report.broken.length > 0) {
    const grouped = groupByDoc(report.broken);

    // Sort docs alphabetically for determinism
    const sortedDocs = [...grouped.keys()].sort();

    for (const doc of sortedDocs) {
      lines.push(`## ${doc}`);
      const refs = grouped.get(doc) ?? [];
      // Sort by line for determinism
      refs.sort((a, b) => a.line - b.line);
      for (const ref of refs) {
        const kindPad = ref.kind.padEnd(6);
        lines.push(
          `- L${ref.line} [${kindPad}] \`${ref.target}\` — ${humanReason(ref.reason)}`,
        );
      }
      lines.push("");
    }
  }

  const docsWord = report.scannedDocs === 1 ? "doc" : "docs";
  const refsWord = report.totalRefs === 1 ? "ref" : "refs";
  const brokenDocs = new Set(report.broken.map((r) => r.doc)).size;
  const skippedCount = report.skipped.length;

  let summary = `(${report.scannedDocs} ${docsWord} scanned, ${brokenDocs} with drift, ${report.totalRefs} ${refsWord} verified`;
  if (skippedCount > 0) {
    summary += `, ${skippedCount} skipped`;
  }
  summary += ")";
  lines.push(summary);

  return lines.join("\n");
}

function humanReason(reason: string): string {
  const MAP: Record<string, string> = {
    file_missing: "file does not exist",
    url_404: "URL returns 404",
    url_410: "URL returns 410 (gone)",
    "cli-unavailable": "binary not on PATH",
    script_not_in_package_json: "script not found in package.json",
    package_json_not_found: "no package.json found",
    package_json_parse_error: "could not parse package.json",
    config_key_not_found: "key not found in oma-config.yaml schema",
    "env-not-found-locally": "env var not found in codebase or .env.example",
  };

  // Handle reason strings that start with a known key
  for (const [key, human] of Object.entries(MAP)) {
    if (reason === key || reason.startsWith(`${key} (`)) {
      const extra = reason.startsWith(`${key} (`)
        ? ` ${reason.slice(key.length).trim()}`
        : "";
      return human + extra;
    }
  }

  return reason;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a DriftReport as a human-readable markdown report.
 *
 * This output is deterministic. The host LLM (the agent runtime that
 * invoked the skill) is responsible for any natural-language synthesis,
 * severity tagging, or fix-priority suggestions on top of this output —
 * see `.agents/skills/oma-docs/SKILL.md` for the host-LLM contract.
 */
export function renderMarkdown(report: DriftReport): string {
  return renderDeterministicMarkdown(report);
}
