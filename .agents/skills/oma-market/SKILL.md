---
name: oma-market
description: "Market research skill for pain-point extraction, trend detection, competitor positioning, and discovery across community sources (Reddit, HN, Bluesky, Mastodon, GitHub Issues, web). Built-in harvest fetchers, deterministic CLI compute, intent-auto SWOT/Porter's 5F/PESTEL frameworks. Use for market research, pain point analysis, trend detection, competitor research, user complaints, voice-of-customer, 시장조사, 사용자 페인, 트렌드, 경쟁구도."
---

# Market Research Agent - Community Signal Intelligence

## Scheduling

### Goal
Classify user intent into pain / trend / competitor / discovery, fan-out to community sources via `oma market harvest`, score and cluster findings with deterministic CLI compute, auto-apply strategic frameworks, and emit a single LAW-compliant markdown brief.

### Intent signature
- User asks about pain points, user complaints, or voice-of-customer signals for a product or category.
- User asks what is trending, growing, or declining in a space this week or month.
- User asks how one product compares to another in community sentiment or positioning.
- User asks for discovery or exploratory market research on a topic.

### When to use
- Extracting real user pain points from community posts (Reddit, HN, GitHub Issues, Bluesky, Mastodon)
- Detecting trends in a product category over a time window (7d / 30d / 90d / 180d)
- Competitor sentiment analysis and SWOT positioning
- Open-ended discovery research across multiple sources

### When NOT to use
- General web research without market framing -> use oma-search directly
- Single-source queries only -> use `oma search fetch` standalone
- Delta tracking or trend velocity over time (v2 feature) -> defer
- Live dashboards or scheduled monitoring -> out of scope (v1 one-shot only)

### Expected inputs
- Topic string and optional `--intent pain|trend|competitor|discovery`
- Optional `--window 7d|30d|90d|180d` (default: `30d`)
- Optional `--sources <list>` to override defaults
- Optional `--vs <entity>` for competitor COMPARISON mode
- Optional `--frameworks auto|none|swot,5f,pestel`
- Optional harvest flags: `--sites <list>` (grounding site: filters, e.g. Naver/tistory/brunch for `ko` locale), `--query-strict` (post-filters results to those whose title contains every whitespace-separated query token)
- Auto-widen (harvest, on by default): widens the window on a thin corpus via the ladder 7d -> 30d -> 90d -> 180d, unless `--window` is explicitly pinned. Disable with `--no-widen`; force it on even with a pinned window via `--widen-on-thin`; tune the thin-corpus cutoff with `--widen-threshold <n>`.

### Expected outputs
- Single markdown brief at `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`
- Badge first-line, `What we learned:` body opener (or COMPARISON title), engine footer
- No raw evidence dump; no Sources block; no em-dash; no `##` in body (framework/COMPARISON sections excepted)

### Dependencies
- `oma market harvest` built-in per-source fetchers (all network I/O stays inside harvest)
- `resources/intent-rules.md`, `resources/operator-packs/`, `resources/output-laws.md`

### Control-flow features
- Branches by classified intent, window, source availability, and env key presence
- detect-trap gate before harvest (exit 2 on broad/ambiguous topic, exit 4 on invalid)
- Env-keyed sources (X, TikTok, Instagram, Perplexity) auto-skip when env key absent; YouTube joins when `yt-dlp` is installed
- Framework auto-toggle by intent (see Routes table)

## Structural Flow

### Entry
1. Run `oma market detect-trap "<topic>"` to preflight the query.
2. Classify or confirm intent from user prompt or `--intent` flag.
3. Select operator pack and framework set for the intent.

### Scenes
1. **PREPARE**: Parse topic and flags; run detect-trap; resolve intent, operator pack, window.
2. **ACT**: Build per-source harvest queries with operator pack query expansion.
3. **ACQUIRE**: Fan-out harvest via `oma market harvest` (parallel, per-source-limit 12, cache TTL 15m).
4. **VERIFY**: Score, fuse, and cluster candidates; validate JSON at each pipe stage.
5. **FINALIZE**: Render LAW-compliant markdown brief; run self-check; write to output path.

