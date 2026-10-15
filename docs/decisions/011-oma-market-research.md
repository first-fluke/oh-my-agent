# Design 011 — oma-market-research

Market research skill for pain-point extraction, trend detection, competitor positioning, and discovery — built as a thin SSL-lite skill on top of `oma-search` with a small `oma market <subcmd>` CLI surface for deterministic compute.

## 1. Intent and Scope

### Problem

OMA users repeatedly ask "what pain points are real users hitting", "what is trending in {category} this month", and "how does {product A} compare to {product B} in community sentiment". Today there is no first-class skill for this; users either improvise WebSearch chains (low signal) or pull in external skills like `last30days-skill` (Python engine, paid API keys) or `x-research-skill` (X-only, paid). Both miss the OMA repo's existing transport layer — `oma-search`'s 4-strategy fetch pipeline + 281-domain trust registry can already reach Reddit, HN, Bluesky, Mastodon, Twitter syndication, GitHub Issues, npm/PyPI, and more, keyless.

### Goal

Ship `oma-market-research` as a deterministic, keyless-first, .md-driven skill that:

- classifies user intent into `pain` / `trend` / `competitor` / `discovery`,
- fan-outs to community sources via `oma search fetch` (no duplication),
- scores, fuses, clusters, and synthesizes findings with auditable per-stage compute,
- emits a single markdown brief that obeys the same output LAWs that fixed the `last30days` regression (no Sources block, no em-dash, no `##` headers in body, inline `[name](url)` citations, badge first-line),
- auto-applies SWOT (always when appropriate) and stubs Porter's 5 Forces / PESTEL templates for v1.1.

### Non-goals (v1)

- Paid platform parity with `last30days` (TikTok / Instagram / X-paid / Polymarket / Perplexity Sonar are env-conditional, not guaranteed).
- Delta tracking / trend velocity over time (cluster-fingerprints memory). Defer to v2.
- A live dashboard or scheduled monitoring. One-shot CLI only.
- Stateful conversation follow-ups beyond the saved brief.

## 2. v1 Scope Matrix

| Layer | v1 | v1.1 | v2 |
|---|---|---|---|
| Intents | pain, trend, competitor, discovery | — | — |
| Sources (keyless) | reddit, hn, bluesky, mastodon, github-issues, grounding(runtime WebSearch) | velog/tistory/clien/inven (KR), naver, dcinside | xiaohongshu, polymarket |
| Sources (paid, env-gated) | x(paid), tiktok, instagram, youtube via yt-dlp, perplexity | — | scrapecreators broader |
| Frameworks | SWOT (auto by intent) | Porter's 5F, PESTEL (auto templates) | bespoke per-skill (e.g., JTBD) |
| Languages | en, ko | ja | zh, etc. |
| Output | single md brief | sidecar json | multi-file dump |
| Memory | trust cache read-only (from oma-search) | — | cluster-fingerprints, delta tracking |
| CLI | detect-trap, harvest, score, fuse, cluster, render | explain | re-rank, follow-up Q&A |

### Success metrics (v1)

- **Coverage**: cluster count ≥ 1 from ≥ 2 sources for any topic with documented community activity (eval set: 12 topics — 4 pain / 4 trend / 4 competitor).
- **LAW pass rate**: render output passes all 5 LAWs on 100% of eval runs (no Sources block, no em-dash, no body `##`, inline link citations, badge first-line).
- **Determinism**: same `OMA_MARKET_MOCK=1` fixture replay → byte-identical clusters and order on 10 consecutive runs.
- **p95 latency**: 5 sources × 30d window → ≤ 90s on cache miss; ≤ 5s on cache hit.

## 3. Architecture

```
User prompt / agent runtime
        │
        ▼
.agents/skills/oma-market-research/SKILL.md
  (intent classifier, operator pack selection, framework auto-toggle, output LAWs)
        │
        ▼  pipe stages — all stdin/stdout JSON except render
┌───────────────┬───────────────────────────────────────────────────────────┐
│ Stage 0       │ oma market detect-trap "<topic>"                          │
│ Stage 1       │ oma market harvest "<query>" --sources <list> --window 30d│
│ Stage 2       │ oma market score   --intent <i>                           │
│ Stage 3       │ oma market fuse                                            │
│ Stage 4       │ oma market cluster                                         │
│ Stage 5       │ oma market render  --format md --intent <i> --frameworks  │
└───────────────┴───────────────────────────────────────────────────────────┘
        │
        ▼ reuse layer (no duplication)
oma search fetch (api/probe/impersonate/browser) + Trust Registry + Serena cache
```

