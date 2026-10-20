---
title: Benchmarks
description: Vijf Claude Code-harnessen bouwden hetzelfde MVP voor een creatief 3D-leerplatform voor kinderen vanuit een identieke prompt. oh-my-agent eindigde als eerste met 80.6/100 op de assen functionaliteit, specificatie, visualisatie, engineering en efficiëntie.
---

# Benchmarks

Vijf Claude Code-harnessen bouwden op basis van één ruwe prompt een MVP voor een creatief 3D-leerplatform voor kinderen. **oh-my-agent scoorde 80.6/100 en eindigde als eerste**, met scores voor functionaliteit, specificatie, visualisatie, engineering en efficiëntie.

> Uitvoeringscondities: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth via de ingelogde `claude` CLI van de gebruiker (zonder `ANTHROPIC_API_KEY`).

---

## Vergeleken harnessen

| Harness | Mechanisme |
|---|---|
| `vanilla` | Kale Claude Code, zonder plugin of skill (baseline) |
| `oma` | `oh-my-agent` source-seeded (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` via `--plugin-dir` |
| `ecc` | `everything-claude-code` geïnstalleerd in `~/.claude/` |
| `superpowers` | `superpowers` via `--plugin-dir` |

---

## Eindstand

| Rang | Harness | **Totaal** | Func/35 | Spec/15 | Visueel/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Uitvoeringseconomie

| Harness | Beurten | Duur | Kosten | Bestanden (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Vergelijking landingspagina

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Volledige vergelijkingen per scherm (world builder, AI-paneel, gallery, save→reload state) staan in het [GitHub-benchmarkrapport](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Hoe de assen worden berekend

| As | Gewicht | Belangrijkste signalen | Tooling |
|---|---|---|---|
| **Functioneel** | 35 | build-exitcode, opstartende dev-server (HTTP 200 ≤45s), 5 user-journey-checks, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13 expliciete prompt-deliverables, real-API bonus | LLM-judge met brace-balanced JSON-extractor |
| **Visueel** | 20 | anti-patronen, kindvriendelijke UX, consistentie van designsysteem, toegankelijkheid | LLM-judge over screenshots |
| **Engineering** | 20 | codebreedte, TS strict, max bestandsgrootte + folderdiepte, deferred-stub markers, geen hardcoded keys | statische analyse (jq + grep + find) |
| **Efficiëntie** | 10 | beurten tot voltooiing, wall-clockduur, kosten per bestand | `claude -p` resultaat-JSON |

Spec- en visuele judges draaien 3 keer per harness via `judge-multi.sh` en de scores per item worden gemiddeld over de rondes. De implementatie staat in [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Kanttekeningen

1. **superpowers prompt-override** — noodzakelijk om de harness in niet-interactieve modus te laten functioneren (de `<HARD-GATE>` brainstorming-skill blokkeert single-shot-runs). Het resultaat weerspiegelt "wat superpowers kan zodra de gate is omzeild", en is dus geen zuivere appels-met-appels-vergelijking.
2. **Multi-judge averaging op spec + visueel, single-run journey** — journey-judging vereist een live dev-server en blijft daarom single-run. Behandel journey-verschillen onder ~2 punten als ruis. De steekproefomvang is 1 build per harness.
3. **Kostennormalisatie** — de efficiëntie-as gebruikt kosten per bestand; de absolute kosten ($1.28–$8.19 over de 5) zijn niet in de score verwerkt.
4. **De `lint-clean`-aftrek van oma is opzettelijk** — oma laat lint- en typecheckhandhaving bewust over aan git hooks (husky + lint-staged) en CI, in plaats van ESLint-specifieke regels in agent-skills op te nemen. De single-run-benchmark bestraft dit met -5 in `lint-clean`, maar in een echte workflow zouden dezelfde problemen door pre-push worden geblokkeerd voordat ze de remote bereiken.

---

## Reproduceren

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

De volledige beschrijving per harness, ruwe scores en screenshots staan in [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md). Dat bestand wordt door `build-report.sh` gegenereerd op basis van de `multiaxis/*.json` van elke run en blijft daardoor afgestemd op de nieuwste score-artefacten.
