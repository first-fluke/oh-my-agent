---
name: ralph
description: Ralph - persistent self-referential execution loop wrapping ultrawork with independent verifier verification
disable-model-invocation: true
---

# MANDATORY RULES: VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- **NEVER skip phases.** Execute from Phase 0 in order. Explicitly report completion of each phase to the user before proceeding to the next.
- **You MUST use MCP tools throughout the entire workflow.** This is NOT optional.
  - Use code analysis tools (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `search_for_pattern`) for code exploration.
  - Use memory tools (read/write/edit) for progress tracking.
  - Memory path: configurable via `memoryConfig.basePath` (default: `.serena/memories`)
  - Tool names: configurable via `memoryConfig.tools` in `mcp.json`
  - Do NOT use raw file reads or grep as substitutes. MCP tools are the primary interface for code and memory operations.
- **This workflow does NOT stop until all completion criteria pass or safeguards trigger.**
- **Follow the context-loading guide.** Read `.agents/skills/_shared/core/context-loading.md` and load only task-relevant resources.

---

## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.
The detected vendor determines how ultrawork spawns agents internally.

---

## Phase 0: INIT (DO NOT SKIP)

### Step 0.1: Load Prerequisites

1. Read `.agents/skills/_shared/core/context-loading.md` for resource loading strategy.
2. Read `.agents/skills/_shared/runtime/memory-protocol.md` for memory protocol.
3. Read `.agents/workflows/ralph/resources/judge-protocol.md` for JUDGE rules.

### Step 0.2: Define Completion Criteria

Analyze the user's request and define **verifiable** completion criteria. Each criterion MUST have:

```markdown
criteria:
  - id: C{N}
    description: "<what to achieve>"
    verification: "<how to verify — test result, build output, file existence, command output>"
    status: PENDING
    fail_count: 0
    previous_status: null           # last non-null status from prior iteration
    regressed_at_iteration: null    # iteration number when PASS → FAIL transition was detected
    affected_paths: []              # optional glob list — only set when verification takes >30s
                                    # used by judge-protocol's cache rules; see judge-protocol.md § "Caching for Heavy Verification"
```

**Rules:**
- Every criterion must be mechanically verifiable (test pass, build success, file exists, command output)
- Reject subjective criteria ("looks good", "feels right"). Ask the user to rephrase.
- Present criteria to the user for confirmation before proceeding

### Step 0.3: Initialize Session

1. Set `max_iterations: 5` (default safeguard)
2. Set `current_iteration: 0`
3. Record session start using memory write tool:
   - Create `session-ralph.md` in the memory base path
   - Include: session start time, user request summary, completion criteria, max_iterations

---

## Phase 1: EXEC

// turbo

### Step 1.1: Prepare Ultrawork Input

Compose the ultrawork input based on current iteration:

- **Iteration 1**: Full user request with all PENDING criteria
- **Iteration 2+**: REMAINING (FAIL + REGRESSED) criteria from previous JUDGE result, with:
  - Previous JUDGE results as context (what failed and why)
  - Suggested actions from JUDGE
  - Already-PASSED criteria excluded from **implementation scope** (do not re-implement), but they remain in **JUDGE scope** (will be re-verified to detect regressions)

### Step 1.2: Execute Ultrawork

Delegate to the ultrawork workflow:

1. Read and follow `.agents/workflows/ultrawork.md` step by step.
2. Pass the prepared input as the task description.
3. Ultrawork handles all vendor-specific agent spawning internally.
4. Wait for ultrawork to complete all 5 phases (PLAN, IMPL, VERIFY, REFINE, SHIP).

### Step 1.3: Record EXEC Completion

1. Increment `current_iteration`
2. Use memory edit tool to record iteration start in `session-ralph.md`

---

## Phase 2: JUDGE

### Step 2.1: Independent Verification

**You are now the independent verifier, NOT the implementer.**

For **EVERY criterion regardless of current status** (including PASS from prior iterations), execute the verification method defined in Phase 0:

- Run tests, then check pass/fail count
- Run build, then check exit code
- Check file existence and verify path
- Run specific commands, then check output

**Why re-verify PASS criteria**: ultrawork modifies shared code (utils, configs, migrations, dependencies). A PASS in iteration N may regress in iteration N+1 when fixing other criteria. Without re-verification, "DONE" can ship silent regressions.

**Heavy verification caching**: For verifications that take >30 seconds (e2e tests, integration suites), apply the caching rules in `judge-protocol.md` § "Caching for Heavy Verification" to skip re-runs when no relevant files changed.

**Follow `.agents/workflows/ralph/resources/judge-protocol.md` for the full protocol.**

### Step 2.2: Produce JUDGE Result

Output the JUDGE result in this exact format:

```markdown
## JUDGE Result — Iteration {N}

| Criterion | Status    | Evidence                                                |
|-----------|-----------|---------------------------------------------------------|
| C1        | PASS      | <concrete evidence>                                     |
| C2        | FAIL      | <concrete evidence of failure>                          |
| C3        | BLOCKED   | <failed 3x: reason>                                     |
| C4        | REGRESSED | previously PASS at iter N — now FAIL: <evidence + diff> |

verdict: PASS | FAIL
```

If verdict is FAIL, also output:

