---
title: "Guide: Market Research (last30days engine)"
description: How oh-my-agent's oma-market skill runs community-signal research on the upstream mvanhorn/last30days engine, kept at the latest release automatically — the market config section, oma market resolve / update / run, the detect-trap gate, intent-to-framework mapping, and failure modes.
---

# Market Research

`oma-market` answers "what are people actually saying about X in the last N days" — pain points, trends, competitor sentiment, discovery — from community sources with real engagement numbers: Reddit (upvotes and top comments), X, YouTube transcripts, TikTok, Instagram, Hacker News, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, the web, and more.

The research itself runs on the upstream [**last30days**](https://github.com/mvanhorn/last30days-skill) engine (MIT, Python 3.12+, zero runtime dependencies, 60k+ stars, released every few days). oh-my-agent does not fork it: it keeps an **always-latest managed copy**, gates every run, and adds a strategic-framework layer on top.

---

## Always the latest engine — nothing to install

```bash
oma market resolve
# engine:   last30days
# reason:   last30days 3.21.1 via managed:v3.21.1 (current)
# root:     ~/.cache/oma-market/last30days/v3.21.1
# skill:    ~/.cache/oma-market/last30days/v3.21.1/SKILL.md
# python:   python3.14 (3.14.7, PATH)
# save_dir: <workspace>/.agents/results/market/raw
```

- Cache: `~/.cache/oma-market/last30days/<tag>/` + `state.json`.
- Before each use, `resolve` asks GitHub for the latest release (throttled to once per `check_interval_min`, default 60 min), downloads a newer tag into its own directory (older tags pruned), and otherwise reuses the cache. Network failures reuse the cached copy and report `stale`.
- Python: `LAST30DAYS_PYTHON` → `market.python` → `python3.14 … python3` on PATH (must be ≥ 3.12) → `uv python find '>=3.12'`. If none is found, `resolve` is not ok and prints the install hint; the skill stops rather than degrade to web-search-only research.
- Engine configuration and API keys live in `~/.config/last30days/` (written by the upstream setup wizard with your consent), so they survive engine upgrades.

Resolution order (first hit wins): `market.path` → `LAST30DAYS_HOME` → **managed latest** → user-installed copies (`.agents|.claude|.codex|.cursor|.qwen|.kiro/skills/last30days` in the project and under `~`, then the Claude Code plugin cache).

```bash
oma market update            # force a check / download now
oma market resolve --offline # never touch the network
oma market run --help        # the engine's own flags
```

---

## Configuration

```yaml
market:
  managed: true                   # false = never download; pins / skill dirs only
  channel: stable                 # stable (latest Release) | main (HEAD)
  check_interval_min: 60          # 0 = check on every call
  path: null                      # explicit engine dir (pin)
  python: null                    # interpreter override
  save_dir: .agents/results/market/raw
```

---

## How a run works

1. `oma market detect-trap "<topic>"` — refuses keyword-trap and demographic-shopping topics (exit 2) with a reframe suggestion.
2. `oma market resolve --json` — engine + Python; stops on `ok: false`.
3. The agent reads the resolved engine's `SKILL.md` top to bottom and follows it: first-run setup wizard, pre-research resolution of handles / subreddits / hashtags (when WebSearch is available), query planning, the precondition gate.
4. `oma market run "<topic>" <flags> --emit=compact` — identical arguments to the upstream `python3 scripts/last30days.py` call; `--save-dir` is added from `market.save_dir`.
5. Synthesis follows the upstream OUTPUT CONTRACT (badge first line, ranked evidence clusters, LAWs 1–8), then oma appends framework sections that cite only engine clusters:

| Intent | Engine shaping | Frameworks |
|---|---|---|
| pain | complaint-shaped topic, `--days 30`, `--deep` when thin | SWOT |
| trend | `--days 7/30/90/180`, `--discover "<domain>"` for "what's hot" | SWOT |
| competitor | `"A vs B"` → upstream comparison flow | SWOT + Porter's 5F |
| discovery | `--discover`, then `--drill` follow-ups | SWOT + PESTEL |

6. Self-check, then write `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`.

---

## Failure modes

| Situation | Result |
|---|---|
| Topic refused by detect-trap | Reframe shown; engine not run. `--force` only after explicit user reconfirmation |
| No engine cached and offline | `ok: false` → run `oma market update` once online |
| No Python 3.12+ | `ok: false` with install hint (brew / apt / `uv python install 3.12`); no web-search-only substitute |
| Release check fails | Cached engine used, reported as `stale` |
| Sources without keys | Skipped inside the engine and listed in the footer; enable via the upstream setup wizard |

---

## Related

- [Diagram Engine](/docs/guide/diagram-engine) — the same managed-latest pattern for archify
- [oma-config.yaml semantics](/docs/guide/oma-config-semantics)
- Upstream: [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)
