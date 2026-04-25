// v0.9.0 sidecar linter — port of resources/scripts/lint.py.
// See .agents/skills/oma-scholar/resources/sidecar-spec.md for rule sources.

import * as fs from "node:fs";
import * as path from "node:path";
import * as YAML from "yaml";

const ACTOR_TYPES = new Set(["tool", "person", "org"]);
const ORIGIN_VALUES = new Set(["machine", "author"]);
const CONFIDENCE_GRADES = new Set(["high", "medium", "low"]);
const ARTIFACT_ROLES = new Set(["subject", "supporting", "cited"]);
const COVERAGE_STATEMENTS = new Set([
  "exhaustive",
  "main_claims_only",
  "key_claims_and_limitations",
  "partial",
]);
const COVERAGE_EVIDENCE = new Set([
  "exhaustive",
  "key_evidence_only",
  "partial",
]);
const FORBIDDEN_ACTOR_TYPES = new Set(["ai", "llm", "model", "agent"]);
const PAST_TENSE_PREDICATES: Record<string, string> = {
  evaluated_on: "evaluates_on",
  implemented: "implements",
  depended_on: "depends_on",
  used: "uses",
};
const PLACEHOLDER_VALUES = new Set([
  "TODO",
  "TBD",
  "N/A",
  "FIXME",
  "XXX",
  "?",
  "UNKNOWN",
]);
const REQUIRED_TOP_LEVEL = ["title", "statements", "relations", "provenance"];
const RECOMMENDED_TOP_LEVEL = [
  "knows_version",
  "record_id",
  "profile",
  "subject_ref",
  "authors",
  "coverage",
  "artifacts",
  "evidence",
  "version",
  "freshness",
];
const NUMERIC_KEYS = new Set([
  "value",
  "score",
  "accuracy",
  "n",
  "count",
  "rate",
  "year",
]);

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  path: string;
  message: string;
  fix?: string;
}

export interface LintReport {
  errors: number;
  warnings: number;
  findings: Finding[];
}

export interface LintOptions {
  lenient?: boolean;
  failOnWarning?: boolean;
}

class Reporter {
  findings: Finding[] = [];
  error(p: string, message: string, fix?: string): void {
    this.findings.push({ severity: "error", path: p, message, fix });
  }
  warn(p: string, message: string, fix?: string): void {
    this.findings.push({ severity: "warning", path: p, message, fix });
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isKebabWithPrefix(value: string, prefix: string): boolean {
  if (!value.startsWith(prefix)) return false;
  const body = value.slice(prefix.length);
  if (!body) return false;
  if (/^[\d-]+$/.test(body)) return false; // ev:001
  if (body.length <= 3 && /^[a-z]\d+$/.test(body)) return false; // c1
  return /^[a-z0-9-]+$/.test(body);
}

function checkNoQuotedNumbers(node: unknown, p: string, r: Reporter): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      checkNoQuotedNumbers(item, `${p}[${i}]`, r);
    });
  } else if (isRecord(node)) {
    for (const [k, v] of Object.entries(node)) {
      const sub = p ? `${p}.${k}` : k;
      if (NUMERIC_KEYS.has(k) && typeof v === "string") {
        const stripped = v.trim().replace(/^-/, "");
        if (/^\d+(\.\d+)?$/.test(stripped)) {
          r.error(
            sub,
            `numeric value '${v}' is quoted as string`,
            `remove quotes -> ${sub}: ${v}`,
          );
        }
      }
      checkNoQuotedNumbers(v, sub, r);
    }
  }
}

function checkActor(actor: unknown, p: string, r: Reporter): void {
  if (!isRecord(actor)) {
    r.error(p, "actor must be a mapping with `type` and `name`");
    return;
  }
  const type = actor.type;
  if (typeof type === "string" && FORBIDDEN_ACTOR_TYPES.has(type)) {
    r.error(
      `${p}.type`,
      `'${type}' is not allowed`,
      "use `tool`, `person`, or `org`",
    );
  } else if (type === undefined) {
    r.error(`${p}.type`, "actor.type is required");
  } else if (typeof type !== "string" || !ACTOR_TYPES.has(type)) {
    r.error(
      `${p}.type`,
      `invalid value '${String(type)}'`,
      `use one of: ${[...ACTOR_TYPES].sort().join(", ")}`,
    );
  }
}

function checkProvenance(prov: unknown, p: string, r: Reporter): void {
  if (!isRecord(prov)) {
    r.error(p, "must be a mapping");
    return;
  }
  const origin = prov.origin;
  if (typeof origin === "string" && !ORIGIN_VALUES.has(origin)) {
    r.error(
      `${p}.origin`,
      `invalid value '${origin}'`,
      "use `machine` (AI-generated) or `author` (human-curated)",
    );
  }
  if ("actors" in prov && !("actor" in prov)) {
    r.error(
      `${p}.actors`,
      "v0.9 spec uses singular `actor` (object), not `actors` (list)",
      "rename `actors` -> `actor` and use a single object",
    );
  }
  if ("actor" in prov) checkActor(prov.actor, `${p}.actor`, r);
}