### File layout

```
.agents/skills/oma-market-research/
├── SKILL.md
└── resources/
    ├── intent-rules.md
    ├── operator-packs/
    │   ├── pain.md
    │   ├── positive.md
    │   ├── competitor.md
    │   └── discovery.md
    ├── frameworks/
    │   ├── swot.md          # v1
    │   ├── porters-5f.md    # v1.1 stub
    │   └── pestel.md        # v1.1 stub
    ├── execution-protocol.md
    ├── output-laws.md
    ├── examples.md
    ├── error-playbook.md
    └── checklist.md

.agents/rules/market-research.md          # new (CLAUDE.md table updated)

packages/cli/src/commands/market/
├── detect-trap.ts
├── harvest.ts
├── score.ts
├── fuse.ts
├── cluster.ts
├── render.ts
└── shared/
    ├── schema.ts
    ├── operators.ts
    ├── frameworks.ts
    └── cache.ts
```

### Reuse rule

- `harvest` never fetches directly. Always delegates to `oma search fetch <platform-api-url> --only api` with platform handlers already shipped by `oma-search`.
- Trust labels come unmodified from `oma search fetch`. No re-scoring.
- Serena `trust-registry-cache` is read-only from this skill (write rights stay with `oma-search`).

## 4. Interfaces

### Stage schemas

```ts
type SourceItem = {
  item_id: string;
  source: "reddit" | "x" | "hn" | "bluesky" | "mastodon"
        | "youtube" | "tiktok" | "instagram" | "github"
        | "polymarket" | "grounding" | "perplexity";
  title: string | null;
  body: string | null;
  snippet: string | null;
  url: string;
  author: string | null;
  published_at: string;
  engagement: Record<string, number>;
  metadata: { hashtags?: string[]; labels?: string[]; [k: string]: unknown };
  trust?: { level: "verified" | "community" | "external" | "unknown"; score: number | null };
};

type Candidate = SourceItem & {
  scores?: {
    relevance: number;
    freshness: number;
    engagement: number;
    source_quality: number;
    final: number;
  };
  rrf_score?: number;
};

type Cluster = {
  cluster_id: string;
  entity_signature: string[];
  representatives: Candidate[];
  members: Candidate[];
  cross_source_count: number;
};
```

### CLI contracts

#### `oma market detect-trap "<topic>"`
- In: topic arg.
- Out: exit 0 pass / exit 2 REFUSE + stderr suggested reframe / exit 4 invalid input.
- Detects: demographic shopping (`gift for 42 year old man`), single-noun-too-broad (`sneakers`, `AI`), age-bracket-no-qualifier, empty topic. `--force` bypasses.
- ASCII control char strip, length ≤ 200, no shell exec.

#### `oma market harvest "<query>" [options]`
- Options:
  - `--sources <list>` (default: auto from env keys; falls back to `reddit,hn,bluesky,mastodon,grounding`)
  - `--window <7d|30d|90d|180d>` (default: `30d`)
  - `--per-source-limit <n>` (default: 12)
  - `--operator-pack <pain|positive|competitor|discovery|none>`
  - `--locale <en|ko|...>` (KR prioritizes velog/tistory/clien/inven when v1.1 lands)
  - `--cache-ttl <duration>` (default: 15m) / `--no-cache`
  - `--vs <entity>` (competitor mode — runs separate fan-out per entity, tags items)
- Behavior: parallel `oma search fetch <api-url> --only api --pretty --timeout 30` per source. Paid sources auto-skip with `[INFO]` stderr if env key missing. Backoff and impersonate fallback handled by `oma search fetch`.
- Cache key: `sha1(query + window + source + operator_pack + locale)` → `~/.cache/oma/market-research/{hash}/result.json`.
- Stdout: `{ "query", "window", "sources_used", "sources_failed", "items": SourceItem[] }`.
- Exit: 0 ok / 2 all sources blocked / 6 timeout.

#### `oma market score [--intent pain|trend|competitor|discovery]`
- Stdin: `{ "items": SourceItem[] }`.
- Engagement weights table (`signals.py` lineage), `log1p` normalize, freshness mode `balanced_recent` default. Intent blends:
  - pain: engagement 0.40 + freshness 0.30 + quality 0.30
  - trend: freshness 0.50 + engagement 0.30 + quality 0.20
  - competitor: relevance 0.35 + engagement 0.35 + quality 0.30
  - discovery: relevance 0.45 + engagement 0.30 + quality 0.25
- Stdout: `{ "items": Candidate[] }` (scores populated, not sorted).

