---
name: ultrawork
description: 5-phase 17-step Phase Gate orchestration
disable-model-invocation: true
---

# /ultrawork

Response language follows `language` setting in `.agents/config/user-preferences.yaml`.

## Claude Code Native Adaptation

### Phase Gate Loop Pattern

Execute each phase sequentially, looping back to the phase when a Gate fails.
The main agent directly evaluates the Gate checklist to control the loop.

```
for each PHASE in [PLAN, IMPL, VERIFY, REFINE, SHIP]:
  GATE_LOOP:
    Execute Steps for that Phase
    Evaluate Gate checklist:
      All items PASS → Proceed to next Phase
      FAIL →
        PLAN_GATE failed: Regress to Step 1 (inline re-execution)
        IMPL_GATE failed: Re-spawn only failed agents via Task tool → GATE_LOOP
        VERIFY_GATE failed: Regress to Step 5, fix implementation, re-run VERIFY
        REFINE_GATE failed: Re-spawn debug-investigator → GATE_LOOP
        SHIP_GATE failed: Re-execute that Step → GATE_LOOP
```

---

### PLAN Phase (Steps 1-4): Execute inline

Main agent performs PM analysis directly:

1. **Step 1**: Requirements analysis, domain identification — save plan to `.agents/plan.json`
2. **Step 2**: Completeness Review — Verify requirements completeness
3. **Step 3**: Meta Review — Review adequacy
4. **Step 4**: Over-Engineering Review — Eliminate unnecessary complexity

**PLAN_GATE**: Plan documentation, assumption list, alternative review, over-engineering review → User confirmation

---

### IMPL Phase (Step 5): Spawn implementation agents in parallel

Spawn implementation agents via Task tool:

- Multiple Task tool calls in same message (true parallel)
- Use `.claude/agents/{agent}.md` definitions
- Pass task + API contract to each agent

**IMPL_GATE**: Build success (Bash), tests pass (Bash), only planned files changed

---

### VERIFY Phase (Steps 6-8): Spawn qa-reviewer Task tool

1. **Step 6**: Alignment Review — Compare implementation vs plan requirements point by point
2. **Step 7**: Security/Bug Review — OWASP Top 10 check: injection, broken auth, sensitive data, access control, security misconfig
3. **Step 8**: Regression Review — Run existing tests, verify no regressions in affected modules

Spawn `qa-reviewer` subagent via Task tool for 3 review steps.

Apply Review Loop:
```
Parse VERIFY results:
  PASS → Next Phase
  FAIL → Re-spawn implementation agent (with feedback) → Re-run VERIFY
```

**VERIFY_GATE**: Implementation==Requirements, 0 CRITICAL, 0 HIGH, no regressions

---

### REFINE Phase (Steps 9-13): Spawn debug-investigator Task tool

1. **Step 9**: Split large files/functions — files >500 lines, functions >50 lines → split
2. **Step 10**: Capture integration opportunities — check for duplicate logic across changed files
3. **Step 11**: Side effect analysis — analyze cascade impact via references
4. **Step 12**: Consistency review — naming/style consistency review
5. **Step 13**: Cleanup — remove newly created dead code

Spawn `debug-investigator` subagent.

> Simple tasks under 50 lines: SKIP REFINE Phase

**REFINE_GATE**: No large files/functions, integration opportunities captured, side effects verified

---

### SHIP Phase (Steps 14-17): Final QA + Deployment checklist

1. **Step 14**: Quality Review — run lint, type-check, verify coverage
2. **Step 15**: UX Flow verification — verify user journey flows
3. **Step 16**: Check cascade impact (2nd pass)
4. **Step 17**: Deployment Readiness — verify: no secrets committed, migrations ready, deployment checklist complete

Spawn `qa-reviewer` subagent (final review).

**SHIP_GATE**: Quality pass, UX verified, related issues resolved → Final user approval

$ARGUMENTS