function checkConfidence(conf: unknown, p: string, r: Reporter): void {
  if (conf === undefined || conf === null) return;
  if (typeof conf === "string") {
    if (!CONFIDENCE_GRADES.has(conf)) {
      r.error(
        p,
        `invalid confidence '${conf}'`,
        `use one of: ${[...CONFIDENCE_GRADES].sort().join(", ")}`,
      );
    }
    return;
  }
  if (isRecord(conf)) {
    for (const sub of ["claim_strength", "extraction_fidelity"]) {
      const v = conf[sub];
      if (
        v !== undefined &&
        (typeof v !== "string" || !CONFIDENCE_GRADES.has(v))
      ) {
        r.error(
          `${p}.${sub}`,
          `invalid value '${String(v)}'`,
          `use one of: ${[...CONFIDENCE_GRADES].sort().join(", ")}`,
        );
      }
    }
    return;
  }
  r.error(p, "confidence must be a string or an object");
}

function checkId(value: unknown, prefix: string, p: string, r: Reporter): void {
  if (typeof value !== "string") {
    r.error(`${p}.id`, "id must be a string");
    return;
  }
  if (!value.startsWith(prefix)) {
    r.error(`${p}.id`, `id '${value}' missing required prefix '${prefix}'`);
    return;
  }
  if (!isKebabWithPrefix(value, prefix)) {
    r.warn(
      `${p}.id`,
      `id '${value}' is not descriptive kebab-case`,
      `use a name like \`${prefix}supports-main-claim\``,
    );
  }
}

function collectAllIds(doc: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  for (const sec of ["statements", "evidence", "artifacts", "relations"]) {
    const items = doc[sec];
    if (Array.isArray(items)) {
      for (const item of items) {
        if (isRecord(item) && typeof item.id === "string") ids.add(item.id);
      }
    }
  }
  return ids;
}

function checkStatements(
  stmts: unknown,
  seenIds: Set<string>,
  r: Reporter,
): Set<string> {
  const stmtIds = new Set<string>();
  if (!Array.isArray(stmts)) {
    r.error("statements", "must be a list");
    return stmtIds;
  }
  stmts.forEach((s, i) => {
    const p = `statements[${i}]`;
    if (!isRecord(s)) {
      r.error(p, "must be a mapping");
      return;
    }
    const sid = s.id;
    if (typeof sid === "string") {
      checkId(sid, "stmt:", p, r);
      if (seenIds.has(sid)) r.error(`${p}.id`, `duplicate id '${sid}'`);
      seenIds.add(sid);
      stmtIds.add(sid);
    } else {
      r.error(`${p}.id`, "required field missing");
    }
    for (const legacy of ["type", "claim"]) {
      if (legacy in s && !("statement_type" in s)) {
        r.error(
          `${p}.${legacy}`,
          `use \`statement_type\` instead of \`${legacy}\``,
          `rename key \`${legacy}\` -> \`statement_type\``,
        );
      }
    }
    if (!("statement_type" in s)) {
      r.warn(
        `${p}.statement_type`,
        "missing — common values: claim, method, limitation, assumption, definition, question",
      );
    }
    checkConfidence(s.confidence, `${p}.confidence`, r);
    if ("provenance" in s) checkProvenance(s.provenance, `${p}.provenance`, r);
  });
  return stmtIds;
}

function checkEvidence(evs: unknown, seenIds: Set<string>, r: Reporter): void {
  if (evs === undefined) return;
  if (!Array.isArray(evs)) {
    r.error("evidence", "must be a list");
    return;
  }
  evs.forEach((e, i) => {
    const p = `evidence[${i}]`;
    if (!isRecord(e)) {
      r.error(p, "must be a mapping");
      return;
    }
    const eid = e.id;
    if (typeof eid === "string") {
      checkId(eid, "ev:", p, r);
      if (seenIds.has(eid)) r.error(`${p}.id`, `duplicate id '${eid}'`);
      seenIds.add(eid);
    } else {
      r.error(`${p}.id`, "required field missing");
    }
    if ("type" in e && !("evidence_type" in e)) {
      r.error(
        `${p}.type`,
        "use `evidence_type` instead of `type`",
        "rename key `type` -> `evidence_type`",
      );
    }
  });
}

