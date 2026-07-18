---
name: oma-brainstorm
description: Design-first ideation that explores user intent, constraints, and approaches before any planning or implementation. Use for brainstorming, ideation, exploring concepts, and evaluating approaches.
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
- Two or three approaches as prose briefs (scenario, mechanism, residual risk) plus a comparison matrix and recommended option
- Section-by-section approved design document
- Blind-review issue list (Tier 1 resolved, Tier 2/3 resolved or explicitly deferred)
- Saved design artifact before handoff to planning

### Dependencies
- Shared context loading, reasoning templates, clarification protocol, quality principles, and skill routing
- Optional `resources/triz-lite.md` for contradiction-shaped approach seeding
- Per-agent reviewer dispatch (e.g. `qa-reviewer`, `architecture-reviewer`) for the high-stakes blind-review escalation path
- Downstream PM workflow for task decomposition after design approval

### Control-flow features
- Branches by ambiguity, user answers, approach comparison, and approval gates
- Optional TRIZ-lite branch when a technical/UX contradiction blocks distinct approaches
- Asks one question at a time
- Blind review round before save; may dispatch fresh-context reviewer subagents for high-stakes designs (the only subagent-spawning path in this skill)
- Stops before implementation or task planning

## Structural Flow

### Entry
1. Confirm that the request is exploratory rather than ready for implementation.
2. Load enough project context to understand constraints.
3. Start with intent and constraints, not solutions.

### Scenes
1. **PREPARE**: Explore context and frame the design question.
2. **ACQUIRE**: Ask clarifying questions one at a time.
3. **REASON**: Generate two or three approaches with tradeoffs.
4. **VERIFY**: Get user approval section by section, then run a blind review round (independent lenses critique without seeing each other's feedback) before saving.
5. **FINALIZE**: Save design and transition to planning when appropriate.

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

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Read context and idea | `READ` | User prompt and project context |
| Ask targeted questions | `REQUEST` | Clarification phase |
| Compare approaches | `COMPARE` | Tradeoff matrix |
| Infer recommendation | `INFER` | Recommended option |
| Emit option-selection decision | `CALL_TOOL` | `oma state:emit` + `oma state:verify --checkpoint option-selection` |
| Validate approval | `VALIDATE` | Section-by-section confirmation |
| Run blind review | `VALIDATE` | Independent lens critiques, tiered issue list, Tier 1 resolution |
| Write design artifact | `WRITE` | `docs/plans/designs/` and memory |
| Transition to plan | `NOTIFY` | Handoff summary |

### Tools and instruments
- Context loading, reasoning templates, clarification protocol
- Optional TRIZ-lite resource for contradiction seeding
- Project memory and `docs/plans/designs/` for persisted designs

### Canonical workflow path
```text
1. Ask one clarifying question at a time.
2. (Optional) If technical/UX contradiction or same-axis approaches only → resources/triz-lite.md.
3. Present 2-3 approaches as prose briefs, then matrix, then recommendation; get user pick, then emit and verify the `brainstorm.option-selection` L1 decision.
4. Design section by section with user approval, then blind review: 4-8 independent lenses critique the design; resolve Tier 1 issues (fresh-context reviewer subagents for high-stakes designs).
5. Save the approved design to `docs/plans/designs/` before handing off to planning.
```

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `MEMORY` | User intent, assumptions, decisions |
| `CODEBASE` | Existing project context when relevant |
| `LOCAL_FS` | Approved design artifacts; optional TRIZ-lite appendix in design doc |

### Preconditions
- The user is still exploring or the request is ambiguous.
- The agent can ask clarifying questions before implementation.

### Effects and side effects
- Produces design decisions and persisted design docs.
- Influences downstream planning but does not implement code.

### Guardrails
1. **No implementation or planning before design approval** - brainstorm produces a design document, not code or task plans
2. **One question at a time** - ask clarifying questions sequentially, not in batches
3. **Always propose 2-3 approaches** - mechanistically distinct when possible; label each `tactical` or `structural`. The recommended option defaults to `structural` and must address the root cause. Recommend `tactical` only for genuinely throwaway scope, not merely because of deadline or effort pressure; include trade-off analysis.
4. **Prose before matrix** - explain each approach with scenario, plain-language mechanism, solves/leaves, and cost feel; then comparison matrix; then recommendation. Do not lead with matrix-only output
5. **Section-by-section design** - present design incrementally with user confirmation at each step
6. **Blind review before save** - mandatory unless the design is trivially small (1-2 files, low stakes); lenses critique independently; use fresh-context reviewer subagents for architecturally significant, hard-to-reverse, or security-/compliance-sensitive designs
7. **YAGNI** - do not over-engineer; design only what is needed for the stated goal
8. **TRIZ-lite is optional** - only for technical/UX contradictions or same-axis collapse; max 3–5 principles from the curated set; no fake scores, full TRIZ/ARIZ, or classical matrices; seeds feed Step 3 briefs and do not replace user approval
9. **Save design, then transition** - persist the approved design document before handing off to `/plan`

### Execution Phases
Follow the brainstorm workflow step by step:
1. **Phase 1 - Context**: Explore the existing codebase and understand the project landscape
2. **Phase 2 - Questions**: Ask clarifying questions one at a time to understand intent and constraints
3. **Phase 3 - Approaches**: Optionally seed with TRIZ-lite when contradiction-shaped; present 2-3 prose approach briefs labelled tactical/structural, a matrix, and an engineering-first structural recommendation unless the work is genuinely throwaway
4. **Phase 4 - Design**: Present the detailed design section by section, getting user approval at each step
5. **Phase 5 - Blind Review**: Run 4-8 independent reviewer lenses on the design, consolidate into Tier 1/2/3 issues, resolve Tier 1 before save; escalate to fresh-context reviewer subagents for high-stakes designs. Skip only for trivially small designs (1-2 files, low stakes)
6. **Phase 6 - Documentation**: Save the approved design to `docs/plans/designs/` and project memory
7. **Phase 7 - Transition**: Hand off to `/plan` for task decomposition

### Common Pitfalls
- **Jumping to solutions**: Asking "how" before fully understanding "what" and "why"
- **Too many questions at once**: Overwhelming the user with a wall of questions
- **Single approach bias**: Presenting only one option without alternatives
- **Matrix-only options**: Dumping a trade-off table without scenario/mechanism prose so the user cannot choose
- **Same-axis "alternatives"**: Three intensities of the same knob (interval/TTL/debounce) presented as distinct approaches
- **TRIZ on everything**: Loading triz-lite without a real contradiction, adding ceremony without better options
- **Over-engineering**: Designing for hypothetical future requirements instead of stated needs
- **Skipping confirmation**: Moving forward without explicit user approval on design decisions
- **Skipping blind review**: Saving a non-trivial design without the independent critique round, or letting the design's author-context leak into escalated reviewer prompts

## References
Vendor-specific execution protocols are injected automatically by `oma agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.
- TRIZ-lite (optional Step 3 seeding): `resources/triz-lite.md`
- Context loading: `../_shared/core/context-loading.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Clarification protocol: `../_shared/core/clarification-protocol.md`
- Quality principles: `../_shared/core/quality-principles.md`
- Skill-to-agent mapping: `../_shared/core/skill-routing.md`
