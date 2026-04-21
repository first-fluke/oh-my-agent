---
title: Agenci
description: Kompletna referencja wszystkich 21 agentów oh-my-agent — ich domeny, stosy technologiczne, pliki zasobów, możliwości, protokół kontroli wstępnej karty, dwuwarstwowe ładowanie umiejętności, ograniczenia wykonania, bramki jakości, strategia przestrzeni roboczej, przepływ orkiestracji i pamięć runtime.
---

# Agenci

Agenci w oh-my-agent to wyspecjalizowane role inżynierskie. Każdy agent ma zdefiniowaną domenę, wiedzę o stosie technologicznym, pliki zasobów, bramki jakości i ograniczenia wykonania. Agenci nie są generycznymi chatbotami — to pracownicy o ściśle określonym zakresie, którzy trzymają się swoich kompetencji i przestrzegają ustrukturyzowanych protokołów.

---

## Kategorie agentów

| Kategoria | Agenci | Odpowiedzialność |
|----------|--------|---------------|
| **Ideacja** | oma-brainstorm | Eksplorowanie pomysłów, proponowanie podejść, tworzenie dokumentów projektowych |
| **Architektura** | oma-architecture | Granice systemu/modułu/usługi, analiza w stylu ADR/ATAM/CBAM, zapisy kompromisów |
| **Planowanie** | oma-pm | Dekompozycja wymagań, rozkład zadań, kontrakty API, przypisywanie priorytetów |
| **Implementacja** | oma-frontend, oma-backend, oma-mobile, oma-db | Pisanie kodu produkcyjnego w swoich domenach |
| **Projektowanie** | oma-design | Systemy projektowe, DESIGN.md, tokeny, typografia, kolor, ruch, dostępność |
| **Infrastruktura** | oma-tf-infra | Wielochmurowe provisionowanie Terraform, IAM, optymalizacja kosztów, polityka jako kod |
| **DevOps** | oma-dev-workflow | Menedżer zadań mise, CI/CD, migracje, koordynacja wydań, automatyzacja monorepo |
| **Obserwowalność** | oma-observability | Potoki obserwowalności, routing śledzenia, sygnały MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), zarządzanie SLO, analiza śledcza incydentów, strojenie transportu |
| **Jakość** | oma-qa | Audyt bezpieczeństwa (OWASP), wydajność, dostępność (WCAG), przegląd jakości kodu |
| **Debugowanie** | oma-debug | Reprodukcja błędów, analiza przyczyn źródłowych, minimalne poprawki, testy regresji |
| **Lokalizacja** | oma-translator | Tłumaczenie uwzględniające kontekst z zachowaniem tonu, rejestru i terminów domenowych |
| **Koordynacja** | oma-orchestrator, oma-coordination | Automatyczna i ręczna orkiestracja wieloagentowa |
| **Git** | oma-scm | Generowanie Conventional Commits, dzielenie commitów według funkcjonalności |
| **Wyszukiwanie i Pobieranie** | oma-search | Router wyszukiwania oparty na intencji z oceną zaufania (dokumenty Context7, web, kod `gh`/`glab`, Serena lokalnie) |
| **Retrospektywa** | oma-recap | Analiza historii konwersacji między narzędziami i tematyczne podsumowania pracy |
| **Przetwarzanie dokumentów** | oma-hwp, oma-pdf | Konwersja HWP/HWPX/HWPML oraz PDF do Markdown dla ingestii LLM/RAG |

---

## Szczegółowa referencja agentów

### oma-brainstorm

**Domena:** Ideacja z priorytetem projektowania, przed planowaniem lub implementacją.

**Kiedy używać:** Eksplorowanie nowego pomysłu na funkcjonalność, zrozumienie intencji użytkownika, porównywanie podejść. Używaj przed `/plan` dla złożonych lub niejednoznacznych żądań.

**Kiedy NIE używać:** Jasne wymagania (przejdź do oma-pm), implementacja (przejdź do agentów domenowych), przegląd kodu (przejdź do oma-qa).

**Podstawowe reguły:**
- Żadnej implementacji ani planowania przed zatwierdzeniem projektu
- Jedno pytanie wyjaśniające na raz (nie w partiach)
- Zawsze proponuj 2-3 podejścia z zalecaną opcją
- Projektowanie sekcja po sekcji z potwierdzeniem użytkownika na każdym kroku
- YAGNI — projektuj tylko to, co potrzebne

**Workflow:** 6 faz: Eksploracja kontekstu, Pytania, Podejścia, Projekt, Dokumentacja (zapis do `docs/plans/`), Przejście do `/plan`.

