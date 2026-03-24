---
title: Workflow
description: Kompletna referencja wszystkich 14 workflow oh-my-agent — komendy slash, tryby trwałe i nietrwałe, słowa kluczowe wyzwalające w 11 językach, fazy i kroki, odczytywane i zapisywane pliki, mechanika automatycznego wykrywania przez triggers.json i keyword-detector.ts, filtrowanie wzorców informacyjnych oraz zarządzanie stanem trybu trwałego.
---

# Workflow

Workflow to ustrukturyzowane, wielokrokowe procesy wyzwalane komendami slash lub słowami kluczowymi w języku naturalnym. Definiują sposób współpracy agentów nad zadaniami — od jednofazowych narzędzi po złożone 5-fazowe bramki jakości.

Jest 14 workflow, z których 3 są trwałe (utrzymują stan i nie mogą być przypadkowo przerwane).

---

## Trwałe workflow

Trwałe workflow działają do momentu zakończenia wszystkich zadań. Utrzymują stan w `.agents/state/` i reiniekują kontekst `[OMA PERSISTENT MODE: ...]` przy każdej wiadomości użytkownika aż do jawnej dezaktywacji.

### /orchestrate

**Opis:** Automatyczne równoległe wykonanie agentów oparte na CLI. Uruchamia subagentów przez CLI, koordynuje przez pamięć MCP, monitoruje postęp i wykonuje pętle weryfikacyjne.

**Trwały:** Tak. Plik stanu: `.agents/state/orchestrate-state.json`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "orchestrate" |
| Angielski | "parallel", "do everything", "run everything" |
| Koreański | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| Japoński | "オーケストレート", "並列実行", "自動実行" |
| Chiński | "编排", "并行执行", "自动执行" |
| Hiszpański | "orquestar", "paralelo", "ejecutar todo" |
| Francuski | "orchestrer", "parallèle", "tout exécuter" |
| Niemiecki | "orchestrieren", "parallel", "alles ausführen" |
| Portugalski | "orquestrar", "paralelo", "executar tudo" |
| Rosyjski | "оркестровать", "параллельно", "выполнить всё" |
| Holenderski | "orkestreren", "parallel", "alles uitvoeren" |
| Polski | "orkiestrować", "równolegle", "wykonaj wszystko" |

**Kroki:**
1. **Krok 0 — Przygotowanie:** Odczytaj skill koordynacji, przewodnik ładowania kontekstu, protokół pamięci. Wykryj dostawcę.
2. **Krok 1 — Załaduj/Utwórz plan:** Sprawdź `.agents/plan.json`. Jeśli brak, poproś użytkownika o uruchomienie `/plan` najpierw.
3. **Krok 2 — Inicjalizacja sesji:** Załaduj `user-preferences.yaml`, wyświetl tabelę mapowania CLI, wygeneruj ID sesji (`session-YYYYMMDD-HHMMSS`), utwórz `orchestrator-session.md` i `task-board.md` w pamięci.
4. **Krok 3 — Uruchom agentów:** Dla każdego poziomu priorytetów (najpierw P0, potem P1...), uruchom agentów używając metody właściwej dla dostawcy (narzędzie Agent dla Claude Code, `oh-my-ag agent:spawn` dla Gemini/Antigravity, mediowane przez model dla Codex). Nigdy nie przekraczaj MAX_PARALLEL.
5. **Krok 4 — Monitoruj:** Odpytuj pliki `progress-{agent}.md`, aktualizuj `task-board.md`. Obserwuj zakończenia, niepowodzenia, awarie.
6. **Krok 5 — Weryfikuj:** Uruchom `verify.sh {agent-type} {workspace}` per zakończony agent. Przy niepowodzeniu, ponownie uruchom z kontekstem błędu (maks. 2 ponowienia). Po 2 ponowieniach, aktywuj Pętlę eksploracji: wygeneruj 2-3 hipotezy, uruchom równoległe eksperymenty, oceń, zachowaj najlepszy.
7. **Krok 6 — Zbierz:** Odczytaj wszystkie pliki `result-{agent}.md`, skompiluj podsumowanie.
8. **Krok 7 — Raport końcowy:** Przedstaw podsumowanie sesji. Jeśli mierzono Quality Score, dołącz podsumowanie Experiment Ledger i automatycznie wygeneruj wnioski.

**Odczytywane pliki:** `.agents/plan.json`, `.agents/config/user-preferences.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Zapisywane pliki:** `orchestrator-session.md`, `task-board.md` (pamięć), raport końcowy.

**Kiedy używać:** Duże projekty wymagające maksymalnej równoległości z automatyczną koordynacją.

---

### /coordinate

**Opis:** Krokowa koordynacja wielodomenowa. PM planuje najpierw, następnie agenci wykonują z potwierdzeniem użytkownika przy każdej bramce, po czym następuje przegląd QA i pętla naprawy problemów.

**Trwały:** Tak. Plik stanu: `.agents/state/coordinate-state.json`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "coordinate", "step by step" |
| Koreański | "코디네이트", "단계별" |
| Japoński | "コーディネート", "ステップバイステップ" |
| Chiński | "协调", "逐步" |
| Hiszpański | "coordinar", "paso a paso" |
| Francuski | "coordonner", "étape par étape" |
| Niemiecki | "koordinieren", "schritt für schritt" |

**Kroki:**
1. **Krok 0 — Przygotowanie:** Odczytaj skill, ładowanie kontekstu, protokół pamięci. Zarejestruj start sesji.
2. **Krok 1 — Analiza wymagań:** Zidentyfikuj zaangażowane domeny. Jeśli jedna domena, zasugeruj bezpośrednie użycie agenta.
3. **Krok 2 — Planowanie PM:** PM rozkłada wymagania, definiuje kontrakty API, tworzy priorytetyzowany rozkład zadań, zapisuje do `.agents/plan.json`.
4. **Krok 3 — Przegląd planu:** Przedstaw plan użytkownikowi. **Wymagane potwierdzenie przed kontynuacją.**
5. **Krok 4 — Uruchom agentów:** Uruchom według poziomu priorytetów, równolegle w ramach tego samego poziomu, oddzielne przestrzenie robocze.
6. **Krok 5 — Monitoruj:** Odpytuj pliki postępu, weryfikuj zgodność kontraktów API między agentami.
7. **Krok 6 — Przegląd QA:** Uruchom agenta QA do bezpieczeństwa (OWASP), wydajności, dostępności, jakości kodu.
8. **Krok 6.1 — Quality Score** (warunkowy): Zmierz i zarejestruj linię bazową.
9. **Krok 7 — Iteruj:** Jeśli znaleziono problemy CRITICAL/HIGH, ponownie uruchom odpowiedzialnych agentów. Jeśli ten sam problem utrzymuje się po 2 próbach, aktywuj Pętlę eksploracji.

**Kiedy używać:** Funkcjonalności obejmujące wiele domen, gdzie chcesz krokowej kontroli i zatwierdzenia użytkownika przy każdej bramce.

---

### /ultrawork

**Opis:** Workflow obsesyjnie dbający o jakość. 5 faz, 17 kroków łącznie, z czego 11 to kroki przeglądu. Każda faza ma bramkę, która musi przejść przed kontynuacją.

**Trwały:** Tak. Plik stanu: `.agents/state/ultrawork-state.json`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "ultrawork", "ulw" |

**Fazy i kroki:**

| Faza | Kroki | Agent | Perspektywa przeglądu |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | Agent PM (inline) | Kompletność, Meta-przegląd, Nadmierna inżynieria/Prostota |
| **IMPL** | 5 | Agenci Dev (uruchamiani) | Implementacja |
| **VERIFY** | 6-8 | Agent QA (uruchamiany) | Zgodność, Bezpieczeństwo (OWASP), Zapobieganie regresji |
| **REFINE** | 9-13 | Agent Debug (uruchamiany) | Dzielenie plików, Ponowne użycie, Wpływ kaskadowy, Spójność, Martwy kod |
| **SHIP** | 14-17 | Agent QA (uruchamiany) | Jakość kodu (lint/pokrycie), Przepływ UX, Powiązane problemy, Gotowość do wdrożenia |

**Definicje bramek:**
- **PLAN_GATE:** Plan udokumentowany, założenia wymienione, alternatywy rozważone, przegląd nadmiernej inżynierii wykonany, potwierdzenie użytkownika.
- **IMPL_GATE:** Build przechodzi, testy przechodzą, zmodyfikowano tylko zaplanowane pliki, bazowy Quality Score zarejestrowany (jeśli mierzony).
- **VERIFY_GATE:** Implementacja pasuje do wymagań, zero CRITICAL, zero HIGH, brak regresji, Quality Score >= 75 (jeśli mierzony).
- **REFINE_GATE:** Brak dużych plików/funkcji (> 500 linii / > 50 linii), możliwości integracji wychwycone, efekty uboczne zweryfikowane, kod wyczyszczony, Quality Score nie spadł.
- **SHIP_GATE:** Sprawdzenia jakości przechodzą, UX zweryfikowany, powiązane problemy rozwiązane, lista kontrolna wdrożenia kompletna, końcowy Quality Score >= 75 z nieujemną deltą, końcowe zatwierdzenie użytkownika.

**Zachowanie przy niepowodzeniu bramki:**
- Pierwsze niepowodzenie: powrót do odpowiedniego kroku, naprawa i ponowna próba.
- Drugie niepowodzenie na tym samym problemie: aktywacja Pętli eksploracji (wygeneruj 2-3 hipotezy, przetestuj każdą eksperymentem, oceń, zachowaj najlepszą).

**Warunkowe ulepszenia:** Pomiar Quality Score, decyzje Keep/Discard, Experiment Ledger, Eksploracja hipotez, Auto-uczenie (wnioski z odrzuconych eksperymentów).

**Warunek pominięcia REFINE:** Proste zadania poniżej 50 linii.

**Kiedy używać:** Maksymalna jakość dostarczenia. Gdy kod musi być gotowy do produkcji z kompleksowym przeglądem.

---

## Nietrwałe workflow

### /plan

**Opis:** Rozkład zadań sterowany przez PM. Analizuje wymagania, wybiera stos technologiczny, rozkłada na priorytetyzowane zadania z zależnościami, definiuje kontrakty API.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "task breakdown" |
| Angielski | "plan" |
| Koreański | "계획", "요구사항 분석", "스펙 분석" |
| Japoński | "計画", "要件分析", "タスク分解" |
| Chiński | "计划", "需求分析", "任务分解" |

**Kroki:** Zbieranie wymagań -> Analiza wykonalności technicznej (analiza kodu MCP) -> Definicja kontraktów API -> Dekompozycja na zadania -> Przegląd z użytkownikiem -> Zapis planu.

**Wyjście:** `.agents/plan.json`, zapis do pamięci, opcjonalnie `docs/exec-plans/active/` dla złożonych planów.

**Wykonanie:** Inline (bez uruchamiania subagentów). Konsumowane przez `/orchestrate` lub `/coordinate`.

---

### /exec-plan

**Opis:** Tworzy, zarządza i śledzi plany wykonawcze jako artefakty repozytorium w `docs/exec-plans/`.

**Słowa kluczowe wyzwalające:** Brak (wykluczony z automatycznego wykrywania, wymaga jawnego wywołania).

**Kroki:** Przygotowanie -> Analiza zakresu (ocena złożoności: Prosta/Średnia/Złożona) -> Tworzenie planu wykonawczego (markdown w `docs/exec-plans/active/`) -> Definicja kontraktów API (jeśli międzydomenowe) -> Przegląd z użytkownikiem -> Wykonanie (przekazanie do `/orchestrate` lub `/coordinate`) -> Zakończenie (przeniesienie do `completed/`).

**Wyjście:** `docs/exec-plans/active/{nazwa-planu}.md` z tabelą zadań, logiem decyzji, notatkami o postępie.

**Kiedy używać:** Po `/plan` dla złożonych funkcjonalności wymagających śledzonego wykonania z logowaniem decyzji.

---

### /brainstorm

**Opis:** Ideacja z priorytetem projektowania. Eksploruje intencje, wyjaśnia ograniczenia, proponuje podejścia, tworzy zatwierdzony dokument projektowy przed planowaniem.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "brainstorm" |
| Angielski | "ideate", "explore design" |
| Koreański | "브레인스토밍", "아이디어", "설계 탐색" |
| Japoński | "ブレインストーミング", "アイデア", "設計探索" |
| Chiński | "头脑风暴", "创意", "设计探索" |

**Kroki:** Eksploracja kontekstu projektu (analiza MCP) -> Pytania wyjaśniające (jedno na raz) -> Propozycja 2-3 podejść z kompromisami -> Prezentacja projektu sekcja po sekcji (z zatwierdzeniem użytkownika na każdym kroku) -> Zapis dokumentu projektowego do `docs/plans/` -> Przejście: sugestia `/plan`.

**Reguły:** Żadnej implementacji ani planowania przed zatwierdzeniem projektu. Żadnego kodu na wyjściu. YAGNI.

---

### /deepinit

**Opis:** Pełna inicjalizacja projektu. Analizuje istniejącą bazę kodu, generuje AGENTS.md, ARCHITECTURE.md i ustrukturyzowaną bazę wiedzy `docs/`.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "deepinit" |
| Koreański | "프로젝트 초기화" |
| Japoński | "プロジェクト初期化" |
| Chiński | "项目初始化" |

**Kroki:** Przygotowanie -> Analiza bazy kodu (typ projektu, architektura, niejawne reguły, domeny, granice) -> Generacja ARCHITECTURE.md (mapa domen, poniżej 200 linii) -> Generacja bazy wiedzy `docs/` (design-docs/, exec-plans/, generated/, product-specs/, references/, dokumenty domenowe) -> Generacja głównego AGENTS.md (~100 linii, spis treści) -> Generacja granicznych plików AGENTS.md (pakiety monorepo, poniżej 50 linii każdy) -> Aktualizacja istniejącej infrastruktury (jeśli ponowne uruchomienie) -> Walidacja (brak martwych linków, limity linii).

**Wyjście:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md, oraz dokumenty domenowe według odkryć.

---

### /review

**Opis:** Pełny pipeline przeglądu QA. Audyt bezpieczeństwa (OWASP Top 10), analiza wydajności, sprawdzenie dostępności (WCAG 2.1 AA) i przegląd jakości kodu.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "code review", "security audit", "security review" |
| Angielski | "review" |
| Koreański | "리뷰", "코드 검토", "보안 검토" |
| Japoński | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chiński | "审查", "代码审查", "安全审计" |

**Kroki:** Identyfikacja zakresu przeglądu -> Automatyczne sprawdzenia bezpieczeństwa (npm audit, bandit) -> Ręczny przegląd bezpieczeństwa (OWASP Top 10) -> Analiza wydajności -> Przegląd dostępności (WCAG 2.1 AA) -> Przegląd jakości kodu -> Generacja raportu QA.

**Opcjonalna pętla napraw-weryfikuj** (z `--fix`): Po raporcie QA, uruchom agentów domenowych do naprawy problemów CRITICAL/HIGH, ponowny przegląd QA, powtórz do 3 razy.

**Delegacja:** Dla dużych zakresów, deleguje Kroki 2-7 do uruchomionego subagenta QA.

---

### /debug

**Opis:** Ustrukturyzowana diagnoza i naprawa błędów z pisaniem testów regresji i skanowaniem podobnych wzorców.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "debug" |
| Angielski | "fix bug", "fix error", "fix crash" |
| Koreański | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japoński | "デバッグ", "バグ修正", "エラー修正" |
| Chiński | "调试", "修复 bug", "修复错误" |

**Kroki:** Zbieranie informacji o błędzie -> Reprodukcja (MCP `search_for_pattern`, `find_symbol`) -> Diagnoza przyczyny źródłowej (MCP `find_referencing_symbols` do śledzenia ścieżki wykonania) -> Propozycja minimalnej poprawki (wymagane potwierdzenie użytkownika) -> Zastosowanie poprawki + napisanie testu regresji -> Skanowanie podobnych wzorców (może uruchomić subagenta debug-investigator jeśli zakres > 10 plików) -> Dokumentacja błędu w pamięci.

**Kryteria uruchomienia subagenta:** Błąd obejmuje wiele domen, zakres skanowania > 10 plików, lub potrzebne głębokie śledzenie zależności.

---

### /design

**Opis:** 7-fazowy workflow projektowy produkujący DESIGN.md z tokenami, wzorcami komponentów i regułami dostępności.

**Słowa kluczowe wyzwalające:**
| Język | Słowa kluczowe |
|----------|----------|
| Uniwersalne | "design system", "DESIGN.md", "design token" |
| Angielski | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Koreański | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japoński | "デザイン", "ランディングページ", "デザインシステム" |
| Chiński | "设计", "着陆页", "设计系统" |

**Fazy:** SETUP (zbieranie kontekstu, `.design-context.md`) -> EXTRACT (opcjonalnie, z URL referencyjnych/Stitch) -> ENHANCE (augmentacja niejasnych promptów) -> PROPOSE (2-3 kierunki projektowe z kolorem, typografią, układem, ruchem, komponentami) -> GENERATE (DESIGN.md + tokeny CSS/Tailwind/shadcn) -> AUDIT (responsywność, WCAG 2.2, heurystyki Nielsena, sprawdzanie AI slop) -> HANDOFF (zapis, informacja dla użytkownika).

**Obowiązkowe:** Wszystkie wyjścia responsive-first (mobile 320-639px, tablet 768px+, desktop 1024px+).

---

### /commit

**Opis:** Generuje Conventional Commits z automatycznym dzieleniem według funkcjonalności.

**Słowa kluczowe wyzwalające:** Brak (wykluczony z automatycznego wykrywania).

**Kroki:** Analiza zmian (git status, git diff) -> Oddzielenie funkcjonalności (jeśli > 5 plików obejmujących różne zakresy/typy) -> Określenie typu (feat/fix/refactor/docs/test/chore/style/perf) -> Określenie zakresu (zmieniony moduł) -> Napisanie opisu (tryb rozkazujący, < 72 znaki) -> Natychmiastowe wykonanie commita (bez promptu potwierdzenia).

**Reguły:** Nigdy `git add -A`. Nigdy nie commituj sekretów. HEREDOC dla wieloliniowych wiadomości. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /setup

**Opis:** Interaktywna konfiguracja projektu.

**Słowa kluczowe wyzwalające:** Brak (wykluczony z automatycznego wykrywania).

**Kroki:** Ustawienia języka -> Sprawdzenie stanu instalacji CLI -> Stan połączenia MCP (Serena w trybie Command lub SSE) -> Mapowanie Agent-CLI -> Podsumowanie -> Pytanie o oznaczenie gwiazdką repozytorium.

**Wyjście:** `.agents/config/user-preferences.yaml`.

---

### /tools

**Opis:** Zarządzanie widocznością i ograniczeniami narzędzi MCP.

**Słowa kluczowe wyzwalające:** Brak (wykluczony z automatycznego wykrywania).

**Funkcje:** Pokazanie bieżącego stanu narzędzi MCP, włączanie/wyłączanie grup narzędzi (memory, code-analysis, code-edit, file-ops), zmiany stałe lub tymczasowe (`--temp`), parsowanie języka naturalnego ("memory tools only", "disable code edit").

**Grupy narzędzi:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /stack-set

**Opis:** Automatyczne wykrywanie stosu technologicznego projektu i generowanie referencji specyficznych dla języka dla skill backendu.

**Słowa kluczowe wyzwalające:** Brak (wykluczony z automatycznego wykrywania).

**Kroki:** Wykryj (skanuj manifesty: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj) -> Potwierdź (wyświetl wykryty stos, uzyskaj potwierdzenie użytkownika) -> Wygeneruj (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` z 8 obowiązkowymi wzorcami, `stack/api-template.*`) -> Zweryfikuj.

