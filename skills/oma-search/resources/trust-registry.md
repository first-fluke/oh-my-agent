# Trust Registry Reference

Domain trust scoring strategy for search results.

**Single source of truth: the CLI.** Resolve every score by running:

```bash
oma search trust <domain>
# → { "domain": "...", "level": "verified|community|external|unknown",
#     "score": 0.95, "tags": ["..."], "source": "registry|heuristic|tranco" }
```

The registry, heuristics, and Tranco fallback are implemented in
`cli/commands/search/trust.ts`. Do NOT hand-score domains or call ranking
APIs directly; this document describes what the CLI returns so you can
interpret it.

## Trust Levels

| Level | Score Range | Label | Description |
|-------|-----------|-------|-------------|
| verified | 0.85-0.95 | **** | Official documentation, vendor sites, standards bodies |
| community | 0.50-0.75 | *** | User-generated, curated platforms |
| external | 0.20-0.49 | ** | Third-party content sources |
| unknown | (none) | (none) | Cannot determine trust level |

## Scoring Rules

1. **Domain-level only**: score applies to the entire domain, not sub-paths
2. **Unknown domains are NOT excluded**: they appear with `—` label
3. **`--strict` filter**: only shows results with score >= 0.85 (verified+)
4. **Sort tiebreaker**: when relevance is equal, higher trust score ranks first

## How the CLI Resolves a Score

Resolution order inside `oma search trust` (first hit wins):

### 1. Static registry (`source: "registry"`)

Enumerated domains with fixed scores. Representative entries
(see `trust.ts` REGISTRY for the full list):

| Domain | Level | Score | Tags |
|--------|-------|-------|------|
| `github.com`, `gitlab.com` | verified | 0.95 | code-host |
| `docs.github.com`, `developer.mozilla.org`, `typescriptlang.org`, `react.dev`, `go.dev`, `rust-lang.org`, `python.org`, `nodejs.org` | verified | 0.95 | lang-docs |
| `w3.org`, `tc39.es`, `ietf.org`, `datatracker.ietf.org`, `owasp.org` | verified | 0.95 | standards |
| `doi.org` | verified | 0.95 | academic |
| `nextjs.org`, `vercel.com` | verified | 0.90 | vendor |
| `npmjs.com`, `pypi.org`, `crates.io`, `pub.dev` | verified | 0.90 | registry |
| `arxiv.org` | verified | 0.90 | academic |
| `wikipedia.org` | community | 0.75 | encyclopedia |
| `stackoverflow.com`, `stackexchange.com` | community | 0.70 | qna |
| `news.ycombinator.com` | community | 0.65 | news |
| `reddit.com` | community | 0.55 | forum |
| `freecodecamp.org`, `baeldung.com` | external | 0.45 | tutorial |
| `dev.to` | external | 0.40 | blog |
| `medium.com`, `hashnode.com`, `substack.com` | external | 0.35 | blog |
| `velog.io`, `tistory.com` | external | 0.30 | blog, kr |
| `w3schools.com`, `geeksforgeeks.org` | external | 0.30 | tutorial |

### 2. Heuristic patterns (`source: "heuristic"`)

| Pattern | Level | Score | Rationale |
|---------|-------|-------|-----------|
| TLD `*.gov`, `*.edu`, `*.mil` | verified | 0.90 | Institutional domains |
| `*.gov.xx`, `*.ac.xx` (country codes) | verified | 0.85 | Institutional domains |
| `docs.*` or `*.docs.*` subdomain | verified | 0.90 | Official documentation subdomain |
| `developer.*` / `developers.*` subdomain | verified | 0.85 | Developer portal convention |

### 3. Tranco popularity prior (`source: "tranco"`)

For domains missing both above, the CLI queries the Tranco list
(`tranco-list.eu` API, SSRF-guarded) and maps rank to a conservative score:

| Tranco Rank | Level | Score |
|-------------|-------|-------|
| < 10,000 | community | 0.60 |
| < 100,000 | external | 0.40 |
| >= 100,000 | external | 0.20 |
| Not ranked / API failure | unknown | `—` |

**Popularity is a prior, not authority**: the Tranco path is capped at 0.60,
so a merely-popular domain can never reach `verified` or pass `--strict`.

## Agent-Level Rules (outside the CLI)

Two cases the CLI cannot decide are handled by the agent:

1. **Context7-resolved docs**: results returned by the `docs` route come from
   Context7 library resolution — label them `verified 0.95` (tag `lib-docs`)
   without a CLI lookup; resolution IS the verification.
2. **Official-site upgrade (upgrade-only)**: when a result domain is
   self-evidently the official site of the queried library or vendor
   (e.g. `htmx.org` for an htmx query, `redis.io` for Redis), the agent may
   assign `verified 0.90` with tag `official-site` even if the CLI returns a
   lower score. Downgrades are never allowed; every other domain uses the CLI
   score as-is.

## Caching

Cache resolved scores in Serena memory to avoid repeated CLI calls within a
project:

```
write_memory("trust-registry-cache", resolved_scores)
read_memory("trust-registry-cache")
```

Cache is project-scoped and survives skill updates.

## Lookup Algorithm

```
1. Extract domain from result URL (strip protocol, path, query)
2. Check Serena memory cache (trust-registry-cache)
3. If cache miss → run `oma search trust <domain>`
4. Apply agent-level rules (Context7 docs label, official-site upgrade)
5. Attach [level, tags, score] to result; unknown → label `—`, keep result
6. Write newly resolved scores to cache
```
