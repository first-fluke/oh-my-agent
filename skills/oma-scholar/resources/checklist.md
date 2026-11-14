# Local Production Compatibility Checklist (v0.9.0)

Check the items that apply to local-profile Generate/Review output. This
checklist and local lint do not validate the complete canonical schema.
Preserve wider canonical shapes in imported records (including author objects,
imported provenance, and normative modality); report incompatibilities instead
of destructively normalizing them.

## Lint

`oma scholar lint` covers the mechanical rules in `sidecar-spec.md`: required
and recommended top-level keys, field names, the `provenance.actor`,
`confidence`, and `coverage` shapes and enums, ID prefixes and duplicates,
quoted numbers, placeholder values, past-tense predicates, dangling
references, and the relation-ratio and statement-count diagnostics.

- [ ] Newly generated local-profile output passes `oma scholar lint`; imported-record incompatibilities are reported without loss of canonical data
- [ ] Warnings reviewed (recommended-key warnings are usually acceptable for local drafts)

## What lint cannot judge

- [ ] `venue`, `year`, `doi` present **only** if visible in the source or confirmed by enrichment
- [ ] No fabricated DOIs, ORCIDs, URLs, author names, or affiliations
- [ ] Statement text is paraphrased or quoted accurately from the source
- [ ] `statement_type`, `modality`, `evidence_type`, and `artifact_type` values come from the `sidecar-spec.md` tables (review sidecars use the same `statement_type` enum; there is no `review_comment`)
- [ ] `source_anchors` reference a `representation_ref` that exists (e.g., `rep:paper-pdf`)
- [ ] Relations are source-supported and appropriate to each statement type; ratio warnings prompt a coverage review, not graph padding
- [ ] Claims with evidence use `supported_by`; source-anchored questions/definitions are not given fabricated support
- [ ] Methods have at least one of `implements`, `uses`, `evaluates_on`, `documents` when the source supports it
- [ ] Review sidecars (Mode 3): cross-record refs use the `record_id#local_id` grammar (e.g., `knows:examples/resnet/1.0.0#stmt:main-contribution`); bare foreign ids are still errors

## Density

- [ ] Statement count appropriate for paper length (complex papers ≥ 15)
- [ ] Limitations and discussion mined for additional statements
- [ ] No important section ignored (abstract, methods, results, discussion, limits)

## Final Report to User

Include:
- Output file path
- Counts: `statements`, `evidence`, `relations`, `artifacts`
- Ratio: relations/statements (diagnostic target 1.5; no fabricated links)
- Lint status: clean / N warnings / N errors
- Fields explicitly omitted due to anti-fabrication (e.g., "DOI not visible; please paste if you have it")
