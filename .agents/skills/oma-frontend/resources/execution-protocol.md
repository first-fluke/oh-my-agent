# Frontend Agent - Execution Protocol

## Preparation
Use the task's scope, existing project conventions, and acceptance criteria. Follow `../../_shared/core/execution-policy.md` when it has not already been supplied. Read only references needed by the selected operation; consult lessons or recovery guides for an observed issue. Expand planning depth only when the change requires it.

## Step 1: Analyze
- Read the task requirements carefully
- Read `DESIGN.md` if present at the project root; treat Section 9 (Agent Prompt Guide) as authoritative component spec
- Identify which components, pages, and hooks are needed
- Inspect existing structure and relevant symbols via `../../_shared/core/code-intelligence.md`; use native search and scoped reads when the configured provider is unavailable
- Review existing patterns: reference search for `Button` through the configured provider or native search to understand usage conventions
- List assumptions; ask if unclear

## Step 2: Plan
- Decide on component structure (which are new, which extend existing)
- Define props interfaces with TypeScript
- Plan state management approach (Jotai or Zustand for client, nuqs for URL, TanStack Query for server)
- Identify API integration points (orval-generated TanStack Query hooks when an OpenAPI spec exists; regenerate via the project's `gen:api` task after contract changes)
- Plan responsive breakpoints and accessibility requirements

## Step 3: Implement
- **Honor the task's `test_approach`** (see `../../_shared/core/test-approach.md`): for `tdd` tasks, write and run the focused test first (record the RED failure), make the minimal change (GREEN), then continue
- Typical affected files (choose an order from actual dependencies):
  1. TypeScript types/interfaces
  2. API client hooks (orval-generated from OpenAPI when available; hand-written TanStack Query otherwise)
  3. Reusable UI components (shadcn/ui based)
  4. Feature components (compose UI + logic)
  5. Page components (route-level)
  6. Tests (unit + integration)
- Follow `resources/tailwind-rules.md` for styling

## Step 4: Verify
- Check applicable items in `resources/checklist.md`
- Use `../../_shared/core/common-checklist.md` only for cross-domain verification
- Check TypeScript strict mode: no errors
- For `tdd` tasks, append the `TDD_EVIDENCE` block (test command, RED, GREEN) to the result file per `../../_shared/core/test-approach.md`
- Verify responsive design at 320px, 768px, 1024px, 1440px
- Test keyboard navigation and screen reader compatibility

## On Error
See `resources/error-playbook.md` for recovery steps.