#### `oma market fuse`
- Stdin: `{ "items": Candidate[] }`.
- URL canonicalize (strip `www./old./m.`, drop `utm_*` params, trim trailing `/`).
- Weighted RRF with `k=60`, per-author cap ≤ 3, diversity guard at relevance < 0.25.
- Stdout: `{ "items": Candidate[] }` (rrf_score, sorted by `_candidate_sort_key`).

#### `oma market cluster`
- Stdin: `{ "items": Candidate[] }`.
- Entity extraction with stopword filter (`last30days/cluster.py` lineage), overlap coefficient ≥ 0.4 → same cluster, MMR (λ = 0.75) selects ≤ 3 representatives.
- Stdout: `{ "clusters": Cluster[] }`.

#### `oma market render --format md|json [options]`
- Options:
  - `--format md|json` (default: `md`)
  - `--intent <i>` (carried from upstream)
  - `--frameworks auto|none|swot,5f,pestel`
  - `--vs <entity>` triggers COMPARISON template (`# A vs B: 시장 신호`)
  - `--min-trust verified|community|external` filter
  - `--self-check` (default true; `--no-self-check` to skip LAW validation)
- Stdin: `{ "clusters", "topic", "intent", "sources_used", "sources_failed" }`.
- Writes: `.agents/results/market-research/{topic-slug}-{YYYYMMDD}.md`.
- Stdout: first 50 lines of brief (preview); full content in file.

### Pipeline contract

- Every stage: stdout = pure JSON object (or markdown for render); stderr = warn/error only. Enforced by CI integration test (`jq .` parse check on stdout).
- `--quiet` suppresses stderr except hard errors.
- `OMA_MARKET_MOCK=1` short-circuits external fetches to fixture replay (used in vitest).

### Pipe composition

```bash
TOPIC="VS Code pain points"
oma market detect-trap "$TOPIC" \
  && oma market harvest "vscode (broken OR bug OR migrate OR quit OR slow)" \
       --sources reddit,hn,bluesky --window 30d --operator-pack pain \
  | oma market score --intent pain \
  | oma market fuse \
  | oma market cluster \
  | oma market render --format md --intent pain --frameworks auto
```

## 5. Output LAWs (adapted from last30days)

1. **No `Sources:` / `References:` / `Further reading:` block.** Engine footer is the only visible citation list.
2. **No invented title line.** Body starts with `What we learned:` (or `# {A} vs {B}: 시장 신호` in COMPARISON mode).
3. **No em-dash / en-dash.** Use ` - ` instead.
4. **No `##` headers in body** except framework sections (`## SWOT`, `## Porter's 5 Forces`, `## PESTEL`) and COMPARISON template sections (`## A`, `## B`, `## Head-to-Head`, `## Bottom Line`).
5. **Engine footer pass-through.** Render emits a `✅ market-research footer` block with sources used, cluster count, item count, latency, cache hit/miss.
6. **No raw evidence dump.** Cluster `### N. (score, items, sources: …)` lines are internal to JSON output only. Markdown body must paraphrase as bold lead-in paragraphs.
7. **Inline citations as `[name](url)`.** Never raw URLs, never plain text when URL is available. Broken `[name]()` is forbidden; fall back to plain text only if URL is genuinely absent.
8. **Badge first line.** `🔎 oma-market-research v{ver} · synced {YYYY-MM-DD}` then one blank line then body.

Self-check at render end before emit: scan last 15 lines for forbidden block, scan body for `—`/`–`, scan headers, scan cite formats. Strip or regenerate before file write.

## 6. Integration Points

- **`oma-search`**: transport-only dependency. All fetches funnel through `oma search fetch --only api`. Bypass fallback inherits.
- **Trust Registry**: read by render to annotate citations (`[verified,vendor 0.90]`). No re-scoring.
- **Serena memory**: read `trust-registry-cache` only. Write nothing in v1.
- **Workflows**: `/oma-market-research` keyword trigger registered in `.agents/hooks/core/triggers.json`. Brainstorm and PM workflows can opt in via `--use-market-research <topic>` arg passing to the rendered brief path.
- **Repo conventions**:
  - TS code in `packages/cli/src/commands/market/`, vitest fixtures in `packages/cli/test/market/__fixtures__/`.
  - Conventional commits with new scope `market` (commitlint config update).
  - `.agents/rules/market-research.md` registered in CLAUDE.md project rules table (`on request` scope).
  - SKILL.md frontmatter follows other oma skills.
  - i18n: response language follows `oma-config.yaml.language`. Inline code, handles, platform names, framework names stay in English on first mention (with KR gloss like `포터 5요인 분석(Porter's 5 Forces)`).
  - CLAUDE.md workflows table not updated (this is a skill, not a workflow).

