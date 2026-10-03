---
title: Wprowadzenie
description: Kompleksowy przegląd oh-my-agent — wieloagentowego frameworka orkiestracji, który zamienia asystentów AI do kodowania w wyspecjalizowane zespoły inżynieryjne dzięki 33 pakietom umiejętności, 12 definicjom subagentów, progresywnemu ładowaniu umiejętności i przenośności między IDE.
---

# Wprowadzenie {#introduction}

oh-my-agent to wieloagentowy framework orkiestracji dla IDE i narzędzi CLI opartych na AI. Zamiast polegać na jednym asystencie AI do wszystkiego, oh-my-agent kieruje pracę przez 33 pakiety umiejętności i 13 kanonicznych ról dispatchu. Dwanaście plików definicji subagentów znajdujących się w repozytorium dostarcza wielokrotnego użytku persony do implementacji, review, planowania, debugowania, dokumentacji, badań i infrastruktury. `research-explorer.md` mapuje się na kanoniczną rolę `explore`; `orchestrator` jest rolą koordynacji runtime'u bez osobnego pliku definicji.

OMA wykonuje mechaniczne kontrole, gdy je wywołasz lub wybierzesz workflow, który je zawiera. `oma verify agent <agent-type>` uruchamia kontrole dla wybranego typu agenta; `/ralph` dodaje weryfikację opartą na artefaktach i pętlę sędziego; włączone hooki Stop dostawcy mogą utrzymywać workflow otwarty, dopóki wykonywane są jego skonfigurowane kontrole. Samo ładowanie umiejętności nie ustanawia akceptacji, a zwykły prompt nie uruchamia automatycznie każdej bramki workflowu. Użyj kryteriów akceptacji workflowu i powstałych plików, aby zdecydować, co jest ukończone.

Cały system znajduje się w przenośnym katalogu `.agents/` wewnątrz projektu. Możesz przełączać się między Claude Code, Codex CLI, Antigravity CLI lub IDE, Cursorem, OpenCode i innymi obsługiwanymi narzędziami, a konfiguracja agentów podróżuje razem z kodem.

Jeśli dopiero poznajesz OMA, zacznij od [Szybkiego startu](./quick-start.md), a potem przeczytaj [Ważne ustawienia domyślne](./important-defaults.md). Instalacja tworzy SSOT i integracje dostawców; pierwszą użyteczną kontrolą jest `oma doctor`, a pierwszym użytecznym zadaniem — jedna mała zmiana w jednej domenie. Przejdź do `/work` lub `/orchestrate` dopiero wtedy, gdy zadanie wymaga koordynacji.

---

## Paradygmat wieloagentowy {#the-multi-agent-paradigm}

Tradycyjni asystenci AI do kodowania często obsługują frontend, backend, bazy danych, bezpieczeństwo i infrastrukturę z jednego kontekstu promptu. Może to prowadzić do:

- **Rozmycia kontekstu:** ładowanie wiedzy dla każdej domeny marnuje okno kontekstowe
- **Niejasnego właścicielstwa:** zadanie obejmujące wiele domen nie ma wyraźnej granicy odpowiedzialności dla każdej części
- **Ręcznej koordynacji:** złożone funkcje obejmujące wiele domen wymagają przekazań wybieranych przez hosta lub użytkownika

oh-my-agent rozwiązuje ten problem dzięki specjalizacji:

1. **Każda umiejętność ma główną domenę.** Umiejętność frontendowa zna React/Next.js, shadcn/ui, TailwindCSS v4 i architekturę FSD-lite. Umiejętność backendowa zna wzorzec Repository-Service-Router, zapytania parametryzowane i uwierzytelnianie JWT. Domeny mogą nakładać się na granicach, dlatego użyj kryteriów akceptacji zadania, aby zdecydować, czy potrzebna jest druga umiejętność lub workflow koordynujący.
2. **Agenci mogą działać równolegle.** Gdy agent backendowy buduje API, agent frontendowy może pracować we własnym workspace'ie. Orchestrator koordynuje działania za pomocą trwałych plików i potwierdzeń przypisanych do runu.
3. **Wskazówki jakości są wbudowane.** Umiejętności zawierają listy kontroli domeny, podręczniki błędów i reguły charteru. Charter preflight zawęża zakres przed napisaniem kodu; review QA uruchamia się, gdy zawiera go wybrany workflow lub gdy o niego poprosisz.

