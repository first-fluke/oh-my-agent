# QA Review Checklist

Check the items that apply to the changed scope and the project's declared
requirements, supported platforms, and existing architecture; skip the rest.
Measure against adopted targets; example sizes, durations, load levels, or
implementation patterns are not universal acceptance gates. Record required
checks that could not run as verification gaps, not passes or defect findings.

## Security Checklist

### Authentication & Authorization
- [ ] Passwords hashed with Argon2id (scrypt/bcrypt acceptable; never MD5/SHA1)
- [ ] Password policy enforced when local password authentication is used
- [ ] JWT tokens properly signed and validated when JWT is used
- [ ] Refresh tokens implemented (if long sessions needed)
- [ ] Token/session expiry and rotation match the declared authentication policy
- [ ] Protected endpoints enforce the required authorization; public endpoints are intentionally public
- [ ] Resource ownership, tenant, and role boundaries match the access model
- [ ] Admin functions require admin role
- [ ] Authentication abuse controls match the declared threat model and rate-limit policy
- [ ] Account lockout after failed login attempts (optional)
- [ ] MFA available (optional, but recommended)

### Input Validation & Injection
- [ ] SQL injection: ORM used OR parameterized queries
- [ ] XSS: Input sanitized, CSP headers set
- [ ] Command injection: No shell execution with user input
- [ ] Path traversal: File paths validated
- [ ] LDAP injection: LDAP queries parameterized
- [ ] XML injection: XML parsing secure
- [ ] Email validation (proper regex/library)
- [ ] URL validation (allowlist for external requests)

### Data Protection
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Sensitive data NOT in logs
- [ ] Sensitive data NOT in error messages
- [ ] Sensitive data NOT in URLs (use POST body)
- [ ] Database backups encrypted
- [ ] PII data encrypted at rest (if applicable)
- [ ] Secure session management (httpOnly, secure, sameSite cookies)

### API Security
- [ ] CORS matches allowed clients and credential use; public noncredentialed APIs may deliberately use wildcard origins
- [ ] CSRF defenses apply to authentication that the browser attaches automatically
- [ ] Rate limiting on API endpoints
- [ ] API keys/tokens NOT in source code
- [ ] API compatibility/versioning follows the affected contract's evolution policy
- [ ] Proper error handling (no stack traces exposed)

### Dependencies
- [ ] No high/critical vulnerabilities reported by the stack's dependency audit (e.g. `npm audit`, `pip-audit`)
- [ ] Affected dependencies are supported and satisfy project policy; unrelated upgrades are not required by this review
- [ ] No unused dependencies
- [ ] License compliance checked

---

## Performance Checklist

### Backend Performance
- [ ] Affected API latency meets the declared SLO at representative load
- [ ] Database queries optimized (no N+1)
- [ ] Database indexes on foreign keys and frequent queries
- [ ] Connection pooling configured
- [ ] Caching is appropriate where measurements or requirements justify it
- [ ] Pagination for large result sets
- [ ] Async operations where appropriate
- [ ] Background jobs for heavy tasks

### Frontend Performance
- [ ] Adopted frontend performance measures meet the project's thresholds on its supported devices and network conditions
- [ ] Affected bundle sizes meet the project budget; record measured regressions and relevant baseline
- [ ] Code splitting implemented
- [ ] Lazy loading for non-critical components
- [ ] Images optimized (WebP, compression)
- [ ] Images lazy loaded (loading="lazy")
- [ ] Fonts optimized (font-display: swap)
- [ ] No render-blocking resources
- [ ] Service worker for caching (optional)

### Mobile Performance
- [ ] Size and startup time meet the supported platform/device budgets
- [ ] Scrolling and interaction meet the adopted frame-time targets
- [ ] No memory leaks
- [ ] Battery usage minimal
- [ ] Offline support (if required)

---

## Accessibility Checklist (WCAG 2.2 AA)

Check the changed UI against the WCAG 2.2 AA success criteria the project targets. The defects that recur in reviews:

- [ ] Text alternatives: informative images have alt text; decorative images use `alt=""`
- [ ] Contrast: 4.5:1 for normal text, 3:1 for large text; meaning is not carried by color alone
- [ ] Keyboard: all functionality reachable, no keyboard trap, logical focus order, visible focus indicator
- [ ] Forms: labels, required-field indication, and error messages are programmatically associated
- [ ] Structure: page language set, semantic HTML first, ARIA roles/labels only where needed and valid
- [ ] Motion and timing: moving content can be paused; no content flashes more than 3 times per second

---

## Testing Checklist

