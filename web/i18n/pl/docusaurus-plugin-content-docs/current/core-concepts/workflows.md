---
title: Workflowy
description: "Pełna referencja wszystkich 21 workflowów oh-my-agent: komendy slash, tryby trwałe i nietrwałe, słowa kluczowe wyzwalające w 11 językach, fazy i kroki, odczytywane i zapisywane pliki, mechanika automatycznego wykrywania przez triggers.json i keyword-detector.ts, filtrowanie wzorców informacyjnych oraz zarządzanie stanem trybu trwałego."
---

# Workflowy {#workflows}

Workflowy to uporządkowane, wielokrokowe procesy wyzwalane komendami slash albo słowami kluczowymi w języku naturalnym. Definiują sposób współpracy agentów nad zadaniami — od narzędzi jednofazowych po złożone, pięciofazowe bramki jakości.

Istnieje 21 workflowów, z których 4 są [trwałe](../getting-started/glossary.md#persistent-workflow) (utrzymują stan i nie mogą zostać przypadkowo przerwane).

## Workflowy w skrócie {#workflows-at-a-glance}

| Workflow | Zastosowanie | Trwały |
|---|---|---|
| [`/orchestrate`](#orchestrate) | Automatyczne równoległe wykonywanie agentów na podstawie planu, z pętlami weryfikacji | Tak |
| [`/work`](#work) | Koordynacja wielu domen krok po kroku: plan, implementacja, QA, poprawki | Tak |
| [`/ultrawork`](#ultrawork) | Pięciofazowy workflow jakości z 12 odizolowanymi etapami przeglądu | Tak |
| [`/ralph`](#ralph) | Powtarzanie ultrawork, aż przejdą kryteria weryfikowalne mechanicznie | Tak |
| [`/plan`](#plan) | Podział zadań przez PM z zależnościami i kontraktami API | Nie |
| [`/brainstorm`](#brainstorm) | Ideacja w stylu design-first przed planowaniem | Nie |
| [`/architecture`](#architecture) | Decyzje architektoniczne, przeglądy i ADR | Nie |
| [`/deepinit`](#deepinit) | Generowanie AGENTS.md, ARCHITECTURE.md i `docs/` dla istniejącej bazy kodu | Nie |
| [`/review`](#review) | Przegląd QA: bezpieczeństwo, wydajność, dostępność, jakość kodu | Nie |
| [`/security`](#security) | Skany bezpieczeństwa, pentesty wdrożonych aplikacji webowych, walidacja ustaleń, bramki CI | Nie |
| [`/debug`](#debug) | Diagnoza i naprawa błędu z testem regresji | Nie |
| [`/design`](#design) | DESIGN.md z tokenami, wzorcami komponentów i regułami dostępności | Nie |
| [`/scm`](#scm) | Operacje Git i Conventional Commits | Nie |
| [`/tools`](#tools) | Widoczność i ograniczenia narzędzi MCP | Nie |
| [`/convert`](#convert) | Konwersja dokumentów i multimediów między formatami | Nie |
| [`/docs`](#docs) | Wykrywanie dryfu dokumentacji i synchronizacja | Nie |
| [`/recap`](#recap) | Dzienne lub okresowe podsumowanie pracy z narzędzi AI | Nie |
| [`/stack-set`](#stack-set) | Referencje specyficzne dla stosu dla umiejętności domenowej | Nie |
| [`/video`](#video) | Generowanie MP4 przez umiejętność `oma-video` | Nie |
| [`/schedule`](#schedule) | Cykliczne zadania agentów uruchamiane według harmonogramu | Nie |
| [`/explain`](#explain) | Interaktywne objaśnienie HTML dla zmiany w kodzie lub tematu | Nie |

---

## Wybór umiejętności lub workflowu {#choosing-a-skill-or-workflow}

Wybierz na podstawie koordynacji i weryfikacji wymaganej przez zadanie. Jeśli workflow został już wybrany, postępuj zgodnie z nim; kontynuuj aktywny workflow, dopóki jawnie go nie anulujesz ani nie zmienisz. Dla nowego zadania bez wybranego workflowu użyj tego przewodnika:

| Potrzeby zadania | Wybór | Przykład |
|---|---|---|
| Jedna domena bez koordynacji agentów | [Pojedyncza umiejętność](/docs/guide/single-skill) | Dodaj endpoint API i przetestuj jego walidację |
| Wiele domen z planowaniem, implementacją i QA krok po kroku | `/work` | Koordynuj zmianę API z jej klientami webowymi i mobilnymi |
| Automatyczna delegacja niezależnych zadań równolegle | `/orchestrate` | Implementuj równolegle zadania backendu i frontendu po rozstrzygnięciu zależności |
| Jawnie zlecony kompleksowy proces jakości | `/ultrawork` | Uruchom pełny przegląd planowania, implementacji, weryfikacji, dopracowania i gotowości do wydania |
| Jawna prośba o powtarzanie wykonania do czasu przejścia kryteriów weryfikowalnych mechanicznie | `/ralph` | Powtarzaj implementację i weryfikację przez sędziego, aż wskazane kontrole regresji przejdą, w ramach zabezpieczeń pętli |

`/orchestrate` ładuje gotowy plan albo tworzy go przez `/plan` przed uruchomieniem agentów. Nie musisz najpierw uruchamiać `/plan`. Istnienie planu nie odróżnia więc `/work` od `/orchestrate`; wybierz według tego, jak chcesz koordynować pracę. Oba workflowy mogą wykonywać niezależne zadania równolegle.

Kryteria akceptacji i testy należą także do zadań z pojedynczą umiejętnością. Sama ich obecność nie oznacza potrzeby użycia `/ralph`: każda iteracja Ralph uruchamia pełny proces ultrawork oraz przebieg sędziego, więc wybierz go, gdy chcesz powtarzanej pętli weryfikacji. Zabezpieczenia mogą zatrzymać pracę z nieukończonymi albo zablokowanymi zadaniami.

Ta tabela jest wskazówką wyboru, a nie automatycznym routerem workflowów. Host agent może zalecić odpowiednie podejście; rekomendacja lub objaśnienie workflowu go nie uruchamia. Komenda slash wybiera go jawnie. Gdy hook wykrywania słów kluczowych jest włączony, dopasowane skonfigurowane słowa kluczowe albo wzorce również mogą go aktywować, z uwzględnieniem filtrów zapytań informacyjnych. Detektor nie klasyfikuje liczby domen, nie sprawdza gotowości planu ani nie stosuje tabeli jako algorytmu priorytetów.

Przegląd planu korzysta z autoryzacji już udzielonej dla zadania. Agenci pytają tylko o istotną brakującą decyzję albo działanie wykraczające poza ten zakres. Przegląd gotowości do wydania sam nie upoważnia do publikacji ani wdrożenia.

---

## Workflowy trwałe {#persistent-workflows}

Workflowy trwałe działają do czasu ukończenia wszystkich zadań. Utrzymują stan w `.agents/state/` i ponownie wstrzykują kontekst `[OMA PERSISTENT MODE: ...]` przy każdej wiadomości użytkownika, dopóki nie zostaną jawnie dezaktywowane.

Tryb trwały uruchamia się wyłącznie przy **jawnym wywołaniu**: slash commandzie workflowu (`/ultrawork` albo formie z przestrzenią nazw, np. `/oma:ultrawork`) lub własnej nazwie workflowu w zwykłym tekście (lista `explicit` w `triggers.json`, np. „orchestrate”, „ultrawork”/„ulw”, „ralph”/„랄프”, „work mode”). Pozostałe słowa kluczowe wyzwalające poniżej to wskazówki w języku naturalnym: wstrzykują workflow jako sugestię, nie aktywując trybu trwałego, i nigdy się nie uruchamiają, gdy pierwsza lub ostatnia linia promptu jest pytaniem kończącym się znakiem `?`.

### /orchestrate {#orchestrate}

**Opis:** Automatyczne równoległe wykonywanie agentów przez CLI. Uruchamia subagentów przez CLI, koordynuje je za pomocą trwałego stanu uruchomienia i potwierdzeń, monitoruje postęp oraz wykonuje pętle weryfikacji.

**Trwały:** Tak. Plik stanu: `.agents/state/orchestrate-state-{sessionId}.json`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Jawne (trwałe) | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |
| Angielski | "do everything", "run everything", "everything in parallel", "automate everything" |
| Koreański | "전부 실행", "전부 해", "전부 병렬로", "자동으로 해줘" |
| Japoński | "全部実行", "全部並列で", "自動でやって" |
| Chiński | "编排", "全部执行", "全部并行", "自动处理" |
| Hiszpański | "ejecutar todo", "todo en paralelo" |
| Francuski | "tout exécuter", "tout en parallèle" |
| Niemiecki | "alles ausführen", "alles parallel" |
| Portugalski | "executar tudo", "tudo em paralelo" |
| Rosyjski | "выполнить всё", "всё параллельно" |
| Niderlandzki | "alles uitvoeren", "alles parallel" |
| Polski | "wykonaj wszystko", "wszystko równolegle" |

Same słowa „parallel” i „automate” (oraz ich tłumaczenia) nie są wyzwalaczami: „run the tests in parallel” albo „automate the release notes” to zwykłe prośby, a nie orkiestracja wieloagentowa.

**Wzorce regex wyzwalające** (intencja + lista dozwolonych rzeczowników, zobacz [Automatyczne wykrywanie: pole Pattern](#pattern-field-raw-regex)):
| Sekcja | Wzorzec | Przykłady wyzwalające |
|---------|---------|----------------------|
| `*` (uniwersalny) | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (uniwersalny) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Lista dozwolonych rzeczowników (14): app, api, service, server, cli, tool, website, dashboard, system, backend, frontend, prototype, mvp, bot. Nie pasuje do niej ani pojedyncza funkcja („implement the login feature”, „로그인 기능 구현해줘”), ani istniejąca rzecz („make the API faster”).

**Kroki:**
1. **Krok 0, przygotowanie:** Odczytaj umiejętność koordynacji, przewodnik ładowania kontekstu i protokół pamięci. Wykryj dostawcę.
2. **Krok 1, załaduj/utwórz plan:** Sprawdź `.agents/results/plan-{sessionId}.json`, a następnie najnowszy `plan-*.json`. Jeśli nie ma planu — albo plan nie jest gotowy do wykonania (zadaniu brakuje agenta, poziomu priorytetu, zależności lub kryteriów akceptacji) — deleguj inline do `/plan`, aby utworzyć plan z tym samym ID sesji. Przedstaw plan i ponownie użyj istniejącej autoryzacji; przed delegowaniem pytaj tylko o istotną brakującą decyzję albo nową autoryzację.
3. **Krok 2, inicjalizacja sesji:** Załaduj `oma-config.yaml`, wyświetl tabelę mapowania CLI, użyj ID sesji z utworzenia planu albo wygeneruj je (`session-YYYYMMDD-HHMMSS`), a następnie utwórz `orchestrator-session-{sessionId}.md` i `task-board-{sessionId}.md` w skonfigurowanym magazynie pamięci.
4. **Krok 3, uruchom agentów:** Dla każdego poziomu priorytetu (od najniższego: najpierw poziom 1, potem poziom 2 i tak dalej) uruchamiaj agentów metodą właściwą dla dostawcy (natywni subagenci, gdy bieżący runtime i dostawca docelowy się zgadzają; `oma agent spawn` dla pracy zewnętrznej lub między dostawcami). Nigdy nie przekraczaj MAX_PARALLEL.
5. **Krok 4, monitoruj:** Odpytuj pliki `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` przypisane do uruchomienia oraz uporządkowane potwierdzenia, po czym aktualizuj tablicę zadań. Obserwuj ukończenia, błędy i awarie.
6. **Krok 5, weryfikuj:** Dla każdego ukończonego agenta uruchom mechaniczną samokontrolę (lint, typecheck, testy, zakres diffu; do 3 cykli), następnie `verify.sh {agent-type} {workspace}` (backend, frontend, mobile, qa, debug i pm; pozostałe typy agentów zapisują `SKIP`), a potem krzyżowy przegląd QA. Po niepowodzeniu weryfikacji uruchom ponownie z kontekstem błędu (maksymalnie 2 retry). Powtarzające się niepowodzenia mogą uzasadniać alternatywne hipotezy, ale wszystkie próby zużywają ten sam łączny budżet odzyskiwania (`max_attempts`, domyślnie 3 łącznie z pierwotną próbą). Jeśli budżet nie wystarcza na rundę porównawczą, zachowaj nierozwiązane dowody.
7. **Krok 6, zbierz:** Odczytaj pliki wyników przypisane do uruchomienia i ustrukturyzowane zgłoszenia, a następnie skompiluj podsumowanie.
8. **Krok 7, raport końcowy:** Przedstaw podsumowanie sesji. Jeśli przeprowadzono eksperymenty, podsumuj dowody i decyzje; zapisuj wnioski tylko wtedy, gdy ustalono przyczynę nadającą się do ponownego użycia.

```mermaid
flowchart TD
  S1{"Step 1: usable plan JSON?"} -->|no| MK["Create the plan inline with /plan, same session ID"]
  S1 -->|yes| S2
  MK --> S2["Step 2: session ID, task board, domain gate"]
  S2 --> S3["Step 3: dispatch by priority tier, tier 1 first; native subagent or oma agent spawn --task-id"]
  S3 --> S4["Step 4: monitor with oma agent status and progress files"]
  S4 --> SC["Step 5: mechanical self-check, up to 3 cycles"]
  SC --> VS{"verify.sh, or SKIP for unsupported agent types"}
  VS -->|"PASS or SKIP"| QA{"QA cross-review"}
  QA -->|"FAIL: findings back to the agent"| SC
  QA -->|PASS| S6["Step 6: collect claims; emit and verify the QA verdict"]
  S6 --> S7(["Step 7: final report"])
  VS -->|FAIL| CL{"classify the failure"}
  CL -->|"workflow evidence"| EV(["one metadata-only repair, then partial handoff if it still fails"])
  CL -->|product| BG{"attempts left in max_attempts?"}
  BG -->|"yes: retry with error context or a 2-3 hypothesis round"| S3
  BG -->|no| STOP(["preserve partial evidence; report partial or failed"])
  QA -.->|"review limit reached"| STOP
```

**Pliki odczytywane:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, pliki postępu/wyników przypisane do uruchomienia oraz ustrukturyzowane potwierdzenia uruchomień.
**Pliki zapisywane:** przypisany do uruchomienia stan sesji/tablicy zadań w skonfigurowanym magazynie pamięci, ustrukturyzowane potwierdzenia i zgłoszenia oraz raport końcowy.

**Kiedy używać:** Duże projekty wymagające maksymalnej równoległości z automatyczną koordynacją.

---

### /work {#work}

**Opis:** Koordynacja wielu domen krok po kroku. Najpierw PM tworzy plan, potem agenci wykonują pracę w autoryzowanym zakresie, a następnie QA przegląda i zleca usunięcie problemów.

**Trwały:** Tak. Plik stanu: `.agents/state/work-state-{sessionId}.json`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Jawne (trwałe) | "work mode", "work workflow" |
| Uniwersalny | "step by step" |
| Angielski | "one by one", "one step at a time" |
| Koreański | "단계별", "하나씩 해줘", "차근차근" |
| Japoński | "ステップバイステップ", "一歩ずつ" |
| Chiński | "逐步", "一步一步" |
| Hiszpański | "paso a paso", "uno por uno" |
| Francuski | "étape par étape", "un par un" |
| Niemiecki | "schritt für schritt", "der reihe nach" |

Samo słowo „work” nie jest wyzwalaczem — to zwykłe słownictwo („Does this work on Windows?”).

**Kroki:**
1. **Krok 0, przygotowanie:** Odczytaj umiejętności, ładowanie kontekstu i protokół pamięci. Zapisz początek sesji.
2. **Krok 1, analiza wymagań:** Ustal zaangażowane domeny. Jeśli jest jedna domena, zasugeruj bezpośrednie użycie agenta.
3. **Krok 2, planowanie przez agenta PM:** PM rozkłada wymagania, definiuje kontrakty API, tworzy uporządkowany według priorytetów podział zadań i zapisuje go w `.agents/results/plan-{sessionId}.json`.
4. **Krok 3, przegląd planu:** Przedstaw plan i działaj w ramach istniejącej autoryzacji. Pytaj tylko o istotną brakującą decyzję albo nową autoryzację.
5. **Krok 4, uruchom agentów:** Uruchamiaj według poziomu priorytetu, równolegle w obrębie poziomu, w osobnych workspace'ach.
6. **Krok 5, monitoruj:** Odpytuj pliki postępu i sprawdzaj zgodność kontraktu API między agentami.
7. **Krok 6, przegląd QA:** Uruchom agenta QA do sprawdzenia bezpieczeństwa (OWASP), wydajności, dostępności i jakości kodu.
8. **Krok 6.1, pomiary** (warunkowo): Zapisz baseline, gdy potrzebne jest zdefiniowane porównanie.
9. **Krok 7, iteruj:** Jeśli znaleziono problemy CRITICAL/HIGH, ponownie uruchom odpowiedzialnych agentów. Jeśli ten sam problem wystąpi po 2 próbach, aktywuj Pętlę eksploracji.

**Kiedy używać:** Funkcje obejmujące wiele domen, gdy potrzebujesz koordynacji planowania, implementacji i QA krok po kroku.

---


### /ultrawork {#ultrawork}

**Opis:** Workflow skupiony na jakości. Obejmuje 5 faz, łącznie 17 kroków i 12 odizolowanych etapów przeglądu. Każda faza ma bramkę, która musi przejść przed kontynuacją.

**Trwały:** Tak. Plik stanu: `.agents/state/ultrawork-state-{sessionId}.json`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Jawne (trwałe) | "ultrawork", "ulw" |

**Fazy i kroki:**

| Faza | Kroki | Agent | Perspektywa przeglądu |
|-------|-------|-------|-------------------|
| **PLAN** | 1–4 | Agent PM (autor, krok 1) + recenzenci CCR (kroki 2–4) | Kompletność, metarecenzja, nadmierne projektowanie/prostota |
| **IMPL** | 5 | Agenci deweloperscy (uruchomieni) | Implementacja |
| **VERIFY** | 6–8 | Recenzenci CCR | Zgodność, bezpieczeństwo (OWASP), zapobieganie regresji |
| **REFINE** | 9–13 | Agent refaktoryzacji (kroki 9, 11, 13) + recenzenci CCR (kroki 10, 12) | Dzielenie plików, ponowne użycie, wpływ kaskadowy, spójność, martwy kod |
| **SHIP** | 14–17 | Recenzenci CCR | Jakość kodu (lint/coverage), przepływ UX, powiązane problemy, gotowość wdrożeniowa |

Każdy etap przeglądu działa jako osobny subagent recenzujący ze świeżym kontekstem ([przegląd międzykontekstowy, Cross-Context Review](../getting-started/glossary.md#cross-context-review-ccr)). Agent PM nie przegląda inline własnego planu.

**Definicje bramek:**
- **PLAN_GATE:** Plan udokumentowany, założenia wymienione, alternatywy rozważone, przegląd nadmiernego projektowania wykonany, zakres autoryzowany.
- **IMPL_GATE:** Odpowiednie kontrole i testy nieemitujące przechodzą, zmodyfikowano tylko zaplanowane pliki, zapisano bazowe dowody dla rzeczywistych eksperymentów. Kontrole builda uruchamiaj tylko po jawnym zażądaniu.
- **VERIFY_GATE:** Implementacja spełnia wymagania, zero CRITICAL, zero HIGH, brak regresji, spełnione odpowiednie cele pomiarowe projektu.
- **REFINE_GATE:** Przestrzegane reguły utrzymywalności projektu, uchwycone możliwości integracji, sprawdzone efekty uboczne, kod oczyszczony, brak nierozwiązanej regresji.
- **SHIP_GATE:** Kontrole jakości przechodzą, UX zweryfikowany, powiązane problemy usunięte, checklista wdrożeniowa ukończona, odpowiednie cele pomiarowe projektu spełnione na podstawie aktualnych dowodów. Korzystaj z istniejącej autoryzacji; publikacja lub wdrożenie wymaga autoryzacji dla tej czynności.

**Zachowanie po niepowodzeniu bramki:**
- Pierwsze niepowodzenie: wróć do właściwego kroku, popraw i spróbuj ponownie.
- Drugie niepowodzenie tego samego problemu: oceń przyczynę ponownie; jeśli alternatywy warto przetestować w ramach pozostałego budżetu, porównaj izolowane eksperymenty z wymaganym zachowaniem i zdefiniowanymi metrykami.
- Limity: niepowodzenie PLAN wraca do kroku 1 tylko przed pierwszym przydzieleniem zadania (potem plan jest niezmienny). Retry VERIFY i REFINE kończą się, gdy liczba niepowodzeń bramek osiągnie skonfigurowane maksimum (domyślnie 5 cykli VERIFY + REFINE) albo gdy zostanie przekroczony limit kosztu sesji.

```mermaid
flowchart TD
  S1["Step 1: PM Agent writes the plan JSON"] --> PR["Steps 2-4: 3 CCR reviewers, completeness, meta-review, simplicity"]
  PR --> PG{"PLAN_GATE"}
  PG -->|"fail, before first dispatch"| S1
  PG -->|pass| S5["Step 5: implementation agents in parallel"]
  S5 --> IG{"IMPL_GATE"}
  IG -->|"fail: re-spawn failed agents"| S5
  IG -->|pass| VR["Steps 6-8: 3 CCR reviewers, alignment, safety, regression"]
  VR --> VG{"VERIFY_GATE"}
  VG -->|fail| VL{"cycle limit or cost cap reached?"}
  VL -->|"no: root-cause fix"| S5
  VG -->|pass| RF["Steps 9-13: 2 CCR reviews, then refactor actions"]
  RF --> RG{"REFINE_GATE"}
  RG -->|fail| RL{"cycle limit or cost cap reached?"}
  RL -->|"no: re-spawn Refactor Agent"| RF
  RG -->|"pass, or recorded skip"| SR["Steps 14-17: 4 CCR reviewers, quality, UX, related issues, deployment"]
  SR --> SG{"SHIP_GATE"}
  SG -->|"fail: re-run affected steps"| SR
  SG -->|pass| DONE(["Final results; optional oma docs verify"])
  VL -->|yes| STOP(["Stop: save step results, report unresolved items"])
  RL -->|yes| STOP
```

**Ulepszenia warunkowe:** porównania zdefiniowanych metryk, decyzje i dowody z eksperymentów, eksploracja hipotez w ramach budżetu oraz wnioski poparte przyczynami nadającymi się do ponownego użycia.

**Warunek pominięcia REFINE:** zadania Simple poniżej 50 linii.

**Kiedy używać:** Pełny proces przeglądu przed decyzją, czy wynik jest gotowy do wydania. Workflow zapisuje kontrole i ustalenia; nie podejmuje za Ciebie decyzji o gotowości produkcyjnej.

---

### /ralph {#ralph}

**Opis:** Trwała, samoodnosząca się pętla wykonywania. Opakowuje ultrawork [sędzią](../getting-started/glossary.md#judge), który po każdej iteracji sprawdza kryteria ukończenia. Raportuje pełne ukończenie, gdy wszystkie kryteria przejdą, częściowe ukończenie, gdy pozostaną tylko kryteria zaliczone i zablokowane, albo zatrzymuje się po uruchomieniu zabezpieczeń.

**Trwały:** Tak. Plik stanu: `.agents/state/ralph-state-{sessionId}.json`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Jawne (trwałe) | "ralph", "랄프" |
| Angielski | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| Koreański | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| Japoński | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chiński | "不要停", "直到完成", "全部完成", "做完为止" |
| Hiszpański | "no pares", "hasta completar", "termina todo" |
| Francuski | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Niemiecki | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

Same frazy wznowienia („keep going”, „carry on”, „계속해”, „続けて”, „продолжай”, …) nie są wyzwalaczami: użytkownicy wpisują je, aby wznowić pracę po przerwie.

**Fazy:**
1. **Faza 0, INIT:** Załaduj wymagania wstępne (ładowanie kontekstu, protokół pamięci, protokół sędziego). Zdefiniuj i zapisz mechanicznie weryfikowalne kryteria ukończenia, takie jak asercje testów, kontrole typów nieemitujące, kody wyjścia lub istnienie pliku. Kontrole builda uwzględniaj tylko po jawnym zażądaniu. Pokaż kryteria i kontynuuj w autoryzowanym zakresie. Zainicjalizuj sesję z `max_iterations: 5`.
2. **Faza 1, EXEC:** Wykonaj ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) jako pojedynczą iterację pod ID sesji Ralpha. Następnie uruchom bramkę artefaktów `oma ralph verify --json --session-id <sessionId> --newer-than <iteration start>`. Jeśli nie przejdzie, iterację uznaje się za niewykonaną: Ralph zapisuje naruszenie, naprawia pracę i ponownie uruchamia bramkę.
3. **Faza 2, JUDGE:** Sędzia sprawdza każde kryterium wobec rzeczywistego stanu projektu (uruchamia autoryzowane kontrole i sprawdza istnienie plików). Prompt workflowu każe orchestratorowi uruchomić sędziego jako osobnego agenta ze świeżym kontekstem, poinstruowanego wyłącznie o kryteriach; nic mechanicznie nie potwierdza tego uruchomienia, a runtime, który nie potrafi uruchamiać subagentów, ma oceniać inline i zapisać `ralph.judge-inline-fallback`. Zapisuje dowody i status kryterium, w tym PASS, FAIL, REGRESSED lub BLOCKED.
4. **Bramka decyzji:** Jeśli wszystkie kryteria mają PASS → raportuj pełne ukończenie. Jeśli pozostają tylko PASS i BLOCKED → raportuj ukończenie częściowe. Jeśli występuje FAIL lub REGRESSED → przekaż kontekst błędu do kolejnej iteracji, z zachowaniem zabezpieczeń.
5. **Faza 3, REPLAN:** Zawęź kolejną iterację do pozycji FAIL i REGRESSED (diagnoza uwzględniająca diff), pomiń pozycje BLOCKED i pozostaw kryteria PASS w zakresie sędziego. Wróć do fazy 1.
6. **Zabezpieczenia:** Pętla zatrzymuje się, gdy `current_iteration >= max_iterations` (domyślnie 5). Kryterium, które zawiedzie 3 razy z rzędu z tą samą przyczyną źródłową, otrzymuje status BLOCKED i nie jest ponawiane (wykrycie zastoju).

```mermaid
flowchart TD
  INIT["Phase 0 INIT: define verifiable criteria, max_iterations = 5"] --> EXEC["Phase 1 EXEC: run the full ultrawork workflow"]
  EXEC --> GATE{"oma ralph verify: plan, QA, and refactor evidence current?"}
  GATE -->|"no: iteration not performed"| REPAIR["Record the violation, emit gate.failed, repair the work"]
  REPAIR --> GATE
  GATE -->|yes| JUDGE["Phase 2 JUDGE: judge re-checks every criterion, including earlier passes"]
  JUDGE --> VERDICT{"verdict"}
  VERDICT -->|"COMPLETED: all PASS"| DONE(["Full completion report"])
  VERDICT -->|"PARTIAL: only PASS and BLOCKED"| PART(["Partial completion report"])
  VERDICT -->|"FAIL: any FAIL or REGRESSED"| LIMIT{"current_iteration >= max_iterations?"}
  LIMIT -->|yes| SAFE(["Safeguard report"])
  LIMIT -->|no| REPLAN["Phase 3 REPLAN: FAIL and REGRESSED items only; skip BLOCKED"]
  REPLAN --> EXEC
```

Węzeł sędziego to sędzia uruchamiany promptem, opisany w fazie 2: workflow każe orchestratorowi uruchomić go ze świeżym kontekstem, a runtime, który nie potrafi uruchamiać subagentów, ocenia inline i zapisuje fallback.

**Najważniejsza różnica względem /ultrawork:** Ultrawork wykonuje proces pięciu faz z retry po niepowodzeniu bramki fazy. Ralph opakowuje ultrawork w pętlę retry z sędzią uruchamianym promptem, który ponownie weryfikuje każde kryterium wobec dowodów z projektu. Pętla kończy się raportem pełnego ukończenia, raportem częściowego ukończenia zablokowanej pracy albo raportem zabezpieczenia.

**Pliki odczytywane:** `.agents/workflows/ralph/resources/judge-protocol.md`, wszystkie pliki ultrawork.
**Pliki zapisywane:** `session-ralph-{sessionId}.md` (pamięć), dzienniki iteracji, raport końcowy.

**Kiedy używać:** Gdy jawnie chcesz powtarzanego wykonania i ponownej weryfikacji przez sędziego wobec mechanicznych kryteriów ukończenia. Same testy nie wymagają Ralph; uwzględnij pełny proces ultrawork w każdej iteracji i jego zabezpieczenia.

---

## Workflowy nietrwałe {#non-persistent-workflows}

### /plan {#plan}

**Opis:** Podział zadania sterowany przez PM. Analizuje wymagania, wybiera stos technologiczny, rozkłada zadania według priorytetów i zależności oraz definiuje kontrakty API.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "task breakdown" |
| Angielski | "plan" |
| Koreański | "계획", "요구사항 분석", "스펙 분석" |
| Japoński | "計画", "要件分析", "タスク分解" |
| Chiński | "计划", "需求分析", "任务分解" |

**Kroki:** Zbierz wymagania -> przeanalizuj wykonalność techniczną (analiza kodu MCP) -> oceń złożoność (Simple/Medium/Complex) -> zdefiniuj kontrakty API (jeśli praca przekracza granice) -> rozłóż zadania -> przejrzyj z użytkownikiem -> zapisz artefakty planu (JSON maszynowy + czytelny dla człowieka tracker Markdown dla Medium/Complex).

**Wynik:** `.agents/results/plan-{sessionId}.json`, zapis pamięci oraz (dla Medium/Complex) `docs/plans/work/{NNN}-{name}.md` z tabelą zadań, dziennikiem decyzji i notatkami postępu. Cykl życia śledzi pole `Status` w nagłówku Markdown (`Active` -> `Completed`); planów nie przenosi się między katalogami. Projekty utworzone przez `/brainstorm` trafiają do `docs/plans/designs/{NNN}-{name}.md`.

**Wykonanie:** Inline (bez uruchamiania subagentów). Workflow `/orchestrate` lub `/work` zużywa plan, aktualizując pola zadania/statusu podczas wykonywania.

---

### /brainstorm {#brainstorm}

**Opis:** Ideacja w stylu design-first. Bada intencję, doprecyzowuje ograniczenia, proponuje podejścia i tworzy zatwierdzony dokument designu przed planowaniem.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "brainstorm" |
| Angielski | "ideate", "explore design" |
| Koreański | "브레인스토밍", "아이디어", "설계 탐색" |
| Japoński | "ブレインストーミング", "アイデア", "設計探索" |
| Chiński | "头脑风暴", "创意", "设计探索" |

**Kroki:** Zbadaj kontekst projektu (analiza MCP) -> zadawaj pytania doprecyzowujące (po jednym) -> zaproponuj 2–3 podejścia z kompromisami -> przedstaw design sekcja po sekcji (z akceptacją użytkownika na każdym etapie) -> zapisz dokument designu w `docs/plans/designs/{NNN}-{name}.md` -> przejście: zasugeruj `/plan`.

**Reguły:** Bez implementacji ani planowania przed akceptacją designu. Bez wyjścia kodu. YAGNI.

---

### /architecture {#architecture}

**Opis:** Workflow architektury oprogramowania, który diagnozuje problemy architektury, wybiera właściwą metodę analizy (routing diagnostyczny / design-twice / ATAM / CBAM / ADR), porównuje opcje, syntetyzuje opinie interesariuszy i tworzy rekomendację, przegląd albo ADR.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "architecture", "ADR", "ATAM", "CBAM" |
| Angielski | "architecture review", "architectural tradeoff" |
| Koreański | "아키텍처", "설계 검토" |
| Japoński | "アーキテクチャ" |
| Chiński | "架构" |

**Kroki:** Ujmij decyzję (nowa architektura / przegląd / analiza kompromisów / priorytetyzacja inwestycji / autorstwo ADR) -> wybierz metodologię przez routing diagnostyczny -> przeanalizuj bieżącą architekturę przez analizę kodu MCP (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> zsyntetyzuj opinie interesariuszy (tylko gdy przekrojowość uzasadnia koszt) -> przygotuj rekomendację z jawnymi założeniami, kompromisami, ryzykami i krokami walidacji -> przekaż do `/plan`, gdy potrzebna jest implementacja.

**Reguły:** NIE pisz w tym workflowie kodu implementacji ani planów zadań. Po decyzji architektonicznej przekaż pracę do `/plan`. Przez cały czas używaj narzędzi MCP; nie zastępuj ich surowym odczytem plików ani grepem.

**Kiedy używać:** Wybory architektury systemu, decyzje o granicach modułów/usług/własności, priorytetyzacja refaktoryzacji, autorstwo ADR, badanie problemów architektury (amplifikacja zmian, ukryte zależności, niezręczne API).

---

### /deepinit {#deepinit}

**Opis:** Pełna inicjalizacja projektu. Analizuje istniejącą bazę kodu, generuje AGENTS.md, ARCHITECTURE.md i uporządkowaną bazę wiedzy `docs/`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "deepinit" |
| Koreański | "프로젝트 초기화" |
| Japoński | "プロジェクト初期化" |
| Chiński | "项目初始化" |

**Kroki:** Przygotowanie -> analiza bazy kodu (typ projektu, architektura, niejawne reguły, domeny, granice) -> generowanie ARCHITECTURE.md (mapa domeny, poniżej 200 linii) -> generowanie bazy wiedzy `docs/` (design-docs/, plans/, generated/, product-specs/, references/, dokumenty domenowe) -> generowanie głównego AGENTS.md (około 100 linii, spis treści) -> generowanie granicznych plików AGENTS.md (pakiety monorepo, każdy poniżej 50 linii) -> aktualizacja istniejącego harnessu (przy ponownym uruchomieniu) -> walidacja (brak martwych linków, limity linii).

**Wynik:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md oraz znalezione dokumenty właściwe dla domen.

---

### /review {#review}

**Opis:** Pełny pipeline przeglądu QA. Audyt bezpieczeństwa (OWASP Top 10), analiza wydajności, kontrola dostępności (WCAG 2.1 AA) i przegląd jakości kodu.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "code review", "security audit", "security review" |
| Angielski | "review" |
| Koreański | "리뷰", "코드 검토", "보안 검토" |
| Japoński | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chiński | "审查", "代码审查", "安全审计" |

**Kroki:** Ustal zakres przeglądu -> automatyczne kontrole bezpieczeństwa (npm audit, bandit) -> ręczny przegląd bezpieczeństwa (OWASP Top 10) -> analiza wydajności -> przegląd dostępności (WCAG 2.1 AA) -> przegląd jakości kodu -> wygeneruj raport QA.

**Opcjonalna pętla poprawka–weryfikacja** (z `--fix`): po raporcie QA uruchom agentów domenowych, aby poprawili problemy CRITICAL/HIGH, ponownie uruchom QA i powtórz maksymalnie 3 razy.

**Delegowanie:** Przy dużym zakresie deleguje kroki 2–7 uruchomionemu subagentowi QA.

---


### /security {#security}

**Opis:** Uruchom umiejętność `oma-security` dla kodu źródłowego, umiejętności agentów, komponentów MCP lub wdrożonej aplikacji webowej. Workflow wybiera odpowiedni silnik, zapisuje zakres sprawdzenia i dowody, weryfikuje ustalenia oraz stosuje skonfigurowaną bramkę CI.

**Punkt wejścia:** `/security`. Tutaj trafiają również prośby o uruchomienie Deepsec, skanerów Cisco lub testu penetracyjnego ARTEX.

**Cele i silniki:**

| Cel | Silnik |
|--------|--------|
| Kod źródłowy | Domyślnie Vercel Deepsec; Cisco AI Deep SAST na żądanie |
| Pakiet umiejętności agenta | Cisco Skill Scanner |
| Komponent lub serwer MCP | Cisco MCP Scanner |
| Wdrożona testowa aplikacja webowa | ARTEX, w granicach autoryzowanego celu i zakresu wykonania |

Metodyka audytu Cloudflare służy do niezależnej weryfikacji i odtwarzania problemów w lokalnej piaskownicy. Nie dodaje kolejnego skanera ani nie dowodzi większej trafności wykrywania.

**Kroki:**

1. Odczytaj `.agents/skills/oma-security/SKILL.md` i tylko zasoby potrzebne dla danego celu i intencji.
2. Określ cel (`source`, `skill`, `mcp` lub `web_runtime`) i intencję (`setup`, `scan`, `diff`, `pentest`, `triage`, `validate`, `ci` lub `troubleshoot`). Sprawdź wersję wybranego silnika, dostępny interfejs, poświadczenia i budżet wykonania.
3. Uruchom wybrany silnik w uzgodnionym zakresie. W razie potrzeby wykorzystaj istniejący stan Deepsec. Dla ARTEX przypisz do uruchomienia sprawdzoną, przypiętą wersję, izolowane wdrożenie, konto, listę dozwolonych celów i budżet. ARTEX korzysta ze zweryfikowanego UI/API sprawdzonej migawki albo zadania ręcznego/zewnętrznego; automatyzacja CI wymaga zweryfikowanego adaptera i zapisów wykonania zadania.
4. Zachowaj surowe wyniki i kody wyjścia silników, a następnie znormalizuj ustalenia bez usuwania ich źródeł ani rozbieżności. Oceń kandydatów niezależnie; zapisz osobno weryfikację statyczną i zaobserwowane odtworzenie problemu.
5. Zgłoś zakres sprawdzenia, ustalenia, dowody, niedokończone prace i właściwy wynik CI. Skieruj poprawki do specjalisty odpowiedzialnego za dany komponent.

**Zasoby:** `deepsec-setup.md`, `deepsec-scanning.md`, `deepsec-config.md` i `deepsec-matchers.md` dotyczą Deepsec. `cisco-source.md`, `skill-scanning.md`, `mcp-scanning.md` i `artex.md` dotyczą pozostałych silników. `findings-contract.md`, `validation.md` i `ci.md` określają wspólne reguły dotyczące dowodów, weryfikacji i bramek. Wszystkie zasoby znajdują się w `.agents/skills/oma-security/resources/`.

**Reguły:** Nie umieszczaj poświadczeń w raportach ani kontroli wersji. Traktuj kod źródłowy i wyniki skanerów jako niezaufane dane wejściowe. Odtwarzaj problemy lokalnie w piaskownicy systemu operacyjnego; ogranicz ruch ARTEX do autoryzowanego zakresu środowiska wykonawczego. Nieudane, częściowe lub pominięte skany oraz nieskuteczne próby wykorzystania podatności nie dowodzą, że cel jest bezpieczny. Ustalenie `confirmed` wymaga niezależnej weryfikacji i zaobserwowanego dowodu na zapisanej rewizji lub wdrożeniu; samo potwierdzenie statyczne pozostaje `needs_validation`.

**Kiedy używać:** Skanowanie bezpieczeństwa, testy penetracyjne wdrożonych aplikacji webowych, triage i weryfikacja ustaleń oraz bramki bezpieczeństwa CI. Użyj `/review` do szerszego przeglądu jakości kodu, dostępności i wydajności.

---

### /debug {#debug}

**Opis:** Uporządkowana diagnoza i naprawa błędów z pisaniem testu regresji oraz skanowaniem podobnych wzorców.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "debug" |
| Angielski | "fix bug", "fix error", "fix crash" |
| Koreański | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japoński | "デバッグ", "バグ修正", "エラー修正" |
| Chiński | "调试", "修复 bug", "修复错误" |

**Kroki:** Zbierz informacje o błędzie -> odtwórz (MCP `search_for_pattern`, `find_symbol`) -> zdiagnozuj przyczynę źródłową (MCP `find_referencing_symbols` do prześledzenia ścieżki wykonania) -> zaproponuj minimalną poprawkę (wymagana zgoda użytkownika) -> zastosuj poprawkę i napisz test regresji -> przeskanuj podobne wzorce (możesz uruchomić subagenta debug-investigator, gdy zakres przekracza 10 plików) -> udokumentuj błąd w pamięci.

**Kryteria uruchomienia subagenta:** Błąd obejmuje wiele domen, zakres skanowania przekracza 10 plików albo potrzebne jest głębokie śledzenie zależności.

---

### /design {#design}

**Opis:** Siedmiofazowy workflow designu tworzący DESIGN.md z tokenami, wzorcami komponentów i regułami dostępności.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "design system", "DESIGN.md", "design token" |
| Angielski | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Koreański | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japoński | "デザイン", "ランディングページ", "デザインシステム" |
| Chiński | "设计", "着陆页", "设计系统" |

**Fazy:** SETUP (zbieranie kontekstu, `.design-context.md`) -> EXTRACT (opcjonalnie z URL-i referencyjnych/Stitch) -> ENHANCE (wzmocnienie niejasnego promptu) -> PROPOSE (2–3 kierunki designu z kolorem, typografią, układem, ruchem i komponentami) -> GENERATE (DESIGN.md + tokeny CSS/Tailwind/shadcn) -> AUDIT (responsive, WCAG 2.2, heurystyki Nielsena, kontrola AI slop) -> HANDOFF (zapisz i poinformuj użytkownika).

**Wymagane:** Cały wynik musi być responsive-first (mobile 320–639 px, tablet 768 px+, desktop 1024 px+).

---

### /scm {#scm}

**Opis:** Tworzy Conventional Commits z automatycznym dzieleniem według funkcji.

**Słowa kluczowe wyzwalające:** Brak (wyłączone z automatycznego wykrywania).

**Kroki:** Przeanalizuj zmiany (git status, git diff) -> rozdziel funkcje (jeśli > 5 plików obejmujących różne zakresy/typy) -> ustal typ (feat/fix/refactor/docs/test/chore/style/perf) -> ustal zakres (zmieniony moduł) -> napisz opis (tryb rozkazujący, < 72 znaki) -> od razu wykonaj commit (bez promptu potwierdzającego).

**Reguły:** Nigdy `git add -A`. Nigdy nie commituj sekretów. Dla wiadomości wieloliniowych używaj HEREDOC. Dodaj trailer co-author tylko wtedy, gdy efektywna konfiguracja `scm.co_author` go włącza i dostarcza obie wartości.

---

### /tools {#tools}

**Opis:** Zarządzaj widocznością i ograniczeniami narzędzi MCP.

**Słowa kluczowe wyzwalające:** Brak (wyłączone z automatycznego wykrywania).

**Funkcje:** Pokazuje bieżący stan narzędzi MCP, włącza/wyłącza grupy narzędzi (memory, code-analysis, code-edit, file-ops), zmiany stałe lub tymczasowe (`--temp`), analizę języka naturalnego („memory tools only”, „disable code edit”).

**Grupy narzędzi:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /convert {#convert}

**Opis:** Konwertuj plik z jednego formatu na inny, kierując go według kategorii mediów. **Dokumenty** (PDF przez `opendataloader-pdf`/`oma-pdf`; HWP/HWPX/HWPML przez `kordoc`/`oma-hwp`) są wyodrębniane do Markdownu. Pliki **obrazów**, **wideo** i **audio** są transkodowane do formatu docelowego przez `ffmpeg` (już dostarczone dla `oma-video`).

**Słowa kluczowe wyzwalające:** Brak (wywoływany jawnie ze ścieżką pliku wejściowego).

**Kroki:** Zweryfikuj wejście i skieruj według kategorii (dokument `.pdf`/`.hwp*`; obraz `.jpg`/`.png`/`.webp`/…; wideo `.mp4`/`.mov`/…; audio `.mp3`/`.wav`/…) -> rozstrzygnij format docelowy (dokument domyślnie = Markdown; media = jawne `--to`) -> konwertuj (PDF: `uvx opendataloader-pdf`, skany używają hybrydowego OCR; HWP: `bunx kordoc@latest`; media: `ffmpeg`) -> normalizuj dokumenty (PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> zweryfikuj (odczytaj Markdown / media `ffprobe`) -> zaraportuj format źródło→cel oraz wybory jakości/kodeka.

**Reguły:** Kieruj według kategorii — nigdy nie uruchamiaj konwertera dokumentów na pliku multimedialnym ani odwrotnie. Domyślna lokalizacja wyniku to ten sam katalog co plik wejściowy. Raportuj wybory jakości/kodeka dla mediów (transkodowanie nie jest bezstratne). Nigdy nie pomijaj kroków. Język odpowiedzi wynika z `.agents/oma-config.yaml`.

**Kiedy używać:** Konwersja dokumentów PDF lub koreańskiej rodziny HWP do Markdownu na potrzeby zasilania LLM/RAG albo transkodowanie obrazów (jpg→webp/png), wideo (mov→mp4, mp4→gif) i audio (wav→mp3) między formatami.

---

### /docs {#docs}

**Opis:** Wykrywanie dryfu dokumentacji i synchronizacja przez `oma-docs`. Tryb verify znajduje uszkodzone odwołania w całym Markdownie repozytorium (domyślne glob `**/*.md`); tryb sync proponuje poprawki per dokument dla stron dotkniętych diffem gita. Wykonuje się inline (bez uruchamiania subagentów); wszyscy dostawcy wywołują bezpośrednio `oma docs`.

**Słowa kluczowe wyzwalające:** Uniwersalne: "oma-docs", "docs verify", "docs sync". Angielskie: "verify docs", "check docs", "docs drift", "broken doc links", "stale docs", "sync docs", "patch docs". Koreańskie: "문서 검증", "문서 드리프트", "문서 동기화". Japońskie: "ドキュメント検証", "ドキュメント同期". Chińskie: "文档校验", "文档同步".

**Kroki:** Wykryj tryb (`verify` domyślnie; `sync`, gdy prompt wspomina sync albo podaje zakres diffu gita) -> preflight (`command -v oma`; dla sync potwierdź użyteczny diff i przejdź do `HEAD~1..HEAD` jako fallbacku) -> verify: `oma docs verify --json` (wyjście `0` czyste, `1` uszkodzone odwołania) albo sync: `oma docs sync --json` dla zakresu -> zsyntetyzuj ustalenia w kontrakcie hosta LLM (verify: grupuj według CRITICAL/HIGH/MEDIUM/LOW z konkretnymi poprawkami; sync: szkicuj minimalne poprawki unified diff) -> przedstaw każdą poprawkę sync interaktywnie (`[y] apply [n] skip [d] show diff [s] show full proposal`; nigdy nie stosuj automatycznie) -> po zastosowaniu wygeneruj indeks ponownie przez `oma docs verify --json` -> zaraportuj tryb, liczbę według rodzaju i odnośniki do `docs/generated/doc-refs.json` / `url-drift.json`.

**Reguły:** Nigdy nie stosuj automatycznie poprawek sync (wymagane potwierdzenie `[y]` per dokument). Nigdy nie modyfikuj `.agents/` (SSOT). Jeśli brakuje `oma docs`, wypisz wskazówkę instalacji i zakończ — nie przechodź do ręcznych grepów.

**Pliki odczytywane:** docelowy Markdown (`**/*.md` albo żądany glob), `git diff` dla `changedFiles` w sync.
**Pliki zapisywane:** `docs/generated/doc-refs.json` (zawsze regenerowany przez verify), `docs/generated/url-drift.json` (gdy uruchamia się kontrola URL-i), zatwierdzone poprawki dokumentacji (po `[y]` w sync).

**Kiedy używać:** Sprawdzanie, czy dokumentacja nadal odpowiada bazie kodu (uszkodzone ścieżki plików, polecenia CLI, klucze konfiguracji, zmienne środowiskowe), albo proponowanie poprawek po zmianie kodu.

---

### /recap {#recap}

**Opis:** Dzienne lub okresowe podsumowanie pracy przez `oma-recap`. Rozstrzyga datę albo zakres z języka naturalnego, uruchamia `oma recap --json` dla historii wielu narzędzi AI (Grok, Claude, Codex, Qwen, Cursor, Antigravity), deleguje analizę tematów i formatowanie Markdownu do umiejętności, a następnie raportuje TL;DR oraz zapisaną ścieżkę. Wykonuje się inline (bez uruchamiania subagentów); wszyscy dostawcy wywołują bezpośrednio `oma recap`.

**Słowa kluczowe wyzwalające:** Uniwersalne: "recap". Koreańskie: "리캡". Japońskie: "リキャップ".

**Kroki:** Wykryj tryb i rozstrzygnij zakres (`daily` domyślnie z dzisiejszą datą; `period`, gdy wyrażenia typu "this week" / "지난 7일" rozstrzygają się do `--window Nd`) -> wyodrębnij filtr `--tool` tylko, gdy użytkownik jawnie wymienia narzędzia (`grok, claude, codex, qwen, cursor, antigravity`) -> preflight (`command -v oma`) -> uruchom `oma recap --json` (daily: `--date YYYY-MM-DD` albo pominięte; period: `--window 7d` / `30d`) -> zsyntetyzuj i zapisz w kontrakcie umiejętności (próg tematu 15 minut, szablon dzienny albo wielodniowy) -> zaraportuj TL;DR w 3 punktach i ścieżkę zapisu.

**Reguły:** Nigdy nie modyfikuj `.agents/` (SSOT). Nigdy nie tłumacz automatycznie terminów technicznych (nazw projektu, narzędzi, flag CLI) w zapisanym podsumowaniu. Nie twórz podsumowania, gdy nie ma źródła.

**Pliki odczytywane:** historie rozmów narzędzi AI (przez `oma recap`).
**Pliki zapisywane:** `.agents/results/recap/{date}.md` albo `.agents/results/recap/{start}~{end}.md`.

**Kiedy używać:** Podsumowanie pracy wykonanej w narzędziach AI w danym dniu lub okresie (tydzień/miesiąc), opcjonalnie ograniczone do wskazanych narzędzi.

---

### /stack-set {#stack-set}

**Opis:** Automatycznie wykrywa stos technologiczny projektu i generuje referencje właściwe dla języka dla rozstrzygniętej umiejętności domenowej (backend albo mobile). Wykrywa stosy mobile (Swift/iOS przez `Package.swift`/`.xcodeproj`, Flutter przez `pubspec.yaml`, React Native przez `package.json` + react-native) i kieruje do `oma-mobile`; w przeciwnym razie do `oma-backend`. W monorepo, gdzie obecne są oba, pyta, który skonfigurować.

**Słowa kluczowe wyzwalające:** Brak (wyłączone z automatycznego wykrywania).

<!-- oma-docs:ignore-start -->
**Kroki:** Wykryj (przeskanuj manifesty: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> potwierdź (wyświetl wykryty stos i uzyskaj potwierdzenie użytkownika) -> wygeneruj (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` z 8 wymaganymi wzorcami, `stack/api-template.*`) -> zweryfikuj.
<!-- oma-docs:ignore-end -->

**Wynik:** Pliki w katalogu `stack/` rozstrzygniętej umiejętności domenowej (np. `.agents/skills/oma-backend/stack/` albo `.agents/skills/oma-mobile/stack/`). Nie modyfikuje SKILL.md ani `resources/`.

---

### /video {#video}

**Opis:** Przeprowadź umiejętność `oma-video` od początku do końca: brief → skrypt → narracja → wizualia → napisy → render-spec → zarządzany kompozytor HyperFrames (albo MoneyPrinterTurbo). Workflow tworzy odtwarzalny katalog uruchomienia i emituje prawdziwy `.mp4` dopiero po pomyślnym przejściu kontroli kompozytora i ffprobe. Konfiguracja dostawcy może opcjonalnie nie zawierać klucza dla obsługiwanych fallbacków zasobów; błąd kompozytora albo toolchainu nadal kończy przebieg niepowodzeniem. Wykonuje się inline (bez uruchamiania subagentów).

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalny | "/video", "oma-video", "hyperframes", "shorts", "reels", "screencast" |
| Angielski | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| Koreański | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Japoński | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Chiński | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**Kroki:**
1. **Rozstrzygnij brief i tryb:** wybierz `shorts` (9:16), `explainer` (16:9) albo `demo` (przechwytywanie ekranu/sieci); zastosuj domyślne wartości trybu, które można nadpisać flagami.
2. **Skomponuj skrypt:** wygeneruj sceny i narrację (LLM, gdy istnieje klucz, w przeciwnym razie deterministyczny zarys z briefu).
3. **Zsyntetyzuj zasoby:** narracja przez `oma-voice`, wizualia przez `oma-image`/`oma-slide`/stock, dopasowanie napisów bez klucza albo nadzorowane przechwytywanie webu w przeglądarce dla `demo --source web`. Każdy dostawca przechodzi do deterministycznego fallbacku.
4. **Zbuduj render-spec:** zapisz `render-spec.json` (granicę determinizmu) i zasoby w katalogu uruchomienia.
5. **Renderuj:** uruchom zarządzany projekt HyperFrames (albo MoneyPrinterTurbo) jako podproces. Zwykły błąd kompozytora lub toolchainu kończy przebieg niepowodzeniem; deterministyczny placeholder jest dostępny wyłącznie przez jawny tryb mock/test (`OMA_VIDEO_MOCK=1`). Przechwytywanie na żywo zapisuje się w manifeście jako `nondeterministic`.

**Wynik:** Katalog uruchomienia w `.agents/results/videos/{timestamp}-{shortid}-{mode}/` z plikami `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4` i `manifest.json`. Zobacz [Przewodnik generowania wideo](../guide/video-generation.md).

---

### /schedule {#schedule}

**Opis:** Rejestruj i zarządzaj zadaniami agentów zależnymi od czasu przez polecenia `oma schedule <action>`. Zadania znajdują się w globalnym rejestrze (`~/.oma/schedule/`) i uruchamiają się przez scheduler systemu operacyjnego (launchd na macOS, timery użytkownika systemd na Linuxie, schtasks na Windowsie, crontab jako fallback POSIX); każde uruchomienie ponownie wchodzi do harnessu przez `oma agent spawn`.

**Słowa kluczowe wyzwalające:** Brak (workflow wywoływany slashem dla czasowych zadań `oma schedule <action>`).

**Kroki:** Rozstrzygnij intencję (add / list / remove / sync) -> sparsuj harmonogram (jawne `--cron` albo język naturalny przez `--every`) -> zarejestruj przez `oma schedule create` (przechwytywanie zmiennych środowiskowych tylko nazw, pliki 0600) -> zweryfikuj przez `oma schedule list` (manifest × dryf OS, grupowanie według projektu) -> zaraportuj ID zadania i następny czas uruchomienia.

**Kiedy używać:** Powtarzalne zadania agentów — nocne podsumowania, zaplanowane skany, okresowe porządki — które muszą uruchamiać się nawet bez otwartej sesji interaktywnej.

---

### /explain {#explain}

**Opis:** Przeprowadź umiejętność `oma-explanation` od początku do końca: zamień diff, PR, branch albo zakres commitów w samodzielne, interaktywne objaśnienie HTML (Background / Intuition / Code / Quiz). Wykonuje się inline (bez uruchamiania subagentów).

**Słowa kluczowe wyzwalające:** Brak („explain” jest codziennym słowem — wykrywanie słów kluczowych dawałoby fałszywe alarmy przy zwykłych pytaniach „explain this function”, więc workflow działa tylko przez slash).

**Kroki:** Rozstrzygnij argumenty (referencja docelowa: jawny zakres PR# / branch / SHA -> staged -> dirty tree -> `HEAD~1..HEAD`; poziom czytelnika `onboarding` | `reviewer`; język wyniku; liczba quizów) -> załaduj kontrakty (`oma-explanation` SKILL.md + zasoby) -> zbierz i zastosuj bramkę (diff + kod otaczający; skan sekretów przed generowaniem; tekst diffu/PR traktuj wyłącznie jako dane) -> wygeneruj HTML zgodnie z kontraktami dokumentu i HTML -> zweryfikuj (checklista grep obejmująca końcowy skan sekretów HTML, maks. 3 pętle poprawek) -> dostarcz (`open` tylko ostrzeżenie, TL;DR + ścieżka).

**Wynik:** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html` (data w strefie `timezone` z oma-config, a gdy jej brak — w strefie czasowej systemu; ponowne uruchomienie tej samej daty i slugu nadpisuje). Zobacz [Przewodnik objaśniania kodu](../guide/code-explainer.md).

---

## Umiejętności a workflowy {#skills-vs-workflows}

| Aspekt | Umiejętności | Workflowy |
|--------|--------|-----------|
| **Czym są** | Wiedza agenta (co agent wie) | Procesy orkiestracji (jak agenci współpracują) |
| **Lokalizacja** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Aktywacja** | Automatycznie przez słowa kluczowe routingu umiejętności | Komendy slash albo słowa kluczowe wyzwalające |
| **Zakres** | Wykonanie w jednej domenie | Wielokrokowe, często wieloagentowe |
| **Przykłady** | „Zbuduj komponent React” | „Zaplanuj funkcję -> zbuduj -> przejrzyj -> zatwierdź” |

---

## Automatyczne wykrywanie: jak działa {#auto-detection-how-it-works}

### System hooków {#the-hook-system}

oh-my-agent używa hooka `UserPromptSubmit` uruchamianego przed przetworzeniem każdej wiadomości użytkownika. Ustawienia dostawcy rejestrują jeden wpis `<hookDir>/oma-hook.sh --vendor <v> --event <e>`, który kieruje do `oma hook run`, gdzie łańcuch handlerów działa w procesie. Łańcuch składa się z:

1. **`triggers.json`** (`.agents/hooks/core/triggers.json`, wbudowane w plik binarny `oma`): definiuje mapowania słów kluczowych na workflowy dla wszystkich 11 obsługiwanych języków (angielskiego, koreańskiego, japońskiego, chińskiego, hiszpańskiego, francuskiego, niemieckiego, portugalskiego, rosyjskiego, niderlandzkiego i polskiego).
2. **`keyword-detector.ts`** (`.agents/hooks/core/keyword-detector.ts`): logika TypeScript skanująca wejście użytkownika względem słów kluczowych wyzwalających każdego języka i wstrzykująca kontekst aktywacji workflowu.
3. **`persistent-mode.ts`** (`.agents/hooks/core/persistent-mode.ts`): egzekwuje wykonywanie workflowu trwałego przez sprawdzanie aktywnych plików stanu i ponowne wstrzykiwanie kontekstu workflowu.

### Przepływ wykrywania {#detection-flow}

1. Użytkownik wpisuje wejście w języku naturalnym
2. Hook sprawdza, czy obecna jest jawna komenda `/command` (jeśli tak, pomija wykrywanie, aby uniknąć duplikacji)
3. Hook oczyszcza wejście (usuwa bloki kodu, ciągi w cudzysłowach i wklejone bloki echo systemu), a następnie skanuje `.agents/hooks/core/triggers.json`, obejmując zarówno listy słów kluczowych (frazy literalne), jak i `patterns` (surowy regex). Strażnik wzmocnienia tłumi ponowne wyzwolenia, jeśli ten sam workflow uruchomił się co najmniej 2 razy w ostatnich 60 sekundach.
4. Jeśli znaleziono dopasowanie, sprawdź, czy wejście pasuje do wzorców informacyjnych
5. Jeśli jest informacyjne (np. „what is orchestrate?”), odfiltruj je (workflow nie zostaje wyzwolony)
6. Jeśli jest operacyjne, wstrzyknij `[OMA WORKFLOW: {workflow-name}]` do kontekstu. Gdy pasuje kilka workflowów, pierwszeństwo ma jawne wywołanie, a następnie najdłuższe słowo kluczowe.
7. Dla workflowu trwałego tylko jawne wywołanie (`explicit` w `triggers.json`) zapisuje plik stanu trybu trwałego; dopasowanie w języku naturalnym jest wstrzykiwane jako sugestia, a prompt zakończony pytaniem (`?` w pierwszej lub ostatniej linii) w ogóle go nie wyzwala
8. Agent odczytuje wstrzyknięty znacznik i ładuje odpowiadający plik workflowu z `.agents/workflows/`

### Konwencja sekcji językowych {#language-section-convention}

`.agents/hooks/core/triggers.json` używa struktury sekcji per język dla `keywords`, `patterns` i `informationalPatterns`:

| Sekcja | Zachowanie |
|---------|----------|
| `*` | Uniwersalna. Używaj dla treści angielskich (lingua franca) i tokenów naprawdę międzyjęzykowych (np. nazwa workflowu `"orchestrate"`). |
| `en` | Angielska. Funkcjonalnie równoważna z `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Sformułowania właściwe dla języka. |

Każda sekcja jest zawsze ładowana: użytkownicy piszą prompty w języku, w którym myślą, a ustawienie `language` w `.agents/oma-config.yaml` steruje wyłącznie językiem odpowiedzi. Słowo kluczowe zapisane w jednym języku może pasować tylko do promptu zawierającego to pismo, więc scalenie wszystkich sekcji nie może wyzwolić workflowu w niepowiązanych promptach.

Granice słów zależą wyłącznie od samego słowa kluczowego, nigdy od `language`: słowa kluczowe ASCII dopasowują się tylko jako całe słowa (więc „work” nie pasuje do „network”, a „review” nie pasuje do „preview”), natomiast słowa kluczowe zawierające tekst spoza ASCII dopasowują się jako podciągi, ponieważ partykuły i końcówki fleksyjne w językach CJK doklejają się bezpośrednio do słowa („리뷰해줘”).


### Pole Pattern (surowy regex) {#pattern-field-raw-regex}

Oprócz literalnych `keywords` każdy workflow może deklarować `patterns` — surowe ciągi regex kompilowane z flagami `iu`. Wzorce umożliwiają dopasowanie intencji obejmującej wiele tokenów, które w przeciwnym razie wymagałoby kombinatorycznych list słów kluczowych.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      // Subset of `keywords` that activates persistent mode (persistent workflows only)
      "explicit": ["orchestrate", ...],
      "keywords": { "*": ["orchestrate"], "en": ["do everything", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:me\\s+)?(?:an?)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

Reguły autorstwa:
- Ciągi są kompilowane bezpośrednio; backslashe należy escapować raz dla JSON-a i raz dla regexu (`\\b`, `\\s+`)
- Nie ma automatycznego owijania granicami słów; autor wzorca sam obsługuje `\b`
- Nieprawidłowy regex jest po cichu pomijany w runtime (w czasie edycji konfiguracji widać to przez niepowodzenia testów)

### Filtrowanie wzorców informacyjnych {#informational-pattern-filtering}

Sekcja `informationalPatterns` w `.agents/hooks/core/triggers.json` definiuje frazy wskazujące na pytania, a nie polecenia. Są sprawdzane w oknie 60 znaków wokół każdego potencjalnego dopasowania workflowu:

| Sekcja | Przykłady wzorców |
|---------|----------------------|
| `*` (uniwersalny angielski) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Jeśli wejście pasuje jednocześnie do wyzwalacza workflowu i wzorca informacyjnego, wzorzec informacyjny ma priorytet i workflow nie jest wyzwalany. To blokuje prompty takie jak:
- `"How do you build a TODO app?"`: `how do` w `*` blokuje regex intencji orchestrate
- `"orchestrate 트리거 해주면 되나요?"`: `트리거` w `ko` blokuje słowo kluczowe orchestrate

### Wykluczane workflowy {#excluded-workflows}

Poniższe workflowy nie są wyzwalane słowami kluczowymi i trzeba je wywołać jawną `/command`. `/tools` i `/stack-set` znajdują się w `excludedWorkflows` (celowo usunięte z wykrywania słów kluczowych); `/convert` nie dostarcza słów kluczowych wyzwalających (umiejętności `oma-pdf` i `oma-hwp` mają własne wykrywanie); `/schedule` jest workflowem wywoływanym slashem (zadania czasowe `oma schedule <action>`); `/explain` nie dostarcza słów kluczowych, ponieważ „explain” jest codziennym słowem i wykrywanie stale dawałoby fałszywe alarmy:
- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## Mechanika trybu trwałego {#persistent-mode-mechanics}

### Pliki stanu {#state-files}

Workflowy trwałe (orchestrate, ultrawork, work, ralph) tworzą pliki stanu w `.agents/state/`, gdy zostaną wywołane jawnie (zobacz [Workflowy trwałe](#persistent-workflows)):

```text
.agents/state/
├── orchestrate-state-{sessionId}.json
├── ultrawork-state-{sessionId}.json
├── work-state-{sessionId}.json
└── ralph-state-{sessionId}.json
```

`{sessionId}` to ID sesji hosta, więc równoległe sesje nie współdzielą pliku. Plik zapisuje nazwę workflowu, ID sesji, czas aktywacji i licznik wzmocnień, a po `oma goal set` także kontrakt celu. Postęp faz jest przechowywany w plikach pamięci, takich jak `session-ultrawork.md`, a nie tutaj.

### Wzmocnienie {#reinforcement}

Gdy aktywny jest workflow trwały, hook `persistent-mode.ts` wstrzykuje `[OMA PERSISTENT MODE: {workflow-name}]` do każdej wiadomości użytkownika. Dzięki temu workflow kontynuuje działanie także między turami rozmowy.

### Kontrakt celu (opcjonalna bramka zatrzymania + budżet) {#goal-contract-optional-stop-gate-budget}

`oma goal set` dołącza mechaniczny kontrakt ukończenia do aktywnego workflowu trwałego:

- `--gate typecheck|test|lint`: hook Stop pozwala zakończyć sesję **wyłącznie wtedy, gdy przejdzie skrypt tego pakietu w package.json** (uruchamiany jako tablica argv, bez powłoki; polecenia dowolnego formatu są celowo odrzucane). Po błędzie blokuje z końcówką wyjścia; błędy i timeouty liczą się do limitu wzmocnienia, więc czerwona bramka nie może blokować wiecznie.
- `--budget-minutes <n>`: budżet czasu zegarowego od aktywacji. Po przekroczeniu dezaktywuje workflow i pozwala na uczciwe częściowe zatrzymanie, zapisane w śladzie zdarzeń sesji.

Bez kontraktu tryb trwały zachowuje się jak opisano wyżej — kontrakt jest opcjonalny. Zobacz `goal set` w [referencji poleceń CLI](../cli-interfaces/commands.md#goal-set).

### Dezaktywacja {#deactivation}

Aby dezaktywować workflow trwały, użytkownik mówi „workflow done” (albo jego odpowiednik w skonfigurowanym języku). To:
1. Usuwa plik stanu z `.agents/state/`
2. Zatrzymuje wstrzykiwanie kontekstu trybu trwałego
3. Przywraca zwykłe działanie

Workflow może także zakończyć się naturalnie, gdy wszystkie kroki zostaną ukończone i końcowa bramka przejdzie. Jeśli skonfigurowano bramkę przez `goal set`, przejście tej bramki dezaktywuje workflow automatycznie.

---

## Typowe sekwencje workflowów {#typical-workflow-sequences}

| Cel | Sekwencja |
|------|----------|
| Funkcja w jednej domenie | Opisz zadanie → odpowiednia umiejętność → implementacja → ukierunkowana weryfikacja |
| Złożony projekt wielodomenowy | `/work` → PM planuje → przegląd w autoryzowanym zakresie → uruchomienie agentów → przegląd QA → poprawki → raport |
| Automatyczna implementacja równoległa | `/orchestrate` → załadowanie lub utworzenie planu → rozstrzygnięcie zależności → uruchomienie niezależnych zadań → weryfikacja → raport |
| Pełny proces weryfikacji przed wydaniem | `/ultrawork` → PLAN (plan + 3 przeglądy) → IMPL → VERIFY (3 przeglądy) → REFINE (2 przeglądy + 3 działania refaktoryzacyjne) → SHIP (4 przeglądy) |
| Badanie błędu | `/debug` → reprodukcja → przyczyna źródłowa → minimalna poprawka → test regresji → skan podobnych wzorców |
| Pipeline od designu do implementacji | `/brainstorm` → dokument designu → `/plan` → podział zadań → `/orchestrate` → implementacja równoległa → `/review` → `/scm` |
| Konfiguracja nowej bazy kodu | `/deepinit` → AGENTS.md + ARCHITECTURE.md + `docs/` |
| Powtarzane wykonanie z weryfikacją przez sędziego | `/ralph` → zdefiniowanie kryteriów → ultrawork → bramka artefaktów → sędzia → powtórzenie w razie potrzeby → raport ukończenia, częściowego ukończenia lub zabezpieczenia |

---

## Zobacz także {#see-also}

- [Wykonywanie równoległe](./parallel-execution.md): `oma agent spawn`, `oma agent parallel` i monitorowanie
- [Struktura projektu](./project-structure.md): gdzie znajdują się pliki stanu workflowów i pamięci
- [`oma goal set`](../cli-interfaces/commands.md#goal-set): bramka zatrzymania i budżet dla workflowów trwałych
- [Przewodnik po projekcie wieloagentowym](../guide/multi-agent-project.md)
- [Rozwiązywanie problemów](../guide/troubleshooting.md)
- [Słownik](../getting-started/glossary.md)