**Zasoby:** Używa tylko zasobów współdzielonych (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-architecture

**Domena:** Architektura oprogramowania/systemu — granice modułów i usług, analiza kompromisów, synteza interesariuszy, zapisy decyzji.

**Kiedy używać:** Wybór lub przegląd architektury systemu, definiowanie granic moduł/usługa/własność, porównywanie opcji architektonicznych z jawnymi kompromisami, badanie bolączek architektonicznych (amplifikacja zmian, ukryte zależności, niewygodne API), priorytetyzacja inwestycji lub refaktoryzacji architektonicznych, pisanie rekomendacji architektonicznych lub ADR.

**Kiedy NIE używać:** Systemy wizualne/projektowe (użyj oma-design), planowanie funkcjonalności i dekompozycja zadań (użyj oma-pm), implementacja Terraform (użyj oma-tf-infra), diagnoza błędów (użyj oma-debug), przegląd bezpieczeństwa/wydajności/dostępności (użyj oma-qa).

**Metodologie:** Routing diagnostyczny, porównanie design-twice, analiza ryzyka w stylu ATAM, priorytetyzacja w stylu CBAM, zapisy decyzji w stylu ADR.

**Reguły podstawowe:**
- Zdiagnozuj problem architektoniczny przed wyborem metody
- Użyj najlżejszej wystarczającej metodologii dla bieżącej decyzji
- Odróżnij projekt architektoniczny od projektu UI/wizualnego oraz od dostarczenia Terraform
- Konsultuj agentów interesariuszy tylko wtedy, gdy decyzja jest na tyle przekrojowa, by uzasadnić koszt
- Jakość rekomendacji jest ważniejsza niż teatr konsensusu: konsultuj szeroko, decyduj jawnie
- Każda rekomendacja musi wskazywać założenia, kompromisy, ryzyka i kroki walidacji
- Domyślnie świadomy kosztów: koszt implementacji, koszt operacyjny, złożoność zespołu, koszt przyszłych zmian

**Zasoby:** `SKILL.md`, katalog `resources/` z przewodnikami metodologii (diagnostic-routing, design-twice, ATAM, CBAM, szablony ADR).

---

### oma-pm

**Domena:** Zarządzanie produktem — analiza wymagań, dekompozycja zadań, kontrakty API.

**Kiedy używać:** Rozkładanie złożonych funkcjonalności, określanie wykonalności, priorytetyzacja pracy, definiowanie kontraktów API.

**Podstawowe reguły:**
- Projektowanie API-first: definiuj kontrakty przed zadaniami implementacyjnymi
- Każde zadanie posiada: agenta, tytuł, kryteria akceptacji, priorytet, zależności
- Minimalizuj zależności dla maksymalnego równoległego wykonania
- Bezpieczeństwo i testowanie są częścią każdego zadania (nie oddzielnymi fazami)
- Zadania muszą być wykonalne przez jednego agenta
- Generuj plan JSON + task-board.md dla kompatybilności z orkiestratorem

**Wyjście:** `.agents/results/plan-{sessionId}.json`, `.agents/brain/current-plan.md`, zapis do pamięci dla orkiestratora.

**Zasoby:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Limit tur:** Domyślnie 10, maks. 15.

---

### oma-frontend

**Domena:** Interfejs webowy — React, Next.js, TypeScript z architekturą FSD-lite.

**Kiedy używać:** Budowanie interfejsów użytkownika, komponentów, logiki po stronie klienta, stylowania, walidacji formularzy, integracji z API.

**Stos technologiczny:**
- React + Next.js (domyślnie Server Components, Client Components dla interaktywności)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (prymitywy tylko do odczytu, rozszerzaj przez cva/wrappery)
- FSD-lite: główny `src/` + feature `src/features/*/` (bez importów między feature)

**Biblioteki:**
| Przeznaczenie | Biblioteka |
|---------|---------|
| Daty | luxon |
| Stylowanie | TailwindCSS v4 + shadcn/ui |
| Hooki | ahooks |
| Narzędzia | es-toolkit |
| Stan URL | nuqs |
| Stan serwera | TanStack Query |
| Stan klienta | Jotai (minimalne użycie) |
| Formularze | @tanstack/react-form + Zod |
| Uwierzytelnianie | better-auth |

**Podstawowe reguły:**
- shadcn/ui najpierw, rozszerzaj przez cva, nigdy nie modyfikuj bezpośrednio `components/ui/*`
- Mapowanie tokenów projektowych 1:1 (nigdy nie koduj kolorów na stałe)
- Proxy zamiast middleware (Next.js 16+ używa `proxy.ts`, nie `middleware.ts` dla logiki proxy)
- Brak prop drilling powyżej 3 poziomów — używaj atomów Jotai
- Obowiązkowe importy absolutne z `@/`
- Cel FCP < 1s
- Breakpointy responsywne: 320px, 768px, 1024px, 1440px

**Zasoby:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Lista kontrolna bramki jakości:**
- Dostępność: etykiety ARIA, nagłówki semantyczne, nawigacja klawiaturą
- Mobile: zweryfikowane na widokach mobilnych
- Wydajność: brak CLS, szybkie ładowanie
- Odporność: Error Boundaries i Loading Skeletons
- Testy: logika pokryta przez Vitest
- Jakość: typecheck i lint przechodzą

**Limit tur:** Domyślnie 20, maks. 30.

---

### oma-backend

**Domena:** API, logika serwerowa, uwierzytelnianie, operacje bazodanowe.

**Kiedy używać:** API REST/GraphQL, migracje baz danych, uwierzytelnianie, logika biznesowa serwera, zadania w tle.

**Architektura:** Router (HTTP) -> Service (logika biznesowa) -> Repository (dostęp do danych) -> Models.

**Wykrywanie stosu:** Odczytuje manifesty projektu (pyproject.toml, package.json, Cargo.toml, go.mod, itd.) aby określić język i framework. W razie braku korzysta z katalogu `stack/` jeśli istnieje, lub prosi użytkownika o uruchomienie `/stack-set`.

**Podstawowe reguły:**
- Czysta architektura: żadnej logiki biznesowej w handlerach route
- Wszystkie dane wejściowe walidowane biblioteką walidacji projektu
- Wyłącznie zapytania parametryzowane (nigdy interpolacja stringów w SQL)
- JWT + bcrypt do uwierzytelniania; rate limit na endpointach auth
- Async gdzie obsługiwane; adnotacje typów na wszystkich sygnaturach
- Niestandardowe wyjątki przez scentralizowany moduł błędów
- Jawna strategia ładowania ORM, granice transakcji, bezpieczny cykl życia

**Zasoby:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Zasoby specyficzne dla stosu w `stack/` (generowane przez `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Limit tur:** Domyślnie 20, maks. 30.

---

### oma-mobile

**Domena:** Aplikacje mobilne międzyplatformowe — Flutter, React Native.

**Kiedy używać:** Natywne aplikacje mobilne (iOS + Android), wzorce UI specyficzne dla mobile, funkcje platformy (kamera, GPS, powiadomienia push), architektura offline-first.

**Architektura:** Clean Architecture: domain -> data -> presentation.

**Stos technologiczny:** Flutter/Dart, Riverpod/Bloc (zarządzanie stanem), Dio z interceptorami (API), GoRouter (nawigacja), Material Design 3 (Android) + iOS HIG.

**Podstawowe reguły:**
- Riverpod/Bloc do zarządzania stanem (bez surowego setState dla złożonej logiki)
- Wszystkie kontrolery usuwane w metodzie `dispose()`
- Dio z interceptorami do wywołań API; graceful handling offline
- Cel 60fps; testowanie na obu platformach

**Zasoby:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Limit tur:** Domyślnie 20, maks. 30.

---

### oma-db

**Domena:** Architektura baz danych — SQL, NoSQL, bazy wektorowe.

**Kiedy używać:** Projektowanie schematów, ERD, normalizacja, indeksowanie, transakcje, planowanie pojemności, strategia backupów, projektowanie migracji, architektura wektorowej bazy danych/RAG, przegląd anty-wzorców, projektowanie zgodne z przepisami (ISO 27001/27002/22301).

**Domyślny workflow:** Eksploracja (identyfikacja encji, wzorce dostępu, wolumen) -> Projektowanie (schemat, ograniczenia, transakcje) -> Optymalizacja (indeksy, partycjonowanie, archiwizacja, anty-wzorce).

**Podstawowe reguły:**
- Najpierw wybierz model, potem silnik
- Domyślnie 3NF dla relacyjnych; dokumentuj kompromisy BASE dla rozproszonych
- Dokumentuj wszystkie trzy warstwy schematu: zewnętrzną, koncepcyjną, wewnętrzną
- Integralność jest priorytetem: encji, domeny, referencyjna, reguł biznesowych
- Współbieżność nigdy nie jest niejawna: definiuj granice transakcji i poziomy izolacji
- Bazy wektorowe to infrastruktura wyszukiwania, nie źródło prawdy
- Nigdy nie traktuj wyszukiwania wektorowego jako zamiennika wyszukiwania leksykalnego

**Wymagane dostarczalne:** Podsumowanie schematu zewnętrznego, schemat koncepcyjny, schemat wewnętrzny, tabela standardów danych, glosariusz, szacowanie pojemności, strategia backupu/odzyskiwania. Dla wektorowych/RAG: polityka wersjonowania embeddingów, polityka chunkowania, strategia wyszukiwania hybrydowego.

**Zasoby:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domena:** Systemy projektowe, UI/UX, zarządzanie DESIGN.md.

**Kiedy używać:** Tworzenie systemów projektowych, stron landing page, tokenów projektowych, palet kolorów, typografii, układów responsywnych, przegląd dostępności.

**Workflow:** 7 faz: Konfiguracja (zbieranie kontekstu) -> Ekstrakcja (opcjonalnie, z URL referencyjnych) -> Ulepszenie (augmentacja niejasnych promptów) -> Propozycja (2-3 kierunki projektowe) -> Generacja (DESIGN.md + tokeny) -> Audyt (responsywność, WCAG, Nielsen, sprawdzanie AI slop) -> Przekazanie.

**Wymuszanie anty-wzorców ("bez AI slop"):**
- Typografia: domyślnie systemowy stos fontów; bez domyślnych Google Fonts bez uzasadnienia
- Kolor: bez gradientów fioletowo-niebieskich, bez gradientowych orbs/blobów, bez czystej bieli na czystej czerni
- Układ: bez zagnieżdżonych kart, bez układów wyłącznie desktopowych, bez szablonowych layoutów z 3 metrykami
- Ruch: bez easing bounce wszędzie, bez animacji > 800ms, obowiązek respektowania prefers-reduced-motion
- Komponenty: bez glassmorphism wszędzie, wszystkie elementy interaktywne potrzebują alternatyw klawiaturowych/dotykowych

**Podstawowe reguły:**
- Najpierw sprawdź `.design-context.md`; utwórz jeśli brak
- Domyślnie systemowy stos fontów (fonty CJK-ready dla ko/ja/zh)
- Minimum WCAG AA dla wszystkich projektów
- Responsive-first (mobile jako domyślny)
- Przedstaw 2-3 kierunki, uzyskaj potwierdzenie

**Zasoby:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, plus katalog `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d) i `examples/` (design-context-example, landing-page-prompt).

---

### oma-tf-infra

**Domena:** Infrastruktura jako kod z Terraform, wielochmurowa.

**Kiedy używać:** Provisionowanie na AWS/GCP/Azure/Oracle Cloud, konfiguracja Terraform, uwierzytelnianie CI/CD (OIDC), CDN/load balancery/storage/networking, zarządzanie stanem, infrastruktura zgodna z ISO.

**Wykrywanie chmury:** Odczytuje providerów Terraform i prefiksy zasobów (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Zawiera pełną tabelę mapowania zasobów wielochmurowych.

**Podstawowe reguły:**
- Niezależne od providera: wykrywaj chmurę z kontekstu projektu
- Zdalny stan z wersjonowaniem i blokowaniem
- OIDC-first dla uwierzytelniania CI/CD
- Zawsze plan przed apply
- IAM z zasadą minimalnych uprawnień
- Taguj wszystko (Environment, Project, Owner, CostCenter)
- Żadnych sekretów w kodzie
- Przypinaj wersje wszystkich providerów i modułów
- Żadnego auto-approve w produkcji

**Zasoby:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domena:** Automatyzacja zadań monorepo i CI/CD.

**Kiedy używać:** Uruchamianie serwerów deweloperskich, wykonywanie lint/format/typecheck w aplikacjach, migracje baz danych, generowanie API, buildy i18n, buildy produkcyjne, optymalizacja CI/CD, walidacja pre-commit.

**Podstawowe reguły:**
- Zawsze używaj zadań `mise run` zamiast bezpośrednich poleceń menedżera pakietów
- Uruchamiaj lint/test tylko na zmienionych aplikacjach
- Waliduj wiadomości commitów za pomocą commitlint
- CI powinno pomijać niezmienione aplikacje
- Nigdy nie używaj bezpośrednich poleceń menedżera pakietów gdy istnieją zadania mise

**Zasoby:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**Domena:** Router obserwowalności i śledzenia oparty na intencji, obejmujący warstwy, granice i sygnały.

**Kiedy używać:** Konfiguracja potoku obserwowalności (OTel SDK + Collector + backend dostawcy), śledzenie przez granice usług i domen (propagatory W3C, baggage, wielodostępność, wielochmurowość), strojenie transportu (progi UDP/MTU, OTLP gRPC vs HTTP, topologia Collector DaemonSet vs sidecar, przepisy samplingu), analiza śledcza incydentów (lokalizacja 6-wymiarowa: code / service / layer / host / region / infra), wybór kategorii dostawcy (OSS full-stack vs komercyjne SaaS vs specjalista wysokiej kardynalności vs specjalista profilowania), observability-as-code (dashboardy Grafana Jsonnet, PrometheusRule CRD, OpenSLO YAML, alerty SLO burn-rate), meta-obserwowalność (kondycja samego potoku, dryft zegara, bariery kardynalności, macierz retencji), pokrycie sygnałów MELT+P (metrics, logs, traces, profiles, cost, audit, privacy), migracja z przestarzałych narzędzi (Fluentd -> Fluent Bit lub OTel Collector).

**Kiedy NIE używać:** Obserwowalność LLM ops / gen_ai (użyj Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage potoków danych (OpenLineage + Marquez, dbt test, Airflow lineage), telemetria warstwy fizycznej IoT / centrum danych (Nlyte, Sunbird, Device42), orkiestracja chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), infrastruktura GPU / TPU (NVIDIA DCGM Exporter), łańcuch dostaw oprogramowania (sigstore, in-toto, SLSA), workflow reagowania na incydenty / paging (PagerDuty, OpsGenie, Grafana OnCall), konfiguracja jednego dostawcy już pokryta przez jego własny skill.

**Podstawowe reguły:**
- Klasyfikuj intencję przed routingiem: setup | migrate | investigate | alert | trace | tune | route
- Kategoria-najpierw, a nie rejestr dostawców: deleguj do skilli dostawców przez `resources/vendor-categories.md`; nie duplikuj dokumentacji dostawcy
- Strojenie transportu to fosa: progi UDP/MTU, wybór protokołu OTLP, topologia Collectora i przepisy samplingu to głębia, której inne skille nie obejmują
- Meta-obserwowalność nie podlega negocjacjom: zwaliduj kondycję samego potoku, synchronizację zegara (< 100 ms dryftu), kardynalność i retencję przed ogłoszeniem ukończenia konfiguracji
- Preferencja CNCF-first: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd jest przestarzały (CNCF 2025-10): dla nowych prac i migracji rekomenduj Fluent Bit lub OTel Collector
- W3C Trace Context jako domyślny propagator; tłumacz zależnie od chmury (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Prywatność przed funkcjonalnościami: redakcja PII, reguły baggage świadome samplingu, niezmienialny audyt SOC2/ISO + usuwanie GDPR/PIPA stosowane przy zbieraniu, nie tylko przy przechowywaniu

**Zasoby:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, oraz zasoby szczegółowe w `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) i `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domena:** Zapewnienie jakości — bezpieczeństwo, wydajność, dostępność, jakość kodu.

**Kiedy używać:** Końcowy przegląd przed wdrożeniem, audyty bezpieczeństwa, analiza wydajności, zgodność z wymaganiami dostępności, analiza pokrycia testami.

**Kolejność priorytetów przeglądu:** Bezpieczeństwo > Wydajność > Dostępność > Jakość kodu.

**Poziomy ważności:**
- **CRITICAL**: Naruszenie bezpieczeństwa, ryzyko utraty danych
- **HIGH**: Blokuje uruchomienie
- **MEDIUM**: Naprawić w tym sprincie
- **LOW**: Do backlogu

**Podstawowe reguły:**
- Każde znalezisko musi zawierać plik:linia, opis i poprawkę
- Najpierw uruchom narzędzia automatyczne (npm audit, bandit, lighthouse)
- Żadnych fałszywych pozytywów — każde znalezisko musi być odtwarzalne
- Dostarczaj kod naprawczy, nie tylko opisy

**Zasoby:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Limit tur:** Domyślnie 15, maks. 20.

---

### oma-debug

**Domena:** Diagnoza i naprawa błędów.

**Kiedy używać:** Błędy zgłoszone przez użytkowników, awarie, problemy wydajnościowe, przerywane awarie, warunki wyścigu, błędy regresji.

**Metodologia:** Najpierw reprodukcja, potem diagnoza. Nigdy nie zgaduj poprawek.

**Podstawowe reguły:**
- Identyfikuj przyczynę źródłową, nie tylko symptomy
- Minimalna poprawka: zmieniaj tylko to, co konieczne
- Każda poprawka otrzymuje test regresji
- Szukaj podobnych wzorców w innych miejscach
- Dokumentuj w `.agents/brain/bugs/`

**Narzędzia Serena MCP:**
- `find_symbol("functionName")` — lokalizacja funkcji
- `find_referencing_symbols("Component")` — znajdowanie wszystkich użyć
- `search_for_pattern("error pattern")` — znajdowanie podobnych problemów

**Zasoby:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Limit tur:** Domyślnie 15, maks. 25.

---

### oma-translator

**Domena:** Wielojęzyczne tłumaczenie uwzględniające kontekst.

**Kiedy używać:** Tłumaczenie ciągów UI, dokumentacji, tekstów marketingowych, przeglądanie istniejących tłumaczeń, tworzenie glosariuszy.

**4-etapowa metoda:** Analiza źródła (rejestr, intencja, terminy domenowe, odniesienia kulturowe, konotacje emocjonalne, mapowanie języka figuratywnego) -> Ekstrakcja znaczenia (oddzielenie od struktury źródłowej) -> Rekonstrukcja w języku docelowym (naturalny szyk wyrazów, dopasowanie rejestru, dzielenie/łączenie zdań) -> Weryfikacja (rubryk naturalności + sprawdzenie anty-wzorców AI).

**Opcjonalny 7-etapowy tryb udoskonalony** dla jakości publikacyjnej: rozszerzony o etapy Krytycznego przeglądu, Rewizji i Polerowania.

**Podstawowe reguły:**
- Najpierw skanuj istniejące pliki locale aby dopasować konwencje
- Tłumacz znaczenie, nie słowa
- Zachowuj konotacje emocjonalne
- Nigdy nie twórz tłumaczeń słowo po słowie
- Nigdy nie mieszaj rejestrów w jednym tekście
- Zachowuj terminologię domenową bez zmian

**Zasoby:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Domena:** Automatyczna koordynacja wieloagentowa przez uruchamianie CLI.

**Kiedy używać:** Złożone funkcjonalności wymagające wielu agentów równolegle, automatyczne wykonanie, implementacja full-stack.

**Domyślne ustawienia konfiguracji:**

| Ustawienie | Domyślna | Opis |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Maksymalna liczba współbieżnych subagentów |
| MAX_RETRIES | 2 | Liczba prób ponowienia dla nieudanego zadania |
| POLL_INTERVAL | 30s | Interwał sprawdzania statusu |
| MAX_TURNS (impl) | 20 | Limit tur dla backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Limit tur dla qa/debug |
| MAX_TURNS (plan) | 10 | Limit tur dla pm |

**Fazy workflow:** Plan -> Konfiguracja (ID sesji, inicjalizacja pamięci) -> Wykonanie (uruchamianie wg poziomu priorytetów) -> Monitoring (odpytywanie postępu) -> Weryfikacja (automatyczna + pętla wzajemnego przeglądu) -> Zbieranie (kompilacja wyników).

**Pętla przeglądu agent-do-agenta:**
1. Samoprzegląd: agent sprawdza własny diff względem kryteriów akceptacji
2. Automatyczna weryfikacja: `oma verify {agent-type} --workspace {workspace}`
3. Przegląd krzyżowy: agent QA przegląda zmiany
4. W przypadku niepowodzenia: problemy zwracane do naprawy (maks. 5 iteracji pętli łącznie)

**Monitoring Clarification Debt:** Śledzi korekty użytkownika podczas sesji. Zdarzenia oceniane jako clarify (+10), correct (+25), redo (+40). CD >= 50 wyzwala obowiązkowe RCA. CD >= 80 wstrzymuje sesję.

**Zasoby:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domena:** Generowanie commitów Git zgodnie z Conventional Commits.

**Kiedy używać:** Po zakończeniu zmian w kodzie, przy uruchamianiu `/scm`.

**Typy commitów:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow:** Analiza zmian -> Podział według funkcjonalności (jeśli > 5 plików obejmujących różne zakresy) -> Określenie typu -> Określenie zakresu -> Napisanie opisu (tryb rozkazujący, < 72 znaki, małe litery, bez końcowej kropki) -> Natychmiastowe wykonanie commita.

**Reguły:**
- Nigdy nie używaj `git add -A` ani `git add .`
- Nigdy nie commituj plików z sekretami
- Zawsze określaj pliki przy staging
- Używaj HEREDOC dla wieloliniowych wiadomości commitów
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

### oma-coordination

**Domena:** Przewodnik po ręcznej, krokowej koordynacji wieloagentowej.

**Kiedy używać:** Złożone projekty, w których chcesz mieć kontrolę człowieka w pętli przy każdej bramce, ręczne wskazówki dotyczące uruchamiania agentów, krokowe przepisy koordynacji.

**Kiedy NIE używać:** W pełni zautomatyzowane wykonanie równoległe (użyj oma-orchestrator), zadania jednodomenowe (użyj agenta domenowego bezpośrednio).

**Zasady główne:**
- Zawsze prezentuj plan do potwierdzenia przez użytkownika przed uruchomieniem agentów
- Jeden poziom priorytetu na raz -- czekaj na zakończenie przed następnym poziomem
- Użytkownik zatwierdza każde przejście przez bramkę
- Przegląd QA jest obowiązkowy przed scaleniem
- Pętla naprawcza problemów dla ustaleń CRITICAL/HIGH

**Workflow:** PM planuje → Użytkownik potwierdza → Uruchomienie według poziomu priorytetu → Monitorowanie → Przegląd QA → Naprawa problemów → Dostarczenie.

**Różnica względem oma-orchestrator:** Coordination jest ręczna i prowadzona (użytkownik kontroluje tempo), orchestrator jest zautomatyzowany (agenci uruchamiają się i działają przy minimalnej interwencji użytkownika).

---

### oma-search

**Domena:** Router wyszukiwania oparty na intencji z oceną zaufania domeny — kieruje zapytania do Context7 (dokumenty), natywnego wyszukiwania webowego, `gh`/`glab` (kod), Serena (lokalnie).

**Kiedy używać:** Znajdowanie oficjalnej dokumentacji bibliotek/frameworków, badania webowe w poszukiwaniu tutoriali/przykładów/porównań/rozwiązań, wyszukiwanie kodu w GitHub/GitLab dla wzorców implementacji, dowolne zapytanie, w którym kanał wyszukiwania jest niejasny (auto-routing), inne umiejętności wymagające infrastruktury wyszukiwania (wspólne wywołanie).

**Kiedy NIE używać:** Eksploracja wyłącznie lokalnej bazy kodu (użyj Serena MCP bezpośrednio), analiza historii Git lub blame (użyj oma-scm), pełne badanie architektury (użyj oma-architecture, która może wewnętrznie wywołać tę umiejętność).

**Reguły podstawowe:**
- Sklasyfikuj intencję przed wyszukiwaniem — każde zapytanie najpierw przechodzi przez IntentClassifier
- Jedno zapytanie, jedna najlepsza trasa — unikaj nadmiarowego multi-routingu, chyba że intencja jest niejednoznaczna
- Ocena zaufania dla każdego wyniku — wszystkie wyniki nielokalne otrzymują etykiety zaufania domeny z rejestru
- Flagi nadpisują klasyfikator: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: jeśli trasa główna zawiedzie, elegancko wróć (docs→web, web→strategie `oma search fetch`)
- Żaden dodatkowy MCP nie jest wymagany: Context7 dla dokumentów, natywne runtime dla web, CLI dla kodu, Serena dla lokalnego
- Wyszukiwanie webowe neutralne wobec dostawcy: użyj tego, co zapewnia bieżący runtime (WebSearch, Google, Bing)
- Zaufanie tylko na poziomie domeny — bez ocen na poziomie ścieżki podrzędnej lub strony

**Zasoby:** `SKILL.md`, katalog `resources/` z klasyfikatorem intencji, definicjami tras i rejestrem zaufania.

---

### oma-recap

**Domena:** Analiza historii konwersacji z wielu narzędzi AI (Claude, Codex, Gemini, Qwen, Cursor) z tematycznymi podsumowaniami pracy dziennymi/okresowymi.

**Kiedy używać:** Podsumowanie dnia lub okresu aktywności zawodowej, zrozumienie przebiegu pracy między wieloma narzędziami AI, analiza wzorców przełączania narzędzi między sesjami, przygotowywanie codziennych standupów / cotygodniowych retro / dzienników pracy.

**Kiedy NIE używać:** Retrospektywa zmian kodu oparta na commitach Git (użyj `oma retro`), monitoring agentów w czasie rzeczywistym (użyj `oma dashboard`), metryki produktywności (użyj `oma stats`).

**Proces:**
1. Rozwiąż datę lub okno czasowe z wejścia w języku naturalnym (today, yesterday, last Monday, jawna data)
2. Pobierz dane konwersacji przez `oma recap --date YYYY-MM-DD` lub `--since` / `--until`
3. Grupuj według narzędzia i sesji
4. Wyodrębnij tematy (funkcje, nad którymi pracowano, naprawione błędy, eksplorowane narzędzia)
5. Wyrenderuj tematyczne podsumowanie dzienne/okresowe

**Zasoby:** `SKILL.md` — deleguje ciężką pracę do CLI `oma recap`.

---

### oma-hwp

**Domena:** Konwersja HWP / HWPX / HWPML (koreański procesor tekstu) → Markdown przy użyciu `kordoc`.

**Kiedy używać:** Konwersja koreańskich dokumentów HWP (`.hwp`, `.hwpx`, `.hwpml`) do Markdown, przygotowanie koreańskich dokumentów rządowych/korporacyjnych dla kontekstu LLM lub RAG, wyodrębnianie ustrukturyzowanej treści (tabele, nagłówki, listy, obrazy, przypisy, hiperłącza) z HWP.

**Kiedy NIE używać:** Pliki PDF (użyj oma-pdf), XLSX/DOCX (poza zakresem), generowanie/edycja HWP (poza zakresem), pliki już w formie tekstowej (użyj narzędzia Read bezpośrednio).

**Reguły podstawowe:**
- Użyj `bunx kordoc@latest` do uruchomienia — instalacja nie jest wymagana; zawsze przekazuj `@latest` lub ustaloną wersję
- Domyślny format wyjściowy to Markdown
- Jeśli nie podano katalogu wyjściowego, wyjście zapisywane jest do tego samego katalogu co wejście
- kordoc zajmuje się zachowaniem struktury (nagłówki, tabele, tabele zagnieżdżone, przypisy, hiperłącza, obrazy)
- Zabezpieczenia (ZIP bomb, XXE, SSRF, XSS) zapewnia kordoc — nie dodawaj własnych
- Dla zaszyfrowanych lub zablokowanych DRM plików HWP jasno zgłoś ograniczenie użytkownikowi
- Przetwórz końcowo z `resources/flatten-tables.ts`, aby przekonwertować bloki HTML `<table>` na tabele GFM oraz usunąć znaki Hancom Private Use Area

**Zasoby:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Domena:** Konwersja PDF do Markdown przy użyciu `opendataloader-pdf`.

**Kiedy używać:** Konwersja dokumentów PDF do Markdown dla kontekstu LLM lub RAG, wyodrębnianie ustrukturyzowanej treści (tabele, nagłówki, listy) z PDF, przygotowywanie danych PDF dla konsumpcji AI.

**Kiedy NIE używać:** Generowanie/tworzenie PDF (użyj odpowiednich narzędzi dokumentowych), edycja istniejących PDF (poza zakresem), proste czytanie plików już tekstowych (użyj narzędzia Read bezpośrednio).

**Reguły podstawowe:**
- Użyj `uvx opendataloader-pdf` do uruchomienia — instalacja nie jest wymagana
- Domyślny format wyjściowy to Markdown
- Jeśli nie podano katalogu wyjściowego, wyjście zapisywane jest do tego samego katalogu co wejściowy PDF
- Zachowaj strukturę dokumentu (nagłówki, tabele, listy, obrazy)
- Dla zeskanowanych PDF użyj trybu hybrydowego z OCR
- Zawsze uruchamiaj `uvx mdformat` na wyjściu, aby znormalizować formatowanie Markdown
- Zwaliduj, czy wyjściowy Markdown jest czytelny i dobrze ustrukturyzowany
- Zgłaszaj użytkownikowi wszelkie problemy konwersji (brakujące tabele, zniekształcony tekst)

**Zasoby:** `SKILL.md`, `config/`, `resources/`.

---

## Kontrola wstępna karty (CHARTER_CHECK)

Przed napisaniem jakiegokolwiek kodu, każdy agent implementacyjny musi wygenerować blok CHARTER_CHECK:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {domena agenta}
- Must NOT do: {3 ograniczenia z zakresu zadania}
- Success criteria: {mierzalne kryteria}
- Assumptions: {zastosowane domyślne wartości}
```

**Cel:**
- Deklaruje co agent będzie robić, a czego nie
- Wyłapuje pełzanie zakresu zanim kod zostanie napisany
- Czyni założenia jawnymi do przeglądu przez użytkownika
- Dostarcza testowalne kryteria sukcesu

**Poziomy wyjaśniania:**
- **LOW**: Jasne wymagania. Kontynuuj z podanymi założeniami.
- **MEDIUM**: Częściowo niejednoznaczne. Wymień opcje, kontynuuj z najbardziej prawdopodobną.
- **HIGH**: Bardzo niejednoznaczne. Ustaw status na zablokowany, wymień pytania, NIE pisz kodu.

W trybie subagenta (uruchomiony przez CLI) agenci nie mogą pytać użytkowników bezpośrednio. LOW kontynuuje, MEDIUM zawęża i interpretuje, HIGH blokuje i zwraca pytania do przekazania przez orkiestratora.

---

## Dwuwarstwowe ładowanie umiejętności

Wiedza każdego agenta jest podzielona na dwie warstwy:

**Warstwa 1 — SKILL.md (~800 bajtów):**
Zawsze załadowana. Zawiera frontmatter (nazwa, opis), kiedy używać / nie używać, podstawowe reguły, przegląd architektury, listę bibliotek i odniesienia do zasobów Warstwy 2.

**Warstwa 2 — resources/ (ładowane na żądanie):**
Ładowane tylko gdy agent aktywnie pracuje, i tylko zasoby pasujące do typu i trudności zadania:

| Trudność | Ładowane zasoby |
|-----------|-----------------|
| **Prosta** | tylko execution-protocol.md |
| **Średnia** | execution-protocol.md + examples.md |
| **Złożona** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Dodatkowe zasoby ładowane podczas wykonania w razie potrzeby:
- `checklist.md` — na kroku Weryfikacji
- `error-playbook.md` — tylko gdy wystąpią błędy
- `common-checklist.md` — do końcowej weryfikacji zadań złożonych

---

## Ograniczone wykonanie

Agenci działają w ścisłych granicach domenowych:

- Agent frontendowy nie modyfikuje kodu backendowego
- Agent backendowy nie dotyka komponentów UI
- Agent DB nie implementuje endpointów API
- Agenci dokumentują zależności poza zakresem dla innych agentów

Gdy podczas wykonania zostanie odkryte zadanie należące do innej domeny, agent dokumentuje je w pliku wyników jako element do eskalacji, zamiast próbować je obsłużyć.

---

## Strategia przestrzeni roboczej

Dla projektów wieloagentowych, oddzielne przestrzenie robocze zapobiegają konfliktom plików:

```
./apps/api      → przestrzeń robocza agenta backend
./apps/web      → przestrzeń robocza agenta frontend
./apps/mobile   → przestrzeń robocza agenta mobile
```

Przestrzenie robocze są określane flagą `-w` przy uruchamianiu agentów:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Przepływ orkiestracji

Przy uruchamianiu workflow wieloagentowego (`/orchestrate` lub `/work`):

1. **Agent PM** rozkłada żądanie na zadania domenowe z priorytetami (P0, P1, P2) i zależnościami
2. **Inicjalizacja sesji** — generowany ID sesji, tworzony `orchestrator-session.md` i `task-board.md` w pamięci
3. **Zadania P0** uruchamiane równolegle (do MAX_PARALLEL współbieżnych agentów)
4. **Monitoring postępu** — orkiestrator odpytuje pliki `progress-{agent}.md` co POLL_INTERVAL
5. **Zadania P1** uruchamiane po zakończeniu P0 i tak dalej
6. **Pętla weryfikacyjna** uruchamiana dla każdego zakończonego agenta (samoprzegląd -> automatyczna weryfikacja -> przegląd krzyżowy przez QA)
7. **Zbieranie wyników** ze wszystkich plików `result-{agent}.md`
8. **Raport końcowy** z podsumowaniem sesji, zmienionymi plikami, pozostałymi problemami

---

## Definicje agentów

Agenci są zdefiniowani w dwóch lokalizacjach:

**`.agents/agents/`** — Zawiera 7 plików definicji subagentów:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

Te pliki definiują tożsamość agenta, referencję protokołu wykonawczego, szablon CHARTER_CHECK, podsumowanie architektury i reguły. Są używane przy uruchamianiu subagentów przez narzędzie Task/Agent (Claude Code) lub CLI.

**`.claude/agents/`** — Definicje subagentów specyficzne dla IDE, które odwołują się do plików `.agents/agents/` przez dowiązania symboliczne lub bezpośrednie kopie dla kompatybilności z Claude Code.

---

## Stan runtime (pamięć Serena)

Podczas sesji orkiestracji agenci koordynują się przez współdzielone pliki pamięci w `.serena/memories/` (konfigurowalne przez `mcp.json`):

| Plik | Właściciel | Cel | Inni |
|------|-------|---------|--------|
| `orchestrator-session.md` | Orkiestrator | ID sesji, status, czas startu, śledzenie faz | Tylko do odczytu |
| `task-board.md` | Orkiestrator | Przypisania zadań, priorytety, aktualizacje statusu | Tylko do odczytu |
| `progress-{agent}.md` | Dany agent | Postęp tura po turze: podjęte akcje, odczytane/zmodyfikowane pliki, bieżący status | Orkiestrator czyta |
| `result-{agent}.md` | Dany agent | Końcowe wyjście: status (completed/failed), podsumowanie, zmienione pliki, lista kontrolna kryteriów akceptacji | Orkiestrator czyta |
| `session-metrics.md` | Orkiestrator | Śledzenie Clarification Debt, progresja Quality Score | QA czyta |
| `experiment-ledger.md` | Orkiestrator/QA | Śledzenie eksperymentów gdy Quality Score jest aktywny | Wszyscy czytają |

Narzędzia pamięci są konfigurowalne. Domyślnie używa Serena MCP (`read_memory`, `write_memory`, `edit_memory`), ale niestandardowe narzędzia mogą być konfigurowane w `mcp.json`:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Panele kontrolne (`oma dashboard` i `oma dashboard:web`) obserwują te pliki pamięci w celu monitoringu w czasie rzeczywistym.
