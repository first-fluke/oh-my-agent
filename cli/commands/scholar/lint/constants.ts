// v0.9.0 sidecar linter — port of resources/scripts/lint.py.
// See .agents/skills/oma-scholar/resources/sidecar-spec.md for rule sources.

export const ACTOR_TYPES = new Set(["tool", "person", "org"]);
export const ORIGIN_VALUES = new Set(["machine", "author"]);
export const CONFIDENCE_GRADES = new Set(["high", "medium", "low"]);
export const ARTIFACT_ROLES = new Set(["subject", "supporting", "cited"]);
export const COVERAGE_STATEMENTS = new Set([
  "exhaustive",
  "main_claims_only",
  "key_claims_and_limitations",
  "partial",
]);
export const COVERAGE_EVIDENCE = new Set([
  "exhaustive",
  "key_evidence_only",
  "partial",
]);
export const FORBIDDEN_ACTOR_TYPES = new Set(["ai", "llm", "model", "agent"]);
export const PAST_TENSE_PREDICATES: Record<string, string> = {
  evaluated_on: "evaluates_on",
  implemented: "implements",
  depended_on: "depends_on",
  used: "uses",
};
export const PLACEHOLDER_VALUES = new Set([
  "TODO",
  "TBD",
  "N/A",
  "FIXME",
  "XXX",
  "?",
  "UNKNOWN",
]);
export const REQUIRED_TOP_LEVEL = [
  "title",
  "statements",
  "relations",
  "provenance",
];
export const RECOMMENDED_TOP_LEVEL = [
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
export const NUMERIC_KEYS = new Set([
  "value",
  "score",
  "accuracy",
  "n",
  "count",
  "rate",
  "year",
]);