## 7. Edge Cases and Error Handling

### Preflight

| Trap | Detection | Action |
|---|---|---|
| Demographic shopping | `_CLASS_1_PATTERNS` regex + qualifier check | exit 2 + REFUSE + suggested reframe |
| Single-noun-too-broad | tokens < 2 AND common-noun hit | exit 2 + suggest narrowing |
| Age bracket no qualifier | `\d+\s?year\s?old` without hobby/budget/relationship | exit 2 |
| Empty topic | arg blank | exit 4 |
| Locale mismatch | quick lang detect | warn-only |

### Harvest

| Scenario | Handler |
|---|---|
| All sources blocked | exit 2 + per-source diagnostics |
| Partial failure | emit `sources_used` + `sources_failed`; downstream proceeds; render annotates "coverage: N/M sources" |
| Rate limit | `oma search fetch` retries with impersonate fallback |
| Missing paid env key | drop source + `[INFO]` stderr |
| Network timeout | exit 6 |
| Zero items | exit 0 with `items: []` |

### Score / Fuse / Cluster

| Scenario | Handler |
|---|---|
| Empty input | pass-through empty array |
| Invalid JSON | exit 4 + stderr offending line |
| Missing engagement field | fall back to source-quality + freshness only |
| Single-source cluster | retain with `cross_source_count: 1` (render shows "uncertainty: single-source") |
| Author cap conflicts across clusters | applied per cluster, not globally |
| Cluster member count < 2 | skip MMR, single representative |

### Render

| Scenario | Handler |
|---|---|
| Zero clusters | preview message + suggest widen window |
| Framework underfit | skip section + stderr warn |
| URL-less citation | LAW 8 fallback to plain text; broken `[name]()` forbidden |
| Language mix | unify in configured language; quoted text preserves original |
| FS permission denied | exit 5 |
| Trust unknown | render as `[unknown —]` |
| Self-check violation | strip or regenerate; exit 1 only if regeneration also fails |

### Security

- topic sanitized (ASCII control strip, length ≤ 200) at detect-trap.
- query URL-encoded before passing to `oma search fetch`.
- env tokens never echoed to stdout; `--debug` masks them in stderr.
- result md file never contains raw API tokens; redacted automatically.

## 8. Testing Strategy (T1-B realized)

- **Unit (vitest)**: per CLI subcommand, fixture-driven, `OMA_MARKET_MOCK=1`.
  - `detect-trap`: 8 cases (4 traps, 2 valid, 2 edge).
  - `harvest`: 4 mocked sources × 2 windows.
  - `score`: 3 intents × same input → different ranking.
  - `fuse`: per-author cap and dedupe.
  - `cluster`: entity overlap pos/neg.
  - `render`: 4 LAW negative cases (em-dash injected, `##` injected, `Sources:` block injected, raw URL citation) all auto-corrected.
- **Integration**: full pipeline on 12-topic eval set (4 pain / 4 trend / 4 competitor). Success metrics measured.
- **Lint**: `bun run lint` clean. New scope `market` accepted by commitlint.

## 9. Open Questions (deferred to plan phase)

- KR handler readiness audit in `oma search fetch` — does it already handle velog, naver blog, clien, dcinside? Audit before v1.1.
- Should `--explain` mode read clusters JSON sidecar (which is v2) or recompute from cache?
- Operator pack inheritance: should `competitor` pack add `pain` operators by default, or stay orthogonal?

## 10. Out of Scope (v1)

- Delta tracking and cluster-fingerprints memory (v2).
- Stderr message localization (v2).
- GDPR/PIPA automated retention controls (v2).
- Token redaction proof across the broader `oma-search` chain (separate PR scope).
- Stateful follow-up Q&A.

---

## Lineage

This design draws on (and explicitly does not vendor) the following:

- `mvanhorn/last30days-skill` — LLM-first planner, intent enum, source priority table, signals weight table, weighted RRF, entity-overlap clustering with MMR, per-author cap, output LAWs (1-8), preflight refuse gate. We reimplement the compute parts in TS CLI; we adapt the LAWs into our render self-check.
- `rohunvora/x-research-skill` — operator-pack philosophy (`from:`, `-is:reply`, `(broken OR bug OR migrate)`), 7-day quick-mode posture, file-based query cache.
- `oma-search` — 4-strategy fetch pipeline, 281-domain trust registry with Tranco validator and Serena cache, intent + flag override + classifier pattern. We layer on top, not beside.
