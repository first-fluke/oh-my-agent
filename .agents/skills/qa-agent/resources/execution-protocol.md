# QA Agent - Execution Protocol

## Step 0: Prepare
1. **Assess difficulty** — see `../_shared/difficulty-guide.md`
   - **Simple**: Quick security + quality check | **Medium**: Full 4 steps | **Complex**: Full + prioritized scope
2. **Check lessons** — read QA section in `../_shared/lessons-learned.md`
3. **Clarify requirements** — follow `../_shared/clarification-protocol.md`
   - Check **Uncertainty Triggers**: security/auth concerns, existing code conflict potential?
   - Determine level: LOW → proceed | MEDIUM → present options | HIGH → ask immediately
4. **Budget context** — follow `../_shared/context-budget.md` (prioritize high-risk files)
5. **After review**: add recurring issues to `../_shared/lessons-learned.md`
6. **If standards matter**: read `resources/iso-quality.md`

**⚠️ Intelligent Escalation**: When uncertain, escalate early. Don't blindly proceed.

Follow these steps in order (adjust depth by difficulty).

## Step 1: Scope
- Identify what to review: new feature, full audit, or specific concern
- List all files/modules to inspect
- Determine review depth: quick check vs. comprehensive audit
- Use Serena to map the codebase:
  - `get_symbols_overview("src/")`: Understand structure
  - `search_for_pattern("password.*=.*[\"']")`: Find hardcoded secrets
  - `search_for_pattern("execute.*\\$\\{")`: Find SQL injection
  - `search_for_pattern("innerHTML")`: Find XSS vulnerabilities

## Step 2: Audit
Review in this priority order:
1. **Security** (CRITICAL): OWASP Top 10, auth, injection, data protection
2. **Performance**: API latency, N+1 queries, bundle size, Core Web Vitals
3. **Accessibility**: WCAG 2.1 AA, keyboard nav, screen reader, contrast
4. **Code Quality**: test coverage, complexity, architecture adherence

When applicable, map findings and gaps to:
- **ISO/IEC 25010** quality characteristics
- **ISO/IEC 29119** test planning, design, traceability, and exit criteria

Use `resources/checklist.md` (renamed qa-checklist) as the comprehensive review guide.

## Step 3: Report
Generate structured report with:
- Overall status: PASS / WARNING / FAIL
- Findings grouped by severity (CRITICAL > HIGH > MEDIUM > LOW)
- Each finding: file:line, description, remediation code
- Performance metrics vs. targets
- Standards suggestions when relevant:
  - quality characteristics under-covered
  - missing test design / traceability / exit criteria

## Step 4: Verify
- Run `resources/self-check.md` to verify your own review quality
- Ensure no false positives (each finding is real and reproducible)
- Confirm remediation suggestions are correct and complete
- Run `../_shared/common-checklist.md` for general quality

## On Error
See `resources/error-playbook.md` for recovery steps.
