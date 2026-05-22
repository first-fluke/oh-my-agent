---
title: Struktura projektu
description: Wyczerpujące drzewo katalogów instalacji oh-my-agent z opisem każdego pliku i katalogu — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, symlinki skills, agents), .serena/memories/ oraz struktura repozytorium źródłowego oh-my-agent.
---

# Struktura projektu

Po zainstalowaniu oh-my-agent, projekt zyskuje trzy drzewa katalogów: `.agents/` (jedno źródło prawdy), `.claude/` (warstwa integracji z IDE) i `.serena/` (stan runtime). Ta strona dokumentuje każdy plik i jego przeznaczenie.

---

## Kompletne drzewo katalogów

```
your-project/
├── .agents/                          ← Jedno źródło prawdy (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    ← Język, strefa czasowa, mapowanie CLI
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Zasoby używane przez WSZYSTKICH agentów
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/             ← (i pozostałe 13 agentów)
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   └── ...
│   │
│   ├── workflows/                    ← 16 definicji workflow
│   ├── agents/                       ← 7 definicji subagentów
│   ├── results/plan-{sessionId}.json                     ← Wygenerowany plan (wypełniany przez /plan)
│   ├── state/                        ← Pliki stanu aktywnych workflow
│   ├── results/                      ← Pliki wyników agentów
│   └── mcp.json                      ← Konfiguracja serwera MCP
│
├── .claude/                          ← Warstwa integracji IDE
│   ├── settings.json                 ← Rejestracja hooków i uprawnienia
│   ├── hooks/
│   │   ├── triggers.json             ← Mapowanie słów kluczowych na workflow (11 języków)
│   │   ├── keyword-detector.ts       ← Logika automatycznego wykrywania
│   │   ├── persistent-mode.ts        ← Wymuszanie trwałych workflow
│   │   └── hud.ts                    ← Wskaźnik [OMA] w pasku stanu
│   ├── skills/                       ← Dowiązania symboliczne → .agents/skills/
│   └── agents/                       ← Definicje subagentów dla Claude Code
│
└── .serena/                          ← Stan runtime (Serena MCP)
    └── memories/
        ├── orchestrator-session.md   ← ID sesji, status, śledzenie faz
        ├── task-board.md             ← Przypisania zadań i status
        ├── progress-{agent}.md       ← Aktualizacje postępu per agent
        ├── result-{agent}.md         ← Końcowe wyjścia per agent
        ├── session-metrics.md        ← Śledzenie Clarification Debt i Quality Score
        └── archive/
            └── metrics-{date}.md     ← Zarchiwizowane metryki sesji
```

---

## .agents/ — Źródło prawdy

To katalog główny. Wszystko czego agenci potrzebują, znajduje się tutaj. To jedyny katalog mający znaczenie dla zachowania agentów — wszystkie inne katalogi są z niego wyprowadzone.

### config/