**Wyjście:** Pliki w `.agents/skills/oma-backend/stack/`. Nie modyfikuje SKILL.md ani `resources/`.

---

## Umiejętności vs workflow

| Aspekt | Umiejętności | Workflow |
|--------|--------|-----------|
| **Czym są** | Kompetencje agenta (co agent wie) | Zorkiestrowane procesy (jak agenci współpracują) |
| **Lokalizacja** | `.agents/skills/oma-{nazwa}/` | `.agents/workflows/{nazwa}.md` |
| **Aktywacja** | Automatyczna przez słowa kluczowe routingu | Komendy slash lub słowa kluczowe wyzwalające |
| **Zakres** | Wykonanie w jednej domenie | Wielokrokowe, często wieloagentowe |
| **Przykłady** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Automatyczne wykrywanie: jak to działa

### System hooków

oh-my-agent używa hooka `UserPromptSubmit`, który uruchamia się przed przetworzeniem każdej wiadomości użytkownika. System hooków składa się z:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Definiuje mapowania słów kluczowych na workflow dla wszystkich 11 obsługiwanych języków (angielski, koreański, japoński, chiński, hiszpański, francuski, niemiecki, portugalski, rosyjski, holenderski, polski).

2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): Logika TypeScript skanująca dane wejściowe użytkownika względem słów kluczowych wyzwalających, respektująca dopasowanie specyficzne dla języka i wstrzykująca kontekst aktywacji workflow.