### Transitions
- If detect-trap exits 2 (REFUSE), surface reframe suggestion and halt.
- If all sources blocked, exit 2 with per-source diagnostics.
- If partial harvest failure, proceed; render annotates "coverage: N/M sources".
- If zero clusters, emit preview message and suggest wider window.
- If `--vs <entity>` flag is present, switch to COMPARISON template.

### Failure and recovery
- detect-trap exit 2: surface REFUSE reason and suggested reframe; do not proceed to harvest.
- Per-source timeout or fetch failure: source lands in `sources_failed`; harvest exits 2 only when all sources fail.
- Invalid JSON from any pipe stage: exit 4 with offending line in stderr.
- Render LAW self-check violation: auto-fixable LAWs are repaired in place; unfixable violations are annotated in the doc and exit 1.
- Render error (invalid input JSON, write failure incl. FS permission denied): exit 4 with the error in stderr.

### Exit
- Success: brief file written; first 50 lines previewed; engine footer present.
- Partial success: source failures and framework skips are explicit in footer and stderr.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Run detect-trap preflight | `VALIDATE` | Topic arg, trap pattern rules |
| Classify intent | `SELECT` | Intent rules, user flags |
| Select operator pack | `SELECT` | `resources/operator-packs/` |
| Fan-out harvest | `CALL_TOOL` | `oma market harvest` built-in per-source fetchers |
| Score candidates | `INFER` | Engagement weights, freshness, intent blends |
| Fuse and deduplicate | `INFER` | URL canonicalize, RRF k=60, author cap |
| Cluster by entity overlap | `INFER` | Overlap coefficient >= 0.4, MMR lambda=0.75 |
| Select frameworks | `SELECT` | Intent-to-framework toggle table |
| Render and self-check | `WRITE` | Output LAWs, framework templates |
| Write brief | `WRITE` | `.agents/results/market/` |
| Report preview | `NOTIFY` | First 50 lines of brief |

### Tools and instruments
- `oma market detect-trap` (preflight gate)
- `oma market discover-competitors` (auto-discover peer entities for a topic; feeds `--vs` in competitor mode)
- `oma market harvest` (fan-out via built-in per-source fetchers)
- `oma market score` (engagement weights, log1p, intent blends)
- `oma market fuse` (URL canonical, RRF, diversity guard)
- `oma market cluster` (entity overlap, MMR)
- `oma market render` (md/json, LAW self-check, file write)

### Canonical command path
```bash
TOPIC="VS Code pain points"
oma market detect-trap "$TOPIC" \
  && oma market harvest "vscode (broken OR bug OR migrate OR quit OR slow)" \
       --sources reddit,hn,bluesky,mastodon,github,grounding --window 30d \
       --operator-pack pain \
  | oma market score --intent pain \
  | oma market fuse \
  | oma market cluster \
  | oma market render --format md --intent pain --frameworks auto
```

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `NETWORK` | Community sources via harvest's built-in fetchers (reddit, hn, bluesky, mastodon, github, grounding; youtube via `yt-dlp`) |
| `LOCAL_FS` | Brief output at `.agents/results/market/`; cache at `~/.cache/oma/market-research/` |
| `PROCESS` | `oma market` subcommands |
| `MEMORY` | Intent classification, operator pack selection, cluster summaries |

### Preconditions
- Topic is non-empty and passes detect-trap (not demographic-shopping, not single-noun-too-broad).
- At least one keyless source is reachable (reddit, hn, bluesky, mastodon, github, or grounding).

### Effects and side effects
- Writes brief markdown to `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`.
- Populates local cache at `~/.cache/oma/market-research/{sha256-16hex}/result.json` (TTL 15m).

