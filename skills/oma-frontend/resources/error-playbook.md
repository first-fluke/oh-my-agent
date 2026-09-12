# Frontend Agent - Error Recovery Playbook

When you encounter a failure, find the matching scenario and follow the recovery steps.
Use the relevant recovery steps. If required information or authority is missing, pause the dependent action and continue independent work.

---

## False Positive: `proxy.ts` flagged as dead code or `middleware.ts` demanded

<!-- oma-docs:ignore-start -->
**Symptoms**: Reviewer claims `src/proxy.ts` won't be picked up, demands rename to `src/middleware.ts`, or flags the auth gate as not wired.
<!-- oma-docs:ignore-end -->

1. Check the installed Next.js version and the project's request interception convention.
2. For a project using the Next.js 16+ proxy convention, inspect `proxy.ts` in the root or `src/` and its `proxy` export.
3. Verify location, configuration, and relevant tests. A framework entry point need not have application imports.
4. Correct a finding based only on an outdated filename assumption; retain any wiring or authorization defect supported by evidence.
5. Reference: https://nextjs.org/docs/messages/middleware-to-proxy

---

## TypeScript Compilation Error

**Symptoms**: `TS2322`, `TS2345`, `Type X is not assignable to type Y`

1. Read the error: which file, which line, which types conflict
2. Check: is the interface/type definition correct?
3. Check: is the API response type matching the expected shape?
4. If API mismatch: update the type to match actual response (don't cast with `as any`)
5. If generic issue: use explicit type parameter `<Type>` instead of inference
6. **NEVER do this**: `@ts-ignore`, `as any` (hides type issues without resolving them)

---

## Build Error

**Symptoms**: `next build` fails, `Module not found`, `SyntaxError`

1. Read the full error: which module, which file
2. If missing dependency: note in result as "requires `npm install X`"; do NOT install yourself
3. If import path wrong: use `search_for_pattern("export.*ComponentName")` to find actual path
4. If dynamic import issue: ensure component is client-side (`'use client'`)
5. Re-run the build only if the user explicitly requested a build; otherwise use relevant non-build checks and report the verification limit.

---

## Test Failure

**Symptoms**: `vitest` FAILED, `expect(X).toBe(Y)` assertion errors

1. Read the error: expected vs received, which test file
2. `find_symbol("ComponentName")` to check current implementation
3. Determine: test outdated or implementation wrong?
   - Test expects old behavior → update test
   - Component bug → fix component
4. Re-run the specific test: `npx vitest run path/to/test.ts`
5. **After 3 failures**: Try a different approach. Record in progress

---

## Hydration Mismatch (Next.js)

**Symptoms**: `Hydration failed`, `Text content does not match server-rendered HTML`

1. Find the component that renders differently on server vs client
2. Common causes:
   - `Date.now()` or `Math.random()` in render
   - Browser-only APIs (`window`, `localStorage`) without `useEffect`
   - Conditional rendering based on client-only state
3. Fix: wrap client-only code in `useEffect` + state, or use `'use client'`
4. If third-party component: wrap with `dynamic(() => import(...), { ssr: false })`

---

## API Integration Error

**Symptoms**: `Network Error`, `CORS`, `401 Unauthorized`, wrong data shape

1. **CORS**: Check backend CORS config; is frontend origin allowed?
2. **401**: Check token; is it in the header? is it expired?
3. **Wrong data**: Log `response.data` and compare with expected type
4. **Network Error**: Is the backend running? Correct port?
5. If backend isn't your responsibility: document the expected API contract in result

---

## Styling / Layout Broken

**Symptoms**: Component renders but looks wrong, responsive breakpoint fails

1. Check Tailwind classes: typo? wrong breakpoint prefix?
2. Check parent container: is it blocking layout? (`overflow-hidden`, fixed width)
3. Test at specific breakpoints: 320px, 768px, 1024px, 1440px
4. Use browser DevTools to inspect computed styles
5. If dark mode issue: check `dark:` variants applied

---

## Rate Limit / Quota Error (LLM runtime)

**Symptoms**: `429`, `RESOURCE_EXHAUSTED`, `rate limit exceeded` (any vendor runtime: Claude, Codex, etc.)

1. **Stop immediately**: do not make additional API calls
2. Save current work to `progress-{agent-id}[-{sessionId}].md`
3. Record Status: `quota_exceeded` in `result-{agent-id}[-{sessionId}].md`
4. Specify remaining tasks

---

## Workflow State Unavailable

Follow `../../_shared/runtime/memory-protocol.md`; state storage is independent of the code-intelligence provider.

1. Use the injected progress/result paths and session/task identity.
2. If a file operation fails, retry once when the failure may be transient.
3. Preserve work and report the failed path and error to the coordinator. Do not silently redirect artifacts to `/tmp` or mark a missing result as completed.
4. For read-only tasks, return the result through the runtime's response channel as required by the dispatch contract.

---

## General Principles

- **After 3 failures**: If same approach fails 3 times, must try a different method
- **Blocked**: If no progress after 5 turns, save current state and record `Status: blocked`
- **Out of scope**: If you find backend issues, only record in result; do not modify directly
