# Source provenance and optional domain diagnostics

Ordinary search results use provenance and inspected content rather than a
mandatory domain score. The CLI's existing domain registry remains available as
an optional diagnostic; this resource does not maintain another score table.

## Evidence to retain

- Source URL or remote repository/file reference and actual provider/route.
- Source type when established: official documentation, primary material,
  community discussion, secondary analysis, or unknown.
- Whether the relevant original content was read in full, read as an excerpt, or
  not read. Search snippets alone are limited evidence.
- The passage or code context supporting the answer and its relevance.
- Publication date, retrieval time and version/revision when observed.
- Access, archive, freshness, version and provider-fallback limitations.

Do not infer official ownership from a hosting domain or a `docs.*` prefix.
Context7 can supply relevant documentation excerpts, but library resolution does
not verify every statement. GitHub/GitLab host both authoritative upstream code
and unrelated repositories. A DOI identifies a record, not the truth of a claim.

## Source constraints

`--strict` retains suitable primary or official material with inspected content
supporting the question. Report when ownership, version or content cannot be
established. Do not make a source pass by assigning it a higher score.

`--wide` includes broader material with its provenance and read-status limits.
It does not relax an explicit official-site, repository, version or date scope.
Unknown provenance does not require discarding a relevant source in this mode.

## Optional CLI diagnostic

Use the existing command when the user requests domain diagnostics or a numeric
domain threshold, or when that information is needed to interpret a source:

```bash
oma search trust <domain>
```

The result contains the CLI's `domain`, `level`, `score`, `tags` and resolution
`source` (`registry`, `heuristic` or `tranco`). Preserve those fields as returned;
unknown scores stay unknown. Do not hand-score or upgrade domains.

The CLI's `verified` label is a domain-registry classification, not evidence that
a page was read, a claim was checked, or requested version/freshness constraints
were met. Popularity is not authority. Keep these diagnostics separate from
source/content evidence; they are not required for every URL or a ranking pass.

Cache a requested diagnostic within the session. Any persisted cache belongs in
generated state and records resolution time/source. Do not copy the registry or
its numeric tables into skill definitions.
