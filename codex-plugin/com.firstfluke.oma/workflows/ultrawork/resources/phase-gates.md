# Phase Gate Definitions

This file is the canonical definition of gate criteria, measurement applicability, and skip conditions. Each phase must pass its gate or record an applicable skip before proceeding. `ultrawork.md` owns dispatch, phase logs, decision checkpoints, and retry limits.

Apply `../../../skills/_shared/core/execution-policy.md` for authorization and verification. Existing authorization satisfies approval requirements; ask only for a material missing decision or new authorization. SHIP checks readiness; publishing or deployment requires authorization for that action.

The "Owner" of each gate coordinates the phase and records the verdict; it does **not** review its own phase inline. The review-type criteria below (completeness, alignment, safety, reusability, consistency, quality, cascade, final) are assessed by fresh, context-isolated reviewer subagents per the **Cross-Context Review (CCR) Dispatch** section of `ultrawork.md` and the CCR Mandate in `multi-review-protocol.md`. On a repeated gate failure, re-review with a fresh reviewer context — adding more same-context passes does not recover the gap.

---

## PLAN_GATE

**Owner**: PM Agent
**Trigger**: After Steps 1-4

### Criteria
- [ ] Plan documented with acceptance criteria
- [ ] Where set, `test_approach` is valid (`tdd|test_after|not_applicable`); every `not_applicable` carries `test_approach_rationale` + `alternative_verification`; refactor tasks are never `tdd` (see `_shared/core/test-approach.md`)
- [ ] Material assumptions recorded
- [ ] Alternatives considered for unresolved architecture decisions
- [ ] Over-engineering review completed
- [ ] Scope authorized under the execution policy

### Auto-pass Conditions
These conditions allow gate bookkeeping to proceed once the required reviews and criteria above are satisfied; they do not skip review steps.

- Difficulty: Simple
- Existing pattern match
- User explicitly skips

### Failure Action
Revise plan, do not proceed to IMPL

---

## IMPL_GATE

**Owner**: Implementation Agent
**Trigger**: After Step 5

### Criteria
- [ ] Applicable non-emitting checks pass; build/compile/package checks run only when the user explicitly requests a build
- [ ] Tests pass
- [ ] Tasks marked `test_approach: tdd` have a `TDD_EVIDENCE` block (focused test command, RED failure, GREEN pass) in the result — checked **only** for `tdd` tasks; `oma verify <agent>` automates this
- [ ] Only planned files modified
- [ ] No unrequested features added
- [ ] Diff reviewed for scope creep
- [ ] For an active experiment, baseline evidence recorded in the Experiment Ledger

### Auto-pass Conditions
These conditions do not waive the criteria above or any later review.

- All tests green
- Diff < 200 lines
- No new dependencies

### Failure Action
Fix issues, re-run implementation

---

## VERIFY_GATE

**Owner**: QA Agent
**Trigger**: After Steps 6-8

### Criteria
- [ ] Implementation matches requirements
- [ ] Zero CRITICAL issues
- [ ] Zero HIGH issues
- [ ] Improvements validated (no regressions)
- [ ] Applicable project measurement targets met; required checks cannot be offset by other metrics

### Blockers
- Any CRITICAL or HIGH issue

### Failure Action
Return to IMPL with findings

---

## REFINE_GATE

**Owner**: Implementation + Refactor Agents
**Trigger**: After Steps 9-13

### Criteria
- [ ] Changed files follow project structure and maintainability rules
- [ ] Changed functions are understandable and testable under project conventions
- [ ] Integration opportunities captured
- [ ] Side effects verified
- [ ] Unused code cleaned
- [ ] Affected behavior and applicable measured targets have no unresolved regression from refinement

### Measurement recovery
Investigate a measured regression against comparable evidence and project tolerances. Repair or discard only the refinement's owned changes, preserving unrelated work; refresh affected checks before passing the gate. No numeric grade triggers automatic rollback.

### Skip Conditions
- Simple tasks < 50 lines total change
- User explicitly skips

### Failure Action
Address issues, re-verify

---

## SHIP_GATE

**Owner**: QA Agent
**Trigger**: After Steps 14-17

### Criteria
- [ ] Lint passes
- [ ] Type check passes
- [ ] Applicable project or task coverage target met; when coverage is not applicable, record alternative verification and its limits per `_shared/core/test-approach.md`
- [ ] UX flows verified
- [ ] No hardcoded secrets
- [ ] Migrations safe
- [ ] Related issues addressed
- [ ] Deployment checklist complete

### Final Approval
Reuse existing authorization under the execution policy. Ask only for an unresolved material decision or an action outside that authorization; readiness review itself does not require another approval.

### Measurement evidence (when applicable)
- [ ] Project-defined targets met with comparable evidence
- [ ] Any experimental changes integrated and affected checks refreshed
- [ ] Actual experiment decisions and limits recorded when a ledger exists

### Failure Action
Return to appropriate phase based on failure type

---

## Quality Measurement Integration

Read `../../../skills/_shared/conditional/quality-score.md` only when a defined metric comparison is needed. Reuse current evidence where valid. Project measurements supplement the criteria above; there are no default composite weights or letter-grade gates. Missing measurements are reported explicitly and never waive required checks.

### Repeated Gate Failure Rule

If the same gate fails twice on the same issue, reassess the cause before another attempt. When distinct alternatives merit testing and the existing aggregate recovery budget covers a comparison round, follow `../../../skills/_shared/conditional/exploration-loop.md`. Record actual evidence, select a candidate that meets required behavior, and refresh verification after integration. Otherwise preserve the unresolved result under the workflow's recovery policy.