---

## Obecny katalog: 33 umiejętności, 12 definicji, 21 workflowów {#the-current-catalog-33-skills-12-definitions-21-workflows}

Katalog rozdziela trzy rzeczy, które łatwo pomylić:

- **Umiejętności** to 33 pakiety wiedzy domenowej w `.agents/skills/*/SKILL.md`. Kierują na podstawie intencji wyrażonej naturalnym językiem i progresywnie ładują zasoby.
- **Definicje agentów** to 12 plików w `.agents/agents/`. Dostarczają natywne dla dostawcy persony subagentów i odwołują się do co najmniej jednej umiejętności.
- **Workflowy** to 21 definicji procesów w `.agents/workflows/`. Cztery są trwałe (`orchestrate`, `work`, `ultrawork` i `ralph`); pozostałe kończą się raportem i nie utrzymują aktywnego trybu persistent.

Poniższe sekcje zachowują szczegółowy katalog umiejętności. Gdy nazwa lub opis się zmienia, źródłem prawdy jest frontmatter aktywnego `SKILL.md`.

Dwanaście plików definicji znajdujących się w repozytorium obejmuje 13 ról runtime'u dzięki aliasom: `research-explorer.md` mapuje się na `explore`, a `orchestrator` istnieje tylko w runtime'ie. Pozostałe pliki definicji mapują się na nazwane role wymienione w [Agentach](../core-concepts/agents.md).

### Pomysły, architektura i planowanie {#ideation-architecture-and-planning}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-brainstorm** | Ideacja z podejściem design-first | Bada intencję użytkownika, proponuje 2–3 podejścia z analizą kompromisów i tworzy dokumenty projektowe przed napisaniem kodu. Workflow w 6 fazach: Context, Questions, Approaches, Design, Documentation, Transition to `/plan`. |
| **oma-architecture** | Specjalista architektury systemów | Granice modułów, usług i własności, analiza kompromisów, synteza perspektyw interesariuszy. Metody: routing diagnostyczny, porównanie design-twice, analiza w stylu ATAM, priorytetyzacja w stylu CBAM i decyzje w formie ADR. Domyślnie uwzględnia koszty. |
| **oma-pm** | Product manager | Rozkłada wymagania na zadania uporządkowane według priorytetów i zależności. Definiuje kontrakty API. Tworzy `.agents/results/plan-{sessionId}.json` i tablicę zadań dla sesji. Obsługuje koncepcje ISO 21500, analizę ryzyka ISO 31000 i zarządzanie ISO 38500. |

### Implementacja {#implementation}

