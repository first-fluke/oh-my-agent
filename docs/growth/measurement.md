# Adoption measurement

Run the aggregate report from the repository root with Bun and an authenticated
GitHub CLI:

```sh
bun scripts/adoption-report.ts
bun scripts/adoption-report.ts --repo first-fluke/oh-my-agent --package oh-my-agent \
  --out .agents/results/adoption/baseline.json
```

The default output is `.agents/results/adoption/YYYY-MM-DD/snapshot.json`, using
the collection date in UTC. A second run on the same day replaces that file;
choose a different `--out` to retain both observations. Snapshot files use mode `0600`.
Keep owner analytics in the ignored `.agents/results/` directory.

The report reads existing GitHub authentication through `gh api`, requests npm's
public download API, and writes local JSON. It records aggregate counts without
listing stargazers, fetching user profiles, or collecting product usage events.
It adds no application telemetry, tracking pixels, scheduler, or publishing step.

## Collected sources

| Source | Window | Meaning |
|---|---|---|
| GitHub repository | Collection time | Current `stargazers_count`, not stars gained during a campaign. |
| GitHub views and clones | API's last 14 days, daily UTC buckets | Returned `count`, `uniques`, and every returned daily bucket. Views, clones, and people are different measures. |
| GitHub top referrers | API's last 14 days, at most ten referrers | Returned source names, counts, and uniques. This is not a complete channel attribution log. |
| npm downloads | Last 30 available days | Exact inclusive `start`/`end` returned by npm, daily downloads, and their sum. Downloads include automated activity and repeated downloads. |

GitHub traffic responses do not provide explicit calendar bounds for their whole
window. Their report periods identify `github_last_14_days` with null bounds;
the views/clones retain actual UTC timestamps for the returned daily buckets.
The referrer endpoint has no daily breakdown. The collector does not invent
dates from the local clock or infer missing zero-activity days. npm's returned
window may lag the collection date; preserve it rather than assuming yesterday.

Every source has an endpoint, period, status, nullable metrics, and an error.
`ok` with a count of `0` means the API returned zero. `unavailable` or `error`
has `metrics: null`; those states are unknown, not zero. A complete run exits
`0`; a saved partial report exits `1`; invalid arguments or a failed local write
exit `2`. Each request has a ten-second timeout and no automatic retry.

Traffic requires repository access. Start with `gh auth status` if GitHub sources
are unavailable, then verify the account's traffic permissions. The report never
reads or prints the token or raw GitHub CLI error output. Fix access and rerun;
retain the partial file when it explains a measurement gap.

API contracts: [GitHub repository traffic](https://docs.github.com/en/rest/metrics/traffic),
[npm download counts](https://github.com/npm/registry/blob/main/docs/download-counts.md).

## Baseline and a manual follow-up

1. Save a baseline before the next distribution change. Record the commit,
   channel, exact post URL, publication timestamp, destination URL, and any
   campaign parameters in a local note beside the JSON.
2. Copy owner-visible impressions, link clicks or visits, and the analytics
   observation time from each post's own analytics. Keep the platform's metric
   label and measurement window. Mark unavailable values as unknown.
3. Run the report again after seven days and save a separate snapshot. This is
   a manual check; no scheduled job is installed. Daily GitHub buckets can be
   compared over matching dates, but the two rolling 14-day totals overlap.
4. Record voluntary first-task feedback through the existing
   [question](https://github.com/first-fluke/oh-my-agent/issues/new?template=04-question.md)
   or [bug](https://github.com/first-fluke/oh-my-agent/issues/new?template=01-bug.md)
   template. Useful details are the selected skill or full setup, runtime and
   version, one intended task, the observed result and verification, and an
   optional return-use or recommendation note. Feedback is public and voluntary;
   contributors choose what to disclose and can omit private code and credentials.
5. Review one stage at a time: exposure, destination visits, first-task evidence,
   and repeat-use or independent recommendations. A copied install command or
   downloaded package alone does not establish a completed task.

Do not divide historical post impressions by a current GitHub traffic window,
sum uniques across platforms, equate downloads with installations or users, or
attribute a star change to a channel without a matching observation window and
attribution evidence. The report emits no conversion or causal ratios. Voluntary
feedback is a sample, not a count of all users.

## Existing star history

`.github/workflows/stargazers-daily.yml` already runs daily at 00:00 UTC and on
manual dispatch. It stores `STARGAZERS.md` on the separate `stargazers-data`
branch, compares account lists, and fetches profile summaries for removed
accounts. Consult that existing history for star changes instead of duplicating
its account-level collection. The local adoption report adds current aggregate
traffic and download observations; it neither runs that workflow nor changes
its branch or privacy settings. A new snapshot does not identify which users
arrived from a promotion or completed a task.
