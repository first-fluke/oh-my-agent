# Skill Routing

Use this map when selecting a specialist or coordinating an authorized multi-agent task. Route by the requested outcome and concrete dependencies, not a keyword alone. Choosing a skill does not start a workflow or authorize delegation.

## Context and ownership

The runtime exposes skill names and descriptions for discovery. Read the owning SKILL.md when the task matches its scope or the user invokes it, under the host's skill rules. Load supporting references only when needed (`context-loading.md`). Use one owning specialist for a scoped task; add a handoff only when it supplies a distinct needed capability.

| Requested outcome | Owning skill |
|---|---|
| Application API, server auth, service/data access logic | `oma-backend` |
| Schema, migration design, indexing, query tuning, database operations | `oma-db` |
| Web components, pages, forms, client state | `oma-frontend` |
| Mobile screens, widgets, platform integration | `oma-mobile` |
| System boundaries, architecture tradeoffs, ADR | `oma-architecture` |
| Diagnose and fix incorrect behavior | `oma-debug` |
| Review correctness, security, accessibility, performance | `oma-qa` |
| Visual system, DESIGN.md, redesign direction | `oma-design` |
| Requested ideation or alternative exploration | `oma-brainstorm` |
| Requirements, dependencies, acceptance criteria | `oma-pm` |
| Requested parallel specialist execution | `oma-orchestration` |
| Requested manual multi-agent coordination | `oma-coordination` |
| Git branches, commits, merges, repository history | `oma-scm` |

For other domains, select from the installed skill descriptions. Preserve explicit task ownership and vendor/model configuration.

## Dependencies

- Resolve an unsettled architecture or product decision before work that depends on it. Existing decisions do not need to pass through architecture, brainstorming, or PM again.
- Backend and client work may proceed independently when their shared API contract is usable. If it is missing, settle that boundary with the relevant owners; use `api-contracts/README.md` when a contract artifact is needed.
- Review can start on a completed, reviewable portion while independent implementation continues. Do not review an unstable artifact as final evidence.
- A bug found during implementation can be fixed by its owner. Add debug assistance when diagnosis warrants it; there is no required implementation-to-debug chain.
- For a cross-domain defect, identify the failing contract and responsible owner from evidence. An API mismatch does not automatically mean the backend must change.

## Dispatch and completion

Use `vendor-detection.md` when dispatch details are unresolved. Parallelize only independent work within the authorized task and available runtime. Each dispatched task needs ownership, acceptance criteria, relevant context, and the runtime's result contract.

A difficulty estimate does not impose fixed per-agent turn limits. Respect explicit user/runtime budgets and preserve partial progress when a real limit is reached. Completion and unresolved decisions follow `execution-policy.md`.
