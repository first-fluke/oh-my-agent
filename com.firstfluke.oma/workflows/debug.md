---
name: debug
description: Structured bug diagnosis and fixing workflow that reproduces, diagnoses root cause, applies a minimal fix, writes regression tests, and scans for similar patterns
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- Follow `.agents/skills/_shared/core/code-intelligence.md`: discover the configured provider’s tools; use native search only for paths outside this project or ignored paths when unavailable or timed out. Do not install a provider or track a repository automatically.
- Use native file tools and `.agents/skills/_shared/runtime/memory-protocol.md` for durable coordination state; code-intelligence memory tools are not required.

---

## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.

Steps 1-5 execute inline for all vendors. Step 6 (similar pattern scanning) may delegate to a `debug-investigator` subagent when the scan scope is broad.

### L1 Decision Events

Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

### Subagent Spawn Criteria

Spawn `debug-investigator` when:
- Error spans multiple domains
- Similar pattern scan scope is 10+ files
- Deep dependency tracing is needed for diagnosis

### Vendor-Specific Spawn (Step 6)

#### If Claude Code

Spawn `debug-investigator` via **Agent tool** using `.claude/agents/debug-investigator.md`.
Include diagnosis results so far + scan scope in prompt.

#### If Codex CLI

Request subagent execution via model-mediated subagent request.
Include diagnosis results and scan scope. Results returned as JSON output.

#### If Gemini CLI

Use the native `.gemini/agents/{name}.md` subagent when available (per `_shared/core/vendor-detection.md`); otherwise fall back to:

```bash
oma agent spawn debug "scan prompt with diagnosis context" {session_id} -w {workspace}
```

#### If Antigravity or CLI Fallback

```bash
oma agent spawn debug "scan prompt with diagnosis context" {session_id} -w {workspace}
```

---

## Step 1: Collect Error Information

Ask the user for:
- Error message, steps to reproduce
- Expected vs actual behavior
- Environment (browser, OS, device)

If an error message is provided, proceed immediately.

---

## Step 2: Reproduce the Bug

Run the smallest available failing test, runtime command, or log query that exercises the reported behavior and capture the observed failure signal. If the environment cannot reproduce it, follow `.agents/skills/oma-debug/resources/error-playbook.md` § "Cannot Reproduce the Bug" and record that limitation before continuing.

Use configured pattern search with the error message or stack trace to locate the error in the codebase. Native search is only for paths outside this project or ignored paths.
Locate the exact function and file with configured symbol tools. Native search is only for paths outside this project or ignored paths.

---

## Step 3: Diagnose Root Cause

Use configured reference tools or native caller inspection to trace the execution path backward from the error point.
Identify the root cause, not just the symptom. Check:
- null/undefined access
- Race conditions
- Missing error handling
- Wrong data types
- Stale state

When the root cause is confirmed, emit and verify the required diagnosis decision:

```bash
oma state emit "decision.made" '{"subject":"debug.root-cause","decision":"Treat the confirmed root cause as the basis for the minimal fix.","rationale":"The diagnosis traced the failure path and distinguished the root cause from symptoms."}'
oma state verify --workflow debug --checkpoint root-cause
```

---

## Step 4: Propose Minimal Fix

Present the root cause and proposed fix to the user.
- The fix should change only what is necessary.
- Explain why this fixes the root cause, not just the symptom.
- Apply `.agents/skills/_shared/core/execution-policy.md`: proceed when the requested work or decision is already authorized; ask only for a material missing decision or new authorization.

---

## Step 5: Apply Fix and Write Regression Test

1. Implement the minimal fix.
2. Write a regression test that reproduces the original bug and verifies the fix.
3. The test must fail without the fix and pass with it.

---

## Step 6: Scan for Similar Patterns

Use configured pattern tools or native search to search the codebase for the same pattern that caused the bug.
Report any other locations that may have the same vulnerability. Fix them if confirmed.

---

## Step 7: Document the Bug

Use memory write tool to record a bug report (for durable artifacts, also save it under `.agents/results/bugs/` per the oma-debug skill's expected outputs):
- Symptom, root cause
- Fix applied, files changed
- Regression test location
- Similar patterns found