### Unit Tests
- [ ] Coverage meets the project's declared baseline or changed-code target when coverage is applicable; otherwise record risk-focused tests or alternative verification and its limits
- [ ] Tasks marked `test_approach: tdd` have a `TDD_EVIDENCE` block in the implementation result (focused test command, RED failure, GREEN pass) — see `../../_shared/core/test-approach.md`; do not require this evidence for `test_after` / `not_applicable` tasks
- [ ] All business logic functions tested
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Mocks used appropriately
- [ ] Test duration and feedback time meet the project's check/CI budget
- [ ] No flaky tests

### Integration Tests
- [ ] All API endpoints tested
- [ ] Database operations tested
- [ ] Auth flow tested
- [ ] Error responses tested (401, 403, 404, 500)
- [ ] Request validation tested

### E2E Tests
- [ ] Critical user flows tested (registration, login, main feature)
- [ ] Happy path tested
- [ ] Error scenarios tested
- [ ] Mobile responsive tested
- [ ] Cross-browser tested (Chrome, Firefox, Safari)

### Test Governance
- [ ] Test levels and scope are defined clearly
- [ ] Important requirements trace to test cases or test scenarios
- [ ] Entry / exit criteria are defined for major release decisions
- [ ] Test design technique is appropriate for risk and feature type

### Performance Tests
- [ ] Load tests use the adopted workload, concurrency, and traffic model where this change requires them
- [ ] Stress testing (identify breaking point)
- [ ] Database under load tested
- [ ] API rate limits tested

---

## Code Quality Checklist

### Architecture
- [ ] Clear separation of concerns
- [ ] Duplication does not create conflicting behavior or excessive change cost
- [ ] SOLID principles followed
- [ ] Dependency injection used
- [ ] Data-access boundaries match the existing backend architecture
- [ ] Component composition (frontend)

### Code Metrics
- [ ] Complexity, size, and nesting meet project rules and allow the affected behavior to be understood and verified
- [ ] Meaningful variable names

### Error Handling
- [ ] Async failures reach the appropriate handler; no swallowed errors or unhandled rejections
- [ ] Errors logged appropriately
- [ ] User-friendly error messages
- [ ] No silent failures
- [ ] Graceful degradation

---

## Issue Prioritization

### CRITICAL (Block Deployment)
- Security vulnerabilities (SQL injection, XSS, auth bypass)
- Data loss bugs
- Application crashes
- Complete feature breakage

### HIGH (Fix Before Launch)
- Confirmed performance failures that violate a launch requirement or block a core workflow
- Major accessibility violations
- Missing auth checks
- Broken core functionality

### MEDIUM (Fix in Sprint)
- Minor bugs
- Code quality issues
- Missing tests
- Minor accessibility issues

### LOW (Backlog)
- Refactoring opportunities
- Performance optimizations
- Nice-to-have features
- Documentation improvements

---

## Notes

- Choose available automated checks that match the stack, changed scope, and target; do not require unrelated tools or unrequested builds
- Use configured code intelligence or the documented native fallback for code analysis patterns
- Browser verification tooling and server selection follow `execution-protocol.md` Step 2.5. The Chrome-specific calls below are examples only; use the selected server's equivalents and report unverified UI checks.
- Standards mapping (ISO/IEC 25010, ISO/IEC 29119) follows `iso-quality.md` when requested.
- Document all findings with file:line references
- Provide remediation code examples
- Estimate fix time for each issue

---

## Runtime Verification (after static review)

Record results in the structured table format defined in `execution-protocol.md` Step 2.5 (Recording Results).
Run only applicable, authorized runtime checks on an available target. A static
document/configuration review does not require starting or building an app.

- [ ] Application starts without errors
- [ ] All modified endpoints return expected status codes; verify with `list_network_requests()`
- [ ] Form submissions produce correct database state; verify with `fill_form()` + `list_network_requests()`
- [ ] Error states render user-friendly messages (not stack traces); verify with `take_snapshot()` on error paths
- [ ] Empty/loading/error UI states all handled; verify with `navigate_page()` to empty state routes + `take_snapshot()`
- [ ] Interactive elements respond to input (not display-only); verify with `click(uid)` + `take_snapshot()` before/after
- [ ] Auth flows work end-to-end (register → login → protected route → logout); verify with sequential `fill()` + `click()` + `list_network_requests()`
- [ ] Rate limiting / throttling triggers at configured thresholds; verify with rapid `evaluate_script(fetch)` calls
- [ ] File upload/download actually transfers data (not stubbed); verify with `upload_file(uid, filePath)` + response check
- [ ] Pagination returns correct pages (not always page 1); verify with `click()` page 2 + `take_snapshot()` to confirm different content
- [ ] Zero JS console errors on critical paths; verify with `list_console_messages(types: ["error"])`
