# QA Agent - Error Recovery Playbook

When you encounter a failure during review, follow these recovery steps.
Use the relevant recovery steps. If required information or authority is missing, pause the dependent action and continue independent work.

---

## Automated Tool Fails to Run

**Symptoms**: `npm audit`, `bandit`, `lighthouse` command errors

1. Check: is the tool installed? Note missing tool in result
2. Check: are you in the correct directory?
3. If `npm audit`: check the lockfile, registry access, and selected dependency scope. A narrower audit does not clear unreviewed dependencies; record exclusions.
4. If `bandit`: check Python path; may need `python -m bandit`
5. If `lighthouse`: requires a running server; note if server not available
6. **If tool unavailable**: Fall back to manual review, record `tool_unavailable: ["tool_name"]` in result

---

## False Positive Suspected

**Symptoms**: Finding looks like a vulnerability but might be safe

1. Trace the data flow: does user input actually reach the dangerous operation?
2. Check: is there validation/sanitization upstream?
3. Check: is the framework handling this automatically? (e.g., ORM prevents SQL injection)
4. If still uncertain, record a hypothesis and the required evidence as a verification gap. Do not assign defect severity without confirming the defect.
5. Classify a confirmed finding by its observed impact, prerequisites, and failure/exploit evidence; do not issue PASS while required evidence is missing.

---

## Cannot Access Source Code

**Symptoms**: configured code-intelligence tool returns nothing, times out, or a file is not found

1. Check the configured provider's discovered tools and the file path.
2. Use the documented native scoped-search fallback; do not install, initialize,
   track, or silently switch providers.
3. Check whether code is in another package or monorepo directory.
4. If truly inaccessible: review what you can access and record the coverage gap.

---

## Performance Metrics Unavailable

**Symptoms**: Can't run Lighthouse, no APM data, no load test results

1. Check if dev server is running for Lighthouse
2. If no server: review code statically for performance anti-patterns:
   - N+1 queries (loops with DB calls)
   - Missing pagination
   - Large bundle imports
   - No code splitting
3. Report findings with `static_analysis_only: true` flag
4. Recommend specific metrics to measure when environment is available

---

## Scope Too Large

**Symptoms**: Full audit requested but codebase has 100+ files

1. Prioritize: auth/security-critical files first
2. Use pattern search to find high-risk areas:
   - `search_for_pattern("password|secret|token|api_key")`
   - `search_for_pattern("execute|eval|innerHTML")`
3. Review critical paths: auth flow, payment, data mutation
4. Note in report: `scope_coverage: "critical paths only, full audit requires more"`

---

## Rate Limit / Quota Error

**Symptoms**: `429`, `RESOURCE_EXHAUSTED`, `rate limit exceeded`

1. Identify the source. An expected rate-limit response from the application under review is a test result, not an agent-provider quota failure.
2. For provider quota exhaustion, stop affected provider calls and record the unavailable checks; continue independent authorized work when possible.
3. Preserve injected session/task/run IDs and the claim path. Save progress/results under the configured memory base using the task/run-scoped names in `../../_shared/runtime/memory-protocol.md`.
4. Use a valid claim status (`partial`, `blocked`, or `failed`) with the actual cause and unresolved work per `../../_shared/runtime/result-contract.md`; do not invent a `quota_exceeded` status.

---

## Coordination File Unavailable

Use native file tools and the configured durable memory base per the shared
memory/result contract. Code-intelligence availability is independent of file
memory. Record a path/permission error and preserve available evidence in an
authorized durable artifact location; report the actual saved path rather than
claiming a missing receipt or substituting an undisclosed `/tmp` result.

---

## General Principles

- **False positive prevention**: Keep uncertain hypotheses separate from confirmed defect findings; state the check needed to resolve each gap
- **Blocked**: Record a material unavailable prerequisite and affected work; use an accurate result status and continue independent work when possible
- **No code modification**: QA only reports; delegate code changes to the appropriate agent
