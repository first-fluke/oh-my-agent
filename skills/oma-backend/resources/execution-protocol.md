# Backend Agent - Execution Protocol

## Preparation
Use the task's scope, existing project conventions, and acceptance criteria. Follow `../../_shared/core/execution-policy.md` when it has not already been supplied. Read only references needed by the selected operation; consult lessons or recovery guides for an observed issue. Expand planning depth only when the change requires it.

## Step 1: Analyze
- Read the task requirements carefully
- Identify which endpoints, models, and services are needed
- Inspect existing structure and relevant symbols via `../../_shared/core/code-intelligence.md`; use native search and scoped reads when the configured provider is unavailable
- If the task is ORM-heavy, load `resources/orm-reference.md` before deciding on loading strategy, transaction scope, or client/session lifecycle
- List assumptions; ask if unclear

## Step 2: Plan
- Decide on file structure: models, schemas, routes, services
- Define API contracts (method, path, request/response types)
- Plan database schema changes (tables, columns, indexes, migrations)
- Plan relation loading strategy, transaction boundary, and ORM lifecycle constraints explicitly
- Identify security requirements (auth, validation, rate limiting)

## Step 3: Implement
- **Honor the task's `test_approach`** (see `../../_shared/core/test-approach.md`): for `tdd` tasks, write and run the focused test first (record the RED failure), make the minimal change (GREEN), then continue; for `tdd` the test comes before item 3 below
- Typical affected files (choose an order from actual dependencies):
  1. Database models + migrations
  2. Validation schemas (request/response)
  3. Service layer (business logic)
  4. API routes (thin, delegate to services)
  5. Tests (unit + integration)
- Use `stack/api-template.*` as reference
- Follow clean architecture: router -> service -> repository -> models

## Step 4: Verify
- Check applicable items in `resources/checklist.md`
- Use `../../_shared/core/common-checklist.md` only for cross-domain verification
- Ensure affected tests and required project checks pass
- For `tdd` tasks, append the `TDD_EVIDENCE` block (test command, RED, GREEN) to the result file per `../../_shared/core/test-approach.md`
- Confirm OpenAPI docs are complete

## On Error
See `resources/error-playbook.md` for recovery steps.
