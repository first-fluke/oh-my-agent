# Prompt and Routing Evaluation

Use when changing skill routing, context injection, approval boundaries, or a workflow's review contract. Static lint establishes structure; it does not measure task utility.

## Comparisons

Compare the current instructions, the proposed instructions, and a minimal task-only baseline on the same held-out tasks. Run each supported model separately with its exact dispatch model and effort recorded. An evaluator's default model, a mock result, or a result from another model is not an Astra measurement.

`oma skill eval` provides baseline/treatment isolation and optional negative-transfer checks; see `web/docs/guide/skill-eval.md` in the repository. Use available recordings or static fixtures first. Live dispatch consumes resources and follows existing budget authorization; do not start it just to complete a prose edit.

## Task matrix

| Task | Expected boundary |
|---|---|
| Fix a typo or doc link | Scoped inspection; no code tests or full repository map |
| Adjust a component style | Existing stack and relevant visual checks; no framework upgrade |
| Fix an authorization bug | Regression evidence for the failure and relevant existing checks |
| Work in a low-coverage repository | Declared project/task target; no invented global floor |
| Sync docs under an existing edit request | Apply scoped corrections without per-file reapproval |
| Review docs without edit authorization | Findings or proposed patches only |
| Create slides with purpose, length, content, and style supplied | Reuse the brief; no mandatory discovery question |
| Change a schema or production resource | Separate local preparation from destructive or external operations |
| Execute two tasks assigned to the same role | Unique task/run/session reports and unchanged claim identity |
| Run a simple task with many graph references | Owning skill retained; conditional references and adjacent specialists deferred |
| Publish or spend outside authorization | Prepare reviewable work and obtain the missing authorization |
| Run explicit ultrawork/ralph | Honor the selected workflow's evidence and review contract |

## Measurements

Record completion and correctness, verified defects found, irrelevant skill activation, unnecessary questions, failed or repeated verification, input tokens, latency, and cost. Report missing evidence as missing. Measure the assembled prompt or actual usage; file-size reduction alone is not a runtime savings claim.

Use repeated runs when model variation affects a decision. Preserve the current review contract until evidence supports changing it. Keep cost controls, destructive-action boundaries, result schemas, and regression requirements in every comparison.

## Regression checks

Check description boundaries before loading SKILL.md. Test the default context path as well as explicit graph calls. Exercise a soft budget smaller than the entry skill and verify the entry survives with a reported overrun. Check generated agent and directory instructions against the same policy as the source. Scope and approval behavior must hold through nested references, not only in the root skill.

The design follows [OpenAI's guidance on skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): concise routing, conditional references, task-specific reading, and explicit completion and authorization boundaries.