| Agent | Rola | Stos technologiczny i zasoby |
|-------|------|----------------------|
| **oma-frontend** | Specjalista UI/UX | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui i architektura FSD-lite. Biblioteki: luxon (daty), ahooks lub @mantine/hooks (hooki), es-toolkit (narzędzia), Jotai/Zustand (stan klienta), TanStack Query przez hooki generowane przez orval (stan serwera), @tanstack/react-form + Zod (formularze), better-auth (uwierzytelnianie), nuqs (stan URL). Zasoby: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md`, `checklist.md`. |
| **oma-backend** | Specjalista API i serwera | Czysta architektura (Router-Service-Repository-Models). Niezależny od stosu; wykrywa Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET na podstawie manifestów projektu. JWT + Argon2id do uwierzytelniania. Zasoby: `execution-protocol.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Obsługuje `/stack-set` do generowania referencji `stack/` specyficznych dla języka. |
| **oma-mobile** | Programowanie mobilne międzyplatformowe | Flutter, Dart, Riverpod/Bloc do zarządzania stanem, Dio z interceptorami do wywołań API i GoRouter do nawigacji. Czysta architektura: domain-data-presentation. Material Design 3 (Android) + iOS HIG. Cel 60 kl./s. Obsługuje też natywne iOS w Swift: SwiftUI + `@Observable` (iOS 17+), Apple `swift-openapi-generator` dla klientów API i układ projektu `App/Core/Features/Shared`. Zasoby: `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md`, `error-playbook.md`; warianty platformowe są materializowane przez `/stack-set`. |
| **oma-db** | Architektura baz danych | Modelowanie baz SQL, NoSQL i wektorowych. Projektowanie schematów (domyślnie 3NF), normalizacja, indeksowanie, transakcje, planowanie pojemności i strategia kopii zapasowych. Obsługuje projektowanie uwzględniające ISO 27001/27002/22301. Zasoby: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Projektowanie {#design}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-design** | Specjalista systemu projektowego | Tworzy DESIGN.md z tokenami, typografią, systemami kolorów i projektowaniem ruchu (motion/react, GSAP, Three.js), układami responsive-first oraz zgodnością z WCAG 2.2. Workflow w 7 fazach: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. Wymusza antywzorce (bez „AI slop”). Opcjonalna integracja ze Stitch MCP. Zasoby: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, a także katalog `reference/` z przewodnikami po typografii, kolorze, przestrzeni, ruchu, responsywności, komponentach, dostępności i shaderach. |

### Infrastruktura, DevOps i obserwowalność {#infrastructure-devops-and-observability}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastruktura jako kod | Wielochmurowy Terraform (AWS, GCP, Azure, Oracle Cloud). Uwierzytelnianie OIDC-first, IAM z zasadą minimalnych uprawnień, polityka jako kod (OPA/Sentinel), optymalizacja kosztów. Obsługuje kontrole AI ISO/IEC 42001, ciągłość działania ISO 22301 i dokumentację architektury ISO/IEC/IEEE 42010. Zasoby: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Automatyzacja zadań monorepo | Menedżer zadań mise, pipeline'y CI/CD, migracje baz danych, koordynacja wydań, hooki git i walidacja pre-commit. Zasoby: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |
| **oma-observability** | Router obserwowalności oparty na intencji | Pokrycie sygnałów MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), strojenie transportu (UDP/MTU, OTLP gRPC vs HTTP, topologia Collectora, próbkowanie), propagacja W3C Trace Context, zarządzanie SLO i alerty burn-rate, analiza śledcza incydentów (lokalizacja 6-wymiarowa), meta-obserwowalność (self-health, synchronizacja zegara, kardynalność, retencja). Podejście CNCF-first; Fluentd jest przestarzały (użyj Fluent Bit lub OTel Collector). |

### Jakość i debugowanie {#quality-and-debugging}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-qa** | Zapewnianie jakości | Audyt bezpieczeństwa (OWASP Top 10), analiza wydajności, dostępność (WCAG 2.2 AA) i przegląd jakości kodu. Poziomy: CRITICAL/HIGH/MEDIUM/LOW z file:line i kodem remediacji. Obsługuje charakterystyki jakości ISO/IEC 25010 i dopasowanie testów ISO/IEC 29119. Zasoby: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Diagnozowanie i naprawa błędów | Metodologia reproduce-first. Analiza przyczyn źródłowych, minimalne poprawki, obowiązkowe testy regresji i skanowanie podobnych wzorców. Używa narzędzi MCP do inteligencji kodu (Gortex lub Serena) do śledzenia symboli. Zasoby: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |
| **oma-refactor** | Refaktoryzacja zachowująca działanie | Bezpieczna, przyrostowa restrukturyzacja zabezpieczona testami charakterystyki. Wyszukiwanie hotspotów (złożoność × churn), wybór code smell/SATD, odwrócenie metodą Mikado przy niepowodzeniu, expand-contract dla zmian stanowych, commity tylko refaktoryzujące (bez mieszania zmiany zachowania). Transformacje engine-first (zmiana nazwy w IDE, jscodeshift/ast-grep), metryki przez `uvx lizard` / `uvx radon`. Czytelność jest kryterium sukcesu; metryki są przybliżeniami. |

