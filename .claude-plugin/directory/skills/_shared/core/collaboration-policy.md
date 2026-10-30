# Collaboration Policy

Use when assigning or coordinating parallel worker tasks. Apply the existing execution policy, task contracts, verification, and recovery limits.

## Assignment and collection

- Give each worker a concrete deliverable, allowed edit paths, shared constraints, and the identities of relevant peers. Choose the worker count from the work and available parallelism.
- Designate one existing worker to collect outputs alongside its own assigned deliverable. Keep integration edits within that worker's approved scope and workspace. Preserve each contributor's run identity and verification evidence when combining results.
- Supply the relevant collaboration rules or this reference through the supported dispatch context so workers receive their contact and handoff instructions.
- Required checks and QA must cover the final combined revision. Re-run affected checks and review after integration edits; the coordinator then checks the combined result and unresolved work.

## Resolve issues with the responsible peer

- When the host exposes direct peer messaging, use the actual recipient identity and identify the affected task/run, paths or interface, observed problem, evidence, and requested action.
- Resolve routine interface and handoff issues with the responsible peer within the assigned contracts. If direct messaging is unavailable, ask the coordinator to relay the issue through the supported handoff path.
- Report unresolved blockers and proposed plan or deliverable changes to the coordinator. Pause only the dependent work and continue independent assignments within the existing recovery budget.

## Transfer edit ownership

1. Both workers confirm the exact paths, remaining work, and current revision or patch. The work must already fit both tasks' authorized scopes and the receiving task's acceptance contract; otherwise refer it to the coordinator.
2. The outgoing owner stops editing the agreed paths before the receiving owner starts. Record the agreement and unfinished work in each worker's own coordination notes, and notify the coordinator to update the shared task board.
3. The receiving owner works in its assigned workspace and records its actual changes and checks under its own run identity. With separate worktrees, exchange patches or commits through the existing integration path and preserve each other's changes.

If agreement or ownership is unclear, pause edits to the contested paths and involve the coordinator. Shared task boards remain coordinator-owned; each worker retains ownership of its own progress, result, and claim files.

## Keep task contracts intact

Peer agreement and notification do not modify a frozen plan. Changes to task identities, deliverables, scope, dependencies, or pinned checks go to the coordinator before dependent work proceeds. Follow the existing [result contract](../runtime/result-contract.md) for replanning, preserve prior outcomes and evidence, and retain the logical goal's recovery budget.
