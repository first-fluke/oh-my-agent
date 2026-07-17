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

## detect-trap exit 2 - Demographic Shopping Pattern

Cause: Topic matches a broad gift/present query for a demographic group (e.g., "gift ideas for a 10 year old", "best headphones for men") with no market-qualifying context (budget, hobby, use-case).

Recovery steps (user-facing): User must add a market qualifier before retrying. Provide examples:

```
Instead of: "gift ideas for a 10 year old"
Try:        "STEM toy market pain points for 8-12 year olds"

Instead of: "best headphones for men"
Try:        "wireless headphone user complaints"
```

The skill does NOT retry automatically on exit 2. The user must re-invoke with a revised topic.

## detect-trap exit 2 - Single-Noun Too Broad

Cause: Topic is a single common noun on the stop list (sneakers, shoes, food, music, books, games, phones, laptops, ai, crypto, nft, sports, fashion) with no qualifying context, producing high-volume, low-signal results across unrelated niches.

Recovery steps (user-facing): User must narrow the topic with an audience, use case, or pain point. Provide examples:

```
Instead of: "CRM"
Try:        "CRM onboarding pain points"

Instead of: "AI"
Try:        "AI coding assistant adoption trends"
```

The skill does NOT retry automatically on exit 2. The user must re-invoke with a revised topic.

## Personal-advice / PII refusal (agent-level gate, not detect-trap)

detect-trap only automates the two classes above; it does not detect personal-advice or PII-targeting queries ("should I learn Python", "best credit card for me", a private individual's personal data). That refusal happens at the agent level before the pipeline starts (see `.claude/rules/market.md` rule 10). Reframe such queries with a market qualifier before invoking harvest, e.g. "should I learn Python" -> "Python developer job market trends", "best credit card for me" -> "credit card user pain points".
