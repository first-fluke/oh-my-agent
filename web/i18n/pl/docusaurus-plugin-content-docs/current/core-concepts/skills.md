---
title: Umiejętności
description: "Pełny przewodnik po dwuwarstwowej architekturze OMA obejmującej 33 umiejętności: routing SKILL.md, zasoby ładowane na żądanie, protokoły współdzielone i warunkowe, wykonywanie przez dostawców, pomiary tokenów oraz mechanikę routingu."
---

# Umiejętności {#skills}

Umiejętności to uporządkowane pakiety wiedzy, które dostarczają roli dispatchu wskazówek z jej domeny. Zawierają protokoły wykonywania, referencje stosu technologicznego, szablony kodu, podręczniki błędów, checklisty jakości i przykłady, jeśli dana umiejętność je udostępnia. Są zorganizowane w dwuwarstwowej architekturze zaprojektowanej pod kątem oszczędzania tokenów.

---

## Architektura dwuwarstwowa {#the-two-layer-design}

### Warstwa 1: SKILL.md (ładowana po routingu umiejętności) {#layer-1-skillmd-loaded-when-the-skill-is-routed}

Każda umiejętność ma w katalogu głównym plik `SKILL.md`. Trafia on do okna kontekstu po skierowaniu do niego umiejętności — hook injectora przekazuje **referencję ścieżki**, a nie treść, więc nieroutowana umiejętność nie kosztuje nic poza swoim `description`. Plik zawiera:

- **Frontmatter YAML** z `name` i `description` (używanymi do routingu i wyświetlania)
- **When to use / When NOT to use**: jawne warunki aktywacji
- **Core rules**: 5–15 najważniejszych ograniczeń dla domeny
- **Przegląd architektury**: jak należy strukturyzować kod
- **Lista bibliotek**: zatwierdzone zależności i ich przeznaczenie
- **Referencje**: odnośniki do zasobów warstwy 2 (nigdy nie są ładowane automatycznie)

Przykładowy frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Pole description ma kluczowe znaczenie, ponieważ zawiera słowa kluczowe routingu używane przez system routingu umiejętności do dopasowywania zadań do agentów.

### Warstwa 2: resources/ (ładowana na żądanie) {#layer-2-resources-loaded-on-demand}

Katalog `resources/` zawiera pogłębioną wiedzę o wykonywaniu. Pliki te są ładowane tylko wtedy, gdy:
1. Host lub workflow wybrał umiejętność (np. przez natywne dopasowanie umiejętności albo jawne polecenie)
2. Bieżące zadanie spełnia warunek ładowania referencji

To ładowanie na żądanie podlega przewodnikowi ładowania kontekstu (`.agents/skills/_shared/core/context-loading.md`), który odróżnia instrukcje punktu wejścia od referencji wybieranych na podstawie zadania.

---

