---
title: "Guide: Bug Fixing"
description: Thorough debugging guide covering the structured 5-step debug loop, severity triage, escalation signals, and post-fix validation.
---

# Guide: Bug Fixing

## When to Use the Debug Workflow

Use `/debug` (or say "fix bug", "fix error", "debug" in natural language) when you have a specific bug to diagnose and fix. The workflow provides a structured, reproducible approach to debugging that avoids the common trap of fixing symptoms instead of root causes.

The debug workflow supports all vendors (Gemini, Claude, Codex, Qwen). Steps 1-5 run inline. Step 6 (similar pattern scanning) may delegate to a `debug-investigator` subagent when the scan scope is broad (10+ files or multi-domain errors).

---

## Bug Report Template

When reporting a bug, provide as much of the following as possible. Each field helps the debug workflow narrow the search faster.

### Required Fields

| Field | Description | Example |
|:------|:-----------|:--------|
| **Error message** | The exact error text or stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Steps to reproduce** | Ordered actions that trigger the bug | 1. Log in as admin. 2. Navigate to /users. 3. Click "Delete" on any user. |
| **Expected behavior** | What should happen | User is deleted and removed from the list. |
| **Actual behavior** | What actually happens | Page crashes with a white screen. |

### Optional Fields (Highly Recommended)

| Field | Description | Example |
|:------|:-----------|:--------|
| **Environment** | Browser, OS, Node version, device | Chrome 124, macOS 15.3, Node 22.1 |
| **Frequency** | Always, sometimes, first-time only | Always reproducible |
| **Recent changes** | What changed before the bug appeared | Merged PR #142 (user deletion feature) |
| **Related code** | Files or functions you suspect | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Server logs, console output | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Screenshots/recordings** | Visual evidence | Screenshot of the error screen |

The more context you provide upfront, the fewer back-and-forth questions the debug workflow needs.

---

## Severity Triage (P0-P3)

Severity determines how the bug is handled and how quickly it should be fixed.

### P0 — Critical (Immediate Response)

**Definition:** Production is down, data is being lost or corrupted, security breach is active.

**Response expectation:** Drop everything. This is the only task until resolved.

**Examples:**
- Authentication system is bypassed — all users can access admin endpoints.
- Database migration corrupted the users table — accounts are inaccessible.
- Payment processing is double-charging customers.
- API endpoint returns other users' personal data.

**Debug approach:** Skip the full template. Provide the error message and any stack trace. The workflow starts immediately at Step 2 (Reproduce).

### P1 — High (Same Session)

**Definition:** A core feature is broken for a significant number of users. Workaround may exist but is not acceptable long-term.

**Response expectation:** Fix within the current work session. Do not start new features until resolved.

**Examples:**
- Search returns no results for queries containing special characters.
- File upload fails for files larger than 5MB (limit should be 50MB).
- Mobile app crashes on launch for Android 14 devices.
- Password reset emails are not sent (email service integration broken).

**Debug approach:** Full 5-step loop. QA review recommended after fix.

### P2 — Medium (This Sprint)

**Definition:** A feature works but with degraded behavior. Affects usability but not functionality.

**Response expectation:** Schedule for the current sprint. Fix before the next release.

**Examples:**
- Table sorting is case-sensitive ("apple" sorts after "Zebra").
- Dark mode has unreadable text in the settings panel.
- API response time for /users endpoint is 8 seconds (should be under 1s).
- Pagination shows "Page 1 of 0" when the list is empty.

**Debug approach:** Full 5-step loop. Include in QA regression suite.

### P3 — Low (Backlog)

**Definition:** Cosmetic issue, edge case, or minor inconvenience.

**Response expectation:** Add to backlog. Fix when convenient, or batch with related changes.

**Examples:**
- Tooltip text has a typo: "Delet" instead of "Delete".
- Console warning about deprecated React lifecycle method.
- Footer alignment is off by 2 pixels on viewport widths between 768-800px.
- Loading spinner continues for 200ms after content is visible.