function checkArtifacts(
  arts: unknown,
  seenIds: Set<string>,
  r: Reporter,
): void {
  if (arts === undefined) return;
  if (!Array.isArray(arts)) {
    r.error("artifacts", "must be a list");
    return;
  }
  arts.forEach((a, i) => {
    const p = `artifacts[${i}]`;
    if (!isRecord(a)) {
      r.error(p, "must be a mapping");
      return;
    }
    const aid = a.id;
    if (typeof aid === "string") {
      checkId(aid, "art:", p, r);
      if (seenIds.has(aid)) r.error(`${p}.id`, `duplicate id '${aid}'`);
      seenIds.add(aid);
    }
    if ("type" in a && !("artifact_type" in a)) {
      r.error(
        `${p}.type`,
        "use `artifact_type` instead of `type`",
        "rename key `type` -> `artifact_type`",
      );
    }
    const role = a.role;
    if (typeof role === "string" && !ARTIFACT_ROLES.has(role)) {
      r.error(
        `${p}.role`,
        `invalid value '${role}'`,
        `use one of: ${[...ARTIFACT_ROLES].sort().join(", ")}`,
      );
    }
    if ("identifiers" in a && !isRecord(a.identifiers)) {
      r.error(`${p}.identifiers`, "must be a mapping");
    }
  });
}

function checkRelations(
  rels: unknown,
  seenIds: Set<string>,
  refIds: Set<string>,
  stmtIds: Set<string>,
  r: Reporter,
  lenient: boolean,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const sid of stmtIds) counts.set(sid, 0);
  if (!Array.isArray(rels)) {
    r.error("relations", "must be a list");
    return counts;
  }
  rels.forEach((rel, i) => {
    const p = `relations[${i}]`;
    if (!isRecord(rel)) {
      r.error(p, "must be a mapping");
      return;
    }
    const rid = rel.id;
    if (typeof rid === "string") {
      checkId(rid, "rel:", p, r);
      if (seenIds.has(rid)) r.error(`${p}.id`, `duplicate id '${rid}'`);
      seenIds.add(rid);
    }
    if ("type" in rel && !("predicate" in rel)) {
      r.error(
        `${p}.type`,
        "use `predicate` instead of `type`",
        "rename key `type` -> `predicate`",
      );
    }
    const pred = rel.predicate;
    if (typeof pred === "string" && pred in PAST_TENSE_PREDICATES) {
      r.warn(
        `${p}.predicate`,
        `past-tense '${pred}' is suspicious (production prefers present)`,
        `consider \`${PAST_TENSE_PREDICATES[pred]}\` if symmetric`,
      );
    }
    if (!pred) {
      r.error(`${p}.predicate`, "required field missing");
    }
    for (const refField of ["subject_ref", "object_ref"]) {
      const refVal = rel[refField];
      if (refVal === undefined || refVal === null) {
        r.error(`${p}.${refField}`, "required field missing");
      } else if (typeof refVal !== "string" || !refIds.has(refVal)) {
        const reportFn = lenient ? r.warn.bind(r) : r.error.bind(r);
        reportFn(
          `${p}.${refField}`,
          `reference '${String(refVal)}' does not match any defined id`,
        );
      } else if (counts.has(refVal)) {
        counts.set(refVal, (counts.get(refVal) ?? 0) + 1);
      }
    }
  });
  return counts;
}

function checkAntiFabrication(doc: Record<string, unknown>, r: Reporter): void {
  for (const key of ["doi", "venue", "year", "title"]) {
    const val = doc[key];
    if (
      typeof val === "string" &&
      PLACEHOLDER_VALUES.has(val.trim().toUpperCase())
    ) {
      r.error(
        key,
        `placeholder value '${val}' violates anti-fabrication rule`,
        `omit \`${key}\` if not visible in source`,
      );
    }
  }
}

function checkTopLevel(doc: Record<string, unknown>, r: Reporter): void {
  for (const k of REQUIRED_TOP_LEVEL) {
    if (!(k in doc)) r.error(k, `required top-level key '${k}' missing`);
  }
  for (const k of RECOMMENDED_TOP_LEVEL) {
    if (!(k in doc)) r.warn(k, `recommended top-level key '${k}' missing`);
  }
}

function checkCoverage(cov: unknown, r: Reporter): void {
  if (!isRecord(cov)) {
    r.error(
      "coverage",
      "must be a mapping with `statements` and `evidence` keys",
    );
    return;
  }
  const sv = cov.statements;
  if (sv === undefined) r.warn("coverage.statements", "no value set");
  else if (typeof sv !== "string" || !COVERAGE_STATEMENTS.has(sv)) {
    r.warn(
      "coverage.statements",
      `unfamiliar value '${String(sv)}'`,
      `prefer one of: ${[...COVERAGE_STATEMENTS].sort().join(", ")}`,
    );
  }
  const ev = cov.evidence;
  if (ev === undefined) r.warn("coverage.evidence", "no value set");
  else if (typeof ev !== "string" || !COVERAGE_EVIDENCE.has(ev)) {
    r.warn(
      "coverage.evidence",
      `unfamiliar value '${String(ev)}'`,
      `prefer one of: ${[...COVERAGE_EVIDENCE].sort().join(", ")}`,
    );
  }
}

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
