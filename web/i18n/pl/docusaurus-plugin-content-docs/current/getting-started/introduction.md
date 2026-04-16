---
title: Wprowadzenie
description: Kompleksowy przegląd oh-my-agent — wieloagentowego frameworka orkiestracji, który zamienia asystentów AI do kodowania w wyspecjalizowane zespoły inżynieryjne z 14 agentami domenowymi, progresywnym ładowaniem umiejętności i przenośnością między IDE.
---

# Wprowadzenie

oh-my-agent to wieloagentowy framework orkiestracji dla IDE i narzędzi CLI zasilanych sztuczną inteligencją. Zamiast polegać na jednym asystencie AI do wszystkiego, oh-my-agent rozdziela pracę pomiędzy 14 wyspecjalizowanych agentów — każdy z nich jest wzorowany na rzeczywistej roli w zespole inżynierskim i posiada własną wiedzę o stosie technologicznym, protokoły wykonawcze, podręczniki obsługi błędów oraz listy kontrolne jakości.

Cały system znajduje się w przenośnym katalogu `.agents/` wewnątrz projektu. Przełączaj się między Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor lub dowolnym innym obsługiwanym narzędziem — konfiguracja agentów podróżuje razem z kodem.

---

## Paradygmat wieloagentowy

Tradycyjni asystenci AI do kodowania działają jako generaliści. Obsługują frontend, backend, bazy danych, bezpieczeństwo i infrastrukturę z tym samym kontekstem promptu i tym samym poziomem kompetencji. Prowadzi to do:

- **Rozwodnienia kontekstu** — ładowanie wiedzy z każdej domeny marnuje okno kontekstowe
- **Niespójnej jakości** — generalista nie dorówna specjaliście w żadnej pojedynczej domenie
- **Braku koordynacji** — złożone funkcjonalności obejmujące wiele domen są realizowane sekwencyjnie

oh-my-agent rozwiązuje to poprzez specjalizację:

1. **Każdy agent dogłębnie zna jedną domenę.** Agent frontendowy zna React/Next.js, shadcn/ui, TailwindCSS v4, architekturę FSD-lite. Agent backendowy zna wzorzec Repository-Service-Router, zapytania parametryzowane, uwierzytelnianie JWT. Nie nakładają się na siebie.

2. **Agenci działają równolegle.** Podczas gdy agent backendowy buduje API, agent frontendowy już tworzy interfejs użytkownika. Orkiestrator koordynuje pracę poprzez współdzieloną pamięć.

3. **Jakość jest wbudowana.** Każdy agent posiada listę kontrolną specyficzną dla domeny oraz podręcznik obsługi błędów. Kontrola wstępna karty (Charter preflight) wyłapuje pełzanie zakresu zanim kod zostanie napisany. Przegląd QA to pełnoprawny krok, a nie dodatkowe działanie po fakcie.

---

## Wszystkie 14 agentów

### Ideacja i planowanie

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-brainstorm** | Ideacja z priorytetem projektowania | Eksploruje intencje użytkownika, proponuje 2-3 podejścia z analizą kompromisów, tworzy dokumenty projektowe przed napisaniem jakiegokolwiek kodu. 6-fazowy workflow: Kontekst, Pytania, Podejścia, Projekt, Dokumentacja, Przejście do `/plan`. |
| **oma-pm** | Menedżer produktu | Rozkłada wymagania na priorytetyzowane zadania z zależnościami. Definiuje kontrakty API. Generuje `.agents/results/plan-{sessionId}.json` i `task-board.md`. Obsługuje koncepcje ISO 21500, ramowanie ryzyka ISO 31000, zarządzanie ISO 38500. |

### Implementacja