**`oma-config.yaml`** — Centralny plik konfiguracyjny z:
- `language`: Kod języka odpowiedzi (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Format znacznika czasu (domyślnie: `YYYY-MM-DD`)
- `timezone`: Identyfikator strefy czasowej (domyślnie: `UTC`)
- `default_cli`: Awaryjny dostawca CLI (antigravity, claude, codex, qwen)
- `model_preset (per-agent overrides via `agents:`)`: Nadpisania routingu CLI per agent

### skills/

Gdzie rezydują kompetencje agentów. 22 katalogów łącznie: 21 umiejętności agentów + 1 katalog zasobów współdzielonych.

**`_shared/`** — Zasoby używane przez wszystkich agentów:
- `core/` — Routing, ładowanie kontekstu, struktura promptów, protokół wyjaśniania, budżet kontekstu, ocena trudności, szablony wnioskowania, zasady jakości, wykrywanie dostawcy, metryki sesji, wspólna lista kontrolna, zdobyte doświadczenia, szablony kontraktów API
- `runtime/` — Protokół pamięci dla subagentów CLI, protokoły wykonawcze per dostawca (claude, codex, qwen)
- `conditional/` — Pomiar quality score, śledzenie experiment ledger, protokół exploration loop (ładowane tylko po spełnieniu warunków)

**`oma-{agent}/`** — Katalogi umiejętności per agent. Każdy zawiera:
- `SKILL.md` (~800 bajtów) — Warstwa 1: zawsze załadowana. Tożsamość, routing, podstawowe reguły.
- `resources/` — Warstwa 2: na żądanie. Protokoły wykonawcze, przykłady, listy kontrolne, podręczniki błędów, stosy technologiczne, fragmenty kodu, szablony.

### workflows/

16 plików Markdown definiujących zachowanie komend slash. Każdy plik zawiera:
- Frontmatter YAML z `description`
- Sekcję obowiązkowych reguł (język odpowiedzi, kolejność kroków, wymagania narzędzi MCP)
- Instrukcje wykrywania dostawcy
- Protokół wykonawczy krok po kroku
- Definicje bramek (dla trwałych workflow)

Trwałe workflow: `orchestrate.md`, `work.md`, `ultrawork.md`.
Nietrwałe: `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

7 plików definicji subagentów używanych przy uruchamianiu agentów przez narzędzie Task (Claude Code) lub CLI. Każdy plik definiuje:
- Frontmatter: `name`, `description`, `skills` (jaki skill załadować)
- Referencję protokołu wykonawczego
- Szablon kontroli wstępnej (CHARTER_CHECK)
- Podsumowanie architektury
- Reguły domenowe (10 reguł)
- Stwierdzenie: "Nigdy nie modyfikuj plików `.agents/`"

### mcp.json

Konfiguracja serwera MCP zawierająca:
- Definicje serwerów (Serena, itp.)
- Konfigurację pamięci: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (nazwy narzędzi read/write/edit)
- Definicje grup narzędzi dla zarządzania `/tools`

---

## .claude/ — Integracja IDE

Ten katalog łączy oh-my-agent z Claude Code i innymi IDE.

### hooks/

**`triggers.json`** — Mapowanie słów kluczowych na workflow. Definiuje:
- `workflows`: Mapa nazwy workflow na `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }`. `keywords` to literalne frazy; `patterns` to surowe ciągi regex (kompilowane z flagami `iu`).
- `informationalPatterns`: Frazy wskazujące pytania (filtrowane z automatycznego wykrywania)
- `excludedWorkflows`: Workflow wymagające jawnego wywołania `/komendą`
- `cjkScripts`: Kody języków używających pism CJK (ko, ja, zh)

Sekcje językowe w `keywords`, `patterns` i `informationalPatterns` przestrzegają następującej konwencji:
- `*` — Uniwersalne/angielskie. Zawsze ładowane niezależnie od ustawienia `language` w `.agents/oma-config.yaml`.
- `en` — Ładowane dla zachowania kompatybilności wstecznej. Funkcjonalnie równoważne `*`. Nową zawartość angielską należy umieszczać w `*`.
- `ko`/`ja`/`zh`/itd. — Specyficzne dla języka. Ładowane tylko gdy w `.agents/oma-config.yaml` ustawiono `language: <kod>`.

**`keyword-detector.ts`** — Hook TypeScript, który:
1. Sanityzuje dane wejściowe (usuwa bloki kodu, ciągi w cudzysłowach, wklejone bloki echo systemowego)
2. Skanuje oczyszczone dane wejściowe względem `keywords` (literalnych) i `patterns` (regex) z triggerów
3. Sprawdza wzorce informacyjne w oknie 60 znaków wokół każdego dopasowania
4. Stosuje zabezpieczenie wzmocnienia (tłumi, jeśli ten sam workflow został wyzwolony 2+ razy w ciągu 60 s)
5. Wstrzykuje `[OMA WORKFLOW: ...]` lub `[OMA PERSISTENT MODE: ...]` do kontekstu

**`persistent-mode.ts`** — Sprawdza aktywne pliki stanu w `.agents/state/` i wzmacnia wykonanie trwałych workflow.

**`hud.ts`** — Renderuje wskaźnik `[OMA]` w pasku stanu pokazujący: nazwę modelu, użycie kontekstu (kodowane kolorami: zielony/żółty/czerwony) i stan aktywnego workflow.

### skills/

Dowiązania symboliczne wskazujące na `.agents/skills/`. Dzięki temu umiejętności są widoczne dla IDE czytających z `.claude/skills/` przy zachowaniu `.agents/` jako jedynego źródła prawdy.

---

## .serena/memories/ — Stan runtime

Gdzie agenci zapisują postęp podczas sesji orkiestracji. Ten katalog jest obserwowany przez panele kontrolne dla aktualizacji w czasie rzeczywistym.

| Plik | Właściciel | Cel |
|------|-------|---------|
| `orchestrator-session.md` | Orkiestrator | Metadane sesji: ID, status, czas startu, bieżąca faza |
| `task-board.md` | Orkiestrator | Przypisania zadań: agent, zadanie, priorytet, status, zależności |
| `progress-{agent}.md` | Dany agent | Aktualizacje tura po turze: podjęte akcje, odczytane/zmodyfikowane pliki, bieżący status |
| `result-{agent}.md` | Dany agent | Końcowe wyjście: status zakończenia, podsumowanie, zmienione pliki, kryteria akceptacji |
| `session-metrics.md` | Orkiestrator | Zdarzenia Clarification Debt, progresja Quality Score |
| `archive/metrics-{date}.md` | System | Zarchiwizowane metryki sesji (retencja 30 dni) |

Ścieżki plików pamięci i nazwy narzędzi są konfigurowalne w `.agents/mcp.json` przez `memoryConfig`.

---

## Struktura repozytorium źródłowego oh-my-agent

Jeśli pracujesz nad samym oh-my-agent (a nie tylko go używasz), repozytorium jest monorepo:

```
oh-my-agent/
├── cli/                  ← Źródło narzędzia CLI (TypeScript, budowane z bun)
│   ├── src/              ← Kod źródłowy
│   ├── package.json
│   └── install.sh        ← Instalator bootstrap
├── web/                  ← Strona dokumentacji (Next.js)
│   └── content/
│       └── en/           ← Strony dokumentacji angielskiej
├── action/               ← GitHub Action do automatycznych aktualizacji skill
├── docs/                 ← Przetłumaczone README i specyfikacje
├── .agents/              ← EDYTOWALNY w repozytorium źródłowym (to JEST źródło)
├── .claude/              ← Integracja IDE
├── .serena/              ← Stan runtime deweloperskiego
├── CLAUDE.md             ← Instrukcje projektu dla Claude Code
└── package.json          ← Konfiguracja głównego workspace
```

W repozytorium źródłowym modyfikacje `.agents/` są dozwolone (to wyjątek SSOT dla samego repozytorium źródłowego). Reguły `.agents/` o niemodyfikowaniu tego katalogu dotyczą projektów konsumenckich, nie repozytorium oh-my-agent.

Polecenia deweloperskie:
- `bun run test` — Testy CLI (vitest)
- `bun run lint` — Lint
- `bun run build` — Build CLI
- Commity muszą przestrzegać formatu konwencjonalnych commitów (wymuszane przez commitlint)
