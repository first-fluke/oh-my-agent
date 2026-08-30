# Output LAWs — oma-market

The upstream `last30days` engine owns the output contract: it emits the badge
as the first line of `--emit=compact` output and its SKILL.md defines LAWs
1–8 (no `Sources:` block, no invented title, no em/en-dash, no `##` headers in
a GENERAL-query body, inline `[name](url)` citations, engine footer, …). Read
them there — they are the authority and change with each release.

This file lists only the oma-side obligations that sit on top.

## O1 — Pass the engine's structure through

Badge first line, cluster structure, and footer come from the engine. Do not
re-title, re-section, or reorder them. Framework sections are appended
**after** the engine body and **before** nothing else — the engine footer stays
last only if the upstream contract says so; otherwise place frameworks after
the footer under the exact headers `## SWOT`, `## Porter's Five Forces`,
`## PESTEL` (these `##` headers are the one sanctioned exception to LAW 4, as
COMPARISON sections already are upstream).

## O2 — Frameworks cite clusters, never invent

Every framework cell references a cluster or representative that exists in
the engine output, as `[name](url)`. Missing URL → plain text, never `[name]()`.

## O3 — Coverage transparency

If the engine footer or stderr lists skipped / failed sources, keep that list
visible in the brief and say it in the chat summary.

## O4 — One brief, one date

`.agents/results/market/{topic-slug}-{YYYYMMDD}.md`. Same-day rerun overwrites.

## O5 — Personal-data refuse

Refuse research that targets a private individual's personal data before
running the engine. Founders, creators, and public handles are allowed
(upstream person mode).

## Self-check (before writing)

```bash
f=".agents/results/market/<slug>-<date>.md"
head -1 "$f" | grep -q '^🌐 last30days v'          || echo "FAIL: badge not first line"
grep -nE '—|–' "$f"                               && echo "FAIL: em/en-dash"
grep -niE '^(Sources|References|Citations):' "$f" && echo "FAIL: sources block"
grep -nE '\[[^]]+\]\(\)' "$f"                     && echo "FAIL: empty citation"
```

Fix and re-check until clean; do not deliver a brief that fails the badge or
empty-citation checks.