| Agent | Rola | Stos technologiczny i zasoby |
|-------|------|----------------------|
| **oma-frontend** | Specjalista UI/UX | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, architektura FSD-lite. Biblioteki: luxon (daty), ahooks (hooki), es-toolkit (narzędzia), Jotai (stan klienta), TanStack Query (stan serwera), @tanstack/react-form + Zod (formularze), better-auth (uwierzytelnianie), nuqs (stan URL). Zasoby: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | Specjalista API i serwera | Czysta architektura (Router-Service-Repository-Models). Niezależny od stosu — wykrywa Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET z manifestów projektu. JWT + bcrypt do uwierzytelniania. Zasoby: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Obsługuje `/stack-set` do generowania referencji `stack/` specyficznych dla języka. |
| **oma-mobile** | Mobilne aplikacje międzyplatformowe | Flutter, Dart, Riverpod/Bloc do zarządzania stanem, Dio z interceptorami do wywołań API, GoRouter do nawigacji. Czysta architektura: domain-data-presentation. Material Design 3 (Android) + iOS HIG. Cel: 60fps. Zasoby: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Architektura baz danych | Modelowanie baz SQL, NoSQL i wektorowych. Projektowanie schematów (domyślnie 3NF), normalizacja, indeksowanie, transakcje, planowanie pojemności, strategia backupów. Obsługuje projektowanie zgodne z ISO 27001/27002/22301. Zasoby: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Projektowanie

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-design** | Specjalista systemu projektowego | Tworzy DESIGN.md z tokenami, typografią, systemami kolorów, projektowaniem ruchu (motion/react, GSAP, Three.js), układami responsive-first, zgodnością z WCAG 2.2. 7-fazowy workflow: Konfiguracja, Ekstrakcja, Ulepszenie, Propozycja, Generacja, Audyt, Przekazanie. Wymusza anty-wzorce (bez "AI slop"). Opcjonalna integracja ze Stitch MCP. Zasoby: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, plus katalog `reference/` z przewodnikami typografii, kolorów, przestrzeni, ruchu, responsywności, komponentów, dostępności i shaderów. |

### Infrastruktura i DevOps

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastruktura jako kod | Wielochmurowy Terraform (AWS, GCP, Azure, Oracle Cloud). Uwierzytelnianie OIDC-first, IAM z zasadą minimalnych uprawnień, polityka jako kod (OPA/Sentinel), optymalizacja kosztów. Obsługuje kontrole AI ISO/IEC 42001, ciągłość działania ISO 22301, dokumentację architektury ISO/IEC/IEEE 42010. Zasoby: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Automatyzacja zadań monorepo | Menedżer zadań mise, pipeline CI/CD, migracje baz danych, koordynacja wydań, hooki git, walidacja pre-commit. Zasoby: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### Jakość i debugowanie

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-qa** | Zapewnienie jakości | Audyt bezpieczeństwa (OWASP Top 10), analiza wydajności, dostępność (WCAG 2.1 AA), przegląd jakości kodu. Poziomy: CRITICAL/HIGH/MEDIUM/LOW z plik:linia i kodem naprawczym. Obsługuje charakterystyki jakości ISO/IEC 25010 i dopasowanie testów ISO/IEC 29119. Zasoby: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Diagnoza i naprawa błędów | Metodologia reproduce-first. Analiza przyczyn źródłowych, minimalne poprawki, obowiązkowe testy regresji, skanowanie podobnych wzorców. Używa Serena MCP do śledzenia symboli. Zasoby: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Lokalizacja, koordynacja i Git

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-translator** | Tłumaczenie uwzględniające kontekst | 4-etapowa metoda tłumaczenia: Analiza źródła, Ekstrakcja znaczenia, Rekonstrukcja w języku docelowym, Weryfikacja. Zachowuje ton, rejestr i terminologię domenową. Wykrywanie anty-wzorców AI. Obsługuje tłumaczenie wsadowe (pliki i18n). Opcjonalny 7-etapowy tryb udoskonalony dla jakości publikacyjnej. Zasoby: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Automatyczny koordynator wieloagentowy | Uruchamia subagentów CLI równolegle, koordynuje przez pamięć MCP, monitoruje postęp, wykonuje pętle weryfikacyjne. Konfigurowalny: MAX_PARALLEL (domyślnie 3), MAX_RETRIES (domyślnie 2), POLL_INTERVAL (domyślnie 30s). Zawiera pętlę przeglądu agent-do-agenta oraz monitoring Clarification Debt. Zasoby: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Konwencjonalne commity | Analizuje zmiany, określa typ/zakres, dzieli po funkcjonalnościach gdy to stosowne, generuje wiadomości commitów w formacie Conventional Commits. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

---

## Model progresywnego ujawniania

oh-my-agent wykorzystuje dwuwarstwową architekturę umiejętności, aby zapobiec wyczerpaniu okna kontekstowego:

**Warstwa 1 — SKILL.md (~800 bajtów, zawsze załadowana):**
Zawiera tożsamość agenta, warunki routingu, podstawowe reguły oraz wskazówki "kiedy używać / kiedy NIE używać". To jedyne co jest załadowane, gdy agent nie pracuje aktywnie.

