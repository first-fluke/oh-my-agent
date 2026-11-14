# Debugging Reference

Supporting material for a debug task: the condensed bug report, the tools reference, and handoff routing. Investigation steps are in `execution-protocol.md`.

## Documentation Template

After fixing, document in `.agents/results/bugs/`. For Complex or CRITICAL/HIGH
severity bugs, use the full `bug-report-template.md`; for Simple/Medium bugs,
this condensed form is sufficient:

```markdown
# Bug: [Title]
**Date**: YYYY-MM-DD
**Severity**: CRITICAL/HIGH/MEDIUM/LOW
**Status**: FIXED

## Problem
[What was broken]

## Root Cause
[Why it was broken]

## Fix
[What was changed]

## Files Modified
- path/to/file

## Testing
- [x] Regression test added
- [x] Manual verification
- [x] Related areas checked

## Prevention
[How to avoid in future]
```

## Tools Reference

- **Code intelligence**: configured symbol, pattern, and reference tools; native search of paths outside this project or ignored paths as fallback
- **Browser automation**: Browser verification uses the installed MCPs selected in `mcp.devtools_browsers`: Aside (`aside`, default), Chrome DevTools MCP (`chrome`), and Firefox DevTools MCP (`firefox`). Multiple selections are supported; use `oma update mcp` to change them. Discover the selected server’s actual tools before use; tool names and capabilities differ between servers. An empty selection disables browser MCP verification; report any unverified UI checks.
- **Git bisect**: Find when the bug was introduced

## Handoff

Route work that falls outside the fix to its owner per `../references/_shared/core/skill-routing.md`:

- Schema, migration design, indexing, or query tuning → `oma-db`
- Architectural change or system-boundary decision → `oma-architecture`
- Security, accessibility, or performance review → `oma-qa`
- Feature-sized implementation → `oma-frontend`, `oma-backend`, or `oma-mobile`
