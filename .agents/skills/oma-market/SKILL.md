---
name: oma-market
description: "Research customer pain points, trends, and competitors through the OMA market engine. Use for market discovery or voice-of-customer analysis."
---

# Market Research Agent - Community Signal Intelligence

## Scheduling

### Goal
Run the installed upstream `last30days` research engine for community-signal research, then frame the result for the user's intent (pain / trend / competitor / discovery) with strategic frameworks and save one brief under `.agents/results/market/`.

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
- Live dashboards or scheduled monitoring -> `oma schedule <action>` wrapping this skill

### Expected inputs
- Topic string; optional `--intent pain|trend|competitor|discovery` (else classified per `resources/intent-rules.md`)
- Optional window (`--days`), `--vs <entity>` (competitor), `--frameworks auto|none|swot,5f,pestel`
- Any native last30days flag (listed in the upstream contract at `engine.skillMd`) — passed through verbatim

### Expected outputs
- Single markdown brief at `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`
- First line: the engine's badge (`🌐 last30days v{VERSION} · synced {date}`); body per the upstream OUTPUT CONTRACT; framework sections per intent after the body; engine footer last
- Raw engine artifacts under `market.save_dir` (default `.agents/results/market/raw/`)

```yaml
outputs:
  - name: market-brief
    description: Single LAW-compliant markdown brief with framework sections
    artifact: ".agents/results/market/*.md"
    required: true
```

No CLI gate reads this block for `oma-market` (`oma verify` checks `outputs:` only for agent-type skills); the self-check in `resources/output-laws.md` enforces the brief.

### Dependencies
- `oma market resolve` / `oma market run` — engine location, Python 3.12+ resolution, `--save-dir` default
- `oma market detect-trap <topic>` — preflight gate
- `oma market update` — installs the `last30days` skill when missing, otherwise runs `bunx skills update last30days -g -y`
- The engine is the skills-CLI install of `last30days`: `oma market resolve` reads installed skill dirs such as `~/.agents/skills/last30days/` (a `market.path` / `LAST30DAYS_HOME` pin wins)
- The upstream `SKILL.md` at the resolved engine root (`skillMd` in `oma market resolve --json`) — the authoritative research contract
- `resources/intent-rules.md`, `resources/frameworks/`, `resources/output-laws.md`, `resources/execution-protocol.md`

## Structural Flow

### Transitions
- `--vs <entity>` or "A vs B" phrasing → competitor intent → upstream COMPARISON flow (two passes + head-to-head as its contract specifies) → SWOT + Porter's 5F.
- Person / company / ticker topics → upstream person / hiring-signals / StockTwits handling applies unchanged.
- Frameworks toggle by intent: pain / trend → SWOT; competitor → SWOT + Porter's 5F; discovery → SWOT + PESTEL.
- A source that needs keys or cookies auto-skips inside the engine; keyless sources (Reddit, HN, GitHub, Polymarket, arXiv, Techmeme, Digg, web) always run.

### Failure and recovery
- detect-trap exit 2 → REFUSE; do not run the engine; `--force` only on explicit user reconfirmation.
- `oma market resolve` not ok → stop with the reason; no engine run.
- Engine non-zero exit → report stderr verbatim; do not synthesize from partial stdout unless the upstream contract says the emitted compact output is still valid.
- Upstream Python-version gate / setup wizard messages → relay to the user exactly as the upstream contract instructs.
- Python 3.12+ absent → `oma market resolve` stops before the upstream setup wizard. Relay its install hint; after an authorized interpreter installation, retry resolution. Do not expect the skipped upstream Python preflight to install it.

### Exit
- Success: brief written with badge, clusters, frameworks, and engine footer, in that order; path reported.
- Partial: engine ran with skipped sources (footer lists them) — say so; never pad with invented evidence.

## Logical Operations

### Canonical command path
1. Run `oma market detect-trap "<topic>"` before anything else. Exit 2 → surface the REFUSE reason and reframe suggestion, stop. Exit 4 → invalid topic, stop.
2. Run `oma market resolve --json`. It is ok when the engine is present and Python ≥ 3.12 is found on PATH, via `uv`, or pinned with `market.python` / `LAST30DAYS_PYTHON`. `ok: false` → report `reason` (missing engine → ask the user, then `oma market update`; missing Python → the install hint) and stop.
3. Read the upstream contract at `engine.skillMd` **top to bottom**. It is long by design; do not skim. Treat `engine.root` as its `SKILL_DIR`.
4. Classify intent per `resources/intent-rules.md`; map to engine flags and framework set. Record the intent, flags, and frameworks with subject `market.route-selection` per `../_shared/runtime/route-selection.md` (explicit flag, `--vs`, or the keyword score that decided it).
5. Follow the upstream SKILL.md exactly — Step 0 (first-run setup wizard, consent-driven), intent parsing, Step 0.45 (its own query-quality preflight), Step 0.5 / 0.55 (handle, subreddit, hashtag resolution when WebSearch is available), Step 0.75 (query plan). Skip only its "Runtime Preflight" Python-hunt block: `oma market run` already resolved the interpreter.
6. Wherever the upstream contract says `"${LAST30DAYS_PYTHON}" "${SKILL_DIR}/scripts/last30days.py" <args>`, run `oma market run <args>` with the **same arguments** (foreground, 5-minute timeout, `--emit=compact`); it passes them through to the resolved upstream engine's Python entry point. `--save-dir` is added automatically from `market.save_dir` unless you pass one.
7. Produce the brief exactly as the upstream OUTPUT CONTRACT dictates (badge first line, Ranked Evidence Clusters, LAWs). Then add the framework sections selected for the intent between the engine body and the engine footer, using only clusters present in the engine output as evidence (`resources/frameworks/`).
8. Write `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`, run the self-check in `resources/output-laws.md` against the written file, fix and re-check, then preview the first 50 lines.

```bash
TOPIC="VS Code pain points"
oma market detect-trap "$TOPIC"
oma market resolve --json            # read .engine.skillMd, then follow it
# … upstream Steps 0 / 0.45 / 0.5 / 0.55 / 0.75 …
oma market run "$TOPIC" --plan "$QUERY_PLAN_FILE" --subreddits=vscode --emit=compact --save-suffix=v3
```

### Resource scope and effects
- Writes the brief to `.agents/results/market/{topic-slug}-{YYYYMMDD}.md` and raw engine files to `market.save_dir`.
- First run: the upstream setup wizard may write `~/.config/last30days/.env` with user consent; `~/.config/last30days/` holds the engine config and keys.
- `oma market run` starts the resolved upstream Python entry point.
- Network calls happen inside the engine (its per-source fetchers) and in the skills CLI during `oma market update`.

### Guardrails
- Never fall back to WebSearch-only synthesis and present it as market research.

## References
- Execution protocol: `resources/execution-protocol.md`
- Intent routing: `resources/intent-rules.md`
- Output contract: `resources/output-laws.md`
- Applicable framework: `resources/frameworks/swot.md`, `resources/frameworks/porters-5f.md`, or `resources/frameworks/pestel.md` (load only the selected framework)
- Validation: `resources/checklist.md`
- Recovery: `resources/error-playbook.md`
- Upstream engine instructions: read the resolved `engine.skillMd` path from `oma market resolve --json`; upstream scripts belong to the installed engine, not to this skill's resources.
