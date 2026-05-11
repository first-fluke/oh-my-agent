# AI Coding Harness Benchmark

Compares 5 Claude Code harnesses on the same prompt — building a children's
3D creative learning platform MVP (`benchmarks/prompt.md`).

| Harness | Mechanism | Activation evidence |
|---|---|---|
| `vanilla` | bare Claude Code, no plugin/skill | baseline |
| `oma` | `oh-my-agent` source-seeded into project (`.agents/` + `.claude/`) | design-rule-driven anti-pattern avoidance, deferred-stub markers |
| `omc` | `oh-my-claudecode` via `--plugin-dir` | self-reported "OMC loaded, 40+ skills" |
| `ecc` | `everything-claude-code` installed to user `~/.claude/` | session skill list expanded with ecc skills |
| `superpowers` | `superpowers` via `--plugin-dir` | first run hit `<HARD-GATE>` brainstorming skill (forced override prompt to proceed) |

Run conditions: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`,
`--no-session-persistence`, `--setting-sources project,local`, identical raw prompt.
ANTHROPIC_API_KEY not set — OAuth via the user's logged-in `claude` CLI.

---

## Final scoreboard (5-axis, 100pt total)

| Rank | Harness | **Total** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 🥇 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 🥈 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 🥉 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Run economics

| Harness | Turns | Duration | Cost | Files (src) | Cost / file |
|---|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 | $0.15 |
| oma | 31 | 15m 56s | $4.04 | 21 | $0.19 |
| omc | 61 | 9m 02s | $1.92 | 14 | $0.14 |
| ecc | 79 | 10m 20s | $3.84 | 22 | $0.17 |
| superpowers | 39 | 8m 13s | $1.28 | 18 | $0.07 |

---

## Screenshot comparison

### Landing page

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla landing](screenshots/vanilla/01-landing.png) | ![oma landing](screenshots/oma/01-landing.png) | ![omc landing](screenshots/omc/01-landing.png) | ![ecc landing](screenshots/ecc/01-landing.png) | ![superpowers landing](screenshots/superpowers/01-landing.png) |

### World builder

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla builder](screenshots/vanilla/02-world-builder.png) | ![oma builder](screenshots/oma/02-builder.png) | ![omc builder](screenshots/omc/02-world-builder.png) | ![ecc builder](screenshots/ecc/02-world-builder.png) | ![superpowers builder](screenshots/superpowers/02-world-builder.png) |

### AI panel

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla ai](screenshots/vanilla/03-ai-panel.png) | ![oma ai](screenshots/oma/03-ai-panel.png) | ![omc ai](screenshots/omc/03-ai-panel.png) | ![ecc ai](screenshots/ecc/03-ai-panel.png) | ![superpowers ai](screenshots/superpowers/03-ai-panel.png) |

### Gallery

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla gallery](screenshots/vanilla/04-gallery.png) | ![oma gallery](screenshots/oma/05-gallery.png) | ![omc gallery](screenshots/omc/04-gallery.png) | ![ecc gallery](screenshots/ecc/04-gallery.png) | ![superpowers gallery](screenshots/superpowers/04-gallery.png) |

### Save → reload (state persistence)

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla save](screenshots/vanilla/04-save-after-reload.png) | ![oma save](screenshots/oma/04-save-after-reload.png) | ![omc save](screenshots/omc/04-save-after-reload.png) | ![ecc save](screenshots/ecc/04-save-after-reload.png) | ![superpowers save](screenshots/superpowers/04-save-after-reload.png) |

> `journey-save` axis evidence: harnesses scoring 3/3 fully restore the saved
> world; harnesses scoring 1.5/3 persist the gallery card but the canvas
> doesn't rehydrate after reload.

---

## Per-harness narrative


### 🥇 oma (80.6)

- **Functional 32/35** — save-reload only 1.5/3.
- **Spec 13.3/15** — passed: `product-concept,personas,journeys,feature-list,ia,ui-direction,tech-arch,db-schema,ai-prompts,safety,starter-code,priority-screens`. failed: `impl-plan`. real-api bonus 2/2.
- **Visual 15.3/20** — anti-patterns 4.3/5 (scores=[ 4 5 4 ] mean=4.3 (over 3 rounds)…); accessibility 3/5.
- **Engineering 15/20** — breadth: routes=5 components=11. type: strict=true any_count=0. modularity: max_depth=9 max_file_lines=164. transparency markers: 0/4. env: env config present, no hardcoded keys.
- **Efficiency 5/10** — 31 turns / 15m 56s / $4.04 total ($0.37/file estimated).

### 🥈 omc (74.1)

- **Functional 33.5/35** — save-reload only 1.5/3.
- **Spec 6.7/15** — passed: `product-concept,feature-list,ia,ai-prompts,starter-code,priority-screens`. failed: `personas,journeys,ui-direction,tech-arch,db-schema,safety,impl-plan`. real-api bonus 2/2.
- **Visual 14.4/20** — anti-patterns 3.7/5 (scores=[ 3 4 4 ] mean=3.7 (over 3 rounds)…); accessibility 2.7/5.
- **Engineering 14.5/20** — breadth: routes=4 components=5. type: strict=true any_count=0. modularity: max_depth=8 max_file_lines=172. transparency markers: 0/4. env: env config present, no hardcoded keys.
- **Efficiency 5/10** — 61 turns / 9m 02s / $1.92 total ($0.38/file estimated).

### 🥉 superpowers (72.9)

- **Functional 30/35** — lint failed.
- **Spec 9.3/15** — passed: `product-concept,feature-list,ia,tech-arch,db-schema,ai-prompts,safety,starter-code,priority-screens`. failed: `personas,journeys,ui-direction,impl-plan`. real-api bonus 2/2.
- **Visual 11.6/20** — anti-patterns 3/5 (scores=[ 4 3 2 ] mean=3.0 (over 3 rounds)…); accessibility 2.3/5.
- **Engineering 14/20** — breadth: routes=4 components=9. type: strict=true any_count=0. modularity: max_depth=8 max_file_lines=258. transparency markers: 0/4. env: env config present, no hardcoded keys.
- **Efficiency 8/10** — 39 turns / 8m 13s / $1.28 total ($0.14/file estimated).

### 4. vanilla (70.7)

- **Functional 28.5/35** — lint failed; save-reload only 1.5/3.
- **Spec 11.7/15** — passed: `product-concept,personas,journeys,feature-list,ia,ui-direction,tech-arch,db-schema,ai-prompts,safety,impl-plan,starter-code`. failed: `priority-screens`. real-api bonus 0/2.
- **Visual 12/20** — anti-patterns 2.3/5 (scores=[ 1 3 3 ] mean=2.3 (over 3 rounds)…); accessibility 2.7/5.
- **Engineering 12.5/20** — breadth: routes=5 components=6. type: strict=true any_count=0. modularity: max_depth=7 max_file_lines=473. transparency markers: 0/4. env: no hardcoded keys, no env refs either.
- **Efficiency 6/10** — 42 turns / 8m 56s / $2.37 total ($0.40/file estimated).

### 5. ecc (70.2)

- **Functional 28.5/35** — lint failed; save-reload only 1.5/3.
- **Spec 9.7/15** — passed: `product-concept,feature-list,ia,ui-direction,tech-arch,db-schema,ai-prompts,safety,starter-code,priority-screens`. failed: `personas,journeys,impl-plan`. real-api bonus 2/2.
- **Visual 13/20** — anti-patterns 3.3/5 (scores=[ 3 3 4 ] mean=3.3 (over 3 rounds)…); accessibility 2.7/5.
- **Engineering 15/20** — breadth: routes=4 components=13. type: strict=true any_count=0. modularity: max_depth=8 max_file_lines=167. transparency markers: 0/4. env: env config present, no hardcoded keys.
- **Efficiency 4/10** — 79 turns / 10m 20s / $3.84 total ($0.30/file estimated).

---

## How the score axes are computed

| Axis | Weight | Key signals | Tooling |
|---|---|---|---|
| **Functional** | 35 | build exit, dev-server boots (HTTP 200 ≤45s), 5 user-journey checks, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13 explicit prompt deliverables (docs or final reply), real-API bonus | LLM judge with brace-balanced JSON extractor |
| **Visual** | 20 | anti-patterns (gradient bgs, sub-16px text, nesting), child-friendly UX, design-system consistency, accessibility | LLM judge over screenshots |
| **Engineering** | 20 | code breadth, TS strict, max file size + folder depth, deferred-stub markers, no hardcoded keys | static analysis (jq + grep + find) |
| **Efficiency** | 10 | turns to complete, wall-clock duration, cost-per-file | `claude -p` result JSON |

Implementation: `benchmarks/scoring/multiaxis/score.sh` → emits per-harness
`multiaxis-score.json` and `multiaxis-summary.json`. This README itself is
generated by `benchmarks/scoring/multiaxis/build-report.sh`.

---

## Honest caveats

1. **superpowers prompt override** — necessary for the harness to function in non-interactive mode. Result is "what superpowers can do once the brainstorming gate is bypassed", not pure apples-to-apples.
2. **Multi-judge averaging (spec + visual), single-run journey** — spec and visual judges run 3 times per harness via `judge-multi.sh`; per-item scores are averaged across rounds (fractional like 0.67 = 2-of-3 rounds passed). Journey judging requires a live dev server so it stays single-run; treat journey gaps under ~2 points as noise. Sample size is still 1 build per harness — re-running the same harness from scratch can still produce different code, which this benchmark does not measure.
3. **Cost normalization** — efficiency uses cost-per-file. Absolute cost ($1.28–$8.19 across the 5) is not reflected in the axis score.
4. **oma design principle: lint and typecheck belong in pre-commit / pre-push, not in the agent skill** — oma deliberately does not have the agent self-police linter rules during generation. The reasoning: (a) baking ESLint-specific rules into a skill is brittle (Biome / oxlint / future linters have different rules), and (b) the canonical layer for "is this push-ready" is git hooks (husky + lint-staged for pre-commit; lint/typecheck/build for pre-push) and CI. In a real workflow, the bad `<a href>` and unused-import this run produced would be blocked by the pre-push hook before they reach the remote — the developer (or agent on retry) would fix and re-push. Single-run benchmark scoring penalises this as -5 in `lint-clean`, but the architectural choice is intentional: keep agent skills focused on framework canonical patterns, leave mechanical enforcement to the hook/CI layer.

---

## Reproduce

```bash
# 1. Run all 5 harnesses (sequential, ~45 min, ~$15-20 in API spend)
./benchmarks/run.sh

# 2. Multiaxis scoring per harness (5-axis, 100pt) — single judge round
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# 3. (optional) Re-judge spec + visual N times and average — reduces LLM noise.
#    Reuses existing run-1 outputs and runs N-1 additional rounds.
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/judge-multi.sh \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    $h \
    3
done

# 4. Generate this README from the multiaxis outputs
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```
