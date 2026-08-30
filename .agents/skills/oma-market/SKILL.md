---
name: oma-market
description: "Market research skill for pain-point extraction, trend detection, competitor positioning, and discovery across community sources (Reddit, X, YouTube, TikTok, HN, Polymarket, GitHub, arXiv, Techmeme, Bluesky, web and more). Delegates research to the always-latest mvanhorn/last30days engine via `oma market run`, adds oma's detect-trap preflight, intent-auto SWOT / Porter's 5F / PESTEL framing, and a single LAW-compliant brief. Use for market research, pain point analysis, trend detection, competitor research, user complaints, voice-of-customer, 시장조사, 사용자 페인, 트렌드, 경쟁구도."
---

# Market Research Agent - Community Signal Intelligence

## Scheduling

### Goal
Run the upstream `last30days` research engine (always the latest release, managed by oma) for community-signal research, then frame the result for the user's intent (pain / trend / competitor / discovery) with strategic frameworks and save one brief under `.agents/results/market/`.

### Intent signature
- User asks about pain points, user complaints, or voice-of-customer signals for a product or category.
- User asks what is trending, growing, or declining in a space this week or month.
- User asks how one product compares to another in community sentiment or positioning.
- User asks for discovery or exploratory market research on a topic, a person, a company, or a ticker.

### When to use
- Extracting real user pain points from community posts (Reddit with real upvotes and top comments, HN, X, Bluesky, GitHub Issues)
- Detecting trends in a category over a window (`--days 7|30|90|180`)
- Competitor sentiment analysis and SWOT / Porter's 5F positioning
- Open-ended discovery research (`--discover`), person mode, hiring signals (`--hiring-signals`), follow-up drills (`--drill`)

### When NOT to use
- General web research without market framing -> use oma-search directly
- Academic literature -> use oma-scholar
- Live dashboards or scheduled monitoring -> `oma schedule:*` wrapping this skill

### Expected inputs
- Topic string; optional `--intent pain|trend|competitor|discovery` (else classified per `resources/intent-rules.md`)
- Optional window (`--days`), `--vs <entity>` (competitor), `--frameworks auto|none|swot,5f,pestel`
- Any native last30days flag (see `oma market run --help`) — passed through verbatim

### Expected outputs
- Single markdown brief at `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`
- First line: the engine's badge (`🌐 last30days v{VERSION} · synced {date}`); body per the upstream OUTPUT CONTRACT; framework sections appended per intent; engine footer preserved
- Raw engine artifacts under `market.save_dir` (default `.agents/results/market/raw/`)

```yaml
outputs:
  - name: market-brief
    description: Single LAW-compliant markdown brief with framework sections
    artifact: ".agents/results/market/*.md"
    required: true
```

### Dependencies
- `oma market resolve` / `oma market run` — engine location, Python 3.12+ resolution, `--save-dir` default
- The upstream `SKILL.md` at the resolved engine root (`skillMd` in `oma market resolve --json`) — the authoritative research contract
- `resources/intent-rules.md`, `resources/frameworks/`, `resources/output-laws.md`, `resources/execution-protocol.md`

