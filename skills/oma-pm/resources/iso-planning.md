# PM Agent - ISO 21500 / 31000 / 38500 Guide

Use this file when the user wants standards-based planning, enterprise delivery structure, risk-aware prioritization, or governance-oriented recommendations.

## Positioning

- **ISO 21500**: project management structure and planning lens
- **ISO 31000**: risk management lens
- **ISO 38500**: governance, accountability, and decision-rights lens

Do not turn these into ceremony for simple tasks. Use them when they improve clarity, accountability, or delivery confidence.

## What Each Lens Adds to a Plan

| Lens | Use it to strengthen | Plan output |
|---|---|---|
| ISO 21500 | Scope, stakeholders, dependency mapping, sequencing, roles | Explicit scope and exclusions; owner per task; milestone or phase structure; deliverables with acceptance criteria |
| ISO 31000 | Risk identification, impact/likelihood, treatment, residual risk | Top risks list; mitigation and contingency tasks; release blockers separated from monitored risks; escalation decision points |
| ISO 38500 (apply lightly) | Decision ownership, approval boundaries, accountability, oversight | Decision owner; who must be informed; what needs explicit sign-off; where governance review is needed |

## When to Apply

Apply these standards when:

- the project is enterprise or regulated
- many teams or stakeholders are involved
- risk is material
- decision rights are unclear
- the user asks for formal planning or governance

Avoid overusing them when:

- the task is a small feature or bug
- standards language would slow delivery without adding control

## Output Pattern

When relevant, add a short section like:

```md
## Standards-Aligned Planning Notes

### ISO 21500
- Scope:
- Stakeholders:
- Major dependencies:

### ISO 31000
- Top risks:
- Mitigations:
- Residual risks:

### ISO 38500
- Decision owner:
- Required approvals:
- Governance checkpoints:
```

## Guardrails

- Keep recommendations actionable, not ceremonial
- Do not claim formal compliance
- Tie each standards suggestion to planning, risk reduction, or decision clarity
- Keep technical execution delegated to specialist agents
