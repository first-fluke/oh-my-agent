---
name: oma-governance
description: Resolve material conflicts about OMA's durable operating identity, organization-wide principles, and internal authority boundaries, then persist an active policy that later sessions must consume.
---

# OMA Governance

Use this skill only for durable organization-level policy. Do not route ordinary implementation, scheduling, retries, coordination, QA findings, or authorization questions through it.

## Purpose

Close an identity/policy feedback loop inside the OMA harness:

`operating evidence or policy conflict -> governance-steward judgment -> active policy -> subsequent OMA behavior -> later evidence/conflict`

The substantive judgment belongs to the governance-steward agent. Files and commands carry and enforce the decision; they do not substitute for it.

## Governance triggers

Invoke this skill when at least one of these is true:

1. Two durable OMA principles or goals conflict and both cannot govern the organization at once.
2. A proposed change would alter OMA's organization-wide operating identity, authority boundary, or precedence rules rather than one task's implementation.
3. Repeated operational evidence suggests an existing organization-wide policy should be retained, narrowed, superseded, or retired.
4. A workflow cannot determine which durable policy has precedence without making a decision that will govern later sessions.
5. `.agents/state/governance/active-policy.md` does not exist yet and a substantive multi-agent workflow is beginning.

Do **not** invoke governance merely because a task is hard, a worker failed, two agents need contract reconciliation, QA found a defect, or the user must authorize an external action. Those belong to ordinary S1/S2/S3/S3* execution and the shared authorization path.

## Inputs

Give the governance-steward a compact evidence brief containing:

- current user-authorized objective and non-negotiable external constraints;
- current `.agents/state/governance/active-policy.md`, if any;
- the competing durable policy claims or the reason a baseline policy is needed;
- concrete operational evidence, incidents, regressions, or later-session effects relevant to the decision;
- affected workflows/skills and the expected consequences of each materially different option.

Do not tell the steward which option to select.

## Decision procedure

1. Create or reuse the current OMA session id.
2. Spawn a fresh governance actor:

   ```bash
   oma agent spawn governance-steward .agents/agents/governance-steward.md <session-id> --task-id governance-policy
   ```

   A verified native role-subagent path is equivalent when the active runtime supports it.
3. Require the steward to compare at least two materially different policy options unless only one is compatible with external constraints.
4. The steward decides one of:
   - `ACTIVE` — adopt a new baseline policy or retain/revise the current one;
   - `SUPERSEDE` — replace an existing active policy with a new decision;
   - `BLOCKED` — no legitimate internal decision exists without changing an external constraint or authorization.
5. For `ACTIVE` or `SUPERSEDE`, the steward writes `.agents/state/governance/active-policy.md` atomically as its durable decision artifact. For `BLOCKED`, it writes `.agents/state/governance/blocked-<session-id>.md` and returns the unresolved external decision to the normal clarification path.
6. The invoking workflow reloads the active policy after the steward returns. It MUST change subsequent planning/dispatch/recovery/verification behavior as required by that policy or stop as blocked if compliance is impossible.
7. Later governance runs must inspect the prior active policy and relevant operating evidence. A superseding decision names the policy it replaces and explains why the new evidence or conflict changes the durable rule.

## Active policy contract

`.agents/state/governance/active-policy.md` must contain these headings/fields:

```markdown
# OMA Active Governance Policy

Status: ACTIVE
Policy-ID: <stable id>
Revision: <positive integer>
Decided-By: governance-steward
Effective-At: <ISO-8601 timestamp>
Supersedes: <policy id/revision or none>

## Identity
<what kind of operating organization OMA is choosing to be inside the authorized boundary>

## Organization-wide principles
<ordered durable principles>

## Precedence decision
<how the conflict was resolved and which principle wins when relevant>

## Authority boundary
<what OMA may decide internally and what remains an external authorization constraint>

## Evidence considered
<concrete evidence paths/events/incident references>

## Rationale
<agent judgment, including alternatives considered>

## Operational consequences
<specific changes that later plans, dispatch, recovery, or verification must obey>
```

The artifact is runtime state, not a tracked source-of-truth file. Agents may write under `.agents/state/`; they must not rewrite shipped `.agents/` definitions during ordinary operation.

## Closure requirement

A governance run is incomplete if it only produces advice. Completion requires all of the following:

- a governance-steward agent made the policy judgment;
- the decision artifact is present and structurally complete;
- the invoking workflow reloaded the artifact;
- at least one concrete downstream behavior is constrained or changed by the active policy when applicable;
- any superseded policy is no longer treated as active.

If these conditions are not met, report governance as partial or blocked rather than claiming policy closure.
