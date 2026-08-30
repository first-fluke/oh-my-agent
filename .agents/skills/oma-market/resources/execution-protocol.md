# Step-by-step execution protocol for oma-market

oma owns the gate, the engine lifecycle, and the framework layer. The upstream
`last30days` SKILL.md owns everything about the research itself. Never
improvise a research flow that the upstream contract already specifies.

## Step 0 — Trap detection (CLI)

`oma market detect-trap "<topic>"`. Exit 2 → return the REFUSE message and
reframe suggestion, STOP. Exit 4 → invalid topic, STOP.

## Step 1 — Resolve the engine (CLI)

`oma market resolve --json` → `{ ok, engine: { root, script, skillMd, version, source, status, note }, python, saveDir, reason }`.

- `ok: false` → report `reason` and STOP. Missing engine: `oma market update`.
  Missing Python: relay the hint (brew / apt / `uv python install 3.12`).
- `status: stale` → note it; research still runs on the cached engine.

## Step 2 — Read the upstream contract (LLM)

Read `engine.skillMd` top to bottom. `engine.root` is the upstream `SKILL_DIR`.
Everything it says about Step 0 (setup wizard), intent parsing, Step 0.45,
Step 0.5 / 0.55 (pre-research resolution), Step 0.75 (query plan), the
PRECONDITION GATE, and the OUTPUT CONTRACT applies verbatim, with exactly two
substitutions:

| Upstream says | Do instead |
|---|---|
| Runtime Preflight Python-hunt block | skip — `oma market run` already resolved `LAST30DAYS_PYTHON` |
| `"${LAST30DAYS_PYTHON}" "${SKILL_DIR}/scripts/last30days.py" <args>` | `oma market run <args>` (same args; `--save-dir` auto-added) |

## Step 3 — Intent and frameworks (LLM)

Classify per `intent-rules.md`; pick the engine flags and framework set from
its table. Combine with the upstream-resolved flags (`--plan`, `--subreddits`,
`--x-handle`, …) — do not drop any of them.

## Step 4 — Run the engine (CLI, foreground)

`oma market run "<topic>" <upstream flags> <intent flags> --emit=compact --save-suffix=v3`

Foreground, 5-minute timeout, read the whole output. Non-zero exit → report
stderr verbatim; do not synthesize from nothing.

## Step 5 — Synthesize (LLM)

Follow the upstream OUTPUT CONTRACT (badge first line, Ranked Evidence
Clusters, LAWs, engine footer). Then append the framework sections for the
intent (`frameworks/*.md`), citing only clusters that appear in the engine
output. Comparison intent uses the upstream COMPARISON template.

## Step 6 — Self-check and write (LLM)

Run the checks in `output-laws.md`. Write
`.agents/results/market/{topic-slug}-{YYYYMMDD}.md` (same day + slug
overwrites). Preview the first 50 lines and report the path. State skipped
sources and the engine version.