### Lokalizacja, koordynacja i Git {#localization-coordination-and-git}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-translation** | Tłumaczenie uwzględniające kontekst | Sześcioetapowy przepływ: Prepare, Acquire, Reason, Act, Verify, Finalize. Metoda tłumaczenia ma cztery kroki: odczytanie znaczenia i chronionej składni, wybór rejestru, rekonstrukcja w języku docelowym i zachowanie stylu autora tam, gdzie ma to zastosowanie. Profile języków docelowych (`resources/lang/{code}.md`) zawierają zasady rejestru i typografii. Zasoby: `translation-rubric.md`, `anti-ai-patterns.md`, `lang/{ko,ja,zh,en}.md`. |
| **oma-orchestration** | Automatyczny koordynator wieloagentowy | Uruchamia subagentów CLI równolegle, koordynuje ich przez trwałą sesję, tablicę zadań, pliki postępu i wyników oraz monitoruje pętle weryfikacji. Konfiguracja: MAX_PARALLEL (domyślnie 3), MAX_RETRIES (domyślnie 2), POLL_INTERVAL (domyślnie 30 s). Zawiera pętlę review między agentami i opcjonalne dowody sesji. Zasoby: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Zarządzanie konfiguracją oprogramowania (SCM) i Git | Obsługuje strategie branchowania, workflowy merge/rebase/conflict, workspace'y, baseline'y i śledzenie stanu wydań. Prowadzi też przez Conventional Commit z bezpiecznym stagingiem; traile co-author pochodzą z aktywnej konfiguracji `scm.co_author`, gdy jest włączona. |
| **oma-coordination** | Ręczny przewodnik po workflowie wieloagentowym | Krok po kroku koordynuje PM, Frontend, Backend, Mobile i QA za pomocą CLI `oma agent spawn`. Zaczyna od dekompozycji PM, uruchamia zadania o tym samym priorytecie w osobnych workspace'ach, monitoruje pliki postępu i wyników przypisane do runu, uzgadnia kontrakty API/danych przed pracą frontendową i mobilną, a kończy review QA. Ręczny odpowiednik `oma-orchestration`. |



### Wyszukiwanie, retrospektywa i przetwarzanie dokumentów {#search-retrospective-and-document-processing}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-search** | Router wyszukiwania oparty na intencji | Kieruje zapytania do Context7 (dokumentacja), natywnego wyszukiwania w sieci, `gh`/`glab` (kod) i lokalnej inteligencji kodu (Gortex lub Serena). Nadaje wynikom spoza repozytorium ocenę wiarygodności domeny. Routing fail-forward (dokumentacja→sieć→pobranie). Flagi: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | Retrospektywa pracy między narzędziami | Analizuje historię rozmów z Grok, Claude, Codex, Gemini, Qwen, Cursor i Antigravity. Rozpoznaje daty i zakresy podane językiem naturalnym, grupuje dane według narzędzia i sesji, wyodrębnia tematy, tworzy podsumowania dzienne lub okresowe oraz odnotowuje, gdy CLI ogranicza żądany zakres do 30 dni. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | Konwertuje koreańskie dokumenty edytorów tekstu za pomocą `bunx kordoc@latest`. Zachowuje nagłówki, tabele (w tym zagnieżdżone), przypisy, hiperłącza i obrazy. Usuwa znaki Hancom Private Use Area za pomocą postprocesora `flatten-tables.ts`. |
| **oma-pdf** | PDF → Markdown | Konwertuje dokumenty PDF za pomocą `uvx opendataloader-pdf`. Zachowuje nagłówki, tabele, listy i obrazy; dla skanowanych plików używa hybrydowego trybu OCR, a wynik normalizuje przez `uvx mdformat`. |

