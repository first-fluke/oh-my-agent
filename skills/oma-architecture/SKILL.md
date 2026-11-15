---
name: oma-architecture
description: Evaluate system boundaries and architectural tradeoffs. Use for
  architecture decisions, design reviews, and ADRs.
---

# Architecture Agent - Software Architecture Specialist

## Scheduling

### Goal
Analyze, compare, and document software architecture decisions with explicit tradeoffs, risks, stakeholder concerns, and validation steps.

### Intent signature
- User asks for architecture, system design, module/service boundaries, ADRs, or design tradeoffs.
- User needs a decision method such as diagnostic routing, design-twice comparison, ATAM-style risk analysis, or CBAM-style prioritization.
- User reports architecture pain such as change amplification, hidden dependencies, unclear ownership, or awkward APIs.
- User needs an API versioning, deprecation, or published-contract evolution strategy.

### When to use
- Choosing or reviewing system architecture
- Defining module, service, or ownership boundaries
- Comparing architectural options with explicit tradeoffs
- Investigating architectural pain: change amplification, hidden dependencies, awkward APIs
- Prioritizing architecture investments or refactors
- Writing architecture recommendations or ADRs
- Deciding API versioning, deprecation windows, and published-contract evolution strategy

### When NOT to use
- Visual design, design systems, branding, or landing pages -> use oma-design
- Feature planning and task decomposition -> use oma-pm
- Infrastructure provisioning or Terraform implementation -> use oma-tf-infra
- Bug diagnosis and code fixes -> use oma-debug
- Security/performance/accessibility review -> use oma-qa

### Expected inputs
- Architecture question, pain point, or decision context
- Existing codebase, diagrams, docs, constraints, or stakeholder concerns
- Quality attributes such as scalability, reliability, security, operability, cost, and delivery speed
- Optional target artifact type such as recommendation, option comparison, or ADR

### Expected outputs
- Architecture diagnosis, recommendation, comparison, prioritization, or ADR
- Assumptions, tradeoffs, risks, and validation steps
- A Mermaid context/container diagram when the decision changes structure (boundaries, dependencies, data flow)
- When `oma diagram resolve` reports `engine: archify` (the normal case — oma auto-fetches the latest archify release), an interactive sibling `<artifact-stem>.archify.json` + `.archify.html` derived from that Mermaid (see `_shared/conditional/diagram-engine.md`)
- When the diagram is a vendor-stack topology and the user wants logos or a poster, a `<artifact-stem>.stack.html` sibling from the upstream stack-diagram skill (stack route in `_shared/conditional/diagram-engine.md`; no CLI, no config key)
- ADRs and retained recommendations for a selected approach in `docs/decisions/`, linked from `docs/decisions/index.md`
- Run-specific reviews, diagnoses, CBAM analyses, and unselected comparison drafts in `.agents/results/architecture/`

```yaml
outputs:
  - name: architecture-decision
    description: ADR or retained recommendation for a selected approach, with its actual authority status
    artifact: "docs/decisions/*.md"
    required: false
  - name: architecture-artifact
    description: Run-specific review, diagnosis, CBAM analysis, or unselected comparison draft
    artifact: ".agents/results/architecture/*.md"
    required: false
  - name: architecture-decision-diagram-html
    description: archify interactive HTML diagram (+ JSON spec) beside a retained structural decision; only when the archify engine resolves
    artifact: "docs/decisions/*.archify.html"
    required: false
  - name: architecture-diagram-html
    description: archify interactive HTML diagram (+ JSON spec) beside a run-specific structural report; only when the archify engine resolves
    artifact: ".agents/results/architecture/*.archify.html"
    required: false
  - name: architecture-decision-stack-html
    description: stack-diagram HTML poster with vendor logos beside a retained structural decision; only on the stack route when the upstream skill resolves
    artifact: "docs/decisions/*.stack.html"
    required: false
  - name: architecture-stack-html
    description: stack-diagram HTML poster with vendor logos beside a run-specific structural report; only on the stack route when the upstream skill resolves
    artifact: ".agents/results/architecture/*.stack.html"
    required: false
```

### Dependencies
- `resources/execution-protocol.md` for workflow
- `resources/methodology-selection.md` for method choice
- `resources/stakeholder-synthesis.md` when cross-cutting stakeholder consultation is justified
- `resources/output-templates.md` for final artifact shapes
- `resources/api-evolution.md` for published-contract versioning/deprecation decisions (MAP evolution patterns)
- `resources/migration-patterns.md` for transition plans when the chosen architecture requires restructuring a live system
- `_shared/conditional/diagram-engine.md` (+ `oma diagram resolve`) when a structural diagram is emitted — picks the route (archify vs Mermaid, or the upstream stack-diagram poster) and owns the validate/deliver loop

## Structural Flow