### Guardrails
1. **detect-trap first**: never harvest without preflight. `--force` bypasses the trap gate unconditionally; use it only after the user explicitly reconfirms a refused topic.
2. **Fetches stay inside harvest**: all network I/O happens in `oma market harvest`'s per-source fetchers; no direct platform HTTP from other stages or the agent.
3. **Env-keyed sources auto-skip**: dropped with a `[harvest] <source> skipped:` stderr notice when the env key is absent; never a hard error. X/TikTok/Instagram/Perplexity fetchers are deferred stubs pending integration and land in `sources_failed` even when keyed.
4. **LAW self-check mandatory**: render runs self-check before file write; `--no-self-check` for debug only.
5. **No raw evidence dump**: cluster internals (scores, item counts) stay in JSON output; markdown body paraphrases.
6. **Stdout pure JSON per stage**: each pipe stage (except render) emits valid JSON only; stderr for warnings.
7. **Personal data refuse**: refuse private-individual PII queries at the agent level before harvest (detect-trap automates demographic-shopping and overly-broad-topic refusal only).

### Routes

| Intent | Operator pack | Auto frameworks | Notes |
|--------|--------------|-----------------|-------|
| `pain` | `resources/operator-packs/pain.md` | SWOT | Weights: engagement 0.40, freshness 0.30, quality 0.30 |
| `trend` | none (optional: `resources/operator-packs/positive.md` for pain/positive contrast) | SWOT | Weights: freshness 0.50, engagement 0.30, quality 0.20 |
| `competitor` | `resources/operator-packs/competitor.md` | SWOT + Porter's 5F | Weights: relevance 0.35, engagement 0.35, quality 0.30; `--vs` enables COMPARISON template; `discover-competitors` can suggest the `--vs` entity |
| `discovery` | `resources/operator-packs/discovery.md` | SWOT + PESTEL | Weights: relevance 0.45, engagement 0.30, quality 0.25 |

Porter's 5F and PESTEL: the CLI renders complete labeled framework skeletons (all 5 forces / all 6 dimensions); the host LLM fills them using the analyst prompts in `resources/frameworks/porters-5f.md` and `pestel.md` (execution-protocol Step 6).

### Default Workflow
1. **Preflight**: `oma market detect-trap` exits 0 or halts.
2. **Harvest**: fan-out to keyless sources with operator-pack query; paid sources conditional on env keys.
3. **Score**: apply intent-specific engagement weights and log1p normalization.
4. **Fuse**: URL-canonicalize, deduplicate, RRF k=60, per-author cap <= 3.
5. **Cluster**: entity overlap coefficient >= 0.4, MMR lambda=0.75, <= 3 representatives.
6. **Render**: select frameworks, synthesize brief, run LAW self-check, write file.

### Invocation

#### Standalone
```
/oma-market "Next.js pain points" --intent pain --window 30d
/oma-market "AI coding tools trend" --intent trend
/oma-market "Cursor vs Windsurf" --intent competitor --vs Windsurf
/oma-market "developer productivity market" --intent discovery
```

#### Shared (from other skills or workflows)
The rendered brief is a static file at `.agents/results/market/{slug}-{YYYYMMDD}.md`. Brainstorm or PM workflows consume it by reading that path directly — there is no intake flag to pass.

## References
- Intent classification: `resources/intent-rules.md`
- Operator packs: `resources/operator-packs/` (pain.md, positive.md, competitor.md, discovery.md)
- Frameworks: `resources/frameworks/` (swot.md, porters-5f.md, pestel.md — analyst prompts the host LLM fills into the rendered slots)
- Execution steps: `resources/execution-protocol.md`
- Output LAWs and self-check rules: `resources/output-laws.md`
- Input/output examples: `resources/examples.md`
- Pre-flight checklist: `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Context loading: `../_shared/core/context-loading.md`
- Lessons learned: `../_shared/core/lessons-learned.md`
