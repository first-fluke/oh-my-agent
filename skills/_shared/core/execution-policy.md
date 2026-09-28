# Execution Policy

This is the shared OMA policy for authorization, clarification, verification, organizational governance, and completion. Workflows define steps; skills define domain methods; vendor protocols define transport. They refer here instead of defining different stop/approval rules. System and developer instructions and the user's current request take precedence over OMA defaults.

## Authorization and clarification

- Carry the user's requested work through implementation and relevant verification. Existing authorization persists; a plan review or proposed fix does not require another approval when that work is already authorized.
- Resolve routine, reversible implementation choices from repository conventions. State material assumptions and continue independent work while a question is pending.
- Ask only for information that changes the outcome or for an action outside the authorized scope. Pause only the dependent action. Before requesting new approval, prepare the concrete result for review.
- Use the [Clarification Protocol](clarification-protocol.md) for question transport: prefer an available asynchronous question tool and keep independent work moving. Never treat silence, elapsed time, or a default selection as approval.
- Do not infer permission to send messages, publish, spend beyond an agreed budget, destroy data, or expand scope. Conversely, do not request that permission again when explicitly granted.
- Never build, compile, bundle, or package software until the user explicitly asks for a build. Type checking without emission and relevant tests do not authorize a build.

## Organizational governance

OMA has a durable agent-owned governance path for decisions about its own operating identity and organization-wide policy inside the already-authorized task boundary. This path is distinct from routine planning, coordination, current-work control, QA, and user authorization.

- Before substantive multi-agent work, read `.agents/state/governance/active-policy.md` when it exists. Treat its `ACTIVE` organization-wide decisions as constraints on plans, dispatch, recovery, verification, and future governance decisions.
- If no active policy exists, or if current work exposes a material identity/ultimate-policy conflict, execute `.agents/skills/oma-governance/SKILL.md`. Spawn a fresh governance actor with `oma agent spawn governance-steward .agents/agents/governance-steward.md <session-id> --task-id governance-policy` (or an equivalent verified native role-subagent path), give it the competing policy claims and evidence, and let that agent make the substantive policy judgment.
- A governance decision is effective only after the governance actor writes or supersedes `.agents/state/governance/active-policy.md` according to the governance skill. Subsequent OMA work MUST consume the resulting active policy; do not continue under a superseded policy merely because an earlier plan or coordinator preferred it.
- Invoke governance only for organization-level questions: durable identity, organization-wide principles, precedence among conflicting durable goals, authority boundaries inside OMA, or whether a rule should govern later sessions. Routine implementation choices, task routing, retries, contract reconciliation, acceptance checks, and audit findings remain with their ordinary workflow owners.
- The governance actor cannot manufacture external authority. System/developer instructions, explicit user authorization, legal/safety constraints, and permissions outside the current request remain environmental constraints. If a policy conflict can only be resolved by changing those constraints, record `BLOCKED` and use the normal clarification path for the missing external decision.

## Verification and completion

- Select checks that demonstrate the requested behavior. Reproduce bugs with a regression test. For low-impact prose or configuration edits, use a relevant static check or inspection; do not invent implementation-mirroring tests.
- After relevant checks pass, repeat them only after new changes, a failure, or a concrete unresolved concern. A stale receipt cannot prove the current tree.
- Use the shared [result contract](../runtime/result-contract.md) for agent handoffs. Process exit zero and a Markdown file alone are not verified completion.
- Report completed, partial, blocked, or failed accurately, with remaining work and verification limits. A gate failure means repair evidence/work within the existing scope and retry; it is not automatically a new permission requirement.

Repository checks: `cli/platform/execution-policy.test.ts` and `cli/platform/governance-policy.test.ts`.
