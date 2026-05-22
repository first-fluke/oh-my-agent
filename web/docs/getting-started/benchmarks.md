---
title: Benchmarks
description: Five Claude Code harnesses built the same children's 3D learning platform MVP from an identical prompt. oh-my-agent ranked first at 80.6/100 across functional, spec, visual, engineering, and efficiency axes.
---

# Benchmarks

Five Claude Code harnesses built the same children's 3D creative learning platform MVP from an identical raw prompt. **oh-my-agent placed first at 80.6/100** on a 5-axis rubric (functional, spec, visual, engineering, efficiency).

> Run conditions: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth via the user's logged-in `claude` CLI (no `ANTHROPIC_API_KEY`).

---

## Harnesses compared

| Harness | Mechanism |
|---|---|
| `vanilla` | bare Claude Code, no plugin/skill (baseline) |
| `oma` | `oh-my-agent` source-seeded (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` via `--plugin-dir` |
| `ecc` | `everything-claude-code` installed to `~/.claude/` |
| `superpowers` | `superpowers` via `--plugin-dir` |

---

## Final scoreboard

| Rank | Harness | **Total** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Run economics

| Harness | Turns | Duration | Cost | Files (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Landing page comparison

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Full per-screen comparisons (world builder, AI panel, gallery, save→reload state) live in the [GitHub benchmark report](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## How the axes are computed

| Axis | Weight | Key signals | Tooling |
|---|---|---|---|
| **Functional** | 35 | build exit, dev-server boots (HTTP 200 ≤45s), 5 user-journey checks, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13 explicit prompt deliverables, real-API bonus | LLM judge with brace-balanced JSON extractor |
| **Visual** | 20 | anti-patterns, child-friendly UX, design-system consistency, accessibility | LLM judge over screenshots |
| **Engineering** | 20 | code breadth, TS strict, max file size + folder depth, deferred-stub markers, no hardcoded keys | static analysis (jq + grep + find) |
| **Efficiency** | 10 | turns to complete, wall-clock duration, cost-per-file | `claude -p` result JSON |

Spec and visual judges run 3 times per harness via `judge-multi.sh` and per-item scores are averaged across rounds. Implementation lives at [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Caveats

1. **superpowers prompt override**: necessary for the harness to function in non-interactive mode (its `<HARD-GATE>` brainstorming skill blocks single-shot runs). Result reflects "what superpowers can do once the gate is bypassed", not pure apples-to-apples.
2. **Multi-judge averaging on spec + visual, single-run journey**: journey judging requires a live dev server, so it stays single-run. Treat journey gaps under ~2 points as noise. Sample size is 1 build per harness.
3. **Cost normalization**: the efficiency axis uses cost-per-file; absolute cost ($1.28–$8.19 across the 5) is not reflected in the score.
4. **oma's `lint-clean` penalty is intentional**: oma deliberately leaves lint/typecheck enforcement to git hooks (husky + lint-staged) and CI rather than baking ESLint-specific rules into agent skills. The single-run benchmark penalises this as -5 in `lint-clean`, but in a real workflow the same issues would be blocked by pre-push before reaching the remote.

---

## Reproduce

```bash
# Run all harnesses (sequential, ~45 min, ~$15-20 in API spend)
./benchmarks/run.sh

# Multiaxis scoring per harness (5-axis, 100pt) — single judge round
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Generate the report
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

The full per-harness narrative, raw scores, and screenshots are maintained at [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md). That file is generated by `build-report.sh` from each run's `multiaxis/*.json`, so it's always in sync with the latest scoring artifacts.