```markdown
remaining:
  - id: C{N}
    reason: "<why it failed>"
    suggested_action: "<what to try next>"
    fail_count: {N}
    regression: true | false        # true if status is REGRESSED
    previous_pass_iteration: {N}    # only when regression: true
```

### Step 2.3: Apply JUDGE Result

Before updating any criterion, capture the current `status` into `previous_status`. Then apply the transition rules in order:

1. **Verification passed** → `PASS`. Reset `regressed_at_iteration` to null.
2. **Verification failed AND `previous_status == PASS`** → `REGRESSED`. Set `regressed_at_iteration: {current_iteration}`. Do NOT increment `fail_count` on the first regression; regression is treated as a distinct first-class signal, not a normal failure streak. Subsequent consecutive failures of the same criterion follow rules 3-4.
3. **Verification failed AND not a regression AND `fail_count < 3`** → `FAIL`. Increment `fail_count`.
4. **Verification failed AND `fail_count >= 3`** → `BLOCKED`.

**Decision Gate impact**:
- `REGRESSED` is treated as `FAIL` for verdict computation (verdict becomes FAIL, REPLAN triggers).
- `REGRESSED` is NOT counted toward "DONE"; only `PASS` and `BLOCKED` count.

---

## Phase 2 → Decision Gate

Evaluate the JUDGE result:

### → DONE (All criteria PASS or BLOCKED)

If all criteria are either PASS or BLOCKED:

1. **If any BLOCKED exists**: Report partial completion with BLOCKED items listed
2. **If all PASS**: Report full completion
3. Use memory edit tool to record final results in `session-ralph.md`
4. Output completion summary:
   ```
   ## Ralph Complete — Iteration {N}/{max}

   PASSED: C1, C2, ...
   BLOCKED: C3 (if any)

   Total iterations: {N}
   ```
5. Workflow ends.

### → REPLAN (Any criterion is FAIL or REGRESSED)

If any criterion has status FAIL or REGRESSED, proceed to Phase 3.

### → SAFEGUARD (max_iterations reached)

If `current_iteration >= max_iterations`:

1. Force stop regardless of FAIL criteria
2. Report partial completion:
   ```
   ## Ralph Safeguard — Max Iterations Reached ({max})

   PASSED: C1, ...
   FAILED: C2, ... (still unresolved)
   BLOCKED: C3, ... (if any)

   Recommendation: Review FAILED criteria manually or increase max_iterations.
   ```
3. Use memory edit tool to record safeguard trigger in `session-ralph.md`
4. Workflow ends.

---

## Phase 3: REPLAN

// turbo

### Step 3.1: Extract Remaining Work

From the JUDGE result, collect criteria with status `FAIL` or `REGRESSED`. Treat the two classes separately:

1. **FAIL** (first-time or persistent failures): list each with its reason and suggested_action
2. **REGRESSED** (previously PASS, now FAIL): list each with previous-pass iteration, the inter-iteration diff that likely caused the regression, and a regression-specific suggested_action.
3. Include previous iteration's JUDGE evidence as context
4. Explicitly state which criteria are PASS (do not re-implement, but do not exclude from next JUDGE either)
5. Explicitly state which criteria are BLOCKED (do not retry)

### Step 3.2: Narrow Scope

Compose a focused task description containing the remaining work, separating regressions from first-fail items so ultrawork's reasoning differs:

```markdown
## Ralph Iteration {N+1} — Remaining Work

### Already Complete (DO NOT re-implement; will be re-verified by JUDGE)
- C1: <description> PASS

### Blocked (DO NOT retry)
- C3: <description> BLOCKED (failed 3x)

### Regressed (was passing — diagnose what broke it; minimal fix that preserves recent changes)
- C4: <description>
  - Last passed at: iteration {N}
  - Failed at: iteration {current}
  - Files changed since last pass: <list of modified paths>
  - Failure evidence: <evidence>
  - Suggested action: diff-aware diagnosis — identify which change in the listed files broke C4, fix that specifically without reverting the criterion that change was made for

### To Fix (first-time or persistent failures)
- C2: <description>
  - Previous failure: <evidence>
  - Suggested action: <action>
```

**Why separate Regressed from To Fix**: ultrawork prompts that frame work as "fix from scratch" vs "diagnose a regression" produce different reasoning paths. Regressed items should trigger diff-based investigation, not greenfield re-implementation.

### Step 3.3: Loop Back

1. Use memory edit tool to record REPLAN in `session-ralph.md`
2. Return to **Phase 1: EXEC** with the narrowed scope

---

## Summary

```
Phase 0: INIT → Define criteria, initialize session
    ↓
Phase 1: EXEC → Run ultrawork (full or narrowed scope)
    ↓
Phase 2: JUDGE → Independent verification of each criterion
    ↓
Decision: DONE? → End
          SAFEGUARD? → Force end
          FAIL? → Phase 3
    ↓
Phase 3: REPLAN → Extract remaining, narrow scope
    ↓
    └──→ Phase 1 (loop)
```

| Phase   | Purpose                    | Key Action                        |
|---------|----------------------------|-----------------------------------|
| INIT    | Define success criteria     | Verifiable criteria + session init |
| EXEC    | Implementation             | Delegate to ultrawork             |
| JUDGE   | Independent verification   | Evidence-based pass/fail per criterion |
| REPLAN  | Scope narrowing            | Extract FAIL + REGRESSED items, separated by class |
