# Context Loading

Read the routed skill once. Its references are an index, not a preload list.

## Selecting context

- Start with the task, acceptance criteria, and the owning skill's SKILL.md.
- Read a supporting document only when its stated trigger applies. Existing project conventions take precedence over starter examples.
- Load execution-protocol.md when its selected operation needs command, schema, or recovery detail; its existence alone is not a trigger.
- Load only the selected framework or platform reference. Generated stack/ files describe the project; variants/ are starter material for /stack-set, not mandatory reading for existing-code edits.
- Consult relevant checklist sections for unresolved verification requirements. Read an error playbook only for the observed failure.
- Read difficulty-guide.md for decomposition decisions, not before every task. Difficulty does not activate extra skills or full checklists.
- Runtime transport, authorization, and result contracts are injected once by CLI dispatch. Native agents read those contracts if not already supplied.

## Conditional shared resources

| Resource | Load when |
|---|---|
| `../conditional/quality-score.md` | The task needs a defined baseline or experiment comparison |
| `../conditional/experiment-ledger.md` | Recording an actual experiment |
| `../conditional/exploration-loop.md` | Repeated recovery fails on the same issue and alternative mechanisms merit testing within budget, or the user requests exploration |
| `common-checklist.md` | A broad cross-domain review needs its applicable checks |
| `context-budget.md` | Managing a long task or diagnosing context overhead |
| `../runtime/memory-protocol.md` | Coordinating agents or resuming durable task state |

## Runtime selection

The graph records references, not permission to load them. The context loader injects the owning entry skill and defers its supporting references. Cross-routes to another specialist do not inject that specialist's body.

Difficulty selects a soft size budget. If the entry skill exceeds it, retain the entry and report the overrun. Do not replace it with smaller unrelated documents. Explicitly requested supporting references are checked against the graph and loaded within the remaining budget; deferred paths remain available for scoped reads.

## Subagent prompts

Pass the task ID, scope, acceptance criteria, material constraints, and relevant artifact paths. Identify the owning skill by path; do not paste its body if the runtime injects it. Pass a reference or guide section only when this task needs it. Preserve injected run/claim identity. Use `prompt-structure.md` when composing an unfamiliar handoff, not as another mandatory preload.
