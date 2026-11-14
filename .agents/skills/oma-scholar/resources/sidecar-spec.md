# Knows Sidecar: Local Production Compatibility Rules (v0.9.0)

These generation rules describe observed `knows.academy` production shapes and
the narrower local `oma scholar lint` contract. They are not a complete
canonical JSON Schema validator. `canonical-delta.md` lists what the canonical
spec permits beyond these rules, including author objects, imported provenance,
and normative modality. Preserve those shapes in imported records and report
local-lint incompatibilities instead of erasing information. Set `$schema` only after
validation against that exact schema; a clean local lint is insufficient.

## Local Generation Structure (paper@1 production compatibility)

```yaml
knows_version: "0.9.0"
record_id: "knows:generated/{slug}/1.0.0"   # only for published records; omit for local drafts
profile: "paper@1"
subject_ref: "art:paper"                      # points to the artifact representing the paper itself

# Top-level metadata (NOT inside a `metadata` block)
title: "..."
authors: ["..."]
venue: "..."          # only if visible in source
year: 2026            # only if visible in source
summary: "..."

# Coverage is an object, not a single value
coverage:
  statements: exhaustive | main_claims_only | key_claims_and_limitations | partial
  evidence: exhaustive | key_evidence_only | partial

license: "CC-BY-4.0"   # if known

artifacts: [...]
statements: [...]
evidence: [...]
relations: [...]
actions: []            # usually empty for paper profile

# Provenance has SINGLE actor (object), not actors (array)
provenance:
  origin: machine | author
  actor:
    name: "knows-gen"
    type: tool         # tool | person | org   (NEVER ai/llm/model)
    version: "0.9.0"
  generated_at: "2026-04-25T00:00:00Z"
  method: extraction

version:
  spec: "0.9.0"
  record: "1.0.0"
  source: original

freshness:
  as_of: "2026-04-25T00:00:00Z"
  update_policy: versioned
```

## Statement Shape

```yaml
- id: stmt:descriptive-kebab-case
  statement_type: claim    # claim | method | limitation | assumption | definition | question
  modality: empirical      # descriptive | empirical | theoretical
  text: "..."
  about_ref: art:paper     # what the statement is about (usually the subject artifact)
  status: asserted
  source_anchors:
    - representation_ref: rep:paper-pdf
      locator_type: section
      locator: "Section 5"
  confidence:
    claim_strength: high       # high | medium | low
    extraction_fidelity: high  # high | medium | low
  provenance:
    origin: machine
    actor:
      name: "knows-gen"
      type: tool
    generated_at: "..."
```

## Evidence Shape

```yaml
- id: ev:descriptive-kebab-case
  evidence_type: table_result   # see Local Generation Values
  summary: "..."
  source_anchors: [...]
  provenance: {...}
```

## Artifact Shape

```yaml
- id: art:paper
  artifact_type: paper       # see Local Generation Values
  role: subject              # subject | supporting | cited
  title: "..."
  identifiers:
    url: "https://arxiv.org/abs/..."
    doi: "..."     # OMIT entirely if not visible in source
  representations:
    - id: rep:paper-pdf
      media_type: application/pdf
      locator:
        type: path | url
        value: "..."
```

## Relation Shape

```yaml
- id: rel:descriptive-kebab-case
  predicate: supported_by  # see "Predicates" section below
  subject_ref: stmt:...
  object_ref: ev:... | stmt:... | art:...
```

### Cross-record references (review@1)

Review sidecars link back to the reviewed paper's record using the
`record_id#local_id` grammar; `oma scholar lint` recognizes these and does not
flag them as dangling:

```yaml
- id: rel:generalization-challenges-main-claim
  predicate: challenged_by
  subject_ref: "knows:examples/resnet/1.0.0#stmt:main-contribution"
  object_ref: "stmt:missing-ablation-study"
```

## Field Naming (copy exactly)

| Concept | Correct field | Wrong |
|---------|---------------|-------|
| Statement category | `statement_type` | `type`, `claim` |
| Evidence category | `evidence_type` | `type` |
| Relation verb | `predicate` | `type`, `relation_type` |
| Artifact category | `artifact_type` | `type` |
| Actor category | `type` (with closed enum) | (none) |
| Top-level metadata | `title`, `authors`, `venue`, `year` (no wrapper) | `metadata.title` etc. |
| Provenance attribution | `provenance.actor` (single object) | `provenance.actors` (array) |
| Confidence | object with `claim_strength` + `extraction_fidelity` | bare string |

## Local Generation Values (Not the Complete Canonical Enums)

