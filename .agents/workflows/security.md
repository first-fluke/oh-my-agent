---
name: security
description: Scan application source, agent skills or MCP components; run scoped web test penetration tests, validate findings and configure security gates through oma-security.
disable-model-invocation: true
---

- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification and completion. Existing authorization persists.
- Respond in the user's language, then the configured language when the prompt supplies none.
- This workflow executes inline. Scanner workspaces and evidence are in scope; product-code fixes route to the owning implementation skill.

## Step 1: Load the canonical skill

Read `.agents/skills/oma-security/SKILL.md`. Resolve the target, intent, source/deployment identity, selected engines and existing execution limits using that skill.
Load only its applicable resources. A repository scan selects source; runtime testing also needs a concrete test deployment.

## Step 2: Execute and retain evidence

Follow the skill's canonical workflow path once. It owns engine selection, native commands, setup/resume, independent validation and failure recovery.
Keep native engine outputs and exits distinct from normalized findings and CI acceptance. Never present an unavailable engine, unfinished task or unsuccessful attack as a clean result.

## L1 decision checkpoints

For an active OMA L1 session, follow `.agents/skills/_shared/runtime/event-spec.md` and the decision section in `.agents/skills/oma-security/resources/findings-contract.md`.
Record execution-scope choices before consequential paid/runtime work and finding dispositions before filtering/export. Reuse a current decision for the same plan; these records do not create a new approval step.

## Step 3: Deliver and hand off

Check the current run's required artifacts and selected gate policy. Report findings, pending validation, actual coverage, stops and engine failures with evidence paths.
Route requested remediation to `oma-debug` or the relevant implementation skill; retain the finding ID and source/deployment identity for subsequent verification.