### Pisanie akademickie i badawcze {#academic-and-research-writing}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-academic-writing** | Proza angielska na poziomie publikacji | Tworzy, poprawia i audytuje eseje, raporty, podsumowania dla kadry kierowniczej, wnioski i przeglądy literatury. Jednocześnie egzekwuje cztery protokoły: Sentence Structure (4 typy, zróżnicowana długość i początki), Verb (zakazane ogólne czasowniki zastępowane elementami stopniowanego korpusu akademickiego), Hedging (siła dopasowana do dowodów) oraz zgodność z zasadami Anti-AI. Obejmuje bramkę quote-before-judgment, mapę Claim-Evidence i odwrotne konspektowanie. Tryby: `draft` / `revise` / `review`. |
| **oma-scholar** | Towarzysz sidecarów artykułów badawczych | Wyszukuje, generuje, sprawdza, recenzuje i porównuje publikacje naukowe za pomocą specyfikacji sidecarów Knows `.knows.yaml` (v0.9.0 / `paper@1`). Zapewnia oszczędny dostęp do twierdzeń, dowodów i relacji (~700 tokenów tylko dla twierdzeń wobec ~10 tys. dla pełnego PDF-a). `oma scholar search/resolve/get/lint` działa przez knows.academy z automatycznym przejściem do OpenAlex dla prac sprzed 2026 roku. Ochrona przed konfabulacją: pomija nieznane pola zamiast zgadywać. |

### Bezpieczeństwo {#security}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-deepsec** | Sterownik skanera podatności opartego na agentach | Obsługuje Vercel `deepsec` (`bunx deepsec`) od początku do końca: wykonuje `init` dla workspace `.deepsec/`, zapisuje projektowy `INFO.md`, uruchamia oszczędne kosztowo przejścia `scan`/`process`/`triage`/`revalidate`/`export`, bramkuje PR-y przez `process --diff` z dwu-zadaniowym wzorcem CI i tworzy własne matchery. Przed dużym przebiegiem kalibruje parametrami `--limit 50 --concurrency 5` i podaje prognozę kwotową przed płatną pracą; koszt zależy od rozmiaru repozytorium i backendu. Backend agentowy: `codex` (gpt-5.5) lub `claude` (claude-opus-4-8). |

### Dokumentacja i metanarzędzia {#documentation-and-meta-tooling}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-docs** | Wykrywanie dryfu dokumentacji | Tryb `verify` deterministycznie sprawdza `docs/**/*.md` pod kątem uszkodzonych odwołań (ścieżki plików, polecenia CLI, klucze konfiguracji, zmienne środowiskowe, skrypty) i kończy działanie kodem 0/1; tryb `sync` koreluje diff gita z kandydackimi dokumentami i tworzy propozycje poprawek hosta LLM, zatwierdzane osobno dla każdego dokumentu (nigdy nie stosuje ich automatycznie). Sprawdzanie URL-i deleguje do `lychee`; CLI emituje uporządkowany JSON, a host LLM wykonuje całą syntezę (bez wywołań SDK dostawcy). Nigdy nie modyfikuje `.agents/`. |
| **oma-skill-creation** | Specjalista tworzenia umiejętności w formacie SSL-lite | Tworzy, aktualizuje i audytuje umiejętności OMA w formacie SSL-lite z czterema wymaganymi sekcjami (Scheduling / Structural Flow / Logical Operations / References). Klasyfikuje typ umiejętności, wstawia dokładnie jedną kanoniczną ścieżkę inline, egzekwuje trasy krzyżowe `When NOT to use` i uruchamia `oma skill audit`, aby wykrywać kolizje opisów (ostrzeżenie przy ≥ 60%, błąd przy ≥ 75% cosinusowego podobieństwa TF-IDF). Długi wariant szczegółów przenosi do `resources/`. |
| **oma-explanation** | Objaśnianie zmian w kodzie | Zamienia diff, PR, branch lub zakres commitów w samodzielne objaśnienie HTML działające offline, z sekcjami Background, Intuition, Code i Quiz. Workflow `/explain` sprawdza końcowy artefakt i zapisuje go w `.agents/results/explain/`. |

