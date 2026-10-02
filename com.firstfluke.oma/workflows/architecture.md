---
name: architecture
description: Software architecture workflow that diagnoses architecture problems, selects the right analysis method, compares options, synthesizes stakeholder input, and produces a recommendation, review, or ADR
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **Do NOT write implementation code or task plans in this workflow.** Hand off to `/plan` after the architecture decision is made.
- Follow `.agents/skills/_shared/core/code-intelligence.md`: discover the configured provider’s tools; use native search only for paths outside this project or ignored paths when unavailable or timed out. Do not install a provider or track a repository automatically.
- Use native file tools and `.agents/skills/_shared/runtime/memory-protocol.md` for durable coordination state; code-intelligence memory tools are not required.

---

> **Vendor note:** This workflow executes inline. Use `.agents/skills/oma-architecture/SKILL.md` and its resources as the primary reference for method selection, stakeholder synthesis, and output format.

---

## L1 Decision Events

Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

---

## Step 1: Frame the Decision

Clarify what kind of architecture work this is:
- new architecture recommendation
- review of an existing architecture
- structural tradeoff analysis
- investment prioritization
- ADR authoring

State explicitly:
- the decision or pain point
- constraints
- quality attributes
- non-goals

If the problem is vague, start in Diagnostic Mode.

---

## Step 2: Analyze the Existing System

Read prior decisions in `.agents/results/architecture/` first — new decisions supersede old ones explicitly (update the old ADR's `Status`), never contradict them silently.

Use MCP code analysis tools to understand the current architecture:
- Configured structure tools or scoped directory/file inspection for project structure and boundaries
- Configured symbol/reference search or native impact inspection for ownership and coupling
- Configured pattern search or native search for integration points, layering, and recurring pain points

Summarize:
- key modules/services
- boundary and ownership model
- current coupling points
- likely architecture risks

---

## Step 3: Select the Method

Choose the lightest sufficient method by reading:
- `.agents/skills/oma-architecture/resources/methodology-selection.md`

Valid modes:
- Diagnostic
- Recommendation
- Design-Twice
- ATAM-style
- CBAM-style
- ADR

State the selected mode and why it fits better than heavier alternatives.

---

## Step 4: Run the Analysis

Execute the selected method using:
- `.agents/skills/oma-architecture/resources/execution-protocol.md`
- `.agents/skills/oma-architecture/resources/output-templates.md`

Requirements:
- compare at least two materially different options for any significant structural decision
- remain cost-aware: implementation cost, operational cost, team complexity, future change cost
- distinguish architecture concerns from visual design, task planning, debugging, and Terraform implementation

---

## Step 5: Consult Stakeholders Only If Justified

For cross-cutting decisions, read:
- `.agents/skills/oma-architecture/resources/stakeholder-synthesis.md`

Consult only the agents that matter to the decision (agent ids per the mapping table in `.agents/workflows/orchestrate.md`):
- `pm` for business scope and priorities
- `backend` for service/API/domain tradeoffs
- `db` for data ownership and consistency
- `tf-infra` for deployment and operational architecture
- `qa` for security, performance, and testability risks
- `frontend` / `mobile` for client complexity and integration impact

Do not turn consultation into consensus theater. Synthesize and recommend explicitly.

---

## Step 6: Present the Recommendation

Present:
- problem framing
- selected method
- options or scenarios reviewed
- stakeholder perspectives, if any
- recommendation
- risks
- assumptions
- validation steps

If the decision remains user-owned, present the options with clear tradeoffs rather than a vague summary.

---

## Step 7: Save the Artifact and Hand Off

Save the architecture artifact to `.agents/results/architecture/`.

Suggested filenames (kebab-case topic, no sequence numbers):
- `adr-<topic>.md`
- `architecture-recommendation-<topic>.md`
- `architecture-review-<topic>.md`
- `cbam-<topic>.md`
- `diagnosis-<topic>.md`

ADR lifecycle: set `Status` (`Proposed` / `Accepted` / `Superseded by <adr-file>`) from the actual decision authority. A completed recommendation stays `Proposed` while a user-owned choice is unresolved; producing the artifact or emitting an event does not supply approval. When replacing an accepted ADR, update the prior artifact only when that supersession is authorized.

### Step 7a: Render the structural diagram (archify when available)

Only when the decision changes structure (boundaries, dependencies, data flow) and the artifact therefore carries a Mermaid diagram:

1. Run `oma diagram resolve --json` and read `.agents/skills/_shared/conditional/diagram-engine.md`.
2. `engine: mermaid` → the Mermaid block in the Markdown artifact is the delivered diagram; done.
3. `engine: archify` → author `<artifact-stem>.archify.json` from the Mermaid topology, then `oma diagram archify validate …` / `oma diagram archify deliver … <artifact-stem>.archify.html` per the protocol. Allow at most 3 repair attempts or 10 minutes total, and stop earlier when the same diagnostic repeats. On success, link the HTML under the artifact's Diagram section; on a bound or convergence failure, keep the Mermaid block, preserve the JSON, and report the last diagnostics.
4. `ok: false` (archify pinned but unresolvable — e.g. first run offline) → stop and tell the user to run `oma diagram update` once online; do not deliver a Mermaid-only artifact silently.

Record the recommendation, its authority status, and supporting comparison. Keep recommendation completion separate from permission to implement:

```bash
oma state emit "decision.made" '{"subject":"architecture.adr-complete","instanceId":"<artifact path and revision>","decision":"<Proposed|Accepted>: <recommended or authorized option and structural boundary>.","rationale":"<option comparison, constraints, and actual acceptance authority when Accepted>","evidence":["<architecture artifact path>","<supporting comparison/authorization evidence>"]}'
oma state verify --workflow architecture --checkpoint adr-complete --instance "<artifact path and revision>"
```

Then guide the next step:
- if approved and implementation is next: suggest `/plan`
- if the issue is actually debugging or QA, redirect to `/debug` or `/review`