## Przykład struktury plików {#file-structure-example}

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

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
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Typy zasobów per umiejętność {#per-skill-resource-types}

| Typ zasobu | Wzorzec nazwy pliku | Przeznaczenie | Kiedy ładowany |
|--------------|---------------------|-------------|-------------|
| **Protokół wykonywania** | `execution-protocol.md` | Workflow krok po kroku: Analyze -> Plan -> Implement -> Verify | Wybrana operacja wymaga szczegółów swojego polecenia lub kontraktu |
| **Stos technologiczny** | `tech-stack.md` | Szczegółowe specyfikacje technologii, wersje i konfiguracja | Wybrany framework lub decyzja dotycząca stosu |
| **Podręcznik błędów** | `error-playbook.md` | Procedury odzyskiwania z eskalacją „3 strikes” | Tylko po błędzie |
| **Checklista** | `checklist.md` | Weryfikacja jakości właściwa dla domeny | Na etapie Verify |
| **Snippety** | `snippets.md` | Gotowe do skopiowania wzorce kodu | Nieznana implementacja lub nieznany kształt wyniku |
| **Przykłady** | `examples.md` lub `examples/` | Przykłady wejścia/wyjścia few-shot dla LLM | Nieznana implementacja lub nieznany kształt wyniku |
| **Warianty** | katalog `variants/` | Referencje właściwe dla języka/frameworka. Backend dostarcza ziarna `node`, `python` i `rust`; mobile dostarcza schemat i może otrzymać wygenerowane referencje platformowe. | Gdy istnieje pasujący stos |
| **Szablony** | `component-template.tsx`, `screen-template.dart` | Szablony plików boilerplate | Przy tworzeniu komponentu |
| **Referencja domenowa** | `orm-reference.md`, `anti-patterns.md` itd. | Pogłębiona wiedza domenowa dla konkretnych podzadań | Zależnie od typu zadania |

---

## Zasoby współdzielone (_shared/) {#shared-resources-shared}

Wszyscy agenci współdzielą podstawy z `.agents/skills/_shared/`. Są one uporządkowane w trzech kategoriach:

### Zasoby podstawowe (`.agents/skills/_shared/core/`) {#core-resources-agents-skills-shared-core}

| Zasób | Przeznaczenie | Kiedy ładowany |
|----------|---------|-------------|
| **`skill-routing.md`** | Kieruje według wyniku zadania, właściciela i rzeczywistych zależności; bez obowiązkowego łańcucha agentów ani limitu tur. | Referencja dla umiejętności orkiestratora i koordynacji |
| **`context-loading.md`** | Właścicielski punkt wejścia, referencje warunkowe i granice ładowania w runtime. | Przy komponowaniu kontekstu |
| **`prompt-structure.md`** | Wskazuje, co zawrzeć przy przekazaniu nieznanego zadania: cel, kontekst, rzeczywiste ograniczenia i dowody akceptacji; bez obowiązkowego szablonu dla zadań bezpośrednich. | Referencja dla agenta PM i wszystkich workflowów |
| **`clarification-protocol.md`** | Rozstrzyga rutynowe szczegóły na podstawie kontekstu i pyta tylko o istotne brakujące informacje lub autoryzację. | Gdy wymagania są niejednoznaczne |
| **`context-budget.md`** | Szacunki rozmiaru plików, pomiar rzeczywistego promptu, zawężone odczyty i checkpointy. | Długie zadania lub diagnozowanie narzutu kontekstu |
| **`difficulty-guide.md`** | Dobiera głębokość planowania i rezultaty na podstawie zależności i potrzeb weryfikacji. | Gdy dekompozycja wymaga oszacowania trudności |
| **`quality-principles.md`** | Wskazówki dotyczące zakresu, łatwości utrzymania, dowodów i proporcjonalnej weryfikacji. | Na początku workflowów skupionych na jakości (ultrawork) |
| **`vendor-detection.md`** | Protokół wykrywania bieżącego środowiska runtime (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen i fallback CLI). Używa znaczników hosta i skonfigurowanego stanu dostawcy. | Na początku workflowu |
| **`session-metrics.md`** | Opcjonalne dowody sesji, bez punktacji karnej rozmowy ani ewaluatora. | Zlecona retrospektywa lub istotna korekta |
| **`common-checklist.md`** | Stosowne kontrole międzydomenowe; bez globalnych limitów liczby wierszy ani ogólnego wymogu catch. | Przegląd międzydomenowy, gdy jest to istotne |
| **`lessons-learned.md`** | Utrwalaj i stosuj wnioski poparte dowodami, z warunkami wersji/wyzwalacza; bez automatycznego progu RCA. | Po błędach i na końcu sesji |
| **`api-contracts/`** | Opcjonalny szablon kontraktu. Używaj ponownie schematów projektu; wygenerowane kontrakty znajdują się poza źródłem umiejętności. | Gdy planowana jest praca na granicy |

### Zasoby runtime (`.agents/skills/_shared/runtime/`) {#runtime-resources-agents-skills-shared-runtime}

| Zasób | Przeznaczenie |
|----------|---------|
| **`memory-protocol.md`** | Format i operacje plików pamięci dla subagentów CLI. Definiuje protokoły On Start, During Execution i On Completion z konfigurowalnymi narzędziami pamięci (read/write/edit). Obejmuje rozszerzenie śledzenia eksperymentów. |
| **`execution-protocols/claude.md`** | Wzorce wykonywania właściwe dla Claude Code. Wstrzykiwane przez `oma agent spawn`, gdy dostawcą jest claude. |
| **`execution-protocols/antigravity.md`** | Wzorce wykonywania CLI Antigravity (`agy`). |
| **`execution-protocols/codex.md`** | Wzorce wykonywania właściwe dla Codex CLI. |
| **`execution-protocols/commandcode.md`** | Wzorce wykonywania CommandCode. |
| **`execution-protocols/grok.md`** | Wzorce wykonywania Grok. |
| **`execution-protocols/kimi.md`** | Wzorce wykonywania Kimi Code. |
| **`execution-protocols/kiro.md`** | Wzorce wykonywania Kiro. |
| **`execution-protocols/opencode.md`** | Wzorce wykonywania rozszerzeń OpenCode. |
| **`execution-protocols/pi.md`** | Wzorce wykonywania rozszerzeń pi. |
| **`execution-protocols/qwen.md`** | Wzorce wykonywania właściwe dla Qwen CLI. |

Protokoły wykonywania właściwe dla dostawcy są automatycznie wstrzykiwane agentom uruchamianym przez CLI przez `oma agent spawn`. Natywni subagenci korzystają z reguł integracji wybranego dostawcy.

### Zasoby warunkowe (`.agents/skills/_shared/conditional/`) {#conditional-resources-agents-skills-shared-conditional}

Są one ładowane tylko wtedy, gdy w trakcie wykonywania spełnione są określone warunki:

| Zasób | Warunek wyzwalający | Ładowany przez |
|----------|-----------------|-----------|
| **`quality-score.md`** | Potrzebny jest zdefiniowany baseline lub porównanie eksperymentów | Orchestrator (przekazuje promptowi agenta QA) |
| **`experiment-ledger.md`** | Pierwszy eksperyment zapisano po ustanowieniu baseline'u IMPL | Orchestrator (inline, po pomiarze baseline'u) |
| **`exploration-loop.md`** | Odzyskiwanie wielokrotnie zawodzi, a alternatywy warto przetestować w ramach budżetu | Orchestrator (inline, przed uruchomieniem agentów hipotez) |

