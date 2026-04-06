---
description: Structured bug diagnosis and fixing workflow — reproduce, diagnose root cause, apply minimal fix, write regression test, and scan for similar patterns
---

# MANDATORY RULES — VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 1 in order.
- **You MUST use MCP tools throughout the workflow.**
  - Use code analysis tools (`find_symbol`, `find_referencing_symbols`, `search_for_pattern`) for bug investigation — NOT raw file reads or grep.
  - Use memory write tool to record debugging results.
  - Memory path: configurable via `memoryConfig.basePath` (default: `.serena/memories`)
  - Tool names: configurable via `memoryConfig.tools` in `mcp.json`
  - MCP tools are the primary interface for all code exploration.

---

## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.

Steps 1-5 execute inline for all vendors. Step 6 (similar pattern scanning) may delegate to a `debug-investigator` subagent when the scan scope is broad.

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

```bash
oma agent:spawn debug "scan prompt with diagnosis context" {session_id} -w {workspace}
```

#### If Antigravity or CLI Fallback

```bash
oma agent:spawn debug "scan prompt with diagnosis context" {session_id} -w {workspace}
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

// turbo
Use MCP `search_for_pattern` with the error message or stack trace to locate the error in the codebase.
Use `find_symbol` to identify the exact function and file. Do NOT grep or read files manually.

---

## Step 3: Diagnose Root Cause

Use MCP `find_referencing_symbols` to trace the execution path backward from the error point.
Identify the root cause — not just the symptom. Check:
- null/undefined access
- Race conditions
- Missing error handling
- Wrong data types
- Stale state

---

## Step 4: Propose Minimal Fix

Present the root cause and proposed fix to the user.
- The fix should change only what is necessary.
- Explain why this fixes the root cause, not just the symptom.
- **You MUST get user confirmation before proceeding to Step 5.**

---

## Step 5: Apply Fix and Write Regression Test

// turbo
1. Implement the minimal fix.
2. Write a regression test that reproduces the original bug and verifies the fix.
3. The test must fail without the fix and pass with it.

---

## Step 6: Scan for Similar Patterns

// turbo
Use MCP `search_for_pattern` to search the codebase for the same pattern that caused the bug.
Report any other locations that may have the same vulnerability. Fix them if confirmed.

---

## Step 7: Document the Bug

Use memory write tool to record a bug report:
- Symptom, root cause
- Fix applied, files changed
- Regression test location
- Similar patterns found
