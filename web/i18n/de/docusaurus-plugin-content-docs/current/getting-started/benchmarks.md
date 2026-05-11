---
title: Benchmarks
description: Fünf Claude-Code-Harnesses haben dasselbe MVP einer 3D-Lernplattform für Kinder aus einem identischen Prompt erstellt. oh-my-agent belegte mit 80.6/100 den ersten Platz über die Achsen Funktion, Spec, Visual, Engineering und Effizienz.
---

# Benchmarks

Fünf Claude-Code-Harnesses haben dasselbe MVP einer 3D-Lernplattform für Kinder aus einem identischen Roh-Prompt erstellt. **oh-my-agent belegte mit 80.6/100 den ersten Platz** in einer 5-Achsen-Bewertungsmatrix (Funktion, Spec, Visual, Engineering, Effizienz).

> Laufbedingungen: `claude-opus-4-6`, Effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth über die eingeloggte `claude` CLI des Nutzers (kein `ANTHROPIC_API_KEY`).

---

## Verglichene Harnesses

| Harness | Mechanismus |
|---|---|
| `vanilla` | bare Claude Code, ohne Plugin/Skill (Baseline) |
| `oma` | `oh-my-agent` quell-seeded (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` via `--plugin-dir` |
| `ecc` | `everything-claude-code` installiert in `~/.claude/` |
| `superpowers` | `superpowers` via `--plugin-dir` |

---

## Endwertung

| Rang | Harness | **Gesamt** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Lauf-Ökonomie

| Harness | Turns | Dauer | Kosten | Dateien (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Vergleich der Landingpages

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Vollständige Vergleiche je Bildschirm (World Builder, KI-Panel, Galerie, Save→Reload-Zustand) finden Sie im [GitHub-Benchmark-Bericht](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Wie die Achsen berechnet werden

| Achse | Gewicht | Schlüsselsignale | Tooling |
|---|---|---|---|
| **Funktional** | 35 | Build-Exit, Dev-Server bootet (HTTP 200 ≤45s), 5 User-Journey-Checks, Lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13 explizite Prompt-Deliverables, Bonus für reale API | LLM-Judge mit klammerausgeglichenem JSON-Extraktor |
| **Visual** | 20 | Anti-Patterns, kindgerechte UX, Konsistenz des Design-Systems, Barrierefreiheit | LLM-Judge über Screenshots |
| **Engineering** | 20 | Code-Breite, TS strict, maximale Dateigröße + Ordnertiefe, Deferred-Stub-Marker, keine hardcodierten Keys | statische Analyse (jq + grep + find) |
| **Effizienz** | 10 | Turns bis zur Fertigstellung, Wall-Clock-Dauer, Kosten pro Datei | `claude -p`-Ergebnis-JSON |

Spec- und Visual-Judges laufen 3-mal pro Harness via `judge-multi.sh`, und die Item-Scores werden über die Runden gemittelt. Die Implementierung liegt unter [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Einschränkungen

1. **superpowers-Prompt-Override** — notwendig, damit der Harness im nicht-interaktiven Modus funktioniert (sein `<HARD-GATE>`-Brainstorming-Skill blockiert Single-Shot-Läufe). Das Ergebnis spiegelt wider, „was superpowers leisten kann, sobald das Gate umgangen ist", nicht einen reinen Eins-zu-eins-Vergleich.
2. **Multi-Judge-Mittelung bei Spec + Visual, Single-Run-Journey** — Journey-Bewertung erfordert einen laufenden Dev-Server und bleibt daher Single-Run. Behandeln Sie Journey-Lücken unter ~2 Punkten als Rauschen. Die Stichprobengröße beträgt 1 Build pro Harness.
3. **Kostennormalisierung** — die Effizienz-Achse verwendet Kosten pro Datei; absolute Kosten ($1.28–$8.19 über die 5) fließen nicht in den Score ein.
4. **omas `lint-clean`-Penalty ist beabsichtigt** — oma überlässt die Durchsetzung von Lint/Typecheck bewusst Git-Hooks (husky + lint-staged) und CI, statt ESLint-spezifische Regeln in Agent-Skills einzubacken. Der Single-Run-Benchmark bestraft dies mit -5 in `lint-clean`, aber in einem realen Workflow würden dieselben Probleme bereits per Pre-Push blockiert, bevor sie das Remote erreichen.

---

## Reproduzieren

```bash
# Alle 5 Harnesses ausführen (sequenziell, ~45 min, ~$15-20 an API-Kosten)
./benchmarks/run.sh

# Multiaxis-Scoring pro Harness (5 Achsen, 100 Pkt) — eine Judge-Runde
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Bericht generieren
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

Das vollständige Narrativ pro Harness, die Roh-Scores und die Screenshots werden unter [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md) gepflegt — diese Datei wird von `build-report.sh` aus den `multiaxis/*.json` jedes Laufs generiert und ist daher stets mit den neuesten Scoring-Artefakten synchron.