Zasoby te są odroczone do czasu spełnienia ich indywidualnych warunków wyzwalających. Sam poziom trudności ich nie wstrzykuje.

---

## Jak umiejętności są routowane przez skill-routing.md {#how-skills-route-via-skill-routingmd}

Mapa routingu umiejętności określa, jak zadania są dopasowywane do agentów:

### Prosty routing (jedna domena) {#simple-routing-single-domain}

Prompt zawierający „Zbuduj formularz logowania z Tailwind CSS” dopasowuje słowa kluczowe `UI`, `component`, `form` i `Tailwind` oraz kieruje zadanie do **oma-frontend**.

### Routing złożonego żądania {#complex-request-routing}

Żądania obejmujące wiele domen stosują ustalone kolejności wykonywania:

| Wzorzec żądania | Kolejność wykonywania |
|----------------|----------------|
| „Utwórz aplikację fullstack” | oma-pm -> (oma-backend + oma-frontend) równolegle -> oma-qa |
| „Utwórz aplikację mobilną” | oma-pm -> (oma-backend + oma-mobile) równolegle -> oma-qa |
| „Napraw błąd i wykonaj przegląd” | oma-debug -> oma-qa |
| „Zaprojektuj i zbuduj stronę docelową” | oma-design -> oma-frontend |
| „Mam pomysł na funkcję” | oma-brainstorm -> oma-pm -> odpowiedni agenci -> oma-qa |
| „Zrób wszystko automatycznie” | oma-orchestration (wewnętrznie: oma-pm -> agenci -> oma-qa) |

### Reguły zależności między agentami {#inter-agent-dependency-rules}

**Można uruchamiać równolegle (bez zależności):**
- oma-backend + oma-frontend (gdy kontrakt API jest zdefiniowany wcześniej)
- oma-backend + oma-mobile (gdy kontrakt API jest zdefiniowany wcześniej)
- oma-frontend + oma-mobile (niezależnie od siebie)

**Muszą działać sekwencyjnie:**
- oma-brainstorm -> oma-pm (design przed planowaniem)
- oma-pm -> wszyscy pozostali agenci (najpierw planowanie)
- agent implementacji -> oma-qa (review po implementacji)
- oma-backend -> oma-frontend/oma-mobile (gdy nie ma wcześniej zdefiniowanego kontraktu API)

