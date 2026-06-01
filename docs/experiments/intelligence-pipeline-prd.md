# PRD 001: Intelligence Pipeline Command

## Summary

Add an OMA command that runs a repeatable intelligence pipeline: gather market and code signals, identify gaps against a target product or project, derive solution candidates, run blind/adversarial review, and emit local PRD/report artifacts plus an optional GitHub issue.

Recommended command surface:

```bash
oma intel run --config oma-intel.yaml --since 30d
oma intel run --config oma-intel.yaml --last-commits 50 --output docs/plans/prds/
oma intel run --topic "agent harness developer workflows" --target first-fluke/oh-my-agent --since 30d
```

The feature should be implemented as a CLI command, not as a loose script. A script can prototype the analysis pipeline, but the product value is repeatable, configurable, and CI-friendly product intelligence.

## Problem

OMA already has strong primitives:

- `oma market` for community-signal research.
- `oma search` for source-aware retrieval.
- domain skills and workflows for brainstorm, plan, review, docs, recap, and orchestration.
- `scripts/utils/git-context.ts` for local commit-window context.

What is missing is a first-class loop that turns research signals into product decisions: market evidence, code/repo deltas, user pain, gap analysis, solution candidates, adversarial review, PRD, and optional issue creation.

Without this, intelligence work is manual, irregular, easy to bias toward visible sources, and hard to convert into well-scoped PRDs or GitHub issues.

## Users

- OMA maintainer deciding what to build next.
- Contributor looking for high-leverage feature work.
- Release owner reviewing whether OMA is drifting behind adjacent tools.
- PM/QA agent generating prioritized tasks from evidence rather than intuition.

## Intelligence Pipeline

The command is source-agnostic. GitHub repositories, market/community research, release notes, local code, issues, and docs are input sources. The product pipeline is:

1. Define target: product/project being improved.
2. Gather signals: market/community, GitHub repos, issues, releases, docs, local code.
3. Normalize evidence: source, provenance, trust, freshness, capability tags.
4. Find gaps: compare signal clusters against target capabilities and user goals.
5. Derive solutions: propose candidate features, workflow changes, docs, or process changes.
6. Review adversarially: reject shallow, overfit, expensive, unsafe, or low-evidence candidates.
7. Produce PRD/report: local artifacts with decisions, evidence, and acceptance criteria.
8. Optional issue: create a GitHub issue only when explicitly enabled and confirmed.

## Gap Analysis Against OMA

### Meaningful Gaps

1. Research-to-PRD pipeline
   - `oma market` handles community signals.
   - OMA can plan and review.
   - OMA lacks a single command that turns evidence into gap analysis, candidate solutions, adversarial review, PRD, and optional issue.

2. Source-agnostic gap detection
   - GitHub repo deltas are useful, but should not dominate the product model.
   - The command needs a generic source model so market/community signals, issues, release notes, local code, and repo changes can be combined.

3. Adversarial solution triage
   - OMA workflows include review, brainstorm, and QA, but not a dedicated "is this derived solution actually needed?" gate.
   - This is important because derived features can become copycat bloat or weakly evidenced work.

4. Configurable evidence windows
   - User needs `previous N commits` and `previous N days`.
   - Market sources need time windows; GitHub sources need time and commit windows; local code may need git ranges.

### Non-Gaps

1. General market research
   - Already covered by `oma market`. The new command should call it, not duplicate it.

2. General code search
   - Already covered by `oma search` and local/GitHub search. The new command should orchestrate them.

3. General planning
   - Already covered by `oma-pm` and `/plan`. The new command should emit compatible artifacts, not invent a new planner.

4. Full dashboard
   - Not needed for v1. A scheduled CLI plus Markdown/JSON outputs is enough.

## Product Goals

- Run a repeatable intelligence analysis for configurable sources.
- Support both `--since <duration>` and `--last-commits <n>`.
- Produce evidence-backed market findings, gap analysis, solution candidates, adversarial review, PRD, and optional GitHub issue.
- Reuse `oma market`, `oma search`, existing GitHub/local git context patterns, and PM output conventions.
- Avoid importing source hype, star counts, or README claims as direct product requirements.
- Preserve provenance for every accepted or rejected feature candidate: repo, URL, commit SHA or issue/release id, observed date, and retrieval timestamp.

## Non-Goals

