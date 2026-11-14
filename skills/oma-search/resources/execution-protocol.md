# Search and retrieval execution

The parent SKILL.md owns route selection, execution order, failure rules and the
result fields. Load the selected route here.

## docs

1. Resolve the library with Context7 `resolve-library-id`, then query the relevant
   documentation with `query-docs`. Carry the requested version and topic through.
2. If Context7 misses or returns irrelevant material, discover the library's
   official documentation with an available search provider. Preserve version and
   official-source constraints; this fallback does not admit community tutorials.
3. Inspect the returned passages or page. Identify excerpt-only access and any
   version mismatch instead of treating library resolution as claim verification.

## web

1. Resolve `providers.web` or the explicit `--provider` override.
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
4. Collect actual result URLs. Search excerpts do not establish that the complete
   source was read.

## code

Use `oma search code "<query>"`, which wraps `gh search code` or `glab api`.
Use `--host gitlab` for an explicit GitLab host, and `--language`, `--repo` and
`--limit` when requested. Default to GitHub only when no host constraint exists.

Retain repository, file path, match context and revision when available. A match
on a hosting domain does not establish ownership or implementation correctness.

## fetch

Read the URL through an available runtime URL reader/browser or the CLI:

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
