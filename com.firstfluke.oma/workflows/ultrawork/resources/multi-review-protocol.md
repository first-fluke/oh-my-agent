# Multi-Review Protocol

## Core Principle
**Every task is reviewed multiple times from different perspectives.**

---

## Cross-Context Review (CCR) Mandate

**Every review below runs in a fresh, context-isolated reviewer subagent — never inline in the main session, and never batched with implementation work or another review.**

### Why isolation is mandatory
- Same-session review is degraded by anchoring and sycophancy: a reviewer that shares the author's context tends to ratify the author's choices instead of independently re-deriving them. Cross-Context Review measurably outperforms repeated same-session review (F1 28.6% cross-context vs 21.7% same-session repeated) — arXiv 2603.12123, "Cross-Context Review".
- Adding more same-session review rounds does not recover the gap and can amplify shared-context error — arXiv 2603.16244, "More Rounds, More Noise". The fix is a fresh context per review, not more passes in the same one.

### Isolation contract (per review)
Each reviewer subagent's prompt MUST contain ONLY:
1. The **durable artifacts** under review, referenced by path so the reviewer reads them fresh: git diff, changed files, `.agents/results/plan-{sessionId}.json`, prior `result-*.md`, and test/lint output.
2. **That single review's guide section** copied from below.

Each reviewer subagent's prompt MUST NOT contain:
- the main session's conversation history,
- the implementation agent's reasoning or self-justification, or
- any prior review's verdict — **unless** that review's guide explicitly requires chaining a specific prior finding (only the Meta Review, Step 3, does: it audits the Step 2 verdict).

### Verdict output
The reviewer writes a structured verdict to memory per `.agents/skills/_shared/runtime/memory-protocol.md`:

```
review: <name> (Step N)
verdict: PASS | FAIL
findings: [ { severity: CRITICAL|HIGH|MEDIUM|LOW, file:line, description, fix } ]
evidence: <artifact paths the reviewer actually read>
```

The phase coordinator collects these verdicts and folds them into the phase's `result-*.md` and `session-ultrawork.md` records. Dispatch mechanics (native subagent vs `oma agent:spawn`) are defined once in the **Cross-Context Review (CCR) Dispatch** section of `ultrawork.md`.

---

## Review Types Guide

### 1. Completeness Review (Step 2)
- **Question**: "Is anything missing?"
- **Check**: Map requirements to plan items
- **Pass Condition**: All requirements reflected in plan

### 2. Meta Review (Step 3)
- **Question**: "Was the review done properly?"
- **Check**: Verify the Step 2 completeness review was sufficient
- **Chaining exception**: this reviewer receives the Step 2 verdict as input — auditing it is the job (the only permitted verdict chaining in this protocol)
- **Pass Condition**: No review gaps confirmed

### 3. Simplicity Review (Step 4)
- **Question**: "Is this over-engineered?"
- **Check**: Question necessity of each component
- **Remove**: "Might need later", speculative features

### 4. Alignment Review (Step 6)
- **Question**: "Did we build what was requested?"
- **Check**: Compare plan vs implementation
- **Pass Condition**: 1:1 mapping confirmed

### 5. Safety Review (Step 7)
- **Question**: "Is there anything dangerous?"
- **Check**: OWASP Top 10, potential bugs
- **Tools**: npm audit, bandit, lighthouse
- **Pass Condition**: Zero CRITICAL/HIGH issues

### 6. Regression Review (Step 8)
- **Question**: "Did improvements break anything?"
- **Check**: Existing tests pass, existing features work
- **Pass Condition**: No regressions

### 7. Reusability Review (Step 10)
- **Question**: "Can we leverage existing code?"
- **Check**: Similar functions/components exist
- **Action**: Integrate if reusable

### 8. Consistency Review (Step 12)
- **Question**: "Is everything harmonious?"
- **Check**: Naming, style, architecture consistency
- **Pass Condition**: Aligns with existing codebase

### 9. Quality Review (Step 14)
- **Question**: "Does it meet quality standards?"
- **Check**: lint, types, coverage, complexity
- **Pass Condition**: All quality metrics pass

### 10. UX Flow Review (Step 15)
- **Question**: "Do the user-facing flows still work end to end?"
- **Check**: Walk the primary user journeys affected by the diff — routes, navigation, forms, error/empty/loading states
- **Pass Condition**: No broken or degraded user journey

### 11. Cascade Impact Review (Step 16)
- **Question**: "Did we break anything elsewhere?"
- **Check**: Use find_referencing_symbols for impact scope
- **Pass Condition**: No cascade impact or handled

### 12. Final Review (Step 17)
- **Question**: "Is this ready to deploy?"
- **Check**: Complete checklist final verification
- **Pass Condition**: User final approval

---

## Failure Recovery

| Review | Return Point on Failure |
|--------|------------------------|
| Step 2-4 | Step 1 (Revise plan) |
| Step 6-8 | Step 5 (Fix implementation) |
| Step 10-13 | Step 9 (Restart refinement) |
| Step 14-17 | Appropriate phase based on failure |