**Warstwa 2 — resources/ (ładowane na żądanie):**
Zawiera protokoły wykonawcze, referencje stosu technologicznego, fragmenty kodu, podręczniki obsługi błędów, listy kontrolne i przykłady. Są ładowane tylko gdy agent jest wywoływany do zadania, a nawet wtedy — tylko zasoby istotne dla konkretnego typu zadania (na podstawie oceny trudności i mapowania zadanie-zasób w `context-loading.md`).

Ten projekt oszczędza około 75% tokenów w porównaniu z ładowaniem wszystkiego z góry. Dla modeli flash-tier (kontekst 128K) całkowity budżet zasobów wynosi około 3100 tokenów — zaledwie 2,4% okna kontekstowego.

---

## .agents/ — Jedno źródło prawdy (SSOT)

Wszystko czego oh-my-agent potrzebuje znajduje się w katalogu `.agents/`:

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 15 katalogów umiejętności (14 agentów + _shared)
│   ├── _shared/            # Zasoby podstawowe używane przez wszystkich agentów
│   └── oma-{agent}/        # SKILL.md + resources/ dla każdego agenta
├── workflows/              # 14 definicji workflow
├── agents/                 # 7 definicji subagentów
├── results/plan-{sessionId}.json               # Wygenerowany plan
├── state/                  # Pliki stanu aktywnych workflow
├── results/                # Pliki wyników agentów
└── mcp.json                # Konfiguracja serwera MCP
```

Katalog `.claude/` istnieje tylko jako warstwa integracji z IDE — zawiera dowiązania symboliczne wskazujące na `.agents/`, plus hooki do wykrywania słów kluczowych i pasek stanu HUD. Katalog `.serena/memories/` przechowuje stan runtime podczas sesji orkiestracji.

Taka architektura oznacza, że konfiguracja agentów jest:
- **Przenośna** — zmieniaj IDE bez ponownej konfiguracji
- **Wersjonowana** — commituj `.agents/` razem z kodem
- **Współdzielona** — członkowie zespołu otrzymują tę samą konfigurację agentów

---

## Obsługiwane IDE i narzędzia CLI

oh-my-agent współpracuje z każdym IDE lub CLI zasilanym AI, które obsługuje ładowanie umiejętności/promptów:

| Narzędzie | Metoda integracji | Agenci równolegli |
|------|-------------------|----------------|
| **Claude Code** | Natywne umiejętności + narzędzie Agent | Narzędzie Task do prawdziwego równoległego wykonania |
| **Gemini CLI** | Umiejętności automatycznie ładowane z `.agents/skills/` | `oma agent:spawn` |
| **Codex CLI** | Umiejętności automatycznie ładowane | Równoległe żądania mediowane przez model |
| **Antigravity IDE** | Umiejętności automatycznie ładowane | `oma agent:spawn` |
| **Cursor** | Umiejętności przez integrację `.cursor/` | Ręczne uruchamianie |
| **OpenCode** | Ładowanie umiejętności | Ręczne uruchamianie |

Uruchamianie agentów automatycznie dostosowuje się do każdego dostawcy dzięki protokołowi wykrywania dostawcy, który sprawdza znaczniki specyficzne dla dostawcy (np. narzędzie `Agent` dla Claude Code, `apply_patch` dla Codex CLI).

---

## System routingu umiejętności

Gdy wysyłasz prompt, oh-my-agent określa, który agent go obsłuży, korzystając z mapy routingu umiejętności (`.agents/skills/_shared/core/skill-routing.md`):

| Słowa kluczowe domeny | Kierowane do |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

Dla złożonych żądań obejmujących wiele domen, routing podąża za ustalonymi kolejnościami wykonania. Na przykład "Stwórz aplikację fullstack" kieruje do: oma-pm (plan) następnie oma-backend + oma-frontend (równoległa implementacja) następnie oma-qa (przegląd).

---

## Co dalej

- **[Instalacja](./installation.md)** — Trzy metody instalacji, presety, konfiguracja CLI i weryfikacja
- **[Agenci](/docs/core-concepts/agents)** — Dogłębny przegląd wszystkich 14 agentów i kontrola wstępna karty
- **[Umiejętności](/docs/core-concepts/skills)** — Dwuwarstwowa architektura wyjaśniona
- **[Workflow](/docs/core-concepts/workflows)** — Wszystkie 14 workflow z wyzwalaczami i fazami
- **[Przewodnik użytkowania](/docs/guide/usage)** — Praktyczne przykłady od pojedynczych zadań po pełną orkiestrację
