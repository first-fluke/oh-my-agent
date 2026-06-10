// v0.9.0 sidecar linter — port of resources/scripts/lint.py.
// See .agents/skills/oma-scholar/resources/sidecar-spec.md for rule sources.

import * as fs from "node:fs";
import * as path from "node:path";
import * as YAML from "yaml";
import {
  checkAntiFabrication,
  checkArtifacts,
  checkCoverage,
  checkEvidence,
  checkNoQuotedNumbers,
  checkProvenance,
  checkRelations,
  checkStatements,
  checkTopLevel,
  collectAllIds,
  isRecord,
} from "./lint/checks.js";
import { type LintOptions, type LintReport, Reporter } from "./lint/report.js";

export type {
  Finding,
  LintOptions,
  LintReport,
  Severity,
} from "./lint/report.js";

export function lintDoc(doc: unknown, opts: LintOptions = {}): LintReport {
  const r = new Reporter();
  if (!isRecord(doc)) {
    r.error("<root>", "top level must be a mapping");
    return makeReport(r);
  }
  checkTopLevel(doc, r);
  checkAntiFabrication(doc, r);
  checkNoQuotedNumbers(doc, "", r);
  if ("coverage" in doc) checkCoverage(doc.coverage, r);
  if ("provenance" in doc) checkProvenance(doc.provenance, "provenance", r);
  if ("subject_ref" in doc) {
    const sref = doc.subject_ref;
    if (typeof sref !== "string" || !sref.startsWith("art:")) {
      r.warn(
        "subject_ref",
        `expected an artifact id starting with 'art:', got '${String(sref)}'`,
      );
    }
  }
  const refIds = collectAllIds(doc);
  const seenIds = new Set<string>();
  const stmtIds = checkStatements(doc.statements, seenIds, r);
  checkEvidence(doc.evidence, seenIds, r);
  checkArtifacts(doc.artifacts, seenIds, r);
  const counts = checkRelations(
    doc.relations,
    seenIds,
    refIds,
    stmtIds,
    r,
    Boolean(opts.lenient),
  );
  if (stmtIds.size > 0) {
    let total = 0;
    for (const c of counts.values()) total += c;
    const avg = total / stmtIds.size;
    if (avg < 1.5) {
      r.warn(
        "relations",
        `avg relations/statement is ${avg.toFixed(2)} (target ≥ 1.5)`,
        "add `supported_by`/`depends_on` relations from statements to evidence",
      );
    }
    for (const [sid, c] of counts) {
      if (c === 0) {
        r.warn(
          `relations(for ${sid})`,
          "statement has no incoming/outgoing relations",
          `add \`supported_by\` or \`depends_on\` for \`${sid}\``,
        );
      }
    }
  }
  if (Array.isArray(doc.statements) && doc.statements.length < 8) {
    r.warn(
      "statements",
      `only ${doc.statements.length} statements — most papers warrant ≥ 8`,
      "re-read source for missed claims, especially in limitations/discussion",
    );
  }
  return makeReport(r);
}

function makeReport(r: Reporter): LintReport {
  let errors = 0;
  let warnings = 0;
  for (const f of r.findings) {
    if (f.severity === "error") errors++;
    else warnings++;
  }
  return { errors, warnings, findings: r.findings };
}

export function parseSidecar(file: string): unknown {
  const raw = fs.readFileSync(file, "utf8");
  const ext = path.extname(file).toLowerCase();
  if (ext === ".json") return JSON.parse(raw);
  return YAML.parse(raw);
}

export function formatReport(report: LintReport, file: string): string {
  const lines = [`Lint report for ${file}:`];
  if (report.findings.length === 0) {
    lines.push("  No issues found.");
  } else {
    for (const f of report.findings) {
      const tag = f.severity === "error" ? "ERROR" : "WARN";
      lines.push(`  [${tag}] ${f.path}: ${f.message}`);
      if (f.fix) lines.push(`           fix -> ${f.fix}`);
    }
  }
  lines.push("");
  lines.push(
    `Summary: ${report.errors} error(s), ${report.warnings} warning(s)`,
  );
  return lines.join("\n");
}

export function lintFile(file: string, opts: LintOptions = {}): LintReport {
  const doc = parseSidecar(file);
  return lintDoc(doc, opts);
}