**QA jest zawsze ostatni**, z wyjątkiem sytuacji, gdy użytkownik prosi o przegląd tylko określonych plików.

---

## Matematyka oszczędności tokenów {#token-savings-math}

Mierz, zanim zadeklarujesz oszczędności:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

Skrypt raportuje szacunki obliczone jako bajty UTF-8 / 4 dla scenariuszy opartych na rozmiarze plików. `routed` to sam punkt wejścia; `simple`, `medium` i `complex` dodają hipotetyczne pliki protokołu, przykładów i stosu dla porównania. Ich nazwy zachowano dla zgodności ze skryptem, a nie jako instrukcje ładowania z góry. `all` to górna granica rozmiaru zasobów, a nie konfiguracja runtime. Świeży checkout może użyć jednego ziarna platformy jako przybliżenia rozmiaru; nie ładuje wszystkich platform.

Polecenie context wyświetla rzeczywiście wstrzykiwany kontekst zadania. Nie obejmuje reszty rozmowy ani wszystkich instrukcji hosta/runtime. Użyj zestawionego promptu albo telemetrii użycia, aby zmierzyć łączną liczbę tokenów wejściowych, opóźnienie i koszt na konkretnym modelu. Nie wnioskuj o tych wartościach z rozmiaru repozytorium ani z liczby wygenerowanych kopii lustrzanych.

## Ładowanie zasobów według zadania {#resource-loading-by-task}

Każdy poziom trudności zaczyna się od właścicielskiej umiejętności. Graf jest indeksem referencji; sąsiedztwo nie upoważnia do ładowania innego specjalisty, podręcznika błędów ani warunkowego workflowu eksperymentów.

Mechanizm ładowania stosuje miękkie budżety 1500 / 4000 / 8000 szacowanych tokenów dla Simple / Medium / Complex. Punkt wejścia przekraczający budżet jest zachowywany, a przekroczenie jest raportowane. Referencje pomocnicze pozostają odroczone, chyba że zostaną jawnie wybrane po ustaleniu, że zadanie spełnia ich warunek wyzwalający. Wymagany punkt wejścia nigdy nie jest zastępowany mniejszymi, niezwiązanymi dokumentami.

Weryfikacja zależy od ryzyka zadania i wymagań projektu. Etykieta trudności nie wymaga pełnego zestawu testów, stałej odpowiedzi preflight ani ponownego zatwierdzenia już autoryzowanej pracy.

## Mapy ładowania kontekstu (per agent) {#context-loading-task-maps-per-agent}

To przykłady referencji, do których należy sięgać, gdy zadanie ich wymaga. Korzystaj z bieżącego indeksu właścicielskiej umiejętności i wybieraj tylko stosowne sekcje:

### Agent backendu {#backend-agent}

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Tworzenie API CRUD | pasujące `variants/{node,python,rust}/snippets.md`, gdy istnieje |
| Uwierzytelnianie | `snippets.md` z pasującego wariantu + `tech-stack.md`, gdy istnieją |
| Migracja bazy danych | `snippets.md` z pasującego wariantu, gdy istnieje |
| Optymalizacja wydajności | `orm-reference.md` i pasujące przykłady dostarczone przez umiejętność |
| Modyfikacja istniejącego kodu | dostawca inteligencji kodu projektu i właściwe zasoby wykonywania |

### Agent frontendu {#frontend-agent}

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Tworzenie komponentu | snippets.md + istniejące wzorce komponentów projektu |
| Implementacja formularza | snippets.md (formularz + Zod) |
| Integracja API | snippets.md (TanStack Query) |
| Stylowanie | tailwind-rules.md |
| Układ strony | snippets.md (grid) |

### Agent designu {#design-agent}

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Tworzenie systemu designu | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Projektowanie landing page | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
| Audyt designu | checklist.md + anti-patterns.md |
| Eksport tokenów designu | design-tokens.md |
| Efekty 3D / shader | reference/shader-and-3d.md + reference/motion-design.md |
| Przegląd dostępności | reference/accessibility.md + checklist.md |

### Agent QA {#qa-agent}

