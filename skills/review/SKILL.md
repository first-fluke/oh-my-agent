---
name: review
description: OWASP security, performance, accessibility, code quality review (includes Fix-Verify Loop)
disable-model-invocation: true
---

# /review

## Review Checklists

### Security (OWASP Top 10)

- Injection (SQL, XSS, command)
- Broken authentication
- Sensitive data exposure
- Broken access control
- Security misconfiguration
- Insecure deserialization
- Known vulnerable components
- Insufficient logging

### Performance

- N+1 queries
- Missing indexes
- Unbounded pagination
- Memory leaks
- Unnecessary re-renders
- Missing lazy loading
- Large bundles
- Unoptimized images

### Accessibility (WCAG 2.1 AA)

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Color contrast
- Focus management
- Screen reader compatibility
- Image alt text

### Code Quality

- Consistent naming
- Proper error handling
- Test coverage
- TypeScript strict mode compliance
- Unused imports/variables
- Proper async/await patterns
- Public API documentation

## Claude Code Adaptation

### Default Mode (Review Only)

Run automated security checks (`npm audit` or equivalent) first, then manual review.

Delegate QA review to `qa-reviewer` subagent:

1. Spawn `.claude/agents/qa-reviewer.md` agent via Task tool
2. Include target files/scope in prompt
3. Report review results to user (CRITICAL → HIGH → MEDIUM → LOW order)

Task tool spawn prompt example:
```
Review the following files for security, performance, accessibility, and code quality issues:
[file list]
Follow .agents/skills/qa-agent/SKILL.md for review standards.
Report findings as: CRITICAL / HIGH / MEDIUM / LOW with file:line, description, and remediation code.
```

### Fix-Verify Loop (with --fix option)

When user wants fixes too, execute review → fix → re-review loop:

```
[1] Spawn qa-reviewer Task tool → Receive issue list
[2] CRITICAL/HIGH issues exist?
    NO → Report and complete
    YES →
      [3] Spawn domain agent Task tool (issues + fix instructions)
          - Backend issues → backend-impl agent
          - Frontend issues → frontend-impl agent
          - Mobile issues → mobile-impl agent
      [4] Receive fix results
      [5] Re-spawn qa-reviewer (re-review fixed code)
      [6] → Back to [2] (repeat up to 3 times)
```

## Determine Review Scope

- If files/directory specified in `$ARGUMENTS` → Only that scope
- If not specified → `git diff --name-only` or recent changed files

## Report Format

Each finding: `file:line` + description + remediation code.

Response language follows `language` setting in `.agents/config/user-preferences.yaml`.

$ARGUMENTS
