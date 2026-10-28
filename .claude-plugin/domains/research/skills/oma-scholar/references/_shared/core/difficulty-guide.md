# Task Decomposition

Use this guide when scope or dependencies make the execution approach unclear. Routine changes do not need a difficulty report or a separate planning phase.

## Choose the amount of planning

| Task characteristics | Approach |
|---|---|
| Clear change following an existing pattern | Inspect the affected behavior, implement, and run relevant checks |
| Several coupled changes or a material design choice | Identify dependencies and acceptance criteria; resolve the choice before dependent edits |
| Multiple independently verifiable outcomes or uncertain boundaries | Break work into deliverables, each with its own implementation and verification |

File counts and estimated turns are hints, not gates. Many repetitive file edits can be straightforward; a one-line authorization change can need careful regression testing. The CLI's Simple/Medium/Complex classifier selects a context size budget; it does not prescribe review depth or activate other agents.

## Decompose around behavior

- Use as many deliverables as dependencies require, without a fixed sprint count or turn quota.
- Keep tests and error handling with the behavior they verify. For authentication plus CRUD, verify authentication with its endpoints before integrating and testing protected CRUD paths.
- Use the project's declared checks and `test-approach.md` where applicable. A broad audit may use relevant sections of `common-checklist.md`; complexity alone does not require every check.
- Delegate only when authorized and when independent work can proceed. Follow `skill-routing.md` for ownership, not a compulsory agent chain.

## Adjust during execution

If new dependencies emerge, update the remaining work and continue within the authorized scope. If the task is simpler than expected, finish without preserving unnecessary phases. For long tasks, checkpoint completed work and remaining evidence as described in `context-budget.md`.

Completion and authorization follow `execution-policy.md`. A turn estimate does not end the task or require renewed approval.