| Typ zadania | Wymagane zasoby |
|-----------|-------------------|
| Przegląd bezpieczeństwa | checklist.md (sekcja Security) |
| Przegląd wydajności | checklist.md (sekcja Performance) |
| Przegląd dostępności | checklist.md (sekcja Accessibility) |
| Pełny audyt | checklist.md (całość) + self-check.md |
| Porównanie zdefiniowanych metryk | quality-score.md (warunkowe) |


---

## Kompozycja promptu orkiestratora {#orchestrator-prompt-composition}

Podczas komponowania promptów dla subagentów orkiestrator dołącza tylko zasoby istotne dla zadania:

1. ścieżkę do SKILL.md właścicielskiej umiejętności (dispatch przez CLI już wstrzykuje treść)
2. sekcję execution-protocol wybranej operacji, gdy jest potrzebna
3. zasoby dopasowane do konkretnego typu zadania (z powyższych map)
4. odpowiednią sekcję error-playbook dopiero po zaobserwowanym niepowodzeniu
5. Memory Protocol (tryb CLI)

Taka ukierunkowana kompozycja unika ładowania niepotrzebnych zasobów i maksymalizuje miejsce subagenta na właściwą pracę.

---

## Dowody sesji i przegląd retrospektywny {#session-evidence-and-retrospective-review}

Zapisy sesji odnotowują istotne korekty, zmiany zakresu, ponowną pracę i rozstrzygnięte ustalenia przeglądu wraz z dowodami. Niezbędne doprecyzowanie nie pociąga za sobą kary. Dawne ważone wyniki CD i EA oraz reguły RCA wyzwalane progami zostały usunięte; były to instrukcje promptu, a nie metryki obliczane przez CLI.

Tam, gdzie to możliwe, korzystaj z istniejących wyników zadań. Osobny plik `session-metrics-{sessionId}.md` jest opcjonalny w skonfigurowanym magazynie koordynacji. Powtarzające się niepowodzenie lub zlecona retrospektywa może uzasadniać wniosek, ale zwykła nieudana kontrola lub sporne ustalenie nie stanowi go automatycznie. Zachowaj historyczne dzienniki; nie przepisuj ich do nowego formatu.

`oma stats` raportuje produktywność oraz zapisane podsumowania użycia/kosztów. `oma retro` grupuje rzeczywiste zdarzenia bramek, blokad i brakujących decyzji w sugestie. Żadne z nich nie oblicza wyników CD/EA na podstawie tych artefaktów Markdown.

## Dekompozycja zadań i odzyskiwanie kontekstu {#task-decomposition-and-context-recovery}

Planuj na podstawie zależności i niezależnie weryfikowalnych zachowań. Z góry ustalone liczby sprintów i plików oraz szacunki tur nie decydują o głębokości przeglądu ani o ukończeniu zadania. Trzymaj testy i obsługę błędów razem z zachowaniem, które weryfikują.

W razie zaobserwowanego zastoju lub utraty przydatnego kontekstu zapisz ukończoną pracę, pozostałe kryteria, istotne ścieżki i dowody weryfikacji przed wznowieniem lub ponownym dispatchem. Zachowaj istniejącą pracę i unikaj powielania trwającej próby. Sam stosunek tur do postępu nie wymaga resetu.

## Warunkowy pomiar i eksploracja {#conditional-measurement-and-exploration}

Zdefiniowany baseline lub porównanie eksperymentów aktywuje wskazówki dotyczące pomiaru; samo posiadanie testów lub lintu ich nie aktywuje. Zapisuj porównywalne metryki wraz z jednostkami, metodą, rewizją i dowodami. Wymagane kontrole poprawności i bezpieczeństwa pozostają niezależne. OMA nie ma domyślnej formuły zbiorczej, bramki opartej na ocenie literowej ani wycofania wyzwalanego wynikiem.

Rzeczywisty eksperyment zapisuje swoją hipotezę, dowody dla baseline'u i kandydata, wymagane kontrole, decyzję oraz należące do niego pliki. Powtarzające się niepowodzenia mogą uzasadniać przetestowanie innego mechanizmu w ramach istniejącego budżetu odzyskiwania. Izoluj zmiany eksperymentu, zachowaj niezwiązane edycje i zweryfikuj zintegrowanego kandydata przed wznowieniem bramki.
