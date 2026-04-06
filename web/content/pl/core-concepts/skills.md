---
title: Umiejętności (Skills)
description: Kompletny przewodnik po dwuwarstwowej architekturze umiejętności oh-my-agent — projekt SKILL.md, ładowanie zasobów na żądanie, wszystkie zasoby współdzielone wyjaśnione, protokoły warunkowe, typy zasobów per-skill, protokoły wykonawcze dostawców, matematyka oszczędności tokenów i mechanika routingu umiejętności.
---

# Umiejętności (Skills)

Umiejętności to ustrukturyzowane pakiety wiedzy, które dają każdemu agentowi kompetencje w jego domenie. To nie są zwykłe prompty — zawierają protokoły wykonawcze, referencje stosu technologicznego, szablony kodu, podręczniki obsługi błędów, listy kontrolne jakości i przykłady few-shot, zorganizowane w dwuwarstwowej architekturze zaprojektowanej pod kątem efektywności tokenów.

---

## Dwuwarstwowy projekt

### Warstwa 1: SKILL.md (~800 bajtów, zawsze załadowana)

Każda umiejętność posiada plik `SKILL.md` w swoim katalogu głównym. Jest on zawsze załadowany do okna kontekstowego gdy umiejętność jest przywoływana. Zawiera:

- **Frontmatter YAML** z polami `name` i `description` (używane do routingu i wyświetlania)
- **Kiedy używać / Kiedy NIE używać** — jawne warunki aktywacji
- **Podstawowe reguły** — 5-15 najważniejszych ograniczeń dla domeny
- **Przegląd architektury** — jak kod powinien być strukturyzowany
- **Lista bibliotek** — zatwierdzone zależności i ich przeznaczenie
- **Referencje** — wskaźniki do zasobów Warstwy 2 (nigdy nie ładowane automatycznie)

Przykład frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Pole description jest kluczowe — zawiera słowa kluczowe routingu, których system routingu umiejętności używa do dopasowywania zadań do agentów.

### Warstwa 2: resources/ (ładowane na żądanie)

Katalog `resources/` zawiera głęboką wiedzę wykonawczą. Te pliki są ładowane tylko gdy:
1. Agent jest jawnie wywołany (przez `/command` lub pole skills agenta)
2. Konkretny zasób jest potrzebny dla bieżącego typu i trudności zadania

To ładowanie na żądanie jest regulowane przez przewodnik ładowania kontekstu (`.agents/skills/_shared/core/context-loading.md`), który mapuje typy zadań na wymagane zasoby per agent.

---

## Przykład struktury plików

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Warstwa 1: zawsze załadowana (~800 bajtów)
└── resources/
    ├── execution-protocol.md         ← Warstwa 2: krokowy workflow
    ├── tech-stack.md                 ← Warstwa 2: szczegółowe specyfikacje technologii
    ├── tailwind-rules.md             ← Warstwa 2: konwencje Tailwind
    ├── component-template.tsx        ← Warstwa 2: szablon komponentu React
    ├── snippets.md                   ← Warstwa 2: gotowe wzorce kodu
    ├── error-playbook.md             ← Warstwa 2: procedury odzyskiwania po błędach
    ├── checklist.md                  ← Warstwa 2: lista kontrolna weryfikacji jakości
    └── examples/                     ← Warstwa 2: przykłady few-shot input/output
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              ← Specyficzne dla domeny (zapytania ORM, N+1, transakcje)
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             ← Generowane przez /stack-set (specyficzne dla języka)
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
├── reference/                         ← Głęboki materiał referencyjny
│   ├── typography.md
│   ├── color-and-contrast.md
│   ├── spatial-design.md
│   ├── motion-design.md
│   ├── responsive-design.md
│   ├── component-patterns.md
│   ├── accessibility.md
│   └── shader-and-3d.md
└── examples/
    ├── design-context-example.md
    └── landing-page-prompt.md