**Debug approach:** May not need the full debug loop. Direct fix with regression test is sufficient.

---

## The 5-Step Debug Loop in Detail

The `/debug` workflow executes these steps in strict order. It uses MCP code analysis tools throughout — never raw file reads or grep.

### Step 1: Collect Error Information

The workflow asks for (or receives from the user):
- Error message and stack trace
- Steps to reproduce
- Expected vs actual behavior
- Environment details

If an error message is already provided in the prompt, the workflow proceeds immediately to Step 2.

### Step 2: Reproduce the Bug

**Tools used:** `search_for_pattern` with the error message or stack trace keywords, `find_symbol` to locate the exact function and file.

The goal is to locate the error in the codebase — find the exact line where the exception is thrown, the exact function that produces wrong output, or the exact condition that causes the unexpected behavior.

This step transforms a user-reported symptom ("the page crashes") into a codebase-level location (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Step 3: Diagnose Root Cause

**Tools used:** `find_referencing_symbols` to trace the execution path backward from the error point.

The workflow traces backward from the error location to find the actual cause. It checks for these common root cause patterns:

| Pattern | What to Look For |
|:--------|:----------------|
| **Null/undefined access** | Missing null checks, optional chaining needed, uninitialized variables |
| **Race conditions** | Async operations completing out of order, missing await, shared mutable state |
| **Missing error handling** | try/catch absent, promise rejection unhandled, error boundary missing |
| **Wrong data types** | String where number expected, missing type coercion, incorrect schema |
| **Stale state** | React state not updating, cached values not invalidated, closure capturing old value |
| **Missing validation** | User input not sanitized, API request body not validated, boundary conditions unchecked |

The key discipline: diagnose the **root cause**, not the symptom. If `user.id` is undefined, the question is not "how do I check for undefined?" but "why is user undefined at this point in the execution path?"

### Step 4: Propose Minimal Fix

The workflow presents:
1. The identified root cause (with evidence from the code trace).
2. The proposed fix (changing only what is necessary).
3. An explanation of why this fixes the root cause, not just the symptom.

**The workflow blocks here until the user confirms.** This prevents the debug agent from making changes without approval.

**Minimal fix principle:** Change the fewest lines possible. Do not refactor, do not improve code style, do not add unrelated features. The fix should be reviewable in under 2 minutes.

### Step 5: Apply Fix and Write Regression Test

Two actions happen in this step:

1. **Implement the fix** — The approved minimal change is applied.
2. **Write a regression test** — A test that:
   - Reproduces the original bug (the test must fail without the fix)
   - Verifies the fix works (the test must pass with the fix)
   - Prevents the same bug from recurring in future changes

The regression test is the most important output of the debug workflow. Without it, the same bug can be reintroduced by any future change.

### Step 6: Scan for Similar Patterns

After the fix is applied, the workflow scans the entire codebase for the same pattern that caused the bug.

**Tools used:** `search_for_pattern` with the pattern that was identified as the root cause.

For example, if the bug was caused by accessing `user.organization.id` without checking if `organization` is null, the scan looks for all other instances of `organization.id` access without null checks.

**Subagent delegation criteria** — The workflow spawns a `debug-investigator` subagent when:
- The error spans multiple domains (e.g., both frontend and backend affected).
- The similar pattern scan scope covers 10+ files.
- Deep dependency tracing is needed to fully diagnose the issue.

Vendor-specific spawn methods:

| Vendor | Spawn Method |
|:-------|:------------|
| Claude Code | Agent tool with `.claude/agents/debug-investigator.md` |
| Codex CLI | `.codex/agents/debug-investigator.toml` for same-vendor native dispatch; otherwise `oma agent:spawn` |
| Gemini CLI | `oma agent:spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oma agent:spawn debug "scan prompt" {session_id} -w {workspace}` |

All similar vulnerable locations are reported. Confirmed instances are fixed as part of the same session.

### Step 7: Document the Bug

The workflow writes a memory file with:
- Symptom and root cause
- Fix applied and files changed
- Regression test location
- Similar patterns found across the codebase

---

## Prompt Template for /debug

When triggering the debug workflow, you can provide a structured prompt:

```
/debug

Error: TypeError: Cannot read properties of undefined (reading 'id')
Stack trace:
  at deleteUser (src/api/users.ts:47:23)
  at handleDelete (src/routes/users.ts:112:5)

Steps to reproduce:
1. Log in as admin
2. Navigate to /users
3. Click "Delete" on a user whose organization was deleted

Expected: User is deleted
Actual: 500 Internal Server Error

Environment: Node 22.1, PostgreSQL 16
```

**Why this structure works:**

- **Error + stack trace** allows Step 2 to immediately locate the code (`search_for_pattern` with "deleteUser" finds the function; `find_symbol` pinpoints the exact location).
- **Steps to reproduce** with the specific trigger condition ("user whose organization was deleted") hints at the root cause (null foreign key).
- **Environment** eliminates version-specific red herrings.

For simpler bugs, a shorter prompt works:

```
/debug The login page shows "Invalid credentials" even with correct password
```

The workflow will ask for additional details as needed.

---

## Escalation Signals

These signals indicate the bug requires escalation beyond the standard debug loop:

### Signal 1: Same Fix Attempted Twice

If the workflow proposes a fix, applies it, and the same error recurs, the problem is deeper than the initial diagnosis. This triggers the **Exploration Loop** in workflows that support it (ultrawork, orchestrate, work):

- Generate 2-3 alternative hypotheses for the root cause.
- Test each hypothesis in a separate workspace (git stash per attempt).
- Score results and adopt the best approach.

### Signal 2: Multi-Domain Root Cause

The error in the frontend is caused by a backend change that is caused by a database schema migration. When the root cause crosses domain boundaries, escalate to `/work` or `/orchestrate` to involve the relevant domain agents.

**Example:** Frontend displays "undefined" for user name. Backend returns null for `user.display_name`. Database migration added the column but existing rows have NULL values. Fix requires: database migration (backfill), backend null handling, and frontend fallback display.

### Signal 3: Missing Reproduction Environment

The bug only occurs in production, and you cannot reproduce it locally. Signals include:
- Environment-specific configuration differences.
- Race conditions that only manifest under production load.
- Third-party service behavior differences between staging and production.

**Action:** Gather production logs, request access to production monitoring, and consider adding instrumentation/logging before attempting a fix.

### Signal 4: Test Infrastructure Failure

The regression test cannot be written because the test infrastructure is broken, missing, or inadequate.

**Action:** Fix the test infrastructure first (or use `oma install` to configure it), then return to the debug workflow.

---

## Post-Fix Validation Checklist

After applying the fix and regression test, verify:

- [ ] **Regression test fails without the fix** — Revert the fix temporarily and confirm the test catches the bug.
- [ ] **Regression test passes with the fix** — Apply the fix and confirm the test passes.
- [ ] **Existing tests still pass** — Run the full test suite to verify no regressions.
- [ ] **Build succeeds** — Compile/build the project to catch type errors or import issues.
- [ ] **Similar patterns scanned** — Step 6 has been completed and all found instances are either fixed or documented.
- [ ] **Fix is minimal** — Only the necessary lines were changed. No unrelated refactoring was included.
- [ ] **Root cause documented** — The memory file records: symptom, root cause, fix applied, files changed, regression test location, and similar patterns found.

---

## Done Criteria

The debug workflow is complete when:

1. The root cause is identified and documented (not just the symptom).
2. A minimal fix is applied with user approval.
3. A regression test exists that fails without the fix and passes with it.
4. The codebase has been scanned for similar patterns, and all confirmed instances are addressed.
5. A bug report is recorded in memory with: symptom, root cause, fix applied, files changed, regression test location, and similar patterns found.
6. All existing tests continue to pass after the fix.
