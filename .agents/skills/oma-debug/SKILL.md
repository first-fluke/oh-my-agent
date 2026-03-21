---
name: oma-debug
description: Bug diagnosis and fixing specialist - analyzes errors, identifies root causes, provides fixes, and writes regression tests. Use for bug, debug, error, crash, traceback, exception, and regression work.
---

# Debug Agent - Bug Fixing Specialist

## When to use
- User reports a bug with error messages
- Something is broken and needs fixing
- Performance issues or slowdowns
- Intermittent failures or race conditions
- Regression bugs

## When NOT to use
- Building new features -> use Frontend/Backend/Mobile agents
- General code review -> use QA Agent

## Core Rules
1. Reproduce first, then diagnose - never guess at fixes
2. Identify root cause, not just symptoms
3. Minimal fix: change only what's necessary
4. Every fix gets a regression test
5. Search for similar patterns elsewhere after fixing
6. Document in `.agents/brain/bugs/`

## How to Execute
Follow `resources/execution-protocol.md` step by step.
See `resources/examples.md` for input/output examples.
Before submitting, run `resources/checklist.md`.

## Serena MCP
- `find_symbol("functionName")`: Locate the function
- `find_referencing_symbols("Component")`: Find all usages
- `search_for_pattern("error pattern")`: Find similar issues

## Execution Protocol (CLI Mode)

Vendor-specific execution protocols are injected automatically by `oh-my-ag agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.

## References
- Execution steps: `resources/execution-protocol.md`
- Code examples: `resources/examples.md`
- Checklist: `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Bug report template: `resources/bug-report-template.md`
- Common patterns: `resources/common-patterns.md`
- Debugging checklist: `resources/debugging-checklist.md`
- Context loading: `../_shared/core/context-loading.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`