```

---

## Typy zasobów per-skill

| Typ zasobu | Wzorzec nazwy pliku | Cel | Kiedy ładowany |
|--------------|-----------------|---------|-------------|
| **Protokół wykonawczy** | `execution-protocol.md` | Krokowy workflow: Analiza -> Plan -> Implementacja -> Weryfikacja | Zawsze (z SKILL.md) |
| **Stos technologiczny** | `tech-stack.md` | Szczegółowe specyfikacje technologii, wersje, konfiguracja | Zadania złożone |
| **Podręcznik błędów** | `error-playbook.md` | Procedury odzyskiwania z eskalacją "3 strikes" | Tylko przy błędzie |
| **Lista kontrolna** | `checklist.md` | Weryfikacja jakości specyficzna dla domeny | Na kroku Weryfikacji |
| **Fragmenty kodu** | `snippets.md` | Gotowe wzorce kodu do skopiowania | Zadania średnie/złożone |
| **Przykłady** | `examples.md` lub `examples/` | Przykłady few-shot input/output dla LLM | Zadania średnie/złożone |
| **Warianty** | katalog `stack/` | Referencje specyficzne dla języka/frameworka (generowane przez `/stack-set`) | Gdy stack istnieje |
| **Szablony** | `component-template.tsx`, `screen-template.dart` | Szablony plików boilerplate | Przy tworzeniu komponentu |
| **Referencja domenowa** | `orm-reference.md`, `anti-patterns.md`, itd. | Głęboka wiedza domenowa dla konkretnych podzadań | Specyficzne dla typu zadania |

---

## Zasoby współdzielone (_shared/)

Wszyscy agenci dzielą wspólne fundamenty z `.agents/skills/_shared/`. Są zorganizowane w trzy kategorie:

### Zasoby podstawowe (`.agents/skills/_shared/core/`)

| Zasób | Cel | Kiedy ładowany |
|----------|---------|-------------|
| **`skill-routing.md`** | Mapuje słowa kluczowe zadań na odpowiedniego agenta. Zawiera tabelę Mapowania Skill-Agent, wzorce routingu złożonych żądań, reguły zależności między agentami, reguły eskalacji i przewodnik limitów tur. | Przywoływany przez orkiestratora i umiejętności koordynacji |
| **`context-loading.md`** | Definiuje jakie zasoby ładować dla jakiego typu i trudności zadania. Zawiera tabele mapowania typ-zadania-na-zasób per agent i wyzwalacze warunkowego ładowania protokołów. | Na starcie workflow (Krok 0 / Faza 0) |
| **`prompt-structure.md`** | Definiuje cztery elementy, które musi zawierać każdy prompt zadania: Cel, Kontekst, Ograniczenia, Gotowe gdy. Zawiera szablony dla agentów PM, implementacji i QA. Wymienia anty-wzorce (rozpoczynanie tylko od Celu). | Przywoływany przez agenta PM i wszystkie workflow |
| **`clarification-protocol.md`** | Definiuje poziomy niepewności (LOW/MEDIUM/HIGH) z akcjami dla każdego. Zawiera wyzwalacze niepewności, szablony eskalacji, wymagane elementy weryfikacji per typ agenta i zachowanie w trybie subagenta. | Gdy wymagania są niejednoznaczne |
| **`context-budget.md`** | Zarządzanie budżetem tokenów. Definiuje strategię czytania plików (używaj `find_symbol` zamiast `read_file`), budżety ładowania zasobów per tier modelu (Flash: ~3100 tokenów / Pro: ~5000 tokenów), obsługę dużych plików i symptomy przepełnienia kontekstu. | Na starcie workflow |
| **`difficulty-guide.md`** | Kryteria klasyfikacji zadań jako Proste/Średnie/Złożone. Definiuje oczekiwane liczby tur, rozgałęzianie protokołów (Fast Track / Standard / Extended) i odzyskiwanie po błędnej ocenie. | Na starcie zadania (Krok 0) |
| **`reasoning-templates.md`** | Ustrukturyzowane szablony wnioskowania do wypełnienia dla typowych wzorców decyzyjnych (np. szablon Decyzji o eksploracji #6 używany przez Pętlę eksploracji). | Podczas złożonych decyzji |
| **`quality-principles.md`** | 4 uniwersalne zasady jakości stosowane przez wszystkich agentów. | Na starcie workflow dla workflow zorientowanych na jakość (ultrawork) |
| **`vendor-detection.md`** | Protokół wykrywania bieżącego środowiska wykonawczego (Claude Code, Codex CLI, Gemini CLI, Antigravity, CLI Fallback). Używa sprawdzeń znaczników: narzędzie Agent = Claude Code, apply_patch = Codex, składnia @ = Gemini. | Na starcie workflow |
| **`session-metrics.md`** | Ocenianie Clarification Debt (CD) i śledzenie metryk sesji. Definiuje typy zdarzeń (clarify +10, correct +25, redo +40), progi (CD >= 50 = RCA, CD >= 80 = pauza) i punkty integracji. | Podczas sesji orkiestracji |
| **`common-checklist.md`** | Uniwersalna lista kontrolna jakości stosowana przy końcowej weryfikacji zadań złożonych (oprócz list kontrolnych specyficznych dla agenta). | Krok weryfikacji zadań złożonych |
| **`lessons-learned.md`** | Repozytorium wniosków z poprzednich sesji, automatycznie generowane z naruszeń Clarification Debt i odrzuconych eksperymentów. Zorganizowane według sekcji domenowych. | Przywoływane po błędach i na końcu sesji |
| **`api-contracts/`** | Katalog z szablonem kontraktu API i wygenerowanymi kontraktami. `template.md` definiuje format per-endpoint (metoda, ścieżka, schematy żądania/odpowiedzi, auth, błędy). | Gdy planowana jest praca międzydomenowa |

### Zasoby runtime (`.agents/skills/_shared/runtime/`)

| Zasób | Cel |
|----------|---------|
| **`memory-protocol.md`** | Format pliku pamięci i operacje dla subagentów CLI. Definiuje protokoły Na Starcie, Podczas Wykonania i Po Zakończeniu używając konfigurowalnych narzędzi pamięci (read/write/edit). Zawiera rozszerzenie śledzenia eksperymentów. |
| **`execution-protocols/claude.md`** | Wzorce wykonawcze specyficzne dla Claude Code. Wstrzykiwane przez `oma agent:spawn` gdy dostawcą jest claude. |
| **`execution-protocols/gemini.md`** | Wzorce wykonawcze specyficzne dla Gemini CLI. |
| **`execution-protocols/codex.md`** | Wzorce wykonawcze specyficzne dla Codex CLI. |
| **`execution-protocols/qwen.md`** | Wzorce wykonawcze specyficzne dla Qwen CLI. |

Protokoły wykonawcze specyficzne dla dostawcy są wstrzykiwane automatycznie przez `oma agent:spawn` — agenci nie muszą ładować ich ręcznie.

### Zasoby warunkowe (`.agents/skills/_shared/conditional/`)

Ładowane tylko gdy konkretne warunki są spełnione podczas wykonania:

| Zasób | Warunek wyzwolenia | Ładowany przez | Przybliżone tokeny |
|----------|-------------------|-----------|----------------|
| **`quality-score.md`** | Faza VERIFY lub SHIP rozpoczyna się w workflow obsługującym pomiar jakości | Orkiestrator (przekazuje do promptu agenta QA) | ~250 |
| **`experiment-ledger.md`** | Pierwszy eksperyment jest rejestrowany po ustaleniu bazowej linii IMPL | Orkiestrator (inline, po pomiarze bazowej linii) | ~250 |
| **`exploration-loop.md`** | Ta sama bramka zawodzi dwukrotnie na tym samym problemie | Orkiestrator (inline, przed uruchomieniem agentów hipotezowych) | ~250 |

Wpływ na budżet: około 750 tokenów łącznie jeśli wszystkie 3 zostaną załadowane. Ponieważ ładowanie jest warunkowe, typowe sesje ładują 1-2 z nich. Budżet flash-tier pozostaje w ramach przydziału ~3100 tokenów.

---

## Jak umiejętności są routowane przez skill-routing.md

Mapa routingu umiejętności definiuje jak zadania są dopasowywane do agentów:

### Prosty routing (jedna domena)

Prompt zawierający "Build a login form with Tailwind CSS" dopasowuje słowa kluczowe `UI`, `component`, `form`, `Tailwind` i kieruje do **oma-frontend**.

### Routing złożonych żądań

Żądania wielodomenowe podążają za ustalonymi kolejnościami wykonania:

| Wzorzec żądania | Kolejność wykonania |
|----------------|----------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) równolegle -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) równolegle -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> odpowiedni agenci -> oma-qa |
| "Do everything automatically" | oma-orchestrator (wewnętrznie: oma-pm -> agenci -> oma-qa) |

### Reguły zależności między agentami

**Mogą działać równolegle (bez zależności):**
- oma-backend + oma-frontend (gdy kontrakt API jest wstępnie zdefiniowany)
- oma-backend + oma-mobile (gdy kontrakt API jest wstępnie zdefiniowany)
- oma-frontend + oma-mobile (niezależne od siebie)

**Muszą działać sekwencyjnie:**
- oma-brainstorm -> oma-pm (projekt przed planowaniem)
- oma-pm -> wszyscy inni agenci (planowanie najpierw)
- agent implementacyjny -> oma-qa (przegląd po implementacji)
- oma-backend -> oma-frontend/oma-mobile (gdy brak wstępnie zdefiniowanego kontraktu API)

**QA jest zawsze ostatni**, chyba że użytkownik prosi o przegląd tylko konkretnych plików.

---

## Matematyka oszczędności tokenów

Rozważmy sesję orkiestracji z 5 agentami (pm, backend, frontend, mobile, qa):

**Bez progresywnego ujawniania:**
- Każdy agent ładuje wszystkie zasoby: ~4000 tokenów na agenta
- Łącznie: 5 x 4000 = 20 000 tokenów zużytych przed jakąkolwiek pracą

**Z progresywnym ujawnianiem:**
- Tylko Warstwa 1 dla wszystkich agentów: 5 x 800 = 4000 tokenów
- Warstwa 2 ładowana tylko dla aktywnych agentów (zazwyczaj 1-2 na raz): +1500 tokenów
- Łącznie: ~5500 tokenów

**Oszczędność: około 72-75%**

Na modelach flash-tier (kontekst 128K) to różnica między posiadaniem 108K tokenów dostępnych na pracę a 125K tokenów — znacząca rezerwa dla złożonych zadań.

---

## Ładowanie zasobów według trudności zadania

Przewodnik trudności klasyfikuje zadania na trzy poziomy, które określają ile Warstwy 2 jest ładowane:

### Proste (oczekiwane 3-5 tur)

Zmiana jednego pliku, jasne wymagania, powtarzanie istniejących wzorców.

Ładuje: tylko `execution-protocol.md`. Pomiń analizę, przejdź bezpośrednio do implementacji z minimalną listą kontrolną.

### Średnie (oczekiwane 8-15 tur)

2-3 zmiany plików, pewne decyzje projektowe potrzebne, stosowanie wzorców do nowych domen.

Ładuje: `execution-protocol.md` + `examples.md`. Standardowy protokół z krótką analizą i pełną weryfikacją.

### Złożone (oczekiwane 15-25 tur)

4+ zmian plików, wymagane decyzje architektoniczne, wprowadzanie nowych wzorców, zależności od innych agentów.

Ładuje: `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. Rozszerzony protokół z punktami kontrolnymi, zapisywaniem postępu w trakcie wykonania i pełną weryfikacją włącznie z `common-checklist.md`.

