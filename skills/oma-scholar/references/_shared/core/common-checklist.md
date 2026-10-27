# Common Code Quality Checklist

Use applicable sections for a cross-domain review. Check the changed behavior and affected boundaries; this list does not expand the task or override project checks. Authorization and verification scope follow `execution-policy.md`.

## Correctness and maintenance
- [ ] Behavior matches acceptance criteria and existing contracts.
- [ ] Names and structure follow the project; complexity does not obscure the changed behavior.
- [ ] No required behavior is left as a stub or unresolved task-created TODO. Existing tracked debt does not block unrelated work.
- [ ] Generated artifacts are updated through the project's generator when required.

## Error handling
- [ ] Failure paths propagate to an appropriate handler or error boundary; no swallowed rejection or silent data loss.
- [ ] User-facing errors are actionable without exposing internal or sensitive data.
- [ ] Recovery, cancellation, and cleanup work where the change depends on them.

## Security
- [ ] No secrets in code, logs, error messages, or staged files.
- [ ] Untrusted input is validated and handled safely at SQL, shell, and HTML boundaries.
- [ ] Protected operations enforce authentication and authorization at the relevant trust boundary.

## Verification
- [ ] Tests assert affected behavior and relevant failure or boundary cases.
- [ ] Required project checks pass, or missing evidence and its impact are reported.
- [ ] For changes where automated tests add little value, applicable inspection or static checks support the result.

## Change hygiene
- [ ] Changes stay within scope and preserve unrelated work.
- [ ] When committing is requested, staging follows repository rules, including whether generated artifacts are tracked.
