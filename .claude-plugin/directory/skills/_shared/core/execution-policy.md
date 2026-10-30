# Execution Policy

This is the shared OMA policy for authorization, clarification, verification, and completion. Workflows define steps; skills define domain methods; vendor protocols define transport. They refer here instead of defining different stop/approval rules. System and developer instructions and the user's current request take precedence over OMA defaults.

## Authorization and clarification

- Carry the user's requested work through implementation. Existing authorization persists; a plan review or proposed fix does not require another approval when that work is already authorized.
- Resolve routine, reversible implementation choices from repository conventions. State material assumptions and continue independent work while a question is pending.
- Ask only for information that changes the outcome or for an action outside the authorized scope. Pause only the dependent action. Before requesting new approval, prepare the concrete result for review.
- Use the [Clarification Protocol](clarification-protocol.md) for question transport: prefer an available asynchronous question tool and keep independent work moving. Never treat silence, elapsed time, or a default selection as approval.
- Do not infer permission to send messages, publish, spend beyond an agreed budget, destroy data, or expand scope. Conversely, do not request that permission again when explicitly granted.
- Never build, compile, bundle, or package software until the user explicitly asks for a build. Type checking without emission and relevant tests do not authorize a build.

## Resource budgets, cancellation, and monitoring

- Before expensive batches, downloads, installations, or long-running subprocesses, record the execution deadline, parallelism, attempt/cost limits, and available host resource limits. Use existing configured limits and a small reversible probe when costs are unknown; preserve the requested scope and do not invent a new approval step.
- Apply one absolute deadline to preparation, installation, execution, retries, and verification, reserving time for shutdown. Propagate the remaining budget to children and retain it across resume; a new process, task ID, or retry does not reset it. CPU, RAM, and storage limits are enforced only where the host or provider supports them. Metadata alone is not enforcement.
- User cancellation takes precedence over completion gates and recovery. Check cancellation and the remaining deadline before every dispatch, review, verification, recovery action, and resumed admission. On cancellation or deadline exhaustion, stop admitting new work, agents, retries, failover, reviews, and verification. Allow only bounded shutdown, termination checks, and an accurate partial handoff. Do not repair a gate or replay work to keep a cancelled run alive.
- Record resources as they are created: run identity, process identity/group, provider or container IDs, and generated file/cache paths. Stop only resources whose ownership is established. Request cancellation through the host API for native agents; use verified process-tree termination for CLI-owned workers. Retain ownership records until termination is confirmed and report any surviving resources or unsupported cancellation capability.
- Stopping computation does not authorize deletion. Preserve logs, results, worktrees, caches, images, volumes, credentials, and user data unless deletion is requested or an explicit retention policy applies. Check shared use before removing a registered resource; never replace scoped cleanup with a global prune or name-only process kill.
- Prefer completion notifications and host-supported waits. When polling is necessary, designate one coordinator, increase the interval within the remaining deadline, and read only changed status or short log tails. Keep cancellation delivery independent of the polling interval; avoid duplicate watchers and repeated unchanged updates.

## Verification and completion

- Verification belongs to the project's local CI and push hooks. Do not run test suites, type checks, linters, or builds on your own initiative; run a check only when the user or the active workflow explicitly requires it.
- Add a regression test with a bug fix. Do not invent implementation-mirroring tests for prose or configuration edits.
- Use the shared [result contract](../runtime/result-contract.md) for agent handoffs. Process exit zero and a Markdown file alone are not verified completion.
- Report completed, partial, blocked, or failed accurately, with remaining work and verification limits. A gate failure means repair evidence/work within the existing scope and retry; it is not automatically a new permission requirement.

Repository check: `cli/platform/execution-policy.test.ts`.