3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Wymusza wykonanie trwałego workflow sprawdzając aktywne pliki stanu i reiniekując kontekst workflow.

### Przepływ wykrywania

1. Użytkownik wpisuje dane wejściowe w języku naturalnym
2. Hook sprawdza czy obecna jest jawna `/komenda` (jeśli tak, pomiń wykrywanie aby uniknąć duplikacji)
3. Hook skanuje dane wejściowe względem list słów kluczowych `triggers.json`
4. Jeśli znaleziono dopasowanie, sprawdź czy dane wejściowe pasują do wzorców informacyjnych
5. Jeśli informacyjne (np. "what is orchestrate?"), odfiltruj — brak wyzwalania workflow
6. Jeśli akcyjne, wstrzyknij `[OMA WORKFLOW: {nazwa-workflow}]` do kontekstu
7. Agent odczytuje wstrzykniony tag i ładuje odpowiedni plik workflow z `.agents/workflows/`

### Filtrowanie wzorców informacyjnych

Sekcja `informationalPatterns` w `triggers.json` definiuje frazy wskazujące na pytania zamiast poleceń. Są sprawdzane przed aktywacją workflow:

| Język | Wzorce informacyjne |
|----------|----------------------|
| Angielski | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| Koreański | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| Japoński | "とは", "って何", "どうやって", "説明して" |
| Chiński | "是什么", "什么是", "怎么", "解释" |

