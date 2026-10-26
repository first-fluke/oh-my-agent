# Search routing examples

These examples describe routing and evidence boundaries. They are not records of
live searches and do not supply fabricated result lists.

## Version-specific documentation

```text
Request: React 19 useEffect official docs
Route: docs
```

Resolve the library with Context7 and inspect relevant documentation. Preserve
React 19. If resolution fails, search official React documentation; report if the
requested version cannot be established. Do not label an excerpt verified solely
because Context7 returned it.

## Selected web provider

```bash
oma search web "Redis pub/sub use cases" --provider exa
```

Use Exa for this request. If its required credential is absent, report that
failure; do not silently return native-search results. A configured Brave request
uses the same provider-selection boundary with `--provider brave`.

## No candidate URL

```text
Request: Compare current approaches to a topic
Route: web
Result: No search provider or candidate result URL is available
```

Report the search limitation or refine within the original scope. Do not call
`oma search fetch` with a guessed URL as a replacement for discovery.

## Known URL

```text
Request: Read https://example.org/article
Route: fetch
```

Read that URL with an available reader or the retrieval CLI. Record access and
content-read status. If only an archive is available, retain its snapshot date
and avoid using it to establish current state.

## Remote implementation

```bash
oma search code "OAuth PKCE" --language TypeScript --repo owner/repository
oma search code "CI pipeline caching" --host gitlab --repo group/project
```

Each command illustrates a separate request. Retain the chosen host, repository,
file path and inspected match context. Hosting on GitHub/GitLab alone does not
establish that a repository is the authoritative source.

## Local code

```text
Request: Find handleAuth in this project
Action: Hand off to configured code intelligence
```

Do not invoke an external search provider or route local work through this skill.

## Source constraints

```text
Request: --strict JWT refresh token rotation
Route: web
```

Keep suitable primary or official sources whose inspected content supports the
answer. If no such evidence is available, report the gap. `--wide` can include
broader labeled results, but never relaxes an explicit official-site, repository,
version or date constraint. No score table or automatic web/docs fanout is needed.
