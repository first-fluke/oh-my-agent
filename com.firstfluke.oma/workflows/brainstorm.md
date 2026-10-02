---
name: brainstorm
description: Design-first ideation workflow that explores user intent, clarifies constraints, proposes approaches, and produces an approved design document before planning
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **Do NOT write any code.** This workflow produces a design document, not implementation.
- Follow `.agents/skills/_shared/core/code-intelligence.md`: discover the configured provider’s tools; use native search only for paths outside this project or ignored paths when unavailable or timed out. Do not install a provider or track a repository automatically.
- Use native file tools and `.agents/skills/_shared/runtime/memory-protocol.md` for durable coordination state; code-intelligence memory tools are not required.

---

> **Vendor note:** This workflow executes inline (no subagent spawning), with one exception: the Step 5 blind-review escalation path may spawn fresh-context reviewer subagents for high-stakes designs. All vendors otherwise use their native code analysis and file tools.

---

## L1 Decision Events

Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

---

## Step 1: Explore Project Context

Use MCP code analysis tools to understand the current codebase:
- Configured structure tools or scoped directory/file inspection for project structure and existing architecture.
- Configured symbol/pattern search or native search to identify relevant modules, patterns, and conventions.
- Summarize what exists and what the user's idea would affect.

---

## Step 2: Ask Clarifying Questions

Ask the user clarifying questions **one at a time**. Prefer multiple-choice options when possible.
For all clarification and approval questions in this workflow, follow `.agents/skills/_shared/core/clarification-protocol.md`: prefer an available asynchronous question tool, continue independent work, and wait for explicit answers before dependent approval steps.
Key areas to clarify:
- **Intent**: What problem are they solving? Who is the target user?
- **Scope**: Must-have vs nice-to-have features
- **Constraints**: Tech stack, timeline, existing integrations
- **Success criteria**: How will they know it's done?

Do NOT proceed to Step 3 until you have a clear understanding of the user's intent.

---

## Step 3: Propose Approaches

Present **2-3 distinct approaches** to solve the problem.

### Optional TRIZ-lite (contradiction problems only)

**Default: off.** If the core issue is a technical or UX tradeoff ("improving A worsens B"), draft approaches collapse into the same axis (only knob-turning: interval, TTL, debounce, log level), or the user asks for inventive / contradiction framing, load and follow:

`.agents/skills/oma-brainstorm/resources/triz-lite.md`

Use T1–T4 only to **seed** mechanistically different options, then present them with the brief format below. Skip TRIZ-lite for ordinary product exploration without a contradiction. Do not run full TRIZ, ARIZ, classical matrices, or fake numeric scores.

### Presentation order (mandatory)

**Prose briefs first → comparison matrix → recommendation.** Do not lead with a matrix-only dump.

For **each** approach, write a short choosable brief (enough to decide — not a full Step 4 design):

```markdown
## Approach {A|B|C} — {short name}
**Label:** tactical | structural
**One-liner:** {one sentence}

### What changes (user / system scenario)
- When the user {does X} → {what they see / what the system does}
- How this differs from today: {1–2 sentences}

### How it works (plain language)
- {3–5 short bullets on the mechanism — no file lists or code}

### What it solves vs leaves
- Solves: ...
- Intentionally leaves: ...
- Residual risks: ...

### Cost feel
- Effort: S | M | L
- Likely touch surface: {areas}
- Reversibility: low | medium | high

### Pros / Cons
- Pros: ...
- Cons: ...
```

Then:

```markdown
## Comparison at a glance
| Criterion | A | B | C |
|-----------|---|---|---|
| ... | ... | ... | ... |

## Recommendation
**{X}** — {3–6 sentences: scenario + tradeoff + why structural fits}
Questions that help choose: {1–2 optional prompts for the user}
```

### Approach rules

- **Label each approach** as `tactical` (patch/workaround/quick win) or `structural` (root-cause/proper engineering).
- Approaches must be **mechanistically distinct** when possible — not three intensities of the same knob.
- **Engineering-first default:** the recommended approach MUST be `structural` — addressing the root cause with proper engineering. Deadline pressure, effort delta, and "we'll fix it properly later" are NOT valid grounds for recommending tactical. Recommending `tactical` is only allowed when the problem itself is genuinely throwaway scope (e.g., one-line config flip, deprecated module being removed). The tighter the deadline, the more important it is to do it right the first time.

Apply `.agents/skills/_shared/core/execution-policy.md`: proceed when the requested work or decision is already authorized; ask only for a material missing decision or new authorization.

Once the option is resolved from the user request, delegated choice, or a clarification, emit and verify the required option-selection decision. Record how the choice was authorized:

```bash
oma state emit "decision.made" '{"subject":"brainstorm.option-selection","instanceId":"<design topic and option revision>","decision":"<selected approach, mechanism, and scoped goal>","rationale":"<comparison evidence and existing instruction, delegated choice, or actual user selection>","evidence":["<option comparison or design artifact path>"]}'
oma state verify --workflow brainstorm --checkpoint option-selection --instance "<design topic and option revision>"
```

---

## Step 4: Present Design

Present the detailed design **section by section**:
- Architecture overview (components, data flow)
- Key interfaces and contracts
- Integration points with existing code
- Edge cases and error handling strategy

Invite feedback on material decisions; reuse existing authorization under the execution policy. Pause only sections that depend on missing information or new authorization.

---

## Step 5: Blind Review Round

Before saving the design, run an independent critique round to surface suppressed issues.

Groupthink and authority bias hide real gaps. A blind round, where each perspective critiques independently without seeing others' feedback, surfaces issues the consensus round would have buried.

**Procedure:**

1. **Select 4-8 independent reviewer lenses** appropriate to the design domain. Examples:
   - Software skill: backend, frontend, devops, security, QA, CTO, end-user, docs-writer
   - Infra skill: network, system, security, finops, SRE, compliance, CTO
   - Customize to the feature's stakeholder map.

2. **Independent critique**: for each lens, produce 2-3 concrete criticisms of the Step 4 design without reference to other lenses' feedback. Cover missing items in their specialty, overlaps/redundancies, naming issues, implementation risks.

3. **Consolidate and dedupe** into a unique issue list. Classify:
   - **Tier 1**: critical gap, must resolve before save
   - **Tier 2**: enhancement, should resolve or explicitly defer
   - **Tier 3**: nice-to-have, defer to next version

4. **Check for suppressed compromises**: revisit each Step 2–4 decision where a concern was raised but the design moved forward anyway (a clarification answered with an unvalidated assumption, a section approved with reservations, a tradeoff accepted under time pressure). Verify each was resolved on principle (regulatory, consumer, architectural) rather than waved through; restore any principled objection that was dropped.

5. **Resolve Tier 1 issues** by updating Step 4 design with either new sections in existing files, new files, or explicit out-of-scope declarations.

6. **Present the resolved design**, noting changes from the critique. Apply the execution policy before Step 6; ask only for unresolved material decisions or new authorization.

**Blind fidelity — inline vs. delegated:**

The default inline lenses run in *this* session, so the model that authored the Step 4 design is also critiquing it. That satisfies the "lenses don't see each other's feedback" requirement, but it does **not** remove authorship bias — the reviewer knows every rationale and approval that produced the design and tends to rationalize rather than challenge. That is a *lower-grade* blind review, acceptable for most designs.

**Escalation (high-stakes designs only):** when the design is architecturally significant, hard to reverse, or security-/compliance-sensitive, delegate the critique to **fresh-context reviewer subagents** instead of inline lenses, so each reviewer sees only the design artifact — not the conversation history, rationale, or approval flow that carries the author's bias.

- Resolve `target_vendor_for_agent` per agent, then dispatch each reviewer lens using the standard per-agent path: native subagent when `target_vendor_for_agent === current_runtime_vendor`, otherwise `oma agent spawn {agent_id} {prompt_file} {session_id} --task-id {task.id} -w {workspace}`.
- Pass **only the Step 4 design document** (and minimal domain constraints) in the prompt file. Do **not** include the clarification Q&A, prior reservations or accepted compromises, or user approvals — that context is exactly what a blind reviewer must not see.
- Suggested reviewer agents: `qa-reviewer`, `architecture-reviewer`, plus domain lenses from the stakeholder map in point 1.
- Consolidate their findings back through points 3-6 above.

Skip only if the design is trivially small (1-2 files, low stakes). Otherwise the inline round is mandatory; the escalation path is recommended for high-stakes designs.

---

## Step 6: Save Design Document

Save the approved design:
1. Write to `docs/plans/designs/<NNN>-<feature-name>.md` where `<NNN>` is the next zero-padded 3-digit number (`ls docs/plans/designs/ | grep -E '^[0-9]{3}-' | tail -1`). Run the listing immediately before writing — not earlier in the session — and if `<NNN>` is already taken (concurrent sessions have produced duplicate numbers), take max+1. Do not append `-design` to the filename; the folder already encodes type.
2. Use memory write tool to record design summary for future reference.

---

## Step 7: Transition to Planning

Inform the user that the design phase is complete and suggest:
> "Design approved. Run `/plan` to decompose this into actionable tasks."

The design document will be automatically loaded by the planning workflow as context.
