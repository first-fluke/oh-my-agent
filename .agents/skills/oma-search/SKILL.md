---
name: oma-search
description: Intent-based search router with trust scoring. Routes queries to optimal channels (Context7 docs, native web search, gh/glab code search, Serena local) and attaches domain trust labels. Use for search, find, lookup, reference, docs, code search, and web research.
---

# Search Agent - Intent-Based Search Router

## When to use
- Finding official library/framework documentation
- Web research for tutorials, examples, comparisons, and solutions
- Searching GitHub/GitLab code for implementation patterns
- Any query where the search channel is unclear (auto-routing)
- Other skills needing search infrastructure (shared invocation)

## When NOT to use
- Local codebase exploration only -> use Serena MCP directly
- Git history or blame analysis -> use SCM Agent
- Full architecture research -> use Architecture Agent (may invoke this skill internally)

## Core Rules
1. **Classify intent before searching**: every query goes through IntentClassifier first
2. **One query, one best route**: avoid redundant multi-route unless intent is ambiguous
3. **Trust score every result**: all non-local results get domain trust labels from the registry
4. **Flags override classifier**: user-provided flags (`--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`) always take precedence
5. **Fail forward**: if primary route fails, fall back gracefully (docs->web, web->`oma search fetch` strategies)
6. **No additional MCP required**: Context7 for docs, runtime native for web, CLI for code, Serena for local
7. **Vendor-agnostic web search**: use whatever the current runtime provides (WebSearch, Google, Bing)
8. **Domain-level trust only**: do not attempt sub-path or page-level scoring

## Routes

| Route | Primary Tool | Fallback | Trigger |
|-------|-------------|----------|---------|
| `docs` | Context7 MCP (`resolve-library-id` → `query-docs`) | `web` route | Official docs, API reference |
| `web` | Runtime native search | `oma search fetch` (api/probe/impersonate/browser) | Tutorials, examples, solutions |
| `code` | `gh search code` / `glab api` | — | Implementation patterns, repos |
| `local` | Serena MCP (delegate) | — | Current project files, symbols |

## Default Workflow
1. **Parse** — Extract query, detect flags, classify intent
2. **Route** — Dispatch to the appropriate search channel(s)
3. **Collect** — Gather results from dispatched routes
4. **Score** — Attach trust labels to each result domain
5. **Present** — Format and rank results for the user

## Invocation

### Standalone
```
/oma-search "React Server Components streaming"
/oma-search --docs "Next.js middleware"
/oma-search --code "PKCE implementation"
/oma-search --strict "JWT refresh token rotation"
```

### Shared Infrastructure (from other skills)
Other skills reference oma-search by specifying intent and query:
1. State intent: `docs` | `web` | `code` | `local`
2. Pass query string
3. Use Trust Score in results to weigh source reliability

## How to Execute
Follow `resources/execution-protocol.md` step by step.
See `resources/examples.md` for input/output examples.
Use `resources/intent-rules.md` for intent classification reference.
Use `resources/trust-registry.md` for domain trust scoring reference.
Before submitting, run `resources/checklist.md`.

## Execution Protocol (CLI Mode)

Vendor-specific execution protocols are injected automatically by `oma agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.

## References
- Execution steps: `resources/execution-protocol.md`
- Intent classification: `resources/intent-rules.md`
- Trust registry: `resources/trust-registry.md`
- Examples: `resources/examples.md`
- Checklist: `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Context loading: `../_shared/core/context-loading.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`
