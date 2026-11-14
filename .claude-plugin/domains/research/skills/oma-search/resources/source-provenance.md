# Source provenance and optional domain diagnostics

Judge results by provenance and inspected content. The CLI's domain registry is
an optional diagnostic, not a step for every result.

## Evidence to retain

- Source URL or remote repository/file reference and actual provider/route.
- Source type when established: official documentation, primary material,
  community discussion, secondary analysis, or unknown.
- Whether the relevant original content was read in full, read as an excerpt, or
  not read. Search snippets alone are limited evidence.
- The passage or code context supporting the answer and its relevance.
- Publication date, retrieval time and version/revision when observed; unknown
  fields stay unknown.
- Access, archive, freshness, version and provider-fallback limitations.

Deduplicate URLs. Do not infer official ownership from a hosting domain or a
`docs.*` prefix. Context7 can supply relevant documentation excerpts, but library
resolution does not verify every statement. GitHub/GitLab host both
authoritative upstream code and unrelated repositories. A DOI identifies a
record, not the truth of a claim. Under `--wide`, unknown provenance does not
require discarding a relevant source.

## Optional CLI diagnostic

Use the command when the user requests domain diagnostics or a numeric domain
threshold, or when that information is needed to interpret a source:

```bash
oma search trust <domain>
```

The result contains the CLI's `domain`, `level`, `score`, `tags` and resolution
`source` (`registry`, `heuristic` or `tranco`). Preserve those fields as returned;
unknown scores stay unknown. Do not hand-score or upgrade domains.

The CLI's `verified` label is a domain-registry classification, not evidence that
a page was read, a claim was checked, or requested version/freshness constraints
were met. Popularity is not authority. Keep these diagnostics separate from
source/content evidence.
