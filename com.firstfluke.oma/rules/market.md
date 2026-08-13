---
description: Market research standards - trap detection, keyless-first sourcing, LAW enforcement, deterministic compute
globs:
alwaysApply: false
---

# Market Research Standards

## Core Rules

1. **Preflight first**: every market research task starts with `oma market detect-trap`. If it refuses, surface the reframe to the user — never bypass without `--force`.
2. **Keyless-first**: default to sources that need no API key (reddit, hn, bluesky, mastodon, github, grounding). youtube joins automatically when the `yt-dlp` binary is installed. Env-keyed sources (x, tiktok, instagram, perplexity) are skipped with a stderr notice when their key is absent.
3. **Fetch inside harvest only**: all network fetches happen inside `oma market harvest` via its built-in per-source fetchers. Do not call platform APIs directly from other market stages or from the agent.
4. **Deterministic compute**: score, fuse, cluster stages must produce byte-identical output on `OMA_MARKET_MOCK=1` fixture replay. Stage stdin/stdout is pure JSON; stderr is warn/error only.
5. **LAW enforcement**: render output must pass the 8 LAWs (see `.agents/skills/oma-market/resources/output-laws.md`). LAW self-check is mandatory; `--no-self-check` is debug-only.
6. **Cite or fall back**: every representative cited in the brief is `[name](url)`. If URL is missing, use plain text — never `[name]()`.
7. **Coverage transparency**: when `sources_failed` is non-empty, render must annotate "coverage: N/M sources" in the engine footer.
8. **Intent → framework auto-toggle**: pain/trend → SWOT only; competitor → SWOT + Porter's 5F; discovery → SWOT + PESTEL. User `--frameworks` flag overrides.
9. **Single brief, single date**: one run = one md file at `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`. Rerunning same day overwrites; previous run is responsible to git the file if needed.
10. **Personal data refuse**: refuse queries that target a private individual's personal data before running the pipeline. This is an agent-level gate — `detect-trap` automates demographic-shopping and overly-broad-topic refusal only. Founders, creators, and public handles are allowed (last30days person-mode parity).
