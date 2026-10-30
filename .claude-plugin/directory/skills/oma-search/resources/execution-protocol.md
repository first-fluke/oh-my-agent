# Search and retrieval execution

The parent SKILL.md owns route selection and execution order. Load the selected
route here; supporting routes address a specific evidence gap.

## docs

1. Resolve the library with Context7 `resolve-library-id`, then query the relevant
   documentation with `query-docs`. Carry the requested version and topic through.
2. If Context7 misses or returns irrelevant material, discover the library's
   official documentation with an available search provider. Preserve version and
   official-source constraints; this fallback does not admit community tutorials.
3. Inspect the returned passages or page. Identify excerpt-only access and any
   version mismatch instead of treating library resolution as claim verification.

## web

1. Resolve `providers.web` or the explicit `--provider` override. Use
   `oma search providers` for registration, selection and credential metadata.
   `oma doctor` checks credential presence, not key validity, quota or API
   reachability. Preserve an adapter's reported credential error.
2. For `native`, use the web-search tools exposed by the current runtime. The CLI
   cannot substitute for an unavailable runtime-native tool.
3. For `brave` or `exa`, use the selected CLI adapter:

   ```bash
   oma search web "<query>" --provider brave
   oma search web "<query>" --provider exa
   ```

   Execute only the selected command. Default credential sources are
   `BRAVE_SEARCH_API_KEY` / vault `brave-search` and `EXA_API_KEY` / vault
   `exa-search`; configured references take precedence. Never print key values.
4. Preserve query, source, date and version constraints. Collect actual result
   URLs. Search excerpts do not establish that the complete source was read.
5. An unavailable or unauthenticated explicit provider is a failed route, not an
   empty result and not permission to switch providers. A permitted provider
   switch must be named. If discovery yields no URL, refine or report no result;
   do not call a URL reader with an invented target.

## code

Use `oma search code "<query>"`, which wraps `gh search code` or `glab api`.
Preserve explicit host/repository constraints. Use `--host gitlab` for an explicit
GitLab host, and `--language`, `--repo` and `--limit` when requested. Default to
GitHub only when no host constraint exists.

Retain repository, file path, match context and revision when available. A match
on a hosting domain does not establish ownership or implementation correctness.

## fetch

Use this route only with a URL supplied by the user or discovered by a search.
Read it through an available runtime URL reader/browser or the CLI:

```bash
oma search fetch <url>
```

The CLI owns retrieval strategies and archive recovery. Use
`oma search fetch --help` for available controls instead of duplicating the
strategy implementation in this skill. Retain access/authentication errors,
returned retrieval provenance and archive snapshot dates. An archived page does
not establish current state.

Useful flags include `--only`, `--skip`, `--timeout`, `--locale` and `--pretty`.
Exit codes: 0=ok, 2=blocked, 3=not-found, 4=invalid-input, 5=auth-required,
6=timeout, 1=error. Follow `error-playbook.md` for a failed retrieval.

## Local-code handoff

Local project symbols, files and references are outside this router. Use the
configured code-intelligence capability directly under
`../../_shared/core/code-intelligence.md`. Do not install or track a repository,
silently switch providers, or broaden native search beyond that contract.

## Results

Keep route, actual provider, title, URL or file reference, source type, relevance,
content-read status and the passage supporting the answer. Distinguish full
content, inspected excerpts and unread search results. Include publication date,
retrieval time, source version/revision and archive/fallback limits when observed;
leave unknown fields unknown. Deduplicate URLs and preserve source constraints.

The parent skill does not require a fixed report layout or a numeric trust lookup.
Use `trust-registry.md` for provenance interpretation and optional diagnostics.
