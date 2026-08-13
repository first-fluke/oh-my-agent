# Output Templates

Templates track ISO/IEC/IEEE 42010 concepts: stakeholders and concerns (Problem / Constraints), viewpoints (Diagram), and rationale (Tradeoffs / Decision).

## Diagram Guidance

Include a Mermaid diagram whenever the decision changes structure — boundaries, dependencies, or data flow. Default to a C4-style context or container view, scoped to only the elements the decision touches:

```
graph LR
  Client[Web Client] --> API[API Service]
  API --> Notif[Notification Module]
  Notif -->|extracted?| NotifSvc[Notification Service]
  NotifSvc --> Queue[(Queue)]
```

Skip the diagram for non-structural decisions (e.g., a versioning policy).

## Recommendation Template

```md
# Architecture Recommendation: <topic>

## Problem

## Constraints and Quality Attributes

## Options

## Diagram (if structural)

## Tradeoff Comparison

## Recommendation

## Transition Plan (if restructuring a live system)

## Risks

## Assumptions

## Validation Steps
```

## ATAM-style Template

```md
# Architecture Review: <topic>

## Scope

## Quality Attribute Scenarios

## Architectural Approaches

## Sensitivity Points

## Tradeoff Points

## Risks / Non-Risks

## Recommendations
```

## CBAM-style Template

```md
# Architecture Investment Analysis: <topic>

## Candidate Investments

## Benefit Estimate

## Cost Estimate

## Operational / Team Impact

## Priority Ranking

## Recommended Sequence
```

## ADR Template

```md
# ADR: <topic>

- Status: Proposed | Accepted | Superseded by <adr-file>
- Date: <YYYY-MM-DD>
- Supersedes: <adr-file or none>

## Context

## Decision

## Diagram (if structural)

## Alternatives Considered

## Consequences

## Follow-up Validation
```
