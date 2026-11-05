---
name: oma-search
description: Find external documentation, web sources, or remote code with
  citations. Local code navigation uses the configured code tools.
---

# Search Router

## Scheduling

### Goal
Select the search or retrieval channel needed by the request and return sources
with supporting evidence and retrieval limits.

### Intent signature
- Find external documentation, web information, or remote implementation examples.
- Read a known external URL or supply external sources to another skill.

### When to use
Library documentation, web research, remote code search, known-URL reading, and
requests whose external source channel needs selection.

### When NOT to use
- Pure local code exploration -> use configured code intelligence directly under
  `references/_shared/core/code-intelligence.md`; do not dispatch this skill.
- Git history/blame -> `oma-scm`; architecture analysis -> `oma-architecture`.

### Expected inputs
Query or known URL; optional route hint (`docs`, `web`, `code`, `fetch`); version,
recency, host, repository and source constraints; optional web-provider override.
Explicit `--docs`, `--code` or `--web` selects the search route. `--gitlab` selects
the remote code host. `--strict` requires suitable primary or official sources
with inspected supporting content; `--wide` includes broader results with their
limitations. These modifiers preserve the request's source constraints.

### Expected outputs
An answer or relevant source list with source URL/file reference, route, actual
provider, source type, content-read status, supporting evidence and material
limitations. Include publication, retrieval and version details when observed.
Do not invent results, dates, sources or certainty.

### Dependencies
Context7 for documentation; the configured `providers.web` (`native`, `brave` or
`exa`) for web discovery; `oma search code`/`gh`/`glab` for remote code; runtime
retrieval tools or `oma search fetch` for known URLs. `oma search providers`
reports registration, selection and credential metadata; `oma doctor` checks
credential presence without verifying validity or API reachability.

## Structural Flow

### Routes
| Route | Execution | Scope |
|---|---|---|
| `docs` | Context7 library resolution and queries; official-site discovery when needed | Official documentation within requested version constraints |
| `web` | Selected web provider: runtime tools for `native`, CLI adapter for `brave` or `exa` | Discover URLs relevant to a query |
| `code` | `oma search code` through the selected code host | Remote implementation matches within host/repository constraints |
| `fetch` | Available URL reader/browser or `oma search fetch <url>` | Read a URL already supplied or discovered |

### Failure and recovery
- Missing/empty documentation lookup: use official-site discovery while retaining
  the documentation route's version and source limits.
- Selected web provider unavailable, unauthenticated or rate-limited: report its
  failure. Do not silently replace an explicit provider choice with native search.
- Search returns no candidate URLs: refine within the original constraints or
  report no result. URL retrieval cannot replace missing search results.
- A known URL cannot be read: use the retrieval-specific recovery reference and
  preserve access/authentication errors and archive provenance.
- No source meets `--strict`: report the source or evidence gap. A broader result
  set does not automatically satisfy the strict request.

### Exit
Return supported results and disclose failed routes, unread sources, stale or
archived content, and version limits. A provider name or domain label does not
verify an individual claim.

## Logical Operations

### Canonical workflow path
1. Resolve the requested outcome and constraints. Hand pure local-code requests
   directly to configured code intelligence. For external work, select one primary
   route; use `resources/intent-rules.md` only when selection is unclear.
2. Execute that route using `resources/execution-protocol.md`. Resolve the web
   provider from configuration or the request override. Add another route only
   when the remaining evidence gap needs it; do not fan out by default.
3. Read the relevant content needed to support the answer. Retain URLs and
   inspection status, deduplicate results, and apply source/version constraints.
   Use `resources/trust-registry.md` for provenance rules or an explicitly needed
   optional domain diagnostic; no numeric lookup is required for ordinary results.
4. Rank by relevance and source suitability for the question. Return the requested
   answer or sources with evidence, the actual route/provider and material limits.

### CLI entry points
```bash
oma search providers
oma search web "<query>" [--provider <id>] [--limit <n>]
oma search code "<query>" [--host gitlab] [--language <lang>] [--repo <owner/repo>]
oma search fetch <url>
oma search trust <domain>
```
Use `api`, `rss`, `meta`, `media`, `archive` or `doctor` only when the selected
operation needs that primitive. `trust` remains an optional domain diagnostic.

### Guardrails
- Preserve explicit route, provider, source, host, version and date constraints.
- Keep query discovery separate from reading an existing URL.
- Treat search snippets and excerpts as limited evidence; identify unread sources.
- Do not manufacture trust scores or promote Context7/GitHub results to claim-level
  verification based on their provider or hosting domain.
- Do not repeat successful routes, search local project files via the web, install
  a provider or track a repository automatically.

### Resource scope and effects
Search may contact external services and spawn configured provider or code-host
processes. Retrieval may launch an available browser. Query constraints and
provenance are session context; persistent caches belong in generated state, not
skill definitions. Local source navigation belongs to the configured code tools.

## References
- Route selection: `resources/intent-rules.md` (unclear external request)
- Execution: `resources/execution-protocol.md` (selected route only)
- Provenance and optional domain diagnostics: `resources/trust-registry.md` (source/evidence interpretation)
- Recovery: `resources/error-playbook.md` (route failure)
- Result checks: `resources/checklist.md` (applicable source and evidence checks)
- Examples: `resources/examples.md` (unfamiliar input or boundary)
- Local-code handoff: `references/_shared/core/code-intelligence.md` (local requests)