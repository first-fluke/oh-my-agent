# Route selection

Select from the requested outcome, supplied input and constraints. Keywords can
help interpret context but do not override what the user is trying to obtain.
The parent SKILL.md owns execution order.

## Selection order

1. Preserve explicit route, provider, source, host, repository, version and date
   constraints. `--docs`, `--code` and `--web` select the search route;
   `--gitlab` selects the code host.
2. Hand pure local-code navigation directly to configured code intelligence.
3. Read a supplied or discovered URL with `fetch` when the requested result is its
   contents. A GitHub URL is not by itself a request for code-pattern search.
4. Use `docs` for a library/API contract or official version-specific instructions,
   `code` for remote implementation matches, and `web` for external discovery such
   as comparisons or current events.
5. Choose one primary route from the available context. If an unresolved ambiguity
   materially changes the answer, clarify that ambiguity. Add a supporting route
   only for a specific remaining evidence gap; do not run `web` and `docs` as an
   automatic fallback.

## Source modifiers

| Modifier | Meaning |
|---|---|
| `--strict` | Keep suitable primary/official sources with inspected content supporting the requested claim; disclose gaps |
| `--wide` | Retain broader sources, including unknown provenance or unread results, with clear limitations |
| Web-provider override | Use the selected web provider without changing persistent configuration |

These modifiers preserve explicit constraints. `--wide` does not turn an
`--docs` request into a community search. Domain-score diagnostics are optional
and never replace content evidence.

## Examples

| Request | Primary action | Constraint |
|---|---|---|
| React 19 useEffect API | `docs` | Check the requested version |
| Next.js versus Remix | `web` | Discover comparative sources |
| OAuth PKCE implementation in a named repository | `code` | Retain repository and language filters |
| Read this GitHub file URL | `fetch` | Read that file; do not infer a broad search |
| Find handleAuth in this project | Local-code handoff | Use configured code intelligence directly |
| No result URLs were discovered | Refine or report the search gap | No fabricated URL for `fetch` |

Multi-language skill activation is managed by the project's trigger definitions;
this resource selects the route after the skill is invoked.