Jeśli dane wejściowe pasują zarówno do słowa kluczowego workflow jak i wzorca informacyjnego, wzorzec informacyjny ma priorytet i żaden workflow nie jest wyzwalany.

### Wykluczane workflow

Następujące workflow są wykluczone z automatycznego wykrywania i muszą być wywoływane jawną `/komendą`:
- `/commit`
- `/setup`
- `/tools`
- `/stack-set`
- `/exec-plan`

---

## Mechanika trybu trwałego

### Pliki stanu

Trwałe workflow (orchestrate, ultrawork, coordinate) tworzą pliki stanu w `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── coordinate-state.json
```

Te pliki zawierają: nazwę workflow, bieżącą fazę/krok, ID sesji, znacznik czasu i oczekujący stan.

### Wzmocnienie

Gdy trwały workflow jest aktywny, hook `persistent-mode.ts` wstrzykuje `[OMA PERSISTENT MODE: {nazwa-workflow}]` do każdej wiadomości użytkownika. To zapewnia kontynuację wykonania workflow nawet między turami konwersacji.

### Dezaktywacja

Aby dezaktywować trwały workflow, użytkownik mówi "workflow done" (lub odpowiednik w swoim skonfigurowanym języku). To:
1. Usuwa plik stanu z `.agents/state/`
2. Zatrzymuje wstrzykiwanie kontekstu trybu trwałego
3. Powraca do normalnego działania

Workflow może też zakończyć się naturalnie gdy wszystkie kroki zostaną ukończone i końcowa bramka przejdzie.

---

## Typowe sekwencje workflow

### Szybka funkcjonalność
```
/plan → przegląd wyjścia → /exec-plan
```

### Złożony projekt wielodomenowy
```
/coordinate → PM planuje → użytkownik potwierdza → agenci uruchomieni → QA przegląda → naprawa problemów → wysyłka
```

### Maksymalna jakość dostarczenia
```
/ultrawork → PLAN (4 kroki przeglądu) → IMPL → VERIFY (3 kroki przeglądu) → REFINE (5 kroków przeglądu) → SHIP (4 kroki przeglądu)
```

### Śledztwo w sprawie błędu
```
/debug → reprodukcja → przyczyna źródłowa → minimalna poprawka → test regresji → skan podobnych wzorców
```

### Pipeline od projektu do implementacji
```
/brainstorm → dokument projektowy → /plan → rozkład zadań → /orchestrate → równoległa implementacja → /review → /commit
```

### Konfiguracja nowej bazy kodu
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/ → /setup → konfiguracja CLI i MCP
```
