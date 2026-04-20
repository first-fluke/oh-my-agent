# Test Layout

Use this directory for **cross-cutting / infrastructure tests** that do not belong to a single slice.

Default: **colocate tests with the unit under test** (see `cli/ARCHITECTURE.md`).

- Command tests → `cli/commands/<slice>/<name>.test.ts`
- Platform / IO / cli-kit / vendors tests → next to the implementation (e.g. `cli/platform/skills-installer.test.ts`, `cli/io/serena.test.ts`, `cli/cli-kit/frontmatter.test.ts`, `cli/vendors/gemini/settings.test.ts`)

Keep here:

- Hook variant / dispatcher tests — they span `.agents/hooks/` + vendor adaptations.
- `install-sh.test.ts` — shell installer smoke.
- `readme.test.ts` — docs-in-sync check.
- `hud.test.ts` — terminal dashboard integration.
- `filter-test-output.test.ts`, `test-filter.test.ts` — test-harness plumbing.
- `types.ts` — shared test types.
- `smoke/` — generated artifact and cross-module compatibility checks.