- No live dashboard in v1.
- No automatic implementation of derived features.
- No direct scraping of private or paid sources without explicit credentials.
- No writes under `.agents/` except existing ignored command outputs created by reused commands.
- No scheduled background daemon in v1. CI or cron can call the CLI.

## Recommended Approach

Structural approach: add `oma intel` as a first-class source-agnostic CLI domain.

Why this approach:

- It keeps recurring product intelligence close to OMA's product surface.
- It can compose existing `market`, `search`, `docs`, and PM workflows.
- It is testable as deterministic CLI stages.
- It avoids one-off script drift.

Alternative approaches:

| Approach | Type | Pros | Cons | Decision |
|---|---|---|---|---|
| `scripts/intel.ts` only | tactical | Fastest prototype, low CLI surface risk. | Harder to discover, weak config story, likely to drift. | Reject for product v1, allow as internal spike. |
| `oma market` extension | tactical/structural hybrid | Reuses existing market command namespace. | Overloads market with gap analysis, solution review, PRD rendering, and GitHub issue creation concerns. | Reject. Use market as a substage. |
| `oma intel` command domain | structural | Clear ownership, composable, CI-friendly, room for future scheduled mode. | Requires command, tests, docs, and issue integration. | Accept. |

## User Experience

### Minimal run

```bash
oma intel run --config oma-intel.yaml --since 30d
```

Outputs:

- `docs/intel/<date>-prd.md`
- `docs/intel/<date>-gap-report.md`
- JSON machine output for automation.

### Commit-window run

```bash
oma intel run --config oma-intel.yaml --last-commits 40
```

### Issue creation

```bash
oma intel run --config oma-intel.yaml --since 14d --create-issue --repo first-fluke/oh-my-agent
```

Creates a GitHub issue with:

- summary
- top accepted feature candidates
- rejected candidates and reasons
- links to generated PRD/report
- acceptance criteria

## Proposed Config

```yaml
version: 1

target: first-fluke/oh-my-agent

topic: agent harness developer workflows

sources:
  github:
    repos:
      - owner/example-agent-tool
      - owner/example-workflow-tool
  market:
    enabled: true

window:
  since: 30d

output:
  dir: docs/intel
  formats: [md, json]

remote:
  github_issue:
    enabled: false
    require_confirm: true
```

The YAML config is intentionally minimal. Defaults should decide which public signals to collect, which review lenses to run, and how to render the standard report. The GitHub repos above are placeholders showing one source type, not product requirements. Inline `--repos owner/name,owner/name` remains available for one-off GitHub experiments and overrides `sources.github.repos` from the config for that run.

Config discovery order:

1. Explicit `--config <path>`
2. `oma-intel.yaml` in the current working directory
3. `.oma/intel.yaml` in the current working directory

If none exists, the command must require `--topic`, `--target`, `--repos`, or a clear setup hint.

## Data Flow

1. Load config and resolve target, topic, source set, and window.
2. Run market research with `oma market` when enabled.
3. Fetch GitHub repo metadata, README surface, releases, recent commits, and selected issue labels when repos are configured.
4. Gather local target context when available.
5. Normalize signals into a common `IntelSignal` schema.
6. Map signals to target capability taxonomy:
   - orchestration
   - workflows
   - hooks
   - memory/state
   - search/research
   - review/QA/security
   - install/update
   - documentation
   - monetization/community
7. Generate gaps and solution candidates.
8. Run blind/adversarial review over candidates.
9. Keep only candidates that pass evidence, fit, cost, and differentiation gates.
10. Render PRD/report.
11. Optionally create GitHub issue.

GitHub collection should use conditional requests or local cache when possible. Rate-limit exhaustion should degrade to partial output with a clear `coverage` section rather than silently dropping repos.

## Candidate Feature Gates

A derived solution is accepted only if it passes all gates:

- Evidence: at least two independent signals, or one strong code signal plus direct OMA gap.
- Fit: supports OMA's cross-runtime SSOT and skills/workflows architecture.
- Differentiation: improves OMA's own product, not a shallow clone.
- Scope: can ship as a bounded v1 without dashboard or daemon dependencies.
- Risk: does not require unsafe scraping, credential capture, or private data.
- Maintenance: has clear test strategy and owner.

## Blind and Adversarial Review

### Independent Lens Critiques

Product:

