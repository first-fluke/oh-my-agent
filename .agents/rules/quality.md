---
description: Quality assurance standards for security (OWASP), performance, accessibility (WCAG), and code quality reviews
globs:
alwaysApply: false
---

# Quality Assurance Standards

## Core Rules

1. Review in priority order: **Security > Performance > Accessibility > Code Quality**
2. Every finding must include file:line, description, and fix
3. Severity levels: CRITICAL (security breach/data loss), HIGH (blocks launch), MEDIUM (this sprint), LOW (backlog)
4. Start from the automated checks the project's stack provides (dependency audit, static analysis, accessibility and performance audits) when the review calls for them; do not require tools from an unrelated stack
5. Report a finding only with supporting evidence; state an unverified hypothesis as a verification gap, not a finding
6. Provide remediation code, not just descriptions