---

## Mapy ładowania kontekstu (per agent)

Przewodnik ładowania kontekstu dostarcza szczegółowe mapowania typ-zadania-na-zasób. Oto kluczowe mapowania:

### Agent backend

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Tworzenie CRUD API | stack/snippets.md (route, schema, model, test) |
| Uwierzytelnianie | stack/snippets.md (JWT, password) + stack/tech-stack.md |
| Migracja DB | stack/snippets.md (migration) |
| Optymalizacja wydajności | examples.md (przykład N+1) |
| Modyfikacja istniejącego kodu | examples.md + Serena MCP |

### Agent frontend

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Tworzenie komponentu | snippets.md + component-template.tsx |
| Implementacja formularza | snippets.md (form + Zod) |
| Integracja API | snippets.md (TanStack Query) |
| Stylowanie | tailwind-rules.md |
| Układ strony | snippets.md (grid) + examples.md |

### Agent design

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Tworzenie systemu projektowego | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Projekt strony landing page | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
| Audyt projektowy | checklist.md + anti-patterns.md |
| Eksport tokenów projektowych | design-tokens.md |
| Efekty 3D / shader | reference/shader-and-3d.md + reference/motion-design.md |
| Przegląd dostępności | reference/accessibility.md + checklist.md |

### Agent QA

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Przegląd bezpieczeństwa | checklist.md (sekcja Security) |
| Przegląd wydajności | checklist.md (sekcja Performance) |
| Przegląd dostępności | checklist.md (sekcja Accessibility) |
| Pełny audyt | checklist.md (pełny) + self-check.md |
| Ocena jakości | quality-score.md (warunkowy) |

---

## Kompozycja promptu orkiestratora

Gdy orkiestrator komponuje prompty dla subagentów, zawiera tylko zasoby istotne dla zadania:

1. Sekcja Core Rules z SKILL.md agenta
2. `execution-protocol.md`
3. Zasoby pasujące do konkretnego typu zadania (z powyższych map)
4. `error-playbook.md` (zawsze dołączany — odzyskiwanie jest kluczowe)
5. Protokół pamięci Serena (tryb CLI)

Ta celowana kompozycja unika ładowania niepotrzebnych zasobów, maksymalizując dostępny kontekst subagenta na rzeczywistą pracę.
