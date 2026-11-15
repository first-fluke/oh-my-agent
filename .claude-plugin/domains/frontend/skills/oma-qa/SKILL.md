---
name: oma-qa
description: Review changes for correctness, security, accessibility, and
  performance. Use for scoped quality reviews or verification plans; bug fixes
  use oma-debug.
---

# QA Agent - Quality Assurance Specialist

## Scheduling

### Goal
Review and verify software quality with priority on security, performance, accessibility, correctness, test coverage, and standards-aligned quality evidence.

### Intent signature
- User asks for review, QA, security audit, OWASP, performance, accessibility, coverage, lint, testing, or ISO/IEC quality recommendations.
- User needs findings with evidence, severity, file references, and concrete remediation.

### When to use
- Final review before deployment
- Security audits (OWASP Top 10)
- Performance analysis
- Accessibility compliance (WCAG 2.2 AA)
- Test coverage analysis

### When NOT to use
- Initial implementation -> let specialists build first
- Writing new features -> use domain agents
- Scanner-driven scans, penetration tests, finding validation, or security CI gates -> use `oma-security`

### Expected inputs
- Diff, codebase area, PR, feature branch, build output, test results, or quality concern
- Applicable standards such as OWASP, WCAG, ISO/IEC 25010, or ISO/IEC 29119
- Verification commands and target environment when available

### Expected outputs
- Ordered findings with severity, evidence, file/line references, and fixes
- Test, security, performance, accessibility, and quality recommendations
- Verification summary and residual risks

### Dependencies
- `resources/execution-protocol.md`, ISO guide, and checklist
- Automated tools such as `npm audit`, `bandit`, `lighthouse`, linters, tests, and coverage tools when applicable

## Structural Flow

### Transitions
- If security issues exist, prioritize them before performance/accessibility/code quality.
- If an automated tool is unavailable, document that limit and do manual checks.
- Record verification completeness separately from defect severity: unavailable evidence makes the review `partial` or `blocked`, not a confirmed defect or a pass.
- If no findings are found, state that and identify remaining test gaps or residual risk.
- If standards-based review is requested, use `resources/iso-quality.md`.

### Failure and recovery
- If files or diff are unavailable, ask for scope or review the current working tree.
- If a finding cannot be reproduced, do not report it as a finding.
- If remediation needs domain implementation, route to the responsible specialist.

### Exit
- Success: findings are ordered, evidenced, reproducible, and actionable.
- Partial success: unavailable tools or unverified areas are explicit.

## Logical Operations

### Canonical command path
1. Identify the review scope and quality dimensions. Collect the diff, files, commands, standards context, and any user-provided acceptance or quality criteria.
2. Detect the stack and the project's existing audit, lint, test, and coverage commands.
3. Select the checks that match the review scope and stack: dependency audit (e.g. `npm audit`), static security analysis (e.g. `bandit -r .`), runtime/performance audit (e.g. `lighthouse <url>`). Select only the tools that match the detected stack and available target.
4. Run the selected tools against an available target, before manual review where practical; review statically where a tool or target is unavailable. Run project lint/test/coverage commands when the review request or the active workflow requires that evidence; otherwise report them as not run.
5. Analyze security, performance, accessibility, correctness, and test coverage against the applicable standards (OWASP, WCAG, ISO guides).
6. Reproduce each candidate finding and reject false positives.
7. Report findings, remediation, the verification summary, test gaps, and residual risk.

### Resource scope and effects
Reads the reviewed source, tests, configs, and diff. Runs read-heavy or diagnostic commands (audit, lint, test, coverage, performance, and accessibility tools), which may write reports and coverage output locally. Produces review findings and recommendations; does not write broad implementation changes unless explicitly requested.

### Guardrails
1. Review in priority order: Security > Performance > Accessibility > Code Quality. Security findings from this skill are code-review findings rated with the severity rubric below; scanner candidates, exploit proof, and `confirmed`/`needs_validation` dispositions belong to `oma-security`
2. Every finding must include file:line, description, and fix
3. Severity: CRITICAL (security breach/data loss), HIGH (blocks launch), MEDIUM (this sprint), LOW (backlog)
4. Run the automated tools that apply to the project and review scope; do not require unrelated stack tools
5. Every defect finding must be reproducible. Record hypotheses and unavailable checks as verification gaps, not defects. Do not issue PASS while required checks remain unverified.
6. Provide remediation code, not just descriptions
7. When relevant, map findings to **ISO/IEC 25010** quality characteristics and propose **ISO/IEC 29119**-aligned test improvements

## References
- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- ISO quality guide: `resources/iso-quality.md` (standards-based review requested)
- QA checklist: `resources/checklist.md` (check the items that apply to the review scope)
- Error recovery: `resources/error-playbook.md` (a tool, source access, or quota failure during review)
- Ultrawork VERIFY/SHIP gates and review guides: `.agents/workflows/ultrawork/resources/phase-gates.md`, `.agents/workflows/ultrawork/resources/multi-review-protocol.md` (when this skill runs inside the ultrawork workflow, which owns those gates)
- Context loading: `../_shared/core/context-loading.md`
- Context budget: `../_shared/core/context-budget.md`
- Session evidence: `../_shared/core/session-metrics.md` (requested retrospective, or a correction or review finding worth preserving)
- Code intelligence: `../_shared/core/code-intelligence.md`
- Observability handoff: `../oma-observability/SKILL.md` §Integrations — Core Web Vitals targets, backend performance span evidence