# Scholar - Execution Protocol

Choose the mode based on user intent, then follow its steps.

## Mode 1: Generate

Create a `.knows.yaml` sidecar from a paper, draft, or research notes.

### Step 0: Gather Source

1. Identify input: PDF path, LaTeX file, plain text, or pasted content
2. If PDF and only path is given -> chain via `oma-pdf` first to extract markdown
3. Determine output path: `{base}.knows.yaml` next to the input unless the user names a path; ask before overwriting an existing file

### Step 1: Read Source Thoroughly

- Read the entire source: abstract, methods, results, discussion, limitations
- Identify: claims, methods, evidence (tables/figures), datasets, code/repo links, cited works, assumptions
- Note paper metadata: title, authors, venue, year, DOI (only if visible)

### Step 2: Draft Sidecar Structure

Use the local production compatibility rules in `sidecar-spec.md` for every
block, field name, and enum; they do not establish full canonical-schema
conformance. Start from its `paper@1` structure, omit `doi`/`venue`/`year`
when they are not visible in the source, and include a `representations` entry
for the source artifact.

### Step 3: Wire Relations

Use relations appropriate to the statement type and supported by the source.
Claims with evidence use `supported_by`; methods may use `uses`, `implements`,
or `evaluates_on`. Definitions and open questions can remain source-anchored
without invented empirical support. The lint ratio target of 1.5 is a coverage
diagnostic, not a requirement to pad the graph. Predicate directions are in
`sidecar-spec.md`; the per-statement-type wiring pattern is in
`canonical-delta.md`.

### Step 4: Optional Metadata Enrichment

If DOI/venue/year are missing from the source, look the paper up. This works
with or without `OPENALEX_API_KEY`; a key only raises the rate limit.

```bash
oma scholar resolve "<paper title>"   # candidates from each source
oma scholar get "<doi>"               # confirm the selected DOI
```

On OpenAlex 403/429, stop enrichment, leave the fields omitted, and point the
user to `setup-openalex.md`.

Verify candidate identity against the source title, authors, year, and any
existing DOI/arXiv identifier before enrichment. A title-search ranking is not
identity proof. Confirm a selected DOI with a DOI lookup; omit disputed fields
when candidates remain ambiguous. A curated catalog is an external source,
and local structural lint cannot verify that it describes the same paper.
Mention in the final report which fields were enriched rather than extracted from source.

### Step 5: Lint

Always validate before reporting done:

```bash
oma scholar lint {output}.knows.yaml
```

For newly generated local-profile output, fix reported issues and re-run. For imported canonical records, preserve valid wider shapes, report local-lint incompatibilities, and do not silently normalize away information.

### Step 6: Report

Tell the user:
- Output path
- Statement count, evidence count, relations/statement ratio
- Any fields omitted due to anti-fabrication (e.g., "DOI not extracted; visible in source? If yes, paste it.")
- Lint status

## Mode 2: Validate

Lint an existing `.knows.yaml`.

### Steps

1. Confirm input file exists and ends with `.knows.yaml`, `.yaml`, or `.json`
2. Decide strictness based on origin:
   - **Own Generate output** → strict (default)
   - **Third-party / remote sidecar** → `--lenient` (dangling refs become warnings)
3. Run lint:
   ```bash
   oma scholar lint {input}
   # OR for fetched sidecars:
   oma scholar lint --lenient {input}
   ```
4. Read output; group findings by severity (error/warning)
5. Report file:line for each issue with the rule violated and the fix
6. Offer to apply fixes if the user agrees

## Mode 3: Review

Generate a peer-review sidecar covering what claims need stronger evidence, what assumptions are unstated, and what limitations are missing.

### Steps

1. Read the source paper (or its existing sidecar)
2. For each statement in the paper, evaluate:
   - Is `supported_by` evidence sufficient?
   - Is `depends_on` assumption explicit?
   - Are limitations acknowledged?
