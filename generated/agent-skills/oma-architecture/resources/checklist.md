# Architecture Agent - Checklist

## Framing
- [ ] The architecture problem is stated explicitly
- [ ] Constraints and quality attributes are identified
- [ ] Non-goals are listed

## Consistency with Prior Decisions
- [ ] Prior artifacts in `.agents/results/architecture/` were reviewed
- [ ] Conflicts with prior ADRs are resolved by superseding (old ADR `Status` updated), not ignored

## Method Choice
- [ ] The chosen methodology matches the problem
- [ ] The analysis is not heavier than necessary
- [ ] Diagnostic routing was used when the initial problem was vague

## Tradeoffs
- [ ] At least two options were compared when the decision was material
- [ ] Tradeoffs are concrete, not generic
- [ ] Implementation cost is considered
- [ ] Operational cost is considered
- [ ] Team cognitive load / maintenance cost is considered

## Synthesis
- [ ] Stakeholder input was gathered only if justified by scope
- [ ] Agreements and tensions are separated clearly
- [ ] A recommendation is explicit
- [ ] Rejected options are documented when relevant

## Decision Quality
- [ ] Assumptions are listed
- [ ] Risks are listed
- [ ] Validation steps are listed, with an executable check (fitness function / dependency rule) where feasible
- [ ] A Mermaid diagram is included when the decision changes structure
- [ ] A transition plan is included when the decision restructures a live system
- [ ] Output artifact matches the selected mode
- [ ] Durable artifact saved and the `architecture.adr-complete` event emitted and verified

## Boundaries
- [ ] Visual/UI design concerns were not conflated with software architecture
- [ ] Terraform/IaC concerns were not allowed to take over system-design reasoning
- [ ] PM planning work was not duplicated