### Badania rynku {#market-research}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-market** | Inteligencja sygnałów społecznościowych | Uruchamia nadrzędny silnik `last30days` (Reddit z rzeczywistymi głosami i komentarzami, X, YouTube, TikTok, HN, Polymarket, GitHub, arXiv, Techmeme, Bluesky, sieć i inne) przez `oma market run`; OMA utrzymuje silnik **zawsze w najnowszym wydaniu** (`~/.cache/oma-market/`), przepuszcza każdy przebieg przez `detect-trap`, klasyfikuje intencję (problem / trend / konkurent / odkrywanie) i dołącza sekcje SWOT / Portera 5F / PESTEL. Tworzy jeden brief zgodny z LAW w `.agents/results/market/{slug}-{YYYYMMDD}.md`. |

### Generowanie mediów i treści {#media-and-content-generation}

| Agent | Rola | Kluczowe możliwości |
|-------|------|-----------------|
| **oma-image** | Router obrazów obsługujący wielu dostawców | Świadomy uwierzytelniania równoległy dispatch do Codex (`gpt-image-2` przez OAuth ChatGPT, najpierw CLI), modeli z rodziny Gemini „nano-banana” w Antigravity przez CLI `agy` + Gemini Code Assist (dokładny model wybierany wewnętrznie) oraz Pollinations (darmowe `flux`/`zimage`). Przed generowaniem stosuje protokół doprecyzowania i wzmocnienia, obsługuje do 10 obrazów referencyjnych, ma strażnika kosztów (potwierdzenie przy ≥ $0.20) i zapisuje `manifest.json` dla odtwarzalności. CLI: `oma image generate`, `oma image doctor` i `oma image vendor list`. |
| **oma-slide** | Generator bogatych w animacje prezentacji HTML | Generuje charakterystyczne prezentacje, bez „AI slop”, na stałej scenie 1920×1080, następnie deterministycznie sprawdza geometrię, pakuje wynik do jednoplikowego HTML i eksportuje do PDF/PNG/PPTX przez CLI `oma slide`. Oferuje presety stylu i odważne szablony, regułę CJK→Pretendard, wymaga `prefers-reduced-motion` i widocznego fokusu oraz stosuje pętlę walidacji z maksymalnie 3 automatycznymi poprawkami. Obrazy deleguje do `oma-image`; opcjonalnie eksportuje/importuje przez Canva MCP. |
| **oma-video** | Router krótkich form, objaśnień i demonstracji | Tworzy shorty/reels (9:16), objaśnienia (16:9) i nagrywane przez człowieka demonstracje (16:9) przez CLI `oma video`. Deterministyczna magistrala zasobów (`script.json` → `timing.json` → `render-spec.json`) zasila zarządzany kompozytor HyperFrames; dostawcy zasobów mogą używać lokalnych fallbacków, a brak kompozycji/toolchainu lub błąd renderowania kończy przebieg niepowodzeniem. Nagrywanie przez człowieka nigdy nie automatyzuje poświadczeń. |
| **oma-voice** | Lokalne TTS i STT | Steruje serwerem Voicebox MCP dla powiadomień na urządzeniu, TTS zasobów i transkrypcji bez wywołań chmurowych ani kosztu za wywołanie. TTS domyślnie używa WAV i może lokalnie transkodować do MP3; transkrypcja przyjmuje ścieżki audio lub base64. Wywołania TTS są ograniczone do 5000 znaków, a wejścia STT do 30 minut; zapisane przebiegi zasobów/transkrypcji tworzą manifest. |

---

## Model progresywnego ujawniania {#progressive-disclosure-model}

oh-my-agent używa dwuwarstwowej architektury umiejętności, aby nie wyczerpać okna kontekstowego:

**Warstwa 1: SKILL.md (ładowana po routingu umiejętności)**
Zawiera tożsamość agenta, warunki routingu, główne reguły oraz wskazówki „kiedy używać / kiedy NIE używać”. To wszystko jest ładowane, gdy agent nie pracuje aktywnie.

