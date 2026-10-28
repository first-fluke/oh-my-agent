# Adoption actions

These changes address task discovery and the path from an introduction to a useful first request. Their effect on reach, installs, or stars still needs measurement.

| ID | Action | Deliverable | Acceptance |
|---|---|---|---|
| G1 | Give each entry task a direct destination | [Review AI code](../../web/docs/tasks/review-ai-code.md), [debug a failing test](../../web/docs/tasks/debug-failing-tests.md), [design an admin UI](../../web/docs/tasks/design-admin-ui.md) | Each page has a skill command, concrete input, prompt, result checks, and dependency scope. |
| G2 | Put the task destinations on the homepage and README | `web/src/pages/index.tsx`, `README.md`, mirrored npm README | The three guides and worked repair are reachable from the entry pages. |
| G3 | Publish a source-backed example | [Plugin-hook repair](../../web/docs/examples/plugin-hook-repair.md) | The before/after commits and regression fixtures resolve; verification limits are explicit. |
| G4 | Align search and package metadata | `web/docusaurus.config.ts`, `cli/package.json` | Canonical domain matches the live site; package description matches the current entry paths. |
| G5 | Change ongoing article generation | `scripts/sns/devto/SOUL.md`, `scripts/sns/lib/devto.ts` | Generation asks for one supported problem, evidence, repair, checks, and a matching task guide; unsupported examples can be skipped. |
| G6 | Make the next measurement repeatable | [Measurement procedure](./measurement.md), `bun run report:adoption` | A dated local snapshot preserves exact source windows and unavailable values. |
| G7 | Prepare the next distribution experiment | [Distribution copy](./distribution.md) | A worked-example article and short post are reviewable. Actual publishing is recorded separately. |

## Current delivery

G1–G5 are implemented in source. G6 adds the collector and a baseline run; its integration checks are recorded with the delivery. G7 is prepared copy, not a published campaign. A source commit does not establish that documentation deployment has completed.

## Distribution experiment

Use the plugin-hook repair as the first example. Its reader has a concrete failure to investigate and a direct code-review or debugging task to try. Keep one primary destination per post. Record the channel, post URL, reporting period, impressions/reach, and reported link visits from that platform.

For the next check on 2026-11-04, run the collector again and inspect the same platform's post analytics. This is a manual review date, not an installed scheduled job. Compare matched periods and retain unavailable fields. Do not infer a first-task success rate from downloads or a star conversion rate from unrelated traffic totals.

## Further work

The next product candidates are domain-specific native plugin entries and workflow dependency handling after selective installation. They need their own implementation scope. They are not prerequisites for using the three single-skill guides above.
