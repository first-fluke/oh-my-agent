---
title: Struktura projektu
description: "Mapa instalacji oh-my-agent przeznaczona dla czytelnika: SSOT w .agents/, przykładowe zasoby umiejętności, workflowy, definicje agentów przechowywane w repozytorium, stan runtime'u, warstwy integracji dostawców oraz układ repozytorium źródłowego."
---

# Struktura projektu {#project-structure}

Po instalacji oh-my-agent projekt zyskuje dwa podstawowe drzewa katalogów: `.agents/` (jedyne źródło prawdy, w tym magazyn koordynacji `.agents/state/memories/`) oraz warstwy integracji runtime'u (np. `.claude/`, `.cursor/`, `.codex/`). Jeśli jako dostawcę inteligencji kodu wybierzesz Serenę, może też istnieć opcjonalny katalog `.serena/` na potrzeby pamięci onboardingu Sereny. Ta strona wyjaśnia wspólne pliki oraz opcjonalne i generowane ścieżki, które mają znaczenie podczas diagnozowania problemów.

---

## Przykładowe drzewo katalogów {#representative-directory-tree}

Poniższe drzewo szczegółowo pokazuje współdzielone zasoby i przykładowe umiejętności domenowe. Bieżący katalog zawiera 33 katalogi umiejętności; pominięte umiejętności stosują ten sam wzorzec `SKILL.md` oraz opcjonalnych katalogów `resources/`, `variants/` lub katalogów właściwych dla danej umiejętności. Gdy wygenerowany albo opcjonalny plik jest nieobecny, za źródło prawdy uznawaj aktywne drzewo `.agents/`.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
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
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/: źródło prawdy {#.agents-the-source-of-truth}

To główny katalog. Znajduje się tu wszystko, czego potrzebują agenci. Jest to jedyny katalog, który ma znaczenie dla zachowania agentów. Wszystkie pozostałe katalogi są z niego wyprowadzane.

### oma-config.cue i oma-config.yaml {#oma-configcue-and-oma-configyaml}

**`oma-config.yaml`**: centralny plik konfiguracji zawierający:
- `language`: kod języka odpowiedzi (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: tekstowy format znacznika czasu (`ISO`, `US` lub `EU`; domyślnie `ISO`)
- `timezone`: identyfikator strefy czasowej IANA; pominięte wartości używają strefy czasowej systemu
- `model_preset`: aktywny klucz presetu modelu (`auto` domyślnie albo preset stały/niestandardowy)
- `providers`: dostawcy możliwości dla dokumentacji, sieci, inteligencji kodu i pamięci semantycznej
- `auto_update_cli`: sprawdzanie aktualizacji w tle (domyślnie `true`, wyłącz przez `false`)
- `telemetry`: zgoda na telemetrię dostawcy (domyślnie `false`)
- `mcp.devtools_browsers`: opcjonalna lista przeglądarek; brak wartości zachowuje istniejące wpisy
- `agents`: opcjonalne nadpisania per agent (tylko obiektowy `AgentSpec`)
- `models`: opcjonalne slugi modeli zdefiniowane przez użytkownika
- `custom_presets`: opcjonalne presety użytkownika z opcjonalnym `extends:`

### skills/ {#skills}

Tu znajdują się specjalistyczne umiejętności. Bieżący katalog zawiera 33 katalogi umiejętności oraz zasoby `_shared`; preset `all` buduje się na podstawie tego aktywnego drzewa.

**`_shared/`**: zasoby używane przez wszystkich agentów:
- `core/`: routing, ładowanie kontekstu, struktura promptów, protokół doprecyzowania, budżet kontekstu, ocena trudności, szablony rozumowania, zasady jakości, wykrywanie dostawcy, metryki sesji, wspólna checklista, wnioski i szablony kontraktów API
- `runtime/`: protokół pamięci, specyfikacja zdarzeń, kontrakt wyniku i protokoły wykonywania dla dostawców
- `conditional/`: pomiar wyniku jakości, śledzenie dziennika eksperymentów i protokół pętli eksploracji (ładowane tylko po wyzwoleniu)

**`oma-{skill}/`**: katalogi poszczególnych umiejętności. Każdy zawiera:
- `SKILL.md` (mediana około 2631 tokenów w bieżącym drzewie): warstwa 1 ładowana po routingu umiejętności. Tożsamość, routing i główne reguły.
- `resources/`: warstwa 2 ładowana na żądanie. Protokoły wykonywania, przykłady, checklisty, podręczniki błędów, stosy technologiczne, fragmenty i szablony.
- Niektóre umiejętności mają dodatkowe podkatalogi: `variants/` (ziarna backendu/mobile), wygenerowane referencje `stack/` z `/stack-set`, `reference/` (oma-design) oraz skrypty i konfiguracje właściwe dla umiejętności.

### workflows/ {#workflows}

21 plików Markdown definiujących zachowanie poleceń slash. Każdy plik zawiera:
- frontmatter YAML z `description`
- sekcję obowiązkowych reguł (język odpowiedzi, kolejność kroków, wymagane narzędzia MCP)
- instrukcje wykrywania dostawcy
- protokół wykonywania krok po kroku
- definicje bramek (dla workflowów trwałych)

Workflowy trwałe: `orchestrate.md`, `work.md`, `ultrawork.md` i `ralph.md`.
Workflowy nietrwałe obejmują `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` i `video.md`.

### agents/ {#agents}

12 definicji subagentów używanych przy uruchamianiu agentów przez narzędzie Task (Claude Code) lub CLI. Każdy plik definiuje:
- frontmatter: `name`, `description`, `skills` (którą umiejętność załadować)
- odwołanie do protokołu wykonywania
- szablon charter preflight (CHARTER_CHECK)
- podsumowanie architektury
- reguły domenowe (10 reguł)
- stwierdzenie: „Nigdy nie modyfikuj plików `.agents/`”

### plan-\{sessionId\}.json {#plan-sessionidjson}

Generowany przez workflow `/plan`. Zawiera uporządkowany podział zadania z przypisaniami agentów, priorytetami, zależnościami i kryteriami akceptacji. Jest używany przez `/orchestrate` i `/work`. Towarzyszący, czytelny dla człowieka tracker znajduje się w `docs/plans/work/{NNN}-{name}.md` (cykl życia określa pole `Status`). Trwałe referencje projektowe są przechowywane obok w `docs/plans/designs/{NNN}-{name}.md`.

### state/ {#state}

Aktywne pliki stanu workflowów trwałych. Te pliki JSON istnieją tylko, gdy trwa workflow. Ich usunięcie (albo powiedzenie „workflow done”) wyłącza workflow.

Podkatalog `state/memories/` jest kanonicznym magazynem pamięci koordynacji: przechowuje stan sesji orkiestratora, tablicę zadań, pliki postępu i wyników poszczególnych agentów, metryki sesji oraz telemetrię kosztów. Dashboardy obserwują tę ścieżkę, a CLI rozstrzyga ją jako pierwszą (starsze projekty przechodzą do starszej lokalizacji `.serena/memories/`). Zobacz [`.agents/state/memories/: stan runtime'u](#agentsstatememories-runtime-state) poniżej.

### results/ {#results}

Pliki wyników agentów. Ukończeni agenci tworzą je ze statusem (completed/failed), podsumowaniem, listą zmienionych plików i checklistą kryteriów akceptacji. Orkiestrator odczytuje je podczas zbierania wyników, a dashboardy używają ich do monitorowania.

### mcp.json {#mcpjson}

Konfiguracja serwerów MCP zawierająca:
- definicje serwerów (Serena itd.)
- konfigurację pamięci: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (nazwy narzędzi odczytu/zapisu/edycji)
- definicje grup narzędzi do zarządzania przez `/tools`


---

## .claude/: integracja z IDE {#.claude-ide-integration}

Ten katalog łączy oh-my-agent z Claude Code i innymi IDE.

### settings.json {#settingsjson}

Rejestruje hooki i uprawnienia Claude Code. Każdy wpis hooka zdarzenia korzysta teraz z kanonicznego ABI `oma hook run`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

Wpis `statusLine` nadal korzysta z bezpośredniej ścieżki `bun` (wyświetlanie na gorącej ścieżce, bez routingu przez `oma hook run`).

### hooks/ {#hooks}

Katalog `hooks/` dostawcy zawiera **wyłącznie pliki, które coś z tego katalogu wykonuje lub odczytuje w runtime**. Sam łańcuch handlerów (wykrywanie słów kluczowych, tryb trwały, wstrzykiwanie umiejętności, …) działa w procesie wewnątrz pliku binarnego `oma` przez `oma hook run` — pliki handlerów `.ts` są dołączane do CLI podczas budowania i NIE są materializowane w katalogach dostawców.

**`oma-hook.sh`**: skrypt opakowujący generowany przez `oma link`/`oma install`/`oma update`. Każde zdarzenie hooka dostawcy przechodzi przez ten plik. Kolejność rozstrzygania w runtime: `$OMA_BIN` (jawne nadpisanie) → `command -v oma` (PATH) → dobrze znane katalogi instalacji, takie jak `$HOME/.bun/bin` i `$HOME/.local/share/mise/shims` (agenci uruchamiani z GUI dziedziczą minimalny PATH) → `exit 0` (fail-open, agent nigdy nie jest blokowany). Skrypt nie zawiera danych zależnych od konkretnej maszyny, więc jest identyczny bajtowo u każdego dewelopera i można go bezpiecznie commitować. Przekazuje `"$@"` bez zmian, dzięki czemu argumenty `--vendor`, `--event` i `--matcher` docierają do `oma hook run`. Zawiera preambułę samodeduplikacji, która tłumi podwójne wywołanie, gdy ten sam event jest rejestrowany zarówno przez instalację projektową, jak i globalną.

**`hud.ts`**: renderuje wskaźnik `[OMA]` na pasku stanu, pokazując nazwę modelu, użycie kontekstu (kolory: zielony/żółty/czerwony) i stan aktywnego workflowu. Jest rejestrowany bezpośrednio pod `statusLine` (bez routingu przez `oma hook run`), aby zachować opóźnienie renderowania gorącej ścieżki. Jest materializowany tylko dla dostawców, których wariant rejestruje `statusLine` lub zdarzenie tylko dla HUD (np. claude, antigravity i qwen). Rozpoznaje dialekt dostawcy na podstawie własnej zainstalowanej ścieżki, więc kopia per dostawca ma znaczenie dla działania.

**`filter-test-output.sh`**: filtr powłoki, który skraca hałaśliwe wyjście runnera testów. Handler test-filter działający w procesie przepisuje wykryte polecenia testowe Basha tak, aby przekazywały dane przez `<hookDir>/filter-test-output.sh`; dlatego plik jest materializowany dla każdego dostawcy, którego wariant rejestruje `test-filter.ts` (wszyscy poza cursorem).

#### Gdzie faktycznie znajduje się logika handlerów {#where-the-handler-logic-actually-lives}

Źródła handlerów są SSOT w `.agents/hooks/core/` i działają w procesie przez `oma hook run`:

**`keyword-detector.ts`**: czysty handler (`run(input, ctx): HandlerResult | null`) do wykrywania słów kluczowych. Logika:
1. Czyści wejście (usuwa bloki kodu, ciągi w cudzysłowach i wklejone bloki echo systemu)
2. Skanuje oczyszczone wejście pod kątem wyzwalających `keywords` (literały) i `patterns` (regexy)
3. Sprawdza wzorce informacyjne w 60-znakowym oknie wokół każdego dopasowania
4. Stosuje strażnika wzmocnienia (wycisza, jeśli ten sam workflow uruchomił się co najmniej 2 razy w 60 s)
5. Zwraca wynik `context` wstrzykujący `[OMA WORKFLOW: ...]` lub `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`**: czysty handler (`run()`), który sprawdza aktywne pliki stanu w `.agents/state/` i wzmacnia wykonywanie trwałego workflowu. Jest wywoływany w procesie przez `oma hook run` dla zdarzeń `Stop`.

**`scm-guard.ts`**: czysty handler (`run()`) dla `PreToolUse` (narzędzia Bash/powłoki), który odmawia `git add` plików prawdopodobnie zawierających sekrety. Wymusza `forbidden_patterns` pomniejszone o `allowed_exceptions` z `.agents/skills/oma-scm/config/commit-config.yaml` (domyślne wartości wbudowane, gdy konfiguracja nie istnieje). W łańcuchu dla claude, codex, cursor, grok, kimi, kiro i qwen działa przed `test-filter`, a także w mostku opencode (`tool.execute.before` rzuca wyjątek blokujący) i w mostku pi (`tool_call` zwraca `{ block: true, reason }`); polecenie z prefiksem `OMA_SCM_ALLOW_SECRETS=1` omija strażnika po jawnym zatwierdzeniu użytkownika. Szerokie stagingowanie (`git add -A` / `git add .`) celowo nie jest blokowane — ta reguła zależy od zgody użytkownika, której hook nie może obserwować.

**`code-intelligence-guard.ts`**: czysty handler (`run()`) dla `PreToolUse`, który mechanicznie wymusza regułę „Code Search”. Dopóki rozstrzygnięta wartość `providers.code_intelligence` to `serena` (lub `gortex`), a `providers.code_intelligence_guard` nie jest `off`, odmawia użycia natywnych narzędzi wyszukiwania (`Grep`, `Glob` w Claude Code) oraz poleceń powłoki, których początkowy program to rekurencyjne wyszukiwanie kodu (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`), a uzasadnienie odmowy wskazuje zamiast nich narzędzie dostawcy (`search_for_pattern`, `find_file`, `find_symbol`). Nierekurencyjny `grep` (filtry potokowe, pojedyncze pliki), `find` bez predykatu nazwy oraz odczyty nigdy nie są blokowane. Zarejestrowany tuż po `scm-guard` dla claude, codex, cursor, grok, kimi, kiro i qwen; instalator scala matchery łańcucha, więc wpis `PreToolUse` dla Claude przyjmuje postać `Bash|Grep|Glob`. Polecenie powłoki zawierające `OMA_CI_ALLOW_NATIVE=1` nadal omija strażnika, ale tylko jako furtka operatora dla wyszukiwań zasobów spoza projektu lub ignorowanych ścieżek, których strażnik nie rozpoznał. Uzasadnienie odmowy nie wymienia tego prefiksu, a sam prefiks nie jest rozwiązaniem zapasowym dla kodu źródłowego projektu.

**`triggers.json`**: statycznie wbudowane w plik binarny `oma` podczas budowania mapowanie słów kluczowych na workflowy (źródło: `.agents/hooks/core/triggers.json`). Definiuje:
- `workflows`: mapę nazwy workflowu na `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` to frazy dosłowne; `patterns` to surowe ciągi regexów (kompilowane z flagami `iu`). `explicit` (tylko workflowy trwałe) wymienia słowa kluczowe uznawane za jawne wywołanie — tylko one aktywują tryb trwały; każde inne dopasowanie jest wstrzykiwane jako sugestia.
- `informationalPatterns`: frazy wskazujące pytania (odfiltrowywane z automatycznego wykrywania)
- `excludedWorkflows`: workflowy wymagające jawnego wywołania `/command`

Sekcje językowe w `keywords`, `patterns` i `informationalPatterns` stosują następującą konwencję:
- `*`: uniwersalne/angielskie.
- `en`: funkcjonalnie równoważne z `*`.
- `ko`/`ja`/`zh`/itd.: sformułowania specyficzne dla języka.

Każda sekcja jest zawsze ładowana; ustawienie `language` w `.agents/oma-config.yaml` steruje wyłącznie językiem odpowiedzi. Granice słów zależą od samego słowa kluczowego: słowa kluczowe ASCII dopasowują się jako całe słowa, a słowa kluczowe zawierające tekst spoza ASCII — jako podciągi.

#### Materializacja per dostawca: przed → po {#per-vendor-materialization-before-after}

Starsze instalacje kopiowały **cały** zestaw `.agents/hooks/core/` (około 20 plików) do katalogu hooków każdego dostawcy, mimo że dispatch w procesie sprawiał, iż większość z nich była martwymi plikami:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Teraz instalator wyprowadza białą listę z JSON-a wariantu dostawcy (`requiredVariantScripts` w `cli/platform/hooks-composer.ts`) i materializuje tylko to, co dany dostawca wykonuje lub odczytuje:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Dostawca | Materializowane pliki | Dlaczego |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, bez statusLine |
| cursor | `oma-hook.sh` | bez statusLine i bez test-filter |
| commandcode | `oma-hook.sh` | tylko Stop — Command Code nie ma zdarzenia promptu, a PreToolUse nie może przepisywać wejścia ([referencja hooków](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | brak (projekt) — `hud.ts` + hooki podstawowe kopiowane do `~/.gemini/antigravity-cli/hooks/` | agy odczytuje ustawienia tylko z HOME, a hooki workspace z `.agents/hooks.json` uruchamiają handlery bezpośrednio z `.agents/hooks/core/`; katalog projektowy `.gemini/antigravity-cli/` nigdy nie jest ładowany (flaga wariantu `homeOnly`) |
| pi | pełny zestaw `.agents/hooks/core/` w `.pi/extensions/oma/` | mostek pi uruchamia handlery jako podprocesy zamiast używać hooków ustawień |

Katalog docelowy jest czyszczony przed kopiowaniem, więc ponowne uruchomienie `oma install`/`oma update`/`oma link` w starszej instalacji automatycznie usuwa nieaktualne pliki z pełnej kopii.

#### Izolowane debugowanie łańcucha handlerów {#debugging-a-handler-chain-in-isolation}

Dowolny łańcuch handlerów możesz uruchomić z prawdziwym payloadem bez wywoływania aktywnej sesji agenta:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` zawsze kończy się kodem 0 (fail-open). Pusty stdout oznacza, że łańcuch nic nie zrobił dla tego zdarzenia. Gdy handler zadziała, JSON w dialekcie dostawcy (albo zwykły tekst dla promptów kiro) jest zapisywany na stdout.

#### Migracja z instalacji sprzed 019 {#migration-from-pre-019-installs}

Istniejące instalacje zawierające stare wpisy `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` są automatycznie migrowane przy następnym uruchomieniu `oma install`, `oma update` lub `oma link`. Instalator stosuje zamianę opartą na markerach: zastępuje tylko grupy hooków zarządzane przez OMA (rozpoznane po wzorcach `name`/`command`); grupy hooków dodane samodzielnie pozostawia w pierwotnej kolejności. Ścieżka `statusLine`/HUD pozostaje bez zmian. Mostek pi działający w procesie nie jest zmieniany. Zobacz `cli/commands/hook/command.ts` dla implementacji routera (wewnętrznie nazywanej „design 019”) oraz `cli/platform/hooks-composer/` dla logiki materializacji per dostawca.

### skills/ {#skills-1}

Dowiązania symboliczne prowadzące do `.agents/skills/`. Dzięki temu umiejętności są widoczne dla IDE odczytujących `.claude/skills/`, a `.agents/` pozostaje jedynym źródłem prawdy.

### agents/ {#agents-1}

Definicje subagentów sformatowane dla narzędzia Agent Claude Code. Odwołują się do plików umiejętności i zawierają szablon CHARTER_CHECK.


---

## .agents/state/memories/: stan runtime'u {#agentsstatememories-runtime-state}

Tu agenci zapisują postęp podczas sesji orkiestracji. To kanoniczny magazyn pamięci koordynacji; CLI rozstrzyga tę ścieżkę jako pierwszą i przechodzi do starszej lokalizacji `.serena/memories/` w projektach utworzonych przed zmianą. Pliki sesji i tablicy zadań zawierają identyfikator sesji; pliki postępu i wyników zawierają identyfikatory agenta, zadania, uruchomienia i sesji. Dashboardy obserwują ten katalog w czasie rzeczywistym.

| Plik | Właściciel | Cel |
|------|-------|---------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Metadane sesji: ID, status, czas rozpoczęcia, bieżąca faza |
| `task-board-{sessionId}.md` | Orchestrator | Przydziały zadań: agent, zadanie, priorytet, status, zależności |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | To uruchomienie | Aktualizacje tury: podjęte działania, przeczytane/zmodyfikowane pliki, bieżący status |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | To uruchomienie | Końcowy wynik: status ukończenia, podsumowanie, zmienione pliki, checklista |
| `session-metrics.md` | Orchestrator | Istotne korekty i dowody z eksperymentów |
| `experiment-ledger.md` | Orchestrator/QA | Wiersze dowodów dla rzeczywistych eksperymentów |
| `session-work.md` | Workflow work | Stan sesji właściwy dla workflowu work |
| `session-ultrawork.md` | Workflow ultrawork | Śledzenie faz workflowu ultrawork |
| `session-cost-{sessionId}.md` | System | Telemetria kosztu uruchomień dla sesji |
| `archive/metrics-{date}.md` | System | Zarchiwizowane metryki sesji (retencja 30 dni) |

Ścieżki plików pamięci i nazwy narzędzi można konfigurować w `.agents/mcp.json` za pomocą `memoryConfig`.

Własne pamięci onboardingu Sereny (`code_style.md`, `project_purpose.md` i podobne pliki wiedzy) pozostają w `.serena/memories/` i są oddzielone od tych artefaktów koordynacji.

---

## Struktura repozytorium źródłowego oh-my-agent {#oh-my-agent-source-repository-structure}

Jeśli pracujesz nad samym oh-my-agent (a nie tylko go używasz), repozytorium jest monorepo:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

W repozytorium źródłowym modyfikowanie `.agents/` jest dozwolone (to wyjątek SSOT dla samego repozytorium). Reguły `.agents/` zakazujące modyfikacji tego katalogu dotyczą projektów użytkowników, a nie repozytorium oh-my-agent.

Polecenia deweloperskie (uruchamiane z katalogu głównego repozytorium):
- `bun run test`: testy CLI (vitest)
- `bun run lint`: lintowanie workspace'ów CLI i web
- `bun run build`: budowanie CLI
- `bun run typecheck`: sprawdzanie typów CLI i web
- Commity muszą korzystać z formatu conventional commit (wymuszane przez commitlint)
