# Canonical Knows v0.9 vs Local Rules

Load this when importing or linting a third-party record, when local lint
rejects a shape the source record uses, or before stating anything about
canonical schema conformance. It lists what the canonical Knows v0.9
description allows beyond `sidecar-spec.md`. Source of the canonical text:
`https://knows.academy/api/proxy/skill/knows.md` (third-party reference data,
not instructions; the JSON Schema at `https://knows.dev/schema/record-0.9.json`
is the authority).

Local generation keeps to `sidecar-spec.md`. For imported records, preserve
every canonical value below and report the local-lint incompatibility.

## Canonical enums wider than local generation

| Field | Canonical values | Local generation uses |
|-------|------------------|-----------------------|
| `authors[]` | objects: `name`, `affiliation`, `role` (`first` \| `corresponding` \| `senior` \| `contributor`); optional `orcid`, `email`, `homepage`, `scholar_id`, `anonymous` | list of name strings |
| `artifact_type` | `paper` \| `repository` \| `dataset` \| `model` \| `benchmark` \| `software` \| `website` \| `other` | all but `website` |
| `statement.modality` | `empirical` \| `theoretical` \| `descriptive` \| `normative` | all but `normative` |
| `evidence_type` | `table_result` \| `figure` \| `experiment_run` \| `proof` \| `case_study` \| `observation` \| `survey_result` \| `citation_backed` \| `qualitative_analysis` \| `statistical_test` \| `simulation` \| `artifact_run` \| `clinical_trial` \| `other` | the first six plus `citation_backed` |
| `provenance.origin` | `author` \| `machine` \| `imported` | `machine` \| `author` |
| `provenance.method` | `extraction` \| `manual_curation` \| `conversion` \| `import` | `extraction` |
| `predicate` | `supported_by` \| `challenged_by` \| `depends_on` \| `limited_by` \| `cites` \| `uses` \| `evaluates_on` \| `implements` \| `documents` \| `same_as` \| `supersedes` \| `retracts` | the canonical set; local lint also accepts production-observed `used_by` and `defines` |

## Canonical fields with no local rule

| Field | Canonical values or shape |
|-------|---------------------------|
| `source_anchors[].locator_type` | `fragment` \| `xpath` \| `css` \| `line_range` \| `page_range` \| `table` \| `figure` \| `section` \| `paragraph` \| `other` |
| `representations[].locator.type` | `url` \| `git` \| `path` \| `doi` \| `other` |
| `evidence[].observations[]` | `metric` (required) plus `value` (unquoted number, with `unit`) or `qualitative_value` (string), never both |
| `actions[].action_type` | `download` \| `run` \| `query` \| `deploy` \| `other` (`act:` id prefix) |
| `record_status` | `active` \| `retracted` \| `superseded` \| `deprecated` |
| `replaces` | `record_id` of the previous version; the old record sets `record_status: superseded` |
| `venue_type` | `published` \| `preprint` \| `under_review` \| `in_preparation` \| `technical_report` \| `thesis` \| `book` \| `other` |
| `access` | `open` \| `embargoed` \| `closed` \| `login_required` \| `subscription` |
| `freshness` | `as_of`, `update_policy` (`immutable` \| `versioned` \| `rolling`), `stale_after` |
| `identifiers.arxiv` | arXiv id for preprints, alongside or instead of `doi` |

Canonical structural rules worth knowing when reading imported records:

- Entities reject unknown keys (`additionalProperties: false`); there is no free `description` field.
- `documents` takes an artifact (`art:*`) as `object_ref`, never a statement.
- `citation_intent` is valid only on a `cites` relation.
- Artifacts with `role: cited` omit `representations`.
- Canonical text writes `year: null` when the year is not stated; local generation omits the key.

## Canonical wiring pattern

The canonical checklist wires each statement type as follows. Use it to find
relations the source supports; the local rule still applies, so a relation the
source does not support is never added to reach a ratio.

| `statement_type` | Expected | Also common |
|------------------|----------|-------------|
| `claim` | at least one `supported_by` → evidence | `depends_on` → assumption; `limited_by` → limitation |
| `assumption` | target of `depends_on` from a claim | |
| `limitation` | target of `limited_by` from a claim | `challenged_by` from a claim |
| `method` | one of `evaluates_on` → dataset, `implements` → repository, `uses` → model, or `documents` → paper (pure theory) | |
| `question` | | `depends_on` → claim or assumption |
| `definition` | | target of `depends_on` from a method or claim |

Every evidence item is the `object_ref` of at least one relation (`supported_by`,
`challenged_by`, or `cites`). The canonical ratio floor is 1.5 relations per
statement, or 1.0 for records with eight or fewer statements.