### Control-flow features
- `oma market detect-trap` gate before anything else (exit 2 = REFUSE, exit 4 = invalid)
- Engine is always the latest release: `oma market resolve` refreshes the managed copy (throttled) and falls back to the cached copy offline; a pinned `market.path` / `LAST30DAYS_HOME` opts out
- Sources needing keys/cookies auto-skip inside the engine; keyless sources (Reddit, HN, GitHub, Polymarket, arXiv, Techmeme, Digg, web) always run
- Framework auto-toggle by intent (pain/trend → SWOT; competitor → SWOT + Porter's 5F; discovery → SWOT + PESTEL)

## Structural Flow

### Entry
1. Run `oma market detect-trap "<topic>"`. Exit 2 → surface the REFUSE reason and reframe suggestion, stop.
2. Run `oma market resolve --json`. `ok: false` → report `reason` (missing engine → `oma market update`; missing Python → the install hint) and stop. Never fall back to WebSearch-only synthesis and present it as market research.
3. Read the upstream contract at `engine.skillMd` **top to bottom**. It is long by design; do not skim. Treat `engine.root` as its `SKILL_DIR`.
4. Classify intent per `resources/intent-rules.md`; map to engine flags and framework set.

### Scenes
1. **PREPARE**: detect-trap, resolve, read upstream SKILL.md, classify intent.
2. **UPSTREAM STEPS**: follow the upstream SKILL.md exactly — Step 0 (first-run setup wizard, consent-driven), intent parsing, Step 0.45 (its own query-quality preflight), Step 0.5 / 0.55 (handle, subreddit, hashtag resolution when WebSearch is available), Step 0.75 (query plan). Skip only its "Runtime Preflight" Python-hunt block: `oma market run` already resolved the interpreter.
3. **RUN**: wherever the upstream contract says `"${LAST30DAYS_PYTHON}" "${SKILL_DIR}/scripts/last30days.py" <args>`, run `oma market run <args>` with the **same arguments** (foreground, 5-minute timeout, `--emit=compact`). `--save-dir` is added automatically from `market.save_dir` unless you pass one.
4. **SYNTHESIZE**: produce the brief exactly as the upstream OUTPUT CONTRACT dictates (badge first line, Ranked Evidence Clusters, LAWs). Then append the framework sections selected for the intent, using only clusters present in the engine output as evidence (`resources/frameworks/`).
5. **FINALIZE**: run the self-check in `resources/output-laws.md`, write `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`, preview the first 50 lines.

### Transitions
- `--vs <entity>` or "A vs B" phrasing → competitor intent → upstream COMPARISON flow (two passes + head-to-head as its contract specifies) → SWOT + Porter's 5F.
- Person / company / ticker topics → upstream person / hiring-signals / StockTwits handling applies unchanged.
- `engine.status: stale` → include the `note` in the report (research ran on the cached engine version).

### Failure and recovery
- detect-trap exit 2 → REFUSE; do not run the engine; `--force` only on explicit user reconfirmation.
- `oma market resolve` not ok → stop with the reason; no engine run.
- Engine non-zero exit → report stderr verbatim; do not synthesize from partial stdout unless the upstream contract says the emitted compact output is still valid.
- Upstream Python-version gate / setup wizard messages → relay to the user exactly as the upstream contract instructs.

### Exit
- Success: brief written with badge, clusters, frameworks, and engine footer; path reported.
- Partial: engine ran with skipped sources (footer lists them) — say so; never pad with invented evidence.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| detect-trap preflight | `VALIDATE` | Topic arg, trap pattern rules |
| Resolve engine + Python | `CALL_TOOL` | `oma market resolve --json` |
| Read upstream contract | `READ` | `engine.skillMd` |
| Classify intent | `SELECT` | `resources/intent-rules.md` |
| Upstream pre-research steps | `INFER` | Upstream SKILL.md Steps 0–0.75 |
| Run engine | `CALL_TOOL` | `oma market run <args>` |
| Synthesize + frameworks | `WRITE` | Upstream OUTPUT CONTRACT, `resources/frameworks/` |
| Self-check + write brief | `WRITE` | `resources/output-laws.md`, `.agents/results/market/` |

### Tools and instruments
- `oma market detect-trap <topic>` (preflight gate)
- `oma market resolve [--refresh|--offline] [--json]` (engine + Python resolution; managed latest)
- `oma market update` (force-refresh the managed engine)
- `oma market run <engine args…>` (passthrough to `scripts/last30days.py`)

### Canonical command path
```bash
TOPIC="VS Code pain points"
oma market detect-trap "$TOPIC"
oma market resolve --json            # read .engine.skillMd, then follow it
# … upstream Steps 0 / 0.45 / 0.5 / 0.55 / 0.75 …
oma market run "$TOPIC" --plan "$QUERY_PLAN_FILE" --subreddits=vscode --emit=compact --save-suffix=v3
```

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `NETWORK` | Inside the engine only (its per-source fetchers); GitHub for the managed engine refresh |
| `LOCAL_FS` | `~/.cache/oma-market/last30days/<tag>/` (engine), `~/.config/last30days/` (engine config, keys), `.agents/results/market/` (brief + raw) |
| `PROCESS` | `oma market` subcommands → `python3 scripts/last30days.py` |

### Preconditions
- Topic passes detect-trap.
- `oma market resolve` is ok (engine present; Python ≥ 3.12 found on PATH, via `uv`, or pinned with `market.python` / `LAST30DAYS_PYTHON`).

### Effects and side effects
- Writes the brief to `.agents/results/market/{topic-slug}-{YYYYMMDD}.md` and raw engine files to `market.save_dir`.
- First run: the upstream setup wizard may write `~/.config/last30days/.env` (with user consent) and, when Python 3.12 is absent but `uv` exists, may install a managed CPython 3.12 (~28 MB) after telling the user.