- Risk: intelligence analysis can become vanity tracking instead of user-value discovery.
- Requirement: output must prioritize decisions, not exhaustive summaries.

Architecture:

- Risk: coupling GitHub fetching, market research, PRD rendering, and issue creation in one module would be brittle.
- Requirement: define small stages and serializable schemas.

Maintainer:

- Risk: scheduled intelligence checks can create noisy issue spam.
- Requirement: default to report-only; issue creation must be explicit.

QA:

- Risk: live GitHub and market sources make tests flaky.
- Requirement: fixture replay and deterministic mock mode are required.

Security:

- Risk: repo URLs, issue bodies, and READMEs are untrusted text and can contain prompt injection.
- Requirement: quote external content as evidence, never as instructions.

User:

- Risk: reports may be too long to act on.
- Requirement: top three accepted candidates, top three rejected candidates, and clear next action.

### Consolidated Findings

Tier 1:

- Treat external repo content as untrusted input.
- Make issue creation opt-in.
- Require deterministic fixture tests for signal normalization and review gates.

Tier 2:

- Add a reusable taxonomy for OMA capability mapping.
- Save JSON output as well as Markdown.
- Support both `--since` and `--last-commits`.

Tier 3:

- Scheduled GitHub Action template.
- Trend charts.
- Web dashboard.

## MVP Scope

### Include

- `oma intel run` command.
- `--repos`, `--config`, `--since`, `--last-commits`, `--base-repo`, `--output-dir`, `--create-issue`.
- GitHub public repo metadata and commit retrieval.
- README/release/issue summary collection when available.
- OMA capability taxonomy and gap scoring.
- Adversarial review gate.
- Markdown PRD and Markdown report output.
- Optional GitHub issue creation through existing GitHub auth, guarded by config, CLI flag, and explicit confirmation.
- Tests with fixture data.

### Defer

- daemon/scheduler
- dashboard
- paid source support
- automatic PR creation
- automatic implementation by agents
- ranking based on star counts alone

## Acceptance Criteria

- Given a config with five public GitHub repos and `--since 30d`, the command writes a gap report and PRD without modifying `.agents/`.
- Given `--last-commits 20`, the command analyzes exactly the latest 20 commits per repo when available.
- Given both `--since` and `--last-commits`, the command exits with a clear validation error unless a precedence flag is provided.
- Given fixture input, signal normalization, taxonomy mapping, candidate scoring, and adversarial review are deterministic.
- Given `--create-issue`, the command creates one GitHub issue with a title, summary, accepted candidates, rejected candidates, and links or pasted content from the generated PRD.
- Given `--create-issue` in a non-interactive environment, the command refuses unless both config enables remote issues and an explicit non-interactive approval flag is present.
- Given a repeated issue creation request, the command detects an existing matching issue title/body fingerprint and asks before creating another issue.
- Given a thin market corpus, the command degrades gracefully and labels market evidence as insufficient instead of blocking code-delta analysis.
- External README, issue, and commit text is treated as untrusted evidence and cannot override command behavior.
- Every accepted and rejected candidate includes provenance fields sufficient to re-check the evidence later.

## Implementation Tasks

1. Add `cli/commands/intel/command.ts` and register it in `cli/cli.ts`.
2. Add config parsing and validation for repo lists, windows, outputs, and issue options.
3. Add GitHub signal collector with fixture-backed tests.
4. Add target capability taxonomy and source-signal mapper.
5. Add candidate gap scoring and adversarial review gate.
6. Add PRD/report renderers.
7. Add optional GitHub issue creator using `gh` or existing authenticated GitHub integration.
8. Add documentation and examples.
9. Add tests for validation, fixture replay, rendering, and issue dry-run.

## Open Questions

- Should the command name be `oma intel`, `oma research`, or `oma strategy`?
- Should GitHub issue creation use `gh`, the GitHub connector where available, or both with fallback?
- Should default output live under `docs/plans/` or `docs/research/`?
- Should recurring execution be documented as a GitHub Action template in v1 or deferred?

## Recommendation

Build `oma intel run` as a CLI-first feature with report-only defaults and explicit `--create-issue`. This is a strong fit for OMA because it composes existing strengths instead of copying source-specific workflows. The most valuable first release is not "track sources"; it is "convert market and code intelligence into evidence-backed, adversarially reviewed product decisions."
