---
name: review
description: Full QA review pipeline covering security audit (OWASP Top 10), performance analysis, accessibility check (WCAG 2.2 AA), and code quality review
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- Follow `.agents/skills/_shared/core/code-intelligence.md`: discover configured
  tools; if unavailable or timed out, use native search only for paths outside this project or ignored paths. Do not install
  or track repositories automatically.
- Persist review state through `.agents/skills/_shared/runtime/memory-protocol.md`.

---

## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.
The detected vendor determines how the QA agent is spawned (Step 7).

### L1 Decision Events

Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

---

## Step 1: Identify Review Scope

Ask the user what to review: specific files, a feature branch, or the entire project.
If a PR or branch is provided, diff against the base branch to scope the review.

---

## Step 2: Run Automated Security Checks

Run available security tools: `npm audit` (Node.js), `bandit` (Python), or equivalent.
Check for known vulnerabilities in dependencies. Flag any CRITICAL or HIGH findings.

---

## Step 3: Manual Security Review (OWASP Top 10)

Use configured code intelligence or the documented native fallback to review code for:
- Injection (SQL, XSS, command)
- Broken auth, sensitive data exposure
- Broken access control, security misconfig
- Insecure deserialization
- Known vulnerable components
- Insufficient logging

---

## Step 4: Performance Analysis

Use configured code intelligence or the documented native fallback to check for:
- N+1 queries, missing indexes
- Unbounded pagination, memory leaks
- Unnecessary re-renders (React)
- Missing lazy loading
- Large bundle sizes, unoptimized images

---

## Step 5: Accessibility Review (WCAG 2.2 AA)

Check for:
- Semantic HTML, ARIA labels
- Keyboard navigation, color contrast
- Focus management, screen reader compatibility
- Image alt text

---

## Step 6: Code Quality Review

Use configured code intelligence or the documented native fallback to check for:
- Consistent naming, proper error handling
- Test coverage, TypeScript strict mode compliance
- Unused imports/variables
- Proper async/await usage
- Public API documentation

---

## Step 7: Generate QA Report

Compile all findings into a prioritized report:
- **CRITICAL**: Security breaches, data loss risks
- **HIGH**: Blocks launch
- **MEDIUM**: Fix this sprint
- **LOW**: Backlog

Each finding must include: `file:line`, description, and remediation code.
Use memory write tool to record the final report.

For each classified finding, record its actual severity, impact, and exploitability or failure evidence before report handoff. Use the finding identity and reviewed revision; when there are no findings, record the reviewed scope and checks with that outcome:

```bash
oma state emit "decision.made" '{"subject":"review.severity-classification","instanceId":"<finding ID or empty-review scope>@<reviewed revision>","decision":"<severity>: <identified finding and resulting remediation priority|no findings in the identified scope>","rationale":"<observed impact, prerequisites, and evidence supporting this classification>","evidence":["<review report and relevant check/log paths>"]}'
oma state verify --workflow review --checkpoint severity-classification --instance "<finding ID or empty-review scope>@<reviewed revision>"
```

---

## Agent Delegation: Spawn QA Agent

For large review scopes, delegate Steps 2-7 to a QA agent instead of running inline.

### If Claude Code
Use the Agent tool to spawn subagent:
- `Agent(subagent_type="qa-reviewer", prompt="Review the following files for security, performance, accessibility, and code quality issues: [file list]. Follow .agents/skills/oma-qa/SKILL.md for review standards. Report findings as: CRITICAL / HIGH / MEDIUM / LOW with file:line, description, and remediation code.", run_in_background=true)`

### If Codex CLI
Request parallel subagent execution with the review scope and standards.

### If Gemini CLI or Antigravity or CLI Fallback
```bash
oma agent spawn qa-agent review-prompt.md {sessionId} --task-id {qa_review_task.id} -w {workspace}
```

**Wait for the QA agent to complete and collect its findings before compiling the Step 7 report.** On the CLI path, read the injected claim and run-scoped result report.

---

## Fix-Verify Loop (with --fix option)

When user wants fixes too, execute review then fix then re-review loop:

1. Spawn QA agent (per vendor method above) to get issue list.
2. If CRITICAL/HIGH issues exist:
   - Spawn domain agent to fix issues:

### If Claude Code
     - `Agent(subagent_type="backend-engineer", prompt="Fix these issues: [issues + fix instructions]", run_in_background=true)`
     - `Agent(subagent_type="frontend-engineer", prompt="Fix these issues: [issues + fix instructions]", run_in_background=true)`

### If Codex CLI
     Request parallel subagent execution with the issues and fix instructions.

### If Gemini CLI or Antigravity or CLI Fallback
     ```bash
     oma agent spawn backend backend-fix-prompt.md {sessionId} --task-id {backend_fix_task.id} -w ./backend &
     oma agent spawn frontend frontend-fix-prompt.md {sessionId} --task-id {frontend_fix_task.id} -w ./frontend &
     wait
     ```

3. Re-spawn QA agent (per vendor method above) to re-review fixed code.
4. Repeat up to 3 times until no CRITICAL/HIGH issues remain.
