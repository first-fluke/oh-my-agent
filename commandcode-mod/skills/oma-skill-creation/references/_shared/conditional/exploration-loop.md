# Hypothesis Exploration

Load when the user requests alternative approaches, or when the same issue persists after repeated relevant recovery and a different mechanism is worth testing. A failed check count is a prompt to reassess the cause, not an unconditional launch signal. Do not activate for an obvious fix or a noisy metric delta.

## Scope and budget

Use the task's existing aggregate attempt and cost budget. Each hypothesis consumes an attempt; exploration never replenishes retries. For a comparison round, reserve all intended attempts before starting. If the existing workflow requires a multi-candidate round and fewer than two attempts remain, preserve evidence and report the unresolved result instead of starting a partial round. Explicit user, runtime, and workflow limits take precedence; this guide does not add turn quotas or file-count caps.

## Procedure

1. Inspect prior failure evidence. State distinct causal hypotheses and the smallest experiment that distinguishes them. Use only as many alternatives as the uncertainty and budget justify; the active workflow may specify the candidate count.
2. Identify ownership, baseline revision, required checks, comparison metrics, and artifact paths before editing. Include tests and related files needed to evaluate the mechanism; a fixed file limit must not hide impact.
3. Isolate alternatives. In authorized multi-agent work, use separate prepared workspaces and preserve the plan task ID and unique run ID in each result. In sequential work, preserve a baseline and apply only the experiment's scoped diff. Do not use a blanket stash, reset, checkout, or cleanup against a workspace with unrelated changes.
4. Run relevant checks and comparable measurements under `quality-score.md`. Missing evidence remains missing; a candidate with failing required checks cannot win through a higher aggregate score.
5. Select a candidate only when it satisfies the required behavior and comparison criteria. Apply its owned changes to the target, then refresh affected verification on the integrated result. Preserve diagnostic evidence from other candidates; do not delete unrelated work or an active workspace.
6. Record the comparison and decision in `experiment-ledger.md`. If no candidate resolves the issue, report the evidence and remaining limitation. Continue only within the existing recovery budget and authorized scope.

## Workflow integration

`/work`, `/orchestrate`, and `/ultrawork` retain their dispatch, required review, and recovery limits. They call this procedure after reassessing a repeated failure, then re-evaluate the failed gate using actual acceptance evidence. This guide does not start a workflow or delegate work by itself.

Use `../runtime/result-contract.md` for task/run/claim identity and `../core/execution-policy.md` for authorization, clarification, and completion.
