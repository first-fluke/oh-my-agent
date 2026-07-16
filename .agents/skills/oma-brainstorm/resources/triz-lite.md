# TRIZ-lite (Optional Approach Seeding)

Lightweight inventive seeding for **technical / UX contradictions** only.
Not full TRIZ, ARIZ, the classical contradiction matrix, or scored pseudo-formulas.

Default: **off**. Load only when Step 3 triggers apply.

---

## When to load

Load this file and run T1–T4 when **any** of the following is true:

- Improving A clearly worsens B (performance vs cost, freshness vs load, security vs UX, etc.)
- Draft approaches collapse into the same axis (only “turn the knob”: interval, TTL, debounce, log level)
- User explicitly asks for TRIZ, inventive framing, or contradiction-focused options

## When NOT to load

- Ambiguous product intent without a technical/UX contradiction → stay on normal clarification
- Trivial / 1–2 file changes
- Pure organizational or political conflict (do not force a technical contradiction)
- Two or three **mechanistically different** approaches already exist

---

## Protocol

### T0 — Trigger check

If none of the “when to load” conditions hold → **skip** this file; use normal Step 3 generation.

### T1 — Technical contradiction

```markdown
### Technical contradiction
- Improve: {desired gain}
- Degrades: {what gets worse}
- Current compromise: {today’s middle-ground}
- Why compromise is insufficient: {one sentence}
```

Optional physical contradiction (“must be X and not X at once”) only if it is real — do not invent one.

### T2 — Ideal Final Result (IFR)

```markdown
### Ideal Final Result
{One sentence: the system delivers the improve-side outcome with little extra machinery and without the usual compromise}
```

IFR is a **direction**, not a Step 4 implementation spec.

### T3 — Principle seeds (pick 3–5)

Use only this curated software/UX-oriented set. Do **not** dump all 40 classical principles.

| # | Principle | Seed questions (software / UX) |
|---|-----------|--------------------------------|
| 1 | Segmentation | Split modules, stages, shards, progressive rollout? |
| 2 | Taking out | Remove work from the hot path? CQRS / side channel? |
| 3 | Local quality | Different policy per region, widget, tier, or failure mode? |
| 5 | Merging | Batch, colocate, single pipeline? |
| 10 | Preliminary action | Precompute, warm cache, migrate ahead, budget limits up front? |
| 11 | Beforehand cushioning | Retry, fallback, feature flag, keep last-good UI? |
| 13 | The other way around | Push↔pull, sync↔async, server↔edge, invert control? |
| 15 | Dynamics | Adaptive TTL, dynamic fidelity, policy engine? |
| 19 | Periodic action | Batch window, lease renew, coalesce, snapshot ticks? |
| 24 | Intermediary | Queue, BFF, adapter, outbox, event bus, draft/commit layer? |
| 25 | Self-service | Self-heal, client revalidation, automation? |
| 28 | Replace mechanical coupling | Indirect signals: events, observations, data-driven policy? |

Rules:

1. Choose principles that **connect to the T1 contradiction** — no random lists.
2. For each chosen principle, write **one concrete seed sentence** (not only the principle name).
3. Produce at least four seeds, then compress to **2–3 approaches**.

### T4 — Compress into normal Step 3 approaches

Map seeds into the standard approach briefs (see workflow Step 3 presentation rules).

- Keep **tactical** vs **structural** labels.
- Default recommendation remains **structural** (engineering-first).
- Pure knob-turning (only interval/TTL/debounce/log-level) is not a full approach unless the problem is throwaway scope; prefer absorbing it into a structural option or marking non-recommended.
- Optional one-line appendix for the design doc:

```markdown
## Appendix: TRIZ-lite
- Contradiction: improve X / degrades Y
- IFR: ...
- Principles used: {ids}
- Discarded seeds: {one line each}
```

Keep the appendix ≤15 lines.

---

## Anti-patterns

- Running TRIZ-lite on every brainstorm
- Listing all 12 principles without seeds
- Inventing continuous “TRIZ scores”
- Replacing ATAM / ADR / full architecture review with this file
- Expanding seeds into a full Step 4 design before the user picks an approach
- Using principle names as the only user-visible explanation (always prose-brief the approach)

---

## Minimal example

**Contradiction:** fresher metrics vs DB load/cost  
**IFR:** readers see near-real-time metrics without per-user DB polling  
**Seeds:** taking out (read path leaves DB), preliminary (pre-aggregate), periodic (shared worker snapshot), intermediary (read model)  
**Approaches:** (A) event → aggregator → read model; (B) shared poller + short cache + invalidation; (C) tighter poll only — non-recommended tactical  
**Recommend:** A
