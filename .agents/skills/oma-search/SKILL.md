---
name: oma-search
description: "Find external documentation, web sources, or remote code with citations. Local code navigation uses the configured code tools."
---

# Search Router

## Scheduling

### Goal
Route an information request to the appropriate channel and return relevant sources with trust labels.

### Intent signature
- Search, find, look up, reference docs, inspect official APIs, or search remote code.
- Another skill requests docs, web, code, or local search with a query and constraints.

### When to use
- Library documentation, web research, GitHub/GitLab implementation patterns, or unclear search channels.

### When NOT to use
- Pure local code exploration -> use configured code intelligence under the shared contract.
- Git history/blame -> `oma-scm`; architecture analysis -> `oma-architecture`.

### Expected inputs
Query, optional route hint (`docs`, `web`, `code`, `local`), source/recency constraints, and flags. Explicit `--docs`, `--code`, or `--web` selects the route; `--strict` filters trust, `--wide` retains labeled results, and `--gitlab` selects the remote code host.

### Expected outputs
Ranked sources with URL or file reference, route, relevance, trust level/score, and material fallback limits. Do not invent sources when no reliable result is found.

### Dependencies
Context7 for docs, runtime web search, `oma search`/`gh`/`glab` for remote code, and configured code intelligence or native local search.

## Structural Flow

### Routes
| Route | Primary | Fallback | Use for |
|---|---|---|---|
| `docs` | Context7 `resolve-library-id` → `query-docs` | Web search | Official API/framework documentation |
| `web` | Runtime web search | `oma search fetch <url>` for known result URLs | Web sources |
| `code` | `oma search code` | Report unavailable host/auth | Remote repository patterns |
| `local` | Configured code-intelligence provider | Native search and scoped reads | Current project files and symbols |

### Failure and recovery
- Missing/empty documentation lookup: use web search and state the fallback.
- A known URL cannot be fetched: use the fetch strategies in the route reference; retain authentication/blocking errors if all strategies fail.
- Configured local tools unavailable or timed out: follow `../_shared/core/code-intelligence.md`.
- Unknown trust: retain the result as `unknown` with score `—`; do not imply verification.
- No result satisfies `--strict`: report that outcome and offer a wider or narrower query.

### Exit
Return evidence-backed results and disclose failed routes or source limitations. A domain score alone does not verify an individual claim.

## Logical Operations

### Canonical workflow path
1. Parse the query and explicit flags. Use `resources/intent-rules.md` only when classification is needed; select one route unless ambiguity requires more.
2. Dispatch using Routes. Load `resources/execution-protocol.md` for the selected channel's command flags, fetch strategies, or normalization details.
3. Collect source references and deduplicate by URL. For non-local results, resolve domain trust using `resources/trust-registry.md`; reuse the current session cache. Apply `--strict` after scoring.
4. Rank by relevance, using trust as a tiebreaker. Return the requested answer or source list with supporting references and fallback limitations.

### CLI entry points
```bash
oma search code "<query>" [--host gitlab] [--language <lang>] [--repo <owner/repo>]
oma search trust <domain>
oma search fetch <url>
```
The CLI also exposes `api`, `api:search`, `meta`, `rss`, `rss:google`, `media`, `archive`, and `doctor`; use a primitive only when the selected route needs it.

### Guardrails
- Explicit route/source constraints take precedence over automatic classification.
- Score at domain level, not URL-path or page level. Use the CLI registry and the documented Context7/official-site exceptions; do not invent scores.
- Do not duplicate successful routes or search locally via the web.
- Use available runtime web tools and the configured local provider; do not install or track a repository automatically.

### Resource scope and effects
Search may contact external services or inspect local code and spawn `gh`/`glab` processes. Query constraints, selected sources, and trust metadata are session context; persistent caches belong in generated state, not skill definitions.

## References
- Intent classifier: `resources/intent-rules.md` (no explicit route or ambiguous query)
- Route execution detail: `resources/execution-protocol.md` (selected channel only)
- Trust resolution and cache rules: `resources/trust-registry.md` (non-local sources)
- Recovery detail: `resources/error-playbook.md` (route failures)
- Result checklist: `resources/checklist.md` (applicable route checks)
- Examples: `resources/examples.md` (unfamiliar input/output contracts)
- Local code-intelligence contract: `../_shared/core/code-intelligence.md`