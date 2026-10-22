---
title: Artifact Layout
sidebar_label: Artifact Layout
description: Where OMA stores maintained documents, execution reports, and runtime state, and how to migrate legacy locations.
---

# Artifact Layout

OMA uses three locations: `docs/` for maintained project documents, `.agents/results/` for human-readable execution reports, and `.agents/state/` for coordination and execution evidence. Paths below are relative to the project root.

## Maintained documents

| Location | Content |
|----------|---------|
| `docs/decisions/` | Approach proposals, tradeoffs, and architecture decision records (ADRs) |
| `docs/plans/work/` | Work plans, progress, decision logs, and the technical debt tracker |
| `docs/plans/contracts/` | Adopted API contracts |
| `DESIGN.md` | UI design system: typography, color, spacing, motion, and components |

Use a `Status` field in decision documents to record `draft`, `accepted`, or `superseded`. Keep a superseded decision and link to its replacement so its reasoning remains available. `design` refers to UI design in OMA; technical proposals and ADRs share `docs/decisions/`.

Use a project document index, such as `docs/README.md`, to link to the maintained documents. The artifact migration moves existing files; it does not create an index or change a document's status.

## Execution reports and runtime state

| Location | Content |
|----------|---------|
| `.agents/results/result-*.md` | Human-readable agent and workflow result reports |
| `.agents/results/architecture/` | Architecture analysis and recommendations |
| `.agents/results/bugs/` | Bug reports |
| `.agents/results/refactor/` | Refactoring plans and reports |
| `.agents/results/security/` | Security scan reports |
| `.agents/results/market/` | Market research briefs |
| `.agents/results/recap/` | Work recaps |
| `.agents/results/explain/` | HTML explanations |
| `.agents/results/api-contracts/` | API contract drafts |
| `.agents/results/plan-{sessionId}.json` | Current task plan |
| `.agents/state/memories/` | Session summaries, task boards, progress, lessons, and experiment records |
| Runtime `agent-runs/` | Structured receipts, claims, and verification evidence |
| Runtime `agent-plans/` | Frozen execution plans |

Report subdirectories remain separate by domain. Human-readable reports supplement the structured evidence; they do not establish verified completion on their own. See [Results and Resume](../agent-results-and-resume/).

Current receipts and frozen plans live in the active profile's project state directory. Older projects may retain them under `.agents/state/`. Their storage and verification bindings are unchanged by this migration.

## Promote a maintained document

When an execution artifact becomes a project reference, move it to the matching maintained location. For example, move an adopted contract from `.agents/results/api-contracts/` to `docs/plans/contracts/`, or turn an architecture recommendation into a decision record in `docs/decisions/`. Leave a link at the old location and update the document index.

If structured execution evidence records the original file or its hash, keep that file intact and create a maintained version instead. Link to the maintained document from the project index.

Install, update, and link ignore `.agents/results/`, `.agents/state/`, and `docs/plans/` in Git by default. `docs/decisions/` is outside that default ignore. Review the project's `.gitignore` when adopting a contract or work plan that the team should version.

## Migrate an existing project

Preview the migration first:

```bash
oma docs migrate --dry-run
```

For structured output, add `--json`. Apply the same migration explicitly when ready:

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` and `oma update` also run this migration. It consolidates these legacy locations:

<!-- oma-docs:ignore-start -->
| Legacy location | Destination |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` and their authored diagram sidecars | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Decision documents retain their subdirectory structure. Legacy architecture ADRs move with their authored `.archify.json` and `.archify.html` sidecars. Run-specific reviews, recommendations, and validation logs remain in the results directory. Result migration covers top-level `result-*.md` files in the two memory directories; other memory files stay in place.

The migration preserves existing destination files. If a different file has the same name, it adds a source suffix, such as `001-cache--from-plan-designs.md`, and reports the chosen path. If that name is occupied, it adds a stable content hash. Re-running the migration does not create duplicate copies or rename files that have already migrated.

It updates supported Markdown links and path references in moved documents, Markdown coordination notes, `docs/**/*.md`, and root `README*.md` and `AGENTS.md` files. Review those changes with the migration report and Git diff. Structured runtime evidence and UI `DESIGN.md` files are excluded from reference rewriting. Existing `oma-docs:ignore-start` / `oma-docs:ignore-end` blocks preserve examples of legacy paths.

Review the report for deferred files. A result report referenced by structured execution evidence stays at its original path so the recorded receipt and hash remain valid. Receipts, claims, frozen execution plans, and other runtime evidence are left in place. Migration does not promote contract drafts, accept decisions, or change the UI design system.
