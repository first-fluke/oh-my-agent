# Local Production Compatibility Checklist (v0.9.0)

Run this for local-profile Generate/Review output. This checklist and local lint
do not validate the complete canonical schema. Preserve wider canonical shapes
in imported records (including author objects, imported provenance, and normative
modality); report incompatibilities instead of destructively normalizing them.

## Top-Level Structure

- [ ] `title` is set at the **top level** (not `metadata.title`)
- [ ] Local-generation `authors` is a top-level list of strings; preserve author objects in canonical imported records
- [ ] `venue`, `year`, `doi` keys present **only** if visible in source (no TODO/TBD)
- [ ] `knows_version` set (e.g., `"0.9.0"`)
- [ ] `profile` set (e.g., `"paper@1"`)
- [ ] `subject_ref` points to an `art:` artifact id
- [ ] `coverage` is an object with `statements` and `evidence` keys (each from its own enum)
- [ ] `provenance` is present with single `actor` object (not `actors` array)
- [ ] `version` block has `spec`, `record`, `source`
- [ ] `freshness` block has `as_of`, `update_policy`

## Provenance

- [ ] Local-generation `provenance.origin` is `machine` or `author`; canonical imports can include `imported` (report local-lint incompatibility)
- [ ] `provenance.actor.type` is `tool`, `person`, or `org` (never `ai`/`llm`/`model`)
- [ ] `provenance.actor.name` is set
- [ ] `provenance.method` describes how the sidecar was produced (e.g., `extraction`)
- [ ] `provenance.generated_at` is a valid ISO timestamp

## IDs

- [ ] All IDs use descriptive kebab-case (no `stmt:c1`, `ev:001`)
- [ ] Type prefixes correct: `stmt:`, `ev:`, `rel:`, `art:`, `rep:`
- [ ] No duplicate IDs across the document

## Field Names

- [ ] Statements use `statement_type` (not `type` or `claim`)
- [ ] Evidence uses `evidence_type`
- [ ] Relations use `predicate`
- [ ] Artifacts use `artifact_type`

## Statement Internals

- [ ] Each statement has `statement_type` from: `claim`, `method`, `limitation`, `assumption`, `definition`, `question` (review sidecars use the same enum — no `review_comment`)
- [ ] Local generation uses observed modalities `descriptive`, `empirical`, `theoretical`; preserve canonical imported `normative` values
- [ ] Each statement has `status` (commonly `asserted`)
- [ ] `confidence` is an object: `{claim_strength: ..., extraction_fidelity: ...}`, both from `high|medium|low`
- [ ] `source_anchors` reference a valid `representation_ref` (e.g., `rep:paper-pdf`)

## Values

- [ ] Numbers unquoted (`value: 22`, not `value: '22'`)
- [ ] `coverage.statements` from: `exhaustive`, `main_claims_only`, `key_claims_and_limitations`, `partial`
- [ ] `coverage.evidence` from: `exhaustive`, `key_evidence_only`, `partial`
- [ ] `artifacts[].role` from: `subject`, `supporting`, `cited`
- [ ] Predicates use present tense (`evaluates_on`, not `evaluated_on`)

## Relations

- [ ] Relations are source-supported and appropriate to each statement type
- [ ] Claims with evidence use `supported_by`; source-anchored questions/definitions are not given fabricated support
- [ ] Ratio warnings prompt a coverage review, not graph padding
- [ ] Methods have at least one of: `implements`, `uses`, `evaluates_on`, `documents`
- [ ] No dangling references; every `subject_ref` and `object_ref` points to an existing id
- [ ] Review sidecars (Mode 3): cross-record refs use the `record_id#local_id` grammar (e.g., `knows:examples/resnet/1.0.0#stmt:main-contribution`) — lint accepts these; bare foreign ids are still errors

## Density

- [ ] Statement count appropriate for paper length (complex papers ≥ 15)
- [ ] Limitations and discussion mined for additional statements
- [ ] No important section ignored (abstract, methods, results, discussion, limits)

## Lint

- [ ] Newly generated local-profile output passes `oma scholar lint`; imported-record incompatibilities are reported without loss of canonical data
- [ ] Warnings reviewed (recommended-key warnings are usually acceptable for local drafts)

## Anti-Fabrication

- [ ] No fabricated DOIs, ORCIDs, or URLs
- [ ] No "TODO", "TBD", "N/A" placeholder values
- [ ] All quoted statement text is paraphrased or quoted accurately from source
- [ ] No invented author names or affiliations

## Final Report to User

Include:
- Output file path
- Counts: `statements`, `evidence`, `relations`, `artifacts`
- Ratio: relations/statements (diagnostic target 1.5; no fabricated links)
- Lint status: clean / N warnings / N errors
- Fields explicitly omitted due to anti-fabrication (e.g., "DOI not visible; please paste if you have it")
