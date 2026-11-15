---
name: oma-brainstorm
description: Explore goals, constraints, and alternative approaches before
  choosing a design. Use when the user requests ideation or design exploration.
---

# Brainstorm - Design-First Ideation

## Scheduling

### Goal
Explore user intent, constraints, and alternative approaches before planning or implementation, then preserve an approved design for downstream planning.

### Intent signature
- User says they have an idea, want to brainstorm, compare approaches, explore concepts, or design before planning.
- Request is ambiguous enough that implementation or task planning would be premature.

### When to use
- Exploring a new feature idea before planning
- Understanding user intent and constraints before committing to an approach
- Comparing multiple design approaches with trade-offs
- When the user says "I have an idea" or "let's design something"
- Before invoking `/plan` for complex or ambiguous requests

### When NOT to use
- Requirements are already clear and well-defined -> use `oma-pm` directly
- Implementing actual code -> delegate to specialized agents
- Performing code reviews -> use `oma-qa`
- Debugging existing issues -> use `oma-debug`

### Expected inputs
- Early idea, ambiguous goal, product concept, design question, or set of constraints
- Existing project context when the idea must fit a codebase or product direction
- User preferences and approval gates

### Expected outputs
- Clarified intent and constraints
- Viable approaches as prose briefs (scenario, mechanism, residual risk), with comparison and recommendation when alternatives aid the decision
- Section-by-section approved design document
- Blind-review issue list (Tier 1 resolved, Tier 2/3 resolved or explicitly deferred)
- Saved design artifact before handoff to planning

### Dependencies
- Shared context loading, clarification protocol, quality principles, and skill routing
- Optional `resources/triz-lite.md` for contradiction-shaped approach seeding
- Per-agent reviewer dispatch (e.g. `qa-reviewer`, `architecture-reviewer`) for the high-stakes blind-review escalation path
- Downstream PM workflow for task decomposition after design approval
- Project memory for coordination summaries; `docs/decisions/` for retained approach proposals

## Structural Flow

### Transitions
- If requirements become clear and implementation-ready, transition to PM planning.
- If user rejects an approach, revise before moving to detailed design.
- If implementation pressure appears early, defer it until design approval.
- If approaches collapse into knob-turning on one axis, load `resources/triz-lite.md` and reseed, then re-present prose briefs.

### Failure and recovery
- If the user cannot answer a question, propose assumptions and ask for confirmation.
- If scope expands, split the design into smaller sections.
- If alternatives collapse into one option, identify the real constraint causing that; use TRIZ-lite only when that constraint is a technical/UX contradiction.

### Exit
- Success: approved design exists and is ready for planning.
- Partial success: open questions and assumptions are explicit.

## Logical Operations

### Canonical workflow path
1. Confirm that the request is exploratory or ambiguous rather than ready for implementation, and load enough project context to understand constraints. Ask one clarifying question at a time, starting with intent and constraints, not solutions.
2. (Optional) If technical/UX contradiction or same-axis approaches only → `resources/triz-lite.md`.
3. Present viable alternatives as prose briefs and compare them when useful; do not invent extra options to meet a count; reuse an existing selection or delegated choice and resolve only an open material choice. In an active OMA workflow, record the actual approach, rationale, evidence, and design/option revision with `brainstorm.option-selection`; verify with the matching `instanceId` as `--instance` (workflow Step 3 owns the commands).
4. Design section by section within existing authorization, then blind review: independent lenses suited to the uncertainty and stakes critique the design; consolidate a tiered issue list and resolve Tier 1 issues (fresh-context reviewer subagents for high-stakes designs).
5. Save the approved approach to `docs/decisions/{NNN}-{name}.md` and update `docs/decisions/index.md` before handing off to planning. Keep this directory versioned. Read `docs/plans/designs/` and `docs/design-docs/` only as legacy fallback until migration; `design` names UI work. Record a coordination summary that links the decision document, then hand off with a summary.

### Resource scope and effects
Reads existing project context when the idea must fit a codebase. Writes the approved design under `docs/decisions/` (the design document may carry an optional TRIZ-lite appendix), updates `docs/decisions/index.md`, and records a coordination summary in project memory. The high-stakes blind review is the only subagent-spawning path in this skill. The saved design feeds downstream planning; this skill does not implement code.

### Guardrails
1. **No implementation or planning before design approval** - brainstorm produces a design document, not code or task plans
2. **One question at a time** - ask clarification and approval questions through the available asynchronous question tool first, following `../_shared/core/clarification-protocol.md`; fall back to a permitted question tool or plain text. Continue independent work while waiting, and never infer approval from silence or a preselected option.
3. **Compare viable approaches** - offer two or three when they aid the decision, and explain constraints when fewer remain. Recommend according to the actual goal, effort, reversibility, and risk. Do not favor a larger structural change solely because of its label.
4. **Explain viable approaches in prose** - state scenario, mechanism, residual risk, and effort. Use a comparison matrix when it helps the decision, then give the recommendation; a single constrained option needs its rationale, not invented alternatives
5. **Section-by-section design** - present the design incrementally; reuse existing decisions and delegated authority, asking only for unresolved material choices under the shared execution policy
6. **Blind review before save** - mandatory unless the design is trivially small (1-2 files, low stakes); lenses critique independently; use fresh-context reviewer subagents for architecturally significant, hard-to-reverse, or security-/compliance-sensitive designs
7. **YAGNI** - do not over-engineer; design only what is needed for the stated goal
8. **TRIZ-lite is optional** - only for technical/UX contradictions or same-axis collapse; max 3–5 principles from the curated set; no fake scores, full TRIZ/ARIZ, or classical matrices; seeds feed Step 3 briefs and do not replace user approval
9. **Save the selected approach, then transition** - persist it in `docs/decisions/` before handing off to `/plan`. Run-specific critique and `result-*.md` reports belong in `.agents/results/`; leave the destination in the source report when promoting a document into `docs/`

## References
- TRIZ-lite (optional Step 3 seeding): `resources/triz-lite.md`
- Context loading: `../_shared/core/context-loading.md`
- Clarification protocol: `../_shared/core/clarification-protocol.md`
- Quality principles: `../_shared/core/quality-principles.md`
- Skill-to-agent mapping: `../_shared/core/skill-routing.md`