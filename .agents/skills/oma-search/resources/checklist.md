# Search result checks

## Route and scope

- The route matches the requested outcome: `docs`, `web`, `code` or `fetch`.
- Pure local-code work went directly to configured code intelligence.
- Explicit route, provider, host, repository, version, date and source constraints
  remain intact through recovery.
- One primary route ran; any additional route addresses an identified evidence gap.
- Web discovery used the configured/requested provider. An explicit provider's
  credential or availability failure was not silently replaced by native search.
- URL retrieval used an actual supplied/discovered URL, not a fabricated search
  fallback target.

## Evidence

- Source references are real, relevant and deduplicated.
- The actual route/provider and source type are identified when known.
- Full-content, excerpt-only and unread-result status are distinguishable.
- Each substantive answer claim has inspected supporting material; search snippets,
  provider identity and hosting domains are not treated as verification.
- Observed dates, versions, revisions and archive provenance are retained. Unknown
  metadata remains unknown.

## Modifiers and limits

- `--strict` is supported by suitable primary/official content, or its evidence gap
  is reported. No domain-score upgrade is used to make a result pass.
- `--wide` preserves broader results with limits while retaining explicit scope.
- Optional numeric domain diagnostics are labeled separately and copied from the
  CLI unchanged; ordinary results do not require a score lookup.
- Provider, access, freshness and version failures are reported. No fake results,
  successful empty response for an auth error, or automatic retry loop is present.

Return the requested answer or source list. A fixed header, numbered layout,
score badge or decorative report template is not required.
