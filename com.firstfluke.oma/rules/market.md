---
description: Market research standards - trap detection, always-latest last30days engine, framework layer, LAW enforcement
globs:
alwaysApply: false
---

# Market Research Standards

## Core Rules

1. **Preflight first**: every market research task starts with `oma market detect-trap`. If it refuses, surface the reframe to the user — never bypass without `--force` and explicit user reconfirmation.
2. **One engine, always latest**: research runs on the upstream `last30days` engine through `oma market run`. `oma market resolve` refreshes oma's managed copy to the latest GitHub Release before use (throttled by `market.check_interval_min`; cached copy on network failure). Do not hand-roll harvesting, scoring, or clustering, and do not run a stale user-installed copy when the managed one resolves.
3. **Follow the upstream contract**: read the resolved engine's `SKILL.md` (`engine.skillMd`) top to bottom every run and follow it — setup wizard, pre-research resolution, query plan, PRECONDITION GATE, OUTPUT CONTRACT. The only substitutions are skipping its Python-hunt block and replacing the raw `python3 scripts/last30days.py` call with `oma market run` (same arguments).
4. **Never WebSearch-only**: if the engine cannot run (no engine, no Python 3.12+, non-zero exit), stop and report; a WebSearch-only synthesis presented as market research is a contract violation.
5. **Keyless-first**: Reddit, HN, GitHub, Polymarket, arXiv, Techmeme, Digg, and web run without keys. Keyed sources (X, TikTok, Instagram, YouTube transcripts, …) are enabled only through the upstream setup wizard with user consent; skipped sources stay visible in the footer.
6. **Frameworks cite the engine**: SWOT / Porter's 5F / PESTEL sections use only clusters present in the engine output, cited as `[name](url)`; plain text when a URL is missing, never `[name]()`. Auto-toggle: pain/trend → SWOT; competitor → SWOT + 5F; discovery → SWOT + PESTEL; `--frameworks` overrides.
7. **LAW enforcement**: the engine's badge is the first line; upstream LAWs 1–8 plus `resources/output-laws.md` self-check must pass before the file is written.
8. **Single brief, single date**: `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; raw engine files under `market.save_dir` (default `.agents/results/market/raw/`). Same-day rerun overwrites.
9. **Personal data refuse**: refuse queries that target a private individual's personal data before running the engine. Founders, creators, and public handles are allowed (upstream person mode).
10. **Side effects are consented**: first-run `.env` creation, credential storage, and a `uv`-managed Python install happen only after the user says yes in the upstream Step 0 flow.
