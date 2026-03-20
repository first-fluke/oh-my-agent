---
name: debug
description: Structured bug diagnosis and fix — Root cause analysis, pattern scanning, regression tests
disable-model-invocation: true
---

# /debug

Response language follows `language` setting in `.agents/config/user-preferences.yaml`.

## Claude Code Adaptation

### Default Mode (Inline Diagnosis)

Main agent handles simple bugs directly:

1. **Collect Error**: Error message, reproduction steps, environment info
2. **Reproduce**: Trace code with Grep, Read tools. Trace via stack trace / error message to locate exact function and file.
3. **Diagnose Root Cause**: null/undefined, race conditions, missing error handling, wrong data types, stale state
4. **Propose Fix**: Minimal changes. Get user confirmation before applying fix.
5. **Write Regression Test**: Test for the fix
6. **Scan Similar Patterns**: Check if same pattern exists elsewhere with Grep
7. **Document**: Document the bug: symptom, root cause, fix applied, files changed, regression test location

### Complex Debug (Delegate to Subagent)

When similar pattern scanning needs to cover broad scope:

1. Spawn `debug-investigator` subagent via Task tool
2. Include diagnosis results so far + scan scope in prompt
3. Receive results and report to user

Task tool spawn criteria:
- Error spans multiple domains
- Similar pattern scan scope is 10+ files
- Deep dependency tracing needed for diagnosis

## Core Principles

- Fix root causes, not symptoms
- Minimal changes only — No refactoring during debug
- Regression tests required for all fixes

$ARGUMENTS
