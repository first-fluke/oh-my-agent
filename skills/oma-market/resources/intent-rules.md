# Intent classification rules for oma-market — maps the request to one of 4 intents, then to engine flags and frameworks.

## Precedence

1. Explicit flag `--intent <pain|trend|competitor|discovery>` always wins.
2. `--vs <entity>` present → intent = `competitor`.
3. `" vs "` / `" 대 "` / "비교" in the topic → `competitor`.
4. Keyword scan (table below) → highest-scoring intent wins; tie-break `competitor > pain > discovery > trend`.
5. Fallback: complaint keyword → `pain`; else → `trend`.

| Intent | English keywords |
|---|---|
| pain | broken, bug, crash, slow, freeze, lag, outage, migrate, ditched, quit, alternative, replacing, painful, frustrating, hate, worst, unusable, deprecated |
| trend | trend, trending, growth, adoption, rising, popular, new, emerging, hot, forecast, survey, report, state of, this month |
| competitor | vs, versus, alternative, replaced, switched, comparison, compare, benchmark, better than, worse than, switch from |
| discovery | wish, need, missing, underrated, underserved, I want, if only, why doesn't, gap, overlooked, unmet, what's exploding |

Korean / Japanese / Chinese prompts are classified by reading the prompt directly (activation tokens live in `.agents/hooks/core/triggers.json §oma-market`).

## Intent → engine invocation → frameworks

The engine is `oma market run` (= upstream `scripts/last30days.py`). Flags below are additive to whatever the upstream SKILL.md resolves in its Steps 0.5–0.75 (`--plan`, `--subreddits`, `--x-handle`, …).

| Intent | Topic shaping / engine flags | Frameworks (`--frameworks auto`) |
|---|---|---|
| pain | topic as "<subject> problems / complaints"; `--days 30` default; `--deep` when the corpus is thin | SWOT |
| trend | topic as-is; `--days 30` (7 for "this week", 90/180 for "this year"); `--discover "<domain>"` for "what's hot in X" | SWOT |
| competitor | `"<A> vs <B>"` topic → upstream COMPARISON flow (pass A, pass B, head-to-head); `--x-related` when handles resolved | SWOT + Porter's 5F |
| discovery | `--discover` (global) or `--discover "<domain>"`; then `--drill` on the chosen cluster when the user follows up | SWOT + PESTEL |

Person, company, ticker, and hiring topics keep the upstream behaviour (person mode, `--github-user`, `--hiring-signals`, StockTwits auto-activation); frameworks default to `none` for person topics unless asked.

`--frameworks none` suppresses all framework sections; an explicit list (`swot,5f,pestel`) overrides the table.