| Field | Allowed values |
|-------|----------------|
| `actor.type` | `tool` \| `person` \| `org` (never `ai`/`llm`/`model`) |
| `provenance.origin` | `machine` (AI-generated) \| `author` (human curation) |
| `confidence.claim_strength` | `high` \| `medium` \| `low` |
| `confidence.extraction_fidelity` | `high` \| `medium` \| `low` |
| `coverage.statements` | `exhaustive` \| `main_claims_only` \| `key_claims_and_limitations` \| `partial` |
| `coverage.evidence` | `exhaustive` \| `key_evidence_only` \| `partial` |
| `artifacts[].role` | `subject` \| `supporting` \| `cited` |
| `statement.status` | `asserted` \| `retracted` \| `superseded` \| `under_review` (upstream enum; production shows only `asserted`) |
| `statement.modality` | `descriptive` \| `empirical` \| `theoretical` |
| `statement_type` | `claim` \| `method` \| `limitation` \| `assumption` \| `definition` \| `question` |
| `evidence_type` | `table_result` \| `figure` \| `proof` \| `observation` \| `experiment_run` \| `case_study` \| `citation_backed` |
| `artifact_type` | `paper` \| `dataset` \| `benchmark` \| `repository` \| `model` \| `software` \| `other` |

## Numeric Values

```yaml
# Correct
- value: 22
- accuracy: 0.945

# Wrong
- value: '22'        # never quote numbers
- accuracy: "0.945"
```

## Anti-Fabrication

If a field is not visible in source, **omit the key entirely**.

```yaml
# Wrong
doi: TODO
venue: TBD

# Correct (just omit the keys)
title: "Paper Title"
authors: ["A. Author"]
```

Applies to: `doi`, `venue`, `year`, ORCIDs, GitHub URLs, dataset URLs.

Exception: backfilling `doi`/`venue`/`year` from **OpenAlex metadata enrichment**
(Generate Step 4) is allowed — that is a curated external source, not fabrication.
Verify paper identity before using catalog metadata; title-search rank alone is insufficient. Omit ambiguous fields.

## ID Format

Descriptive kebab-case with type prefix. **Never** use opaque IDs.

```yaml
# Correct
- id: stmt:standard-transformer-fails-unseen-tokens
- id: ev:lemma-41-contraction-proof
- id: rel:collapse-causes-failure
- id: art:paper
- id: rep:paper-pdf

# Wrong
- id: stmt:c1
- id: ev:001
- id: rel:r-23
```

## Predicates

| Predicate | Direction | Use |
|-----------|-----------|-----|
| `supported_by` | claim → evidence | most common; primary evidence wiring |
| `depends_on` | claim/method → assumption | preconditions |
| `evaluates_on` | method → dataset/benchmark | empirical evaluation target |
| `limited_by` | claim → limitation | acknowledged limit |
| `documents` | statement → artifact (paper) | references the source paper |
| `uses` | method → artifact (model/software) | active usage |
| `used_by` | artifact → method | reverse direction of `uses` |
| `challenged_by` | claim → counter-claim | opposed/debated |
| `cites` | artifact → cited paper | citation graph |
| `implements` | method → repository | code implementation |
| `defines` | statement → definition | term introduction |

The canonical spec closes the predicate set at 12:

```
supported_by, challenged_by, depends_on, limited_by, cites, uses,
evaluates_on, implements, documents, same_as, supersedes, retracts
```

`cites` relations may carry an optional `citation_intent` from:
`supports | extends | uses_method | compares_to | contradicts | reviews | cites_data | background | other`.
Notions like "extends" or "contradicts" are citation intents, **not** predicates.
Production-observed extras (`used_by`, `defines`) remain accepted by our lint
(see `canonical-delta.md`).

```yaml
# Wrong tense (warning)
predicate: evaluated_on

# Correct
predicate: evaluates_on

# Passive forms accepted in production
predicate: supported_by
predicate: used_by
predicate: challenged_by
```

## Relation Wiring (CRITICAL)

The average-ratio target **1.5** is a lint diagnostic. Add only source-supported
relations appropriate to each statement type; do not invent links to satisfy
a quota. Source-anchored questions or definitions need not assert empirical
support. The Predicates table above gives each predicate's direction; the
per-statement-type wiring pattern is in `canonical-delta.md`.

## Statement Density Guidance

- Short methods paper: 8-12 statements
- Standard ML paper: 12-18 statements
- Complex/long paper: **15+ required**
- Survey/review paper: 20+ recommended

If under-extracted, re-read:
- Limitations sections
- Discussion/conclusions
- Footnotes and ablation studies
