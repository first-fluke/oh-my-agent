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
| G7 | Prepare the next distribution experiment | [Distribution copy](./distribution.md) | The article and short post are reviewable. Publishing requires an explicit request for the target account and channel. |
| G8 | Add native plugin entries for selected domains | Generated marketplace entries and scoped bootstrap | Each domain entry declares its skills, agents, and hooks; bootstrap installs that scope and preserves the existing full plugin. |
| G9 | Handle workflow dependencies after selective installation | Explicit required/conditional metadata and workflow exposure | Only workflows with valid required skill manifests are exposed; conditional references remain advisory, and selected skills are preserved. |
| G10 | Check native manifests with a pinned real host | Claude Code 2.1.311 CI validation | The marketplace and each isolated domain root pass the real host's strict manifest validation without model calls. |

## Current delivery

G1–G6 are implemented and verified, including the baseline collection. The documentation [deployment succeeded](https://github.com/first-fluke/oh-my-agent/actions/runs/40623057207), and the homepage, three task guides, worked repair, and Korean setup links were checked live. G7 contains prepared copy and a DEV article record. G8 and G9 are implemented with focused regression checks. G10 has passed locally with Claude Code 2.1.311 and is configured in CI; its first CI run remains to be observed.

## Distribution experiment

Use the plugin-hook repair as the first example. Its reader has a concrete failure to investigate and a direct code-review or debugging task to try. Keep one primary destination per post. Record the channel, post URL, reporting period, impressions/reach, and reported link visits from that platform.

For the next check on 2026-11-04, run the collector again and inspect the same platform's post analytics. This is a manual review date, not an installed scheduled job. Compare matched periods and retain unavailable fields. Do not infer a first-task success rate from downloads or a star conversion rate from unrelated traffic totals.

## Further work

Codex native marketplace metadata is generated. The local available-list returned no entries; a fresh-host registration and discovery check has not run. Claude manifest validation and model task success are separate checks.
