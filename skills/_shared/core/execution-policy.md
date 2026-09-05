# Execution Policy

This is the shared OMA policy for authorization, clarification, verification, and completion. Workflows define steps; skills define domain methods; vendor protocols define transport. They refer here instead of defining different stop/approval rules. System and developer instructions and the user's current request take precedence over OMA defaults.

## Authorization and clarification

- Carry the user's requested work through implementation and relevant verification. Existing authorization persists; a plan review or proposed fix does not require another approval when that work is already authorized.
- Resolve routine, reversible implementation choices from repository conventions. State material assumptions and continue independent work while a question is pending.
- Ask only for information that changes the outcome or for an action outside the authorized scope. Pause only the dependent action. Before requesting new approval, prepare the concrete result for review.
- Do not infer permission to send messages, publish, spend beyond an agreed budget, destroy data, or expand scope. Conversely, do not request that permission again when explicitly granted.
- Never build, compile, bundle, or package software until the user explicitly asks for a build. Type checking without emission and relevant tests do not authorize a build.

## Verification and completion

- Select checks that demonstrate the requested behavior. Reproduce bugs with a regression test. For low-impact prose or configuration edits, use a relevant static check or inspection; do not invent implementation-mirroring tests.
- After relevant checks pass, repeat them only after new changes, a failure, or a concrete unresolved concern. A stale receipt cannot prove the current tree.
- Use the shared [result contract](../runtime/result-contract.md) for agent handoffs. Process exit zero and a Markdown file alone are not verified completion.
- Report completed, partial, blocked, or failed accurately, with remaining work and verification limits. A gate failure means repair evidence/work within the existing scope and retry; it is not automatically a new permission requirement.

Repository check: `cli/platform/execution-policy.test.ts`.