### Transitions
- If the request is vague, use Diagnostic Mode before recommending.
- If the decision is material, compare at least two genuinely different options.
- If risk/quality attributes dominate, use ATAM-style analysis.
- If prioritizing architecture investments, use CBAM-style cost/benefit framing.
- If the decision is final, format it as an ADR.

### Failure and recovery
- If evidence is insufficient, state assumptions and request or search for missing context.
- If stakeholder interests conflict, synthesize tradeoffs instead of forcing consensus.
- If the task belongs to another domain, route to the relevant skill.

### Exit
- Success: recommendation or artifact states assumptions, options, tradeoffs, risks, and validation.
- Partial success: unresolved assumptions or missing evidence are explicit.

## Logical Operations

### Canonical workflow path
1. Identify the architecture problem, decision, or pain signal, and clarify scope, quality attributes, constraints, stakeholder context, and the target artifact.
2. Read prior decisions in `docs/decisions/`; read `.agents/results/architecture/`, `docs/design-docs/`, and `docs/plans/designs/` as legacy fallback until migration.
3. Use the configured code-intelligence provider for structure, symbols, references, and integration points: discover its file, symbol, reference, and pattern tools, then inspect architecture-relevant modules, ownership, and integration points within the selected scope. If unavailable, use native search only for paths outside this project or ignored paths.
4. Choose Diagnostic, Recommendation, Design-Twice, ATAM-style, CBAM-style, or ADR mode before writing the artifact. Record the mode with subject `architecture.route-selection` per `references/_shared/runtime/route-selection.md` (the lightest sufficient method and why heavier ones were not needed).
5. Diagnose, compare options, and analyze tradeoffs and risks in the selected mode, following `resources/execution-protocol.md`.
6. Check assumptions, validation steps, and fit against constraints with `resources/checklist.md`.
7. Write the recommendation, ADR, or run report from `resources/output-templates.md` to the location Guardrail 9 assigns. When the decision changes structure, add the diagram per `_shared/conditional/diagram-engine.md`. Report the recommendation with its assumptions, tradeoffs, risks, and validation steps.

### Resource scope and effects
Reads architecture-relevant source files and docs. Writes ADRs and retained recommendations to `docs/decisions/` (and its index) and run reports to `.agents/results/architecture/`; diagram siblings are written beside the artifact they illustrate. A recommendation may influence implementation direction, ownership boundaries, and future refactors. This skill does not modify product code unless a separate implementation task is requested.

### Guardrails
1. Diagnose the architecture problem before selecting a method.
2. Use the lightest sufficient methodology for the current decision.
3. Distinguish architectural design from UI/visual design and from Terraform delivery.
4. Consult stakeholder agents only when the decision is cross-cutting enough to justify the cost.
5. Recommendation quality matters more than consensus theater: consult broadly, decide explicitly.
6. Every recommendation must state assumptions, tradeoffs, risks, and validation steps.
7. Be cost-aware by default: implementation cost, operational cost, team complexity, and future change cost.
8. When a decision is material, compare at least two genuinely different options before recommending one.
9. Save ADRs and retained recommendations for a selected approach to `docs/decisions/` and update its index. Keep run reviews, diagnoses, CBAM analyses, and unselected drafts in `.agents/results/architecture/`. Promotion into `docs/` leaves a destination link in the source report.
10. Read prior decisions in `docs/decisions/` before deciding; read legacy locations until migration. When replacing an old decision, mark it superseded rather than contradicting it. Dispatched `result-*.md` reports always go to `.agents/results/`, preserving their task/run/session filenames.
11. When a durable artifact is finalized in an active OMA workflow, record its actual recommendation, authority status, rationale, revision, and evidence with `architecture.adr-complete` (execution protocol Step 7). A completed proposal does not supply user approval or authorize implementation.

### Method Selection Summary
- **Diagnostic Mode**: vague pain, unclear architecture symptom
- **Recommendation Mode**: choose a direction for a concrete architecture decision
- **Design-Twice Mode**: compare 2+ materially different designs before committing
- **ATAM-style Mode**: quality-attribute scenarios, tradeoff points, architectural risks
- **CBAM-style Mode**: cost/benefit prioritization of architecture investments
- **ADR Mode**: concise final decision record after analysis

## References
- Local code tools: `references/_shared/core/code-intelligence.md` (code search/navigation)

- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- Checklist (run before handoff): `resources/checklist.md`
- Method selection: `resources/methodology-selection.md`
- Stakeholder protocol: `resources/stakeholder-synthesis.md`
- Output templates: `resources/output-templates.md`
- API evolution patterns (versioning, deprecation, lifecycle guarantees): `resources/api-evolution.md`
- Migration/transition patterns (strangler fig, branch by abstraction, expand-contract): `resources/migration-patterns.md`
- Context loading: `references/_shared/core/context-loading.md`
- Task decomposition: `references/_shared/core/difficulty-guide.md` (unresolved scope or dependencies)
- Clarification protocol: `references/_shared/core/clarification-protocol.md`
- Quality principles: `references/_shared/core/quality-principles.md`