# Open-Ended Execution Protocol

This protocol governs the **Open-ended** route of `oma-mode` when a goal is too large, unfamiliar, or uncertain for a narrower workflow or a single upfront plan (for example: a major migration, a cross-cutting architectural overhaul, or an investigation-to-fix with unresolved technical unknowns).

Do not load this protocol for ordinary single-owner features, routine bug fixes, or work with a settled plan.

---

## Phase A: Frame before changing behavior

Ground the work before designing steps or editing production code.

1. **Make every Step 1 criterion falsifiable.** Each criterion in `session-oma-mode-{sessionId}.md` must state the concrete command, invariant, or observable output that disproves completion. If a goal only states an aspiration ("faster", "cleaner", "migrated"), pin down the measurable baseline and target first.
2. **Inventory unknowns and blast radius.** List what is verified in the codebase versus what is still a hypothesis: data-migration irreversibility, public API or schema contracts, runtime assumptions, and external dependencies.
3. **Separate high-risk unknowns from routine work.** Identify the smallest experiment or probe that can invalidate the planned approach cheaply.

Record the frame (unknowns, constraints, and baseline measurements) in `session-oma-mode-{sessionId}.md` before Phase B.

---

## Phase B: Design the execution sequence

Design a minimal, auditable sequence tailored to this goal rather than forcing a generic template.

1. **Riskiest unknowns first.** Order feasibility spikes, compatibility checks, or data-shape validations ahead of bulk edits so a wrong assumption fails before wide changes accumulate.
2. **Build the verification harness first.** Before modifying existing behavior, establish characterization tests, invariant scripts, or baseline metrics so every subsequent unit is judged against the same yardstick.
3. **Decompose into atomic, independently landable units.** Each unit has:
   - a single clear outcome and bounded file scope;
   - a non-emitting check that leaves the repository green when the unit finishes;
   - an execution mode: **Skill** (one specialist owner) by default, or `orchestrate` only when units sit across verified independent seams.
4. **Keep a decision audit trail.** Record each sequence decision, tested hypothesis, and pivot reason in `session-oma-mode-{sessionId}.md`. For material boundary or architecture pivots, emit a decision event with `oma state emit "decision.made"` (a failed emit never blocks the work).

Copy the designed units into the host task list in execution order (per `oma-mode.md` Step 4), ending with the Step 5 judgment item.

---

## Phase C: Execute with hypothesis checkpoints

1. **Prove Unit 1 before expanding scope.** Run the highest-risk unknown or harness unit first through **Skill** (or read-only probe when no edit is needed).
2. **Re-plan on a disproved hypothesis.** If a unit falsifies an assumption, stop expanding downstream units, record what was learned and the revised sequence in `session-oma-mode-{sessionId}.md`, append the updated units to the task list, and continue. Never push bulk changes through on top of a broken assumption.
3. **Land one verified unit at a time.** Verify each unit's check before starting the next dependent unit. Never split tightly coupled code across parallel owners; escalate to `orchestrate` only for units whose contract and seam are already proven.
4. **Hand off to the independent judge.** Once the planned units complete (or hit a real blocker), return to `oma-mode.md` Step 5 so the fresh-context judge verifies all Step 1 criteria unchanged.

---

## Guardrails

- **No silent criteria drift.** Learning something new may revise the execution units, never weaken or drop the Step 1 completion criteria.
- **No speculative over-design.** Design only the units needed to resolve the unknowns and reach the criteria; if Phase A reveals the task is actually a normal single-owner change or standard workflow, re-route immediately under `oma-mode.md` Step 4.
- **Respect route limits.** Attempt budgets, authorization boundaries, and the 5-iteration limit of `oma-mode.md` apply unchanged.
