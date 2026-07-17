---
name: architecture
description: Software architecture workflow that diagnoses architecture problems, selects the right analysis method, compares options, synthesizes stakeholder input, and produces a recommendation, review, or ADR
disable-model-invocation: true
---

# MANDATORY RULES: VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 1 in order.
- **Do NOT write implementation code or task plans in this workflow.** Hand off to `/plan` after the architecture decision is made.
- **You MUST use MCP tools throughout the workflow.**
  - Use code analysis tools (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `search_for_pattern`) to inspect the current architecture.
  - Use memory tools (write/edit) to record architecture outputs.
  - Memory path: configurable via `memoryConfig.basePath` (default: `.agents/state/memories`)
  - Tool names: configurable via `memoryConfig.tools` in `.agents/mcp.json`
  - Do NOT use raw file reads or grep as substitutes when MCP tools are available.

---

> **Vendor note:** This workflow executes inline. Use `.agents/skills/oma-architecture/SKILL.md` and its resources as the primary reference for method selection, stakeholder synthesis, and output format.

---

## L1 Decision Events

Emit required L1 decisions by calling `oma state:emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

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

// turbo
Read prior decisions in `.agents/results/architecture/` first — new decisions supersede old ones explicitly (update the old ADR's `Status`), never contradict them silently.

Use MCP code analysis tools to understand the current architecture:
- `get_symbols_overview` for project structure and boundaries
- `find_symbol` and `find_referencing_symbols` for ownership and coupling
- `search_for_pattern` for integration points, layering, and recurring pain points

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

// turbo
Save the architecture artifact to `.agents/results/architecture/`.

Suggested filenames (kebab-case topic, no sequence numbers):
- `adr-<topic>.md`
- `architecture-recommendation-<topic>.md`
- `architecture-review-<topic>.md`
- `cbam-<topic>.md`
- `diagnosis-<topic>.md`

ADR lifecycle: set `Status` (`Proposed` / `Accepted` / `Superseded by <adr-file>`); when replacing an old ADR, update its `Status` in the same run.

Emit and verify the required ADR/architecture completion decision:

```bash
oma state:emit "decision.made" '{"subject":"architecture.adr-complete","decision":"Use the completed architecture recommendation or ADR as the handoff basis.","rationale":"The architecture artifact captures the selected option, tradeoffs, risks, and validation steps."}'
oma state:verify --workflow architecture --checkpoint adr-complete
```

Then guide the next step:
- if approved and implementation is next: suggest `/plan`
- if the issue is actually debugging or QA, redirect to `/debug` or `/review`