**Warstwa 2: resources/ (ładowana na żądanie)**
Zawiera protokoły wykonania, referencje stosu technologicznego, fragmenty kodu, podręczniki błędów, checklisty i przykłady. Zasoby są ładowane tylko po wywołaniu agenta i tylko te potrzebne dla konkretnego typu zadania (na podstawie oceny trudności i mapowania zadanie–zasób w `context-loading.md`).

Ile kontekstu to oszczędza, zależy od umiejętności i zadania, więc zmierz to, zamiast zakładać konkretną liczbę. Zobacz [matematykę oszczędności tokenów](../core-concepts/skills.md#token-savings-math), aby poznać skrypt i to, co obejmują jego szacunki.

---

## .agents/: jedyne źródło prawdy (SSOT) {#.agents-the-single-source-of-truth-ssot}

Wszystko, czego potrzebuje oh-my-agent, znajduje się w katalogu `.agents/`:

```
.agents/
├── oma-config.yaml         # Shared preferences and provider/model settings
├── oma-config.cue          # Optional schema-backed configuration
├── skills/                 # 33 skill directories + _shared resources
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{skill}/         # Per-skill SKILL.md + resources/variants
├── workflows/              # 21 workflow definitions
├── agents/                 # 12 subagent definitions
├── results/plan-{sessionId}.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

Katalog `.claude/` istnieje wyłącznie jako warstwa integracji z IDE. Zawiera dowiązania symboliczne prowadzące z powrotem do `.agents/` oraz hooki do wykrywania słów kluczowych i paska HUD. Katalog `.agents/state/memories/` przechowuje stan koordynacji w czasie wykonywania sesji orkiestracji (starsze projekty korzystają awaryjnie ze starszej ścieżki `.serena/memories/`).

Ta architektura sprawia, że konfiguracja agenta jest:
- **Przenośna:** możesz zmieniać IDE bez ponownej konfiguracji
- **Wersjonowana:** commituj `.agents/` razem z kodem
- **Współdzielona:** członkowie zespołu otrzymują tę samą konfigurację agentów



## Obsługiwane IDE i narzędzia CLI {#supported-ides-and-cli-tools}

oh-my-agent współpracuje z wybranymi IDE i CLI opartymi na AI przez natywne ładowanie umiejętności i promptów albo wygenerowane pliki integracji:

| Narzędzie | Metoda integracji | Agenci równolegli |
|------|-------------------|----------------|
| **Claude Code** | Natywne umiejętności + narzędzie Agent | Narzędzie Task zapewnia prawdziwą równoległość |
| **Antigravity CLI/IDE** | Umiejętności i ustawienia MCP projektowane dla `agy` | `oma agent spawn` |
| **Codex CLI** | Umiejętności ładowane automatycznie | Równoległe żądania mediowane przez model |
| **Cursor** | Umiejętności przez integrację `.cursor/` | Ręczne uruchamianie |
| **OpenCode** | Umiejętności + mostek w procesie + wygenerowani subagenci (`.opencode/agents/`) | `oma agent spawn --vendor opencode` |
| **Kimi Code CLI** | Hooki + umiejętności w `~/.kimi-code/` (zapis HOME wymagający zgody; natywnie odczytuje też SSOT `.agents/skills/`); Serena MCP w zakresie projektu | `oma agent spawn --vendor kimi` |

Uruchamianie agentów dostosowuje się do każdego wybranego dostawcy przez wykrywanie dostawcy i aktywną konfigurację. Runtime tego samego dostawcy może użyć natywnych subagentów; praca między dostawcami przechodzi do `oma agent spawn`. Reguły dispatchu opisano w [równoległym wykonywaniu](../core-concepts/parallel-execution.md).

---

## System routingu umiejętności {#skill-routing-system}

Po wysłaniu promptu oh-my-agent ustala, który agent ma go obsłużyć, korzystając z mapy routingu umiejętności (`.agents/skills/_shared/core/skill-routing.md`):

| Słowa kluczowe domeny | Kierowane do |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, Swift, SwiftUI, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestration |

W przypadku złożonych żądań obejmujących wiele domen routing korzysta z ustalonych kolejności wykonywania. Na przykład „Create a fullstack app” jest kierowane do: oma-pm (plan), następnie oma-backend + oma-frontend (implementacja równoległa), a potem oma-qa (przegląd).

---

## Pasek HUD {#hud-statusline}

Podczas pracy w Claude Code oh-my-agent wyświetla na pasku stanu trwały wskaźnik `[OMA]` zawierający:
- nazwę modelu (np. Opus, Sonnet)
- użycie kontekstu z kodami kolorów (zielony < 70%, żółty 70–85%, czerwony > 85%)
- stan aktywnego workflowu (gdy działa workflow trwały)

HUD korzysta z `.claude/hooks/hud.ts` i funkcji hooka `statusLine` Claude Code.

---

## Automatyczne wykrywanie workflowów {#automatic-workflow-detection}

Nie musisz wpisywać `/command`, aby uruchamiać workflowy. System hooków oh-my-agent skanuje Twój język naturalny pod kątem wyzwalaczy słów kluczowych zdefiniowanych w `.agents/hooks/core/triggers.json` (wbudowanych w plik binarny `oma` i współdzielonych przez każdego dostawcę), obsługując 11 języków (angielski, koreański, japoński, chiński, hiszpański, francuski, niemiecki, portugalski, rosyjski, niderlandzki i polski).

- **Dane operacyjne** (np. „plan the auth feature”) → workflow jest ładowany automatycznie
- **Dane informacyjne** (np. „what is orchestrate?”) → odfiltrowane, nie uruchamiają workflowu
- **Jawne `/command`** → hook pomija wykrywanie, aby uniknąć duplikacji
- **Workflowy trwałe** ponownie wstrzykują kontekst przy każdej wiadomości, dopóki nie powiesz „workflow done”

Każde zdarzenie hooka jest dostarczane przez kanoniczne ABI `oma hook run`: dostawca uruchamia `oma-hook.sh --vendor <v> --event <nativeEvent>`, które kieruje zdarzenie do łańcucha handlerów działającego w procesie i emituje dialekt właściwy dla dostawcy na stdout (zawsze exit 0, fail-open).

---

## Obsługa wielu dostawców {#cross-vendor-support}

oh-my-agent nie ogranicza się do Claude Code. Dostawcy obsługujący hooki współdzielą to samo ABI `oma hook run`, a dostawcy rozszerzeń używają mostka działającego w procesie:

| Dostawca | Dostarczanie hooków | StatusLine |
|--------|--------------|------------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts` (bezpośrednio, bez zmian) |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | — |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | Ścieżka `bun` przez `ui.statusLine` |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | — |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | — |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | — |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop` (globalny TOML zawierający tylko `[[hooks]]` w `~/.kimi-code/config.toml`) | — |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | — |
| **pi** | Mostek w procesie (`installPiExtension`) — nie jest kierowany przez `oma hook run` | — |

Katalog `.agents/` pozostaje źródłem prawdy. Instalacja tworzy dowiązania lub projektuje jego umiejętności, workflowy, hooki i definicje agentów do wybranych dostawców; możliwości różnią się zależnie od dostawcy. Zarówno natywni subagenci tego samego dostawcy, jak i agenci między dostawcami uruchamiani przez CLI odczytują to źródło.

---

## Co dalej {#what-is-next}

- **[Instalacja](./installation.md)**: trzy metody instalacji, presety, konfiguracja CLI i weryfikacja
- **[Agenci](/docs/core-concepts/agents)**: szczegółowe omówienie 33 umiejętności, 13 ról dispatchu i charter preflight
- **[Umiejętności](/docs/core-concepts/skills)**: wyjaśnienie architektury dwuwarstwowej
- **[Workflowy](/docs/core-concepts/workflows)**: wszystkie 21 workflowów z wyzwalaczami i fazami
- **[Przewodnik użycia](/docs/guide/usage)**: rzeczywiste przykłady od pojedynczych zadań po pełną orkiestrację
