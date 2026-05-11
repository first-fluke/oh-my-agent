---
title: Benchmarki
description: Pięć harnessów Claude Code zbudowało ten sam MVP platformy edukacyjnej 3D dla dzieci na podstawie identycznego promptu. oh-my-agent zajął pierwsze miejsce z wynikiem 80.6/100 w osiach funkcjonalnej, zgodności ze specyfikacją, wizualnej, inżynierskiej i wydajnościowej.
---

# Benchmarki

Pięć harnessów Claude Code zbudowało ten sam MVP kreatywnej platformy edukacyjnej 3D dla dzieci na podstawie identycznego surowego promptu. **oh-my-agent zajął pierwsze miejsce z wynikiem 80.6/100** w 5-osiowej rubryce (funkcjonalność, zgodność ze specyfikacją, warstwa wizualna, inżynieria, wydajność).

> Warunki uruchomienia: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth przez zalogowane CLI `claude` użytkownika (bez `ANTHROPIC_API_KEY`).

---

## Porównywane harnessy

| Harness | Mechanizm |
|---|---|
| `vanilla` | czyste Claude Code, bez wtyczek/umiejętności (linia bazowa) |
| `oma` | `oh-my-agent` zaszczepione ze źródła (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` przez `--plugin-dir` |
| `ecc` | `everything-claude-code` zainstalowany w `~/.claude/` |
| `superpowers` | `superpowers` przez `--plugin-dir` |

---

## Końcowa tablica wyników

| Pozycja | Harness | **Suma** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Ekonomia uruchomienia

| Harness | Tury | Czas trwania | Koszt | Pliki (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Porównanie strony startowej

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Pełne porównania ekran-po-ekranie (kreator światów, panel AI, galeria, stan save→reload) znajdują się w [raporcie benchmarka na GitHubie](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Jak liczone są poszczególne osie

| Oś | Waga | Kluczowe sygnały | Narzędzia |
|---|---|---|---|
| **Funkcjonalność** | 35 | exit kompilacji, uruchomienie dev-servera (HTTP 200 ≤45s), 5 sprawdzeń ścieżek użytkownika, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Specyfikacja** | 15 | 13 jawnych wymagań z promptu, bonus za realne API | sędzia LLM z ekstraktorem JSON o zbalansowanych klamrach |
| **Warstwa wizualna** | 20 | anty-wzorce, UX przyjazny dzieciom, spójność systemu projektowego, dostępność | sędzia LLM nad zrzutami ekranu |
| **Inżynieria** | 20 | szerokość kodu, TS strict, maksymalny rozmiar pliku + głębokość folderów, znaczniki deferred-stub, brak zaszytych kluczy | analiza statyczna (jq + grep + find) |
| **Wydajność** | 10 | tury do ukończenia, czas zegarowy, koszt na plik | wynikowy JSON `claude -p` |

Sędziowie spec i visual uruchamiani są 3 razy na każdy harness przez `judge-multi.sh`, a wyniki cząstkowe są uśredniane między rundami. Implementacja znajduje się w [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Zastrzeżenia

1. **Nadpisanie promptu superpowers** — niezbędne, by harness zadziałał w trybie nieinteraktywnym (jego umiejętność brainstormingu z `<HARD-GATE>` blokuje pojedyncze uruchomienia). Wynik odzwierciedla "co potrafi superpowers po obejściu bramki", a nie czyste porównanie jeden do jednego.
2. **Uśrednianie wielu sędziów dla spec + visual, pojedynczy przebieg journey** — sędziowanie ścieżek użytkownika wymaga działającego dev-servera, więc pozostaje jednoprzebiegowe. Różnice w journey poniżej ~2 punktów traktuj jako szum. Liczba próbek to 1 build na harness.
3. **Normalizacja kosztów** — oś wydajności używa kosztu na plik; absolutny koszt ($1.28–$8.19 dla całej piątki) nie jest odzwierciedlony w wyniku.
4. **Kara `lint-clean` dla oma jest celowa** — oma świadomie pozostawia egzekwowanie lintu/typecheck hookom git (husky + lint-staged) oraz CI, zamiast wbudowywać reguły specyficzne dla ESLint w umiejętności agentów. Pojedynczy benchmark karze to wynikiem -5 w `lint-clean`, ale w realnym workflow te same problemy zostałyby zablokowane przez pre-push przed dotarciem do zdalnego repozytorium.

---

## Reprodukcja

```bash
# Uruchom wszystkie 5 harnessów (sekwencyjnie, ~45 min, ~$15-20 wydatków na API)
./benchmarks/run.sh

# Punktacja multiaxis dla każdego harnessu (5 osi, 100pkt) — pojedyncza runda sędziowska
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Wygeneruj raport
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

Pełna narracja per harness, surowe wyniki i zrzuty ekranu są utrzymywane w [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md) — ten plik jest generowany przez `build-report.sh` z `multiaxis/*.json` każdego uruchomienia, więc zawsze pozostaje zsynchronizowany z najnowszymi artefaktami punktacji.
