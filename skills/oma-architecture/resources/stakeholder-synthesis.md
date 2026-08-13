# Stakeholder Synthesis Protocol

Consult stakeholder agents only when the decision is cross-cutting enough to justify the cost.

## Consultation Thresholds

### Solo Analysis

Use when:
- single module or local subsystem
- no major cross-domain effects
- decision can be made from direct code/context analysis

### Targeted Consultation

Consult 1-3 agents when:
- the decision affects multiple layers
- tradeoffs are real but bounded
- specific specialist input is needed

Typical pairings (agent ids, not skill names — see the mapping table in `.agents/workflows/orchestrate.md`):
- `pm`: business constraints, scope, product priorities
- `backend`: service/API/domain concerns
- `db`: data ownership, schema, consistency
- `tf-infra`: deployment and operational architecture
- `qa`: risk, performance, security, testability
- `frontend` / `mobile`: client integration and complexity costs

### Full Stakeholder Sweep

Use when:
- architecture is system-wide
- multiple teams/domains are materially affected
- the decision will constrain future roadmap work

## Dispatch Mechanics

Consultation is a real subagent call, not an imagined persona.

1. Resolve dispatch per the project's Per-Agent Dispatch rules (`target_vendor_for_agent` in `.agents/oma-config.yaml`):
   - same vendor as the current runtime → the runtime's native subagent path (e.g., Claude Code Agent tool)
   - different vendor, or no native subagent support → `oma agent:spawn <agent>` for that agent only
2. Give each consulted agent a bounded charter:
   - the decision in one sentence
   - constraints that are already fixed (not up for debate)
   - the specific question for that specialty
   - expected output: position plus top risk, 10 lines or fewer
3. One round only by default; a second round requires a named unresolved conflict.
4. Cost bound: targeted consultation is 1-3 agents. A full sweep must state its cross-cutting justification in the artifact.

## Synthesis Rules

1. Capture perspectives as inputs, not votes
2. Separate:
   - agreements
   - conflicts
   - assumptions
3. Name the real tradeoff behind disagreements
4. Make an explicit recommendation even if perspectives differ
5. If user decision is required, present framed options rather than an unstructured summary

## Output Section

Include a section like:

```md
## Stakeholder Perspectives
- PM: ...
- Backend: ...
- DB: ...

## Agreements
- ...

## Tensions
- ...

## Recommendation
- ...
```