3. Produce review sidecar at `{base}.review.knows.yaml` with:
   - `profile: "review@1"` (not `paper@1`)
   - top-level `coverage`: `{statements: key_claims_and_limitations, evidence: partial}`
   - `statements` capturing reviewer assertions using the **closed `statement_type`
     enum**: weaknesses and strengths as `claim`, identified gaps as `limitation`,
     open issues as `question` (there is no `review_comment` type)
   - `relations` linking the reviewed paper's claims to reviewer weaknesses via
     `predicate: challenged_by`, using the **cross-record reference grammar**
     `record_id#local_id` for the original paper's side:

   ```yaml
   relations:
     - id: rel:generalization-challenges-main-claim
       predicate: challenged_by
       subject_ref: "knows:examples/resnet/1.0.0#stmt:main-contribution"  # original paper's claim
       object_ref: "stmt:missing-ablation-study"                          # this review's weakness
   ```

4. Lint and report (same as Generate). `oma scholar lint` recognizes
   `record_id#local_id` cross-record refs and does not flag them as dangling.

## Mode 4: Analyze / Query

Answer natural-language questions over an existing sidecar.

### Steps

1. Locate sidecar: local path or `oma scholar get "{record_id}"` from knows.academy
2. For token efficiency, prefer **partial fetch** when only a subset is needed.
   The query param is **`section` (singular)**; allowed values are `statements|evidence|relations|artifacts|citation`:
   - "What claims does this paper make?" -> `?section=statements`
   - "What are the experimental results?" -> `?section=evidence`
   - "Who do they cite?" -> `?section=citation` (or `?section=artifacts` filtered by `role: cited`)
3. Parse YAML, traverse structure to answer
4. Cite IDs (`stmt:...`, `ev:...`) so the user can verify

## Mode 5: Compare

Structural diff between two sidecars.

### Steps

1. Load both sidecars (local or remote)
2. Build comparison table:
   - **Claims overlap**: shared `statement_type` themes
   - **Method differences**: same dataset? different metrics?
   - **Evidence quality**: relations-per-statement ratio for each
   - **Citation overlap**: shared `artifacts` with `role: cited`
3. Output a markdown table; cite specific IDs from each paper
4. Optional: surface opposing claims (search for `predicate: challenged_by` relations or `citation_intent: contradicts` on `cites`)

## Mode 6: Remote (with OpenAlex / Semantic Scholar fallback)

Search and fetch from knows.academy first, then fall back to OpenAlex when the
paper isn't in the (2026-only) knows.academy index, then to Semantic Scholar
(AI TL;DR + citation counts) when OpenAlex also has nothing.

### Recommended path: `oma scholar` (handles cascade automatically)

Use `oma scholar search`, `resolve`, and `get [--section <one>]`; the commands
and accepted id forms are in SKILL.md Quick Reference. See
`fallback-providers.md` for the cascade design.

### Manual cascade (raw curl, when the CLI is unavailable)

`{base}` is `https://knows.academy` unless `scholar.base_url` is set (SKILL.md Configuration).

1. **knows.academy search**: `curl -s "{base}/api/proxy/search?q={query}"`
2. If hits → fetch sidecar:
   - Full: `/api/proxy/sidecars/{record_id}`
   - Partial: `/api/proxy/partial?record_id={id}&section=statements|evidence|relations|artifacts|citation`
3. If no hits OR clearly wrong paper (cross-source title similarity < 0.7) →
   **OpenAlex fallback**:
   - `curl -s "https://api.openalex.org/works?search={query}"` (anonymous OK)
   - Or by DOI: `https://api.openalex.org/works/doi:{doi}`
   - Reconstruct abstract from `abstract_inverted_index`
4. If user wants a sidecar from the OpenAlex result → transition to **Mode 1 Generate**
   using the abstract as the source text. The local sidecar will not be on
   knows.academy but is structurally identical.
5. **Stats** (health check): `curl -s "{base}/api/proxy/jobs/stats"`
6. If user asks for analysis after fetch, transition to **Mode 4** (Analyze)

## Error Recovery

| Error | Recovery |
|-------|----------|
| `oma scholar` not found | Run `oma install` to install / update the CLI |
| Lint script reports many errors | Fix top error first; re-run; cascading errors often resolve together |
| Remote API timeout | Retry once; if still failing, check `/api/proxy/jobs/stats` |
| Empty search results | Broaden query; remove quotes; try keyword-only |
| YAML parse error after Generate | Re-emit with stricter quoting on string values containing `:` `#` `&` `*` |
| Source PDF has no text layer | Chain via `oma-pdf` with hybrid OCR mode first |
| OpenAlex 403/429 | Stop enrichment and leave fields omitted; tell user to set `OPENALEX_API_KEY` (see `setup-openalex.md`) |
