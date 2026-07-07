# Recovery steps for common oma-market failures — consult when a CLI stage exits with an error code.

## harvest exit 2 - All Sources Blocked

Cause: Every configured source returned 429, 403, or auth failure.

Recovery steps:
1. Check env keys if keyed sources were requested (X_BEARER_TOKEN, SCRAPECREATORS_API_KEY, PERPLEXITY_API_KEY; GITHUB_TOKEN raises github rate limits). reddit, hn, bluesky, mastodon, github, and grounding are keyless.
2. Retry with `--window 90d` to widen the harvest window (more cache-eligible content).
3. Try `--sources reddit` to isolate a single known-working source.
4. If all sources are blocked, the run cannot proceed. Report to user:

```
All configured sources are currently unavailable. Check your API keys or try again later.
Use --sources to restrict to a source you know is accessible.
```

## harvest per-source timeout

Cause: One or more source adapters exceeded the per-request time limit. Timed-out sources land in `sources_failed`; harvest still exits 0 while at least one source succeeds (exit 2 only when all fail).

Recovery steps:
1. Reduce result set with `--per-source-limit 6` (default is 12).
2. Add `--no-cache` to bypass a stale cache that may be causing retry loops.
3. Try `--sources hn` or `--sources reddit` to exclude slow sources.
4. If timeout persists on a single source, open an issue against the source adapter.

## render zero clusters - No Clusters Produced

Cause: score + fuse + cluster pipeline produced 0 clusters above the trust threshold.

Recovery steps:
1. Widen window: re-harvest with `--window 90d`.
2. Drop operator pack: re-harvest with `--operator-pack none` (removes topic-narrowing clauses that may exclude all signals).
3. Loosen trust filter on render: `--min-trust external` (levels: `verified` > `community` > `external`).
4. If zero clusters persist after all three steps, report to user:

```
No market signals found for this topic in the configured window and sources.
The topic may be too niche, too new, or misspelled. Try a broader rephrasing.
```

## detect-trap exit 2 - Personal Advice Trap

Cause: Topic classified as a personal decision (interest, budget, relationship) rather than a market signal.

Recovery steps (user-facing): User must add a market qualifier before retrying. Provide examples:

```
Instead of: "should I learn Python"
Try:        "Python developer job market trends"

Instead of: "best credit card for me"
Try:        "credit card user pain points"

Instead of: "is my startup idea good"
Try:        "async standup tools user pain"
```

The skill does NOT retry automatically on exit 2. The user must re-invoke with a revised topic.
