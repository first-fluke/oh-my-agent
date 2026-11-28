---
name: ralph
description: Deprecated alias of oma-mode. Repeats work until an independent judge passes every completion criterion
disable-model-invocation: true
---

- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **`/ralph` is deprecated.** It no longer wraps `ultrawork` and has no steps of its own. It runs the `oma-mode` workflow, which carries the completion criteria, the independent judge, and the iteration limit that `/ralph` used to own.

---

## Run oma-mode

Read `.agents/workflows/oma-mode.md` and follow it from Step 1 with the user's request as the goal, with two settings fixed:

1. **Criteria are required.** A request without a mechanically verifiable finish condition still gets completion criteria derived in Step 1; state them before the first route runs.
2. **Every iteration is judged.** Step 5 dispatches the judge after every route that changed the project. The exception that lets the session verify a single stated edit directly does not apply here.

Tell the user once, in the first reply, that `/ralph` is deprecated and that `/oma-mode` does the same work.
