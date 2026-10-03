---
title: Agenci
description: "Referencja 33 pakietów umiejętności OMA, 13 kanonicznych ról dyspozycyjnych i 12 śledzonych definicji subagentów: ich domeny, zasoby, wstępny protokół karty, ładowanie progresywne, reguły zakresu, bramki jakości, strategia przestrzeni roboczych, orkiestracja i pamięć runtime."
---

# Agenci

OMA rozdziela pakiety umiejętności, role dyspozycyjne i pliki definicji subagentów. Umiejętność kieruje do wskazówek domenowych i je ładuje, kanoniczna rola jest tożsamością runtime używaną przy dyspozycji, a definicja śledzona nadaje subagentowi personę właściwą dla dostawcy. Warstwy te celowo się pokrywają, dlatego o tym, czy wystarczy jedna umiejętność, decydują granice zadania i kryteria akceptacji.

Definicje agentów w katalogu `.agents/agents/` są źródłem prawdy. OMA projektuje je do plików właściwych dla dostawcy w runtime'ach obsługujących własne subagenty:

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` albo inny projekt wybranego dostawcy, jeśli jest obsługiwany

Gdy workflow mapuje agenta na tego samego dostawcę co bieżący runtime, powinien najpierw użyć natywnego pliku agenta tego runtime'u. Zadania między dostawcami przechodzą do `oma agent spawn`.

> **Dyspozycja modelem per agent:** każdy agent rozstrzyga konkretny slug modelu, dostawcę CLI i nakład rozumowania przez `model_preset` (oraz opcjonalne nadpisania `agents:`) w `.agents/oma-config.yaml`. Zobacz [Modele per agent](../guide/per-agent-models.md), aby skonfigurować te ustawienia, oraz [`oma doctor --profile`](../cli-interfaces/commands.md#doctor), aby sprawdzić bieżącą macierz.

---

## Kategorie agentów

| Kategoria | Agenci | Odpowiedzialność |
|----------|--------|-----------------|
| **Ideacja** | oma-brainstorm | Eksplorowanie pomysłów, proponowanie podejść, tworzenie dokumentów projektowych |
| **Architektura** | oma-architecture | Granice systemu/modułu/usługi, analiza w stylu ADR/ATAM/CBAM, rejestry kompromisów |
| **Planowanie** | oma-pm | Dekompozycja wymagań, podział zadań, kontrakty API, przypisywanie priorytetów |
| **Implementacja** | oma-frontend, oma-backend, oma-mobile, oma-db | Pisanie kodu w odpowiednich domenach |
| **Projektowanie** | oma-design | Systemy projektowe, DESIGN.md, tokeny, typografia, kolor, ruch, dostępność |
| **Infrastruktura** | oma-tf-infra | Wielochmurowe provisionowanie Terraform, IAM, optymalizacja kosztów, polityka jako kod |
| **DevOps** | oma-dev-workflow | Runner zadań mise, CI/CD, migracje, koordynacja wydań, automatyzacja monorepo |
| **Obserwowalność** | oma-observability | Potoki obserwowalności, routing śledzenia, sygnały MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), zarządzanie SLO, analiza śledcza incydentów, strojenie transportu |
| **Jakość** | oma-qa | Audyt bezpieczeństwa (OWASP), wydajność, dostępność (WCAG), przegląd jakości kodu |
| **Debugowanie** | oma-debug | Reprodukcja błędów, analiza przyczyn źródłowych, minimalne poprawki, testy regresji |
| **Lokalizacja** | oma-translation | Tłumaczenie uwzględniające kontekst, z zachowaniem tonu, rejestru i terminów domenowych |
| **Koordynacja** | oma-orchestration, oma-coordination | Automatyczna i ręczna orkiestracja wieloagentowa |
| **Git** | oma-scm | Generowanie Conventional Commits, dzielenie commitów według funkcjonalności |
| **Wyszukiwanie i pobieranie** | oma-search | Router wyszukiwania oparty na intencji z oceną zaufania (dokumenty Context7, web, kod `gh`/`glab`, lokalne code intelligence) |
| **Retrospektywa** | oma-recap | Analiza historii konwersacji z wielu narzędzi i tematyczne podsumowania pracy |
| **Przetwarzanie dokumentów** | oma-hwp, oma-pdf | Konwersja HWP/HWPX/HWPML i PDF do Markdown na potrzeby ingestii LLM/RAG |
| **Dokumentacja** | oma-docs | Wykrywanie dryfu dokumentacji (weryfikacja uszkodzonych odnośników, propozycje synchronizacji dla dokumentów dotkniętych diffem) |
| **Objaśnienia** | oma-explanation | Offline'owe interaktywne objaśnienia HTML dla diffów, branchy, PR-ów lub zakresów commitów |
| **Pisanie akademickie** | oma-academic-writing, oma-scholar | Tworzenie i audyt publikacyjnej prozy akademickiej oraz badania naukowe, wyszukiwanie i recenzowanie z sidecarami Knows |
| **Bezpieczeństwo** | oma-deepsec | Prowadzenie skanera podatności Vercel deepsec z agentami (scan, bramka PR, matchery, triage) z uwzględnieniem kosztów |
| **Refaktoryzacja** | oma-refactor | Stopniowa restrukturyzacja zachowująca działanie, kierowanie hotspotami, testy charakterystyki jako siatka bezpieczeństwa, commity tylko refaktoryzacyjne |
| **Badania rynku** | oma-market | Badanie bólu, trendów, konkurencji i odkrywania sygnałów społecznościowych z frameworkami SWOT/5F Portera/PESTEL dobieranymi do intencji |
| **Tworzenie umiejętności** | oma-skill-creation | Tworzenie i walidowanie umiejętności OMA w formacie SSL-lite |
| **Generowanie mediów** | oma-image, oma-slide, oma-video, oma-voice | Generowanie obrazów AI, prezentacje HTML, krótkie/objaśniające/demonstracyjne wideo oraz lokalne TTS/STT |

---

## Szczegółowa referencja agentów

### oma-brainstorm

**Domena:** Ideacja projektowa przed planowaniem lub implementacją.

**Kiedy używać:** Eksplorowanie pomysłu na funkcję, rozumienie intencji użytkownika i porównywanie podejść. Przed `/plan` używaj go przy złożonych lub niejednoznacznych żądaniach.

**Kiedy NIE używać:** Jasne wymagania (przejdź do oma-pm), implementacja (przejdź do agentów domenowych), przegląd kodu (przejdź do oma-qa).

**Podstawowe reguły:**
- Nie implementuj ani nie planuj przed zatwierdzeniem projektu
- Zadawaj jedno pytanie wyjaśniające naraz, a nie w partiach
- Zawsze proponuj 2–3 podejścia i wskaż rekomendowaną opcję
- Projektuj sekcja po sekcji i uzyskaj potwierdzenie użytkownika na każdym kroku
- YAGNI: projektuj tylko to, co jest potrzebne

**Workflow:** 6 faz: eksploracja kontekstu, pytania, podejścia, projekt, dokumentacja (zapis do `docs/plans/`), przejście do `/plan`.

**Zasoby:** Korzysta wyłącznie ze współdzielonych zasobów (clarification-protocol, quality-principles, skill-routing).

---

### oma-architecture

**Domena:** Architektura oprogramowania/systemu, w tym granice modułów i usług, analiza kompromisów, synteza interesariuszy i rejestry decyzji.

**Kiedy używać:** Wybór lub przegląd architektury systemu, definiowanie granic modułu/usługi/własności, porównywanie opcji architektonicznych z jawnymi kompromisami, badanie problemów architektonicznych (amplifikacja zmian, ukryte zależności, niewygodne API), priorytetyzacja inwestycji lub refaktoryzacji architektonicznych, pisanie rekomendacji architektonicznych lub ADR-ów.

**Kiedy NIE używać:** Systemy wizualne/projektowe (użyj oma-design), planowanie funkcjonalności i dekompozycja zadań (użyj oma-pm), implementacja Terraform (użyj oma-tf-infra), diagnoza błędów (użyj oma-debug), przegląd bezpieczeństwa/wydajności/dostępności (użyj oma-qa).

**Metodologie:** Routing diagnostyczny, porównanie design-twice, analiza ryzyka w stylu ATAM, priorytetyzacja w stylu CBAM, zapisy decyzji w stylu ADR.

**Podstawowe reguły:**
- Zdiagnozuj problem architektoniczny przed wyborem metody
- Użyj najlżejszej wystarczającej metodologii dla bieżącej decyzji
- Odróżnij projekt architektoniczny od projektu UI/wizualnego oraz od dostarczenia Terraform
- Konsultuj agentów interesariuszy tylko wtedy, gdy decyzja jest na tyle przekrojowa, by uzasadnić koszt
- Jakość rekomendacji jest ważniejsza niż pozory konsensusu: konsultuj szeroko, ale decyduj jawnie
- Każda rekomendacja musi podawać założenia, kompromisy, ryzyka i kroki walidacji
- Domyślnie uwzględniaj koszty: implementacji, operacyjne, złożoność zespołu i przyszłe zmiany

**Zasoby:** `SKILL.md`, katalog `resources/` z przewodnikami metodologii (diagnostic-routing, design-twice, ATAM, CBAM, szablony ADR).

---

### oma-pm

**Domena:** Zarządzanie produktem, w tym analiza wymagań, dekompozycja zadań i kontrakty API.

**Kiedy używać:** Rozkładanie złożonych funkcji, określanie wykonalności, priorytetyzacja pracy i definiowanie kontraktów API.

**Podstawowe reguły:**
- Projektuj API-first: definiuj kontrakty przed zadaniami implementacyjnymi
- Każde zadanie ma: agenta, tytuł, kryteria akceptacji, priorytet i zależności
- Minimalizuj zależności, aby maksymalizować wykonanie równoległe
- Bezpieczeństwo i testowanie należą do każdego zadania, a nie do oddzielnych faz
- Zadania muszą być wykonalne przez jednego agenta
- Zwróć plan JSON oraz task board przypisany do sesji, aby orkiestrator mógł z niego korzystać

**Wyjście:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, zapis do pamięci dla orkiestratora.

**Zasoby:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/template.md` (kontrakty są zapisywane w `.agents/results/api-contracts/`).

---

### oma-frontend

**Domena:** Interfejs webowy zbudowany w React, Next.js i TypeScript na architekturze FSD-lite.

**Kiedy używać:** Budowanie interfejsów użytkownika, komponentów, logiki klienckiej, stylowania, walidacji formularzy i integracji z API.

**Stos technologiczny:**
- React + Next.js (domyślnie Server Components, Client Components dla interaktywności)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (prymitywy tylko do odczytu, rozszerzaj przez cva/wrappery)
- FSD-lite: główny `src/` + funkcje `src/features/*/` (bez importów między funkcjami)

**Biblioteki:**
| Przeznaczenie | Biblioteka |
|---------|---------|
| Daty | luxon |
| Stylowanie | TailwindCSS v4 + shadcn/ui |
| Hooki | ahooks lub @mantine/hooks |
| Narzędzia | es-toolkit |
| Stan URL | nuqs |
| Stan serwera | TanStack Query (albo hooki generowane przez orval, gdy istnieje specyfikacja OpenAPI) |
| Stan klienta | Jotai (używaj oszczędnie) |
| Formularze | @tanstack/react-form + Zod |
| Uwierzytelnianie | better-auth |

**Podstawowe reguły:**
- Najpierw shadcn/ui, rozszerzaj przez cva, nigdy nie modyfikuj bezpośrednio `components/ui/*`
- Mapuj tokeny projektowe 1:1, nigdy nie koduj kolorów na stałe
- Proxy zamiast middleware (Next.js 16+ używa `proxy.ts`, nie `middleware.ts` do logiki proxy)
- Nie stosuj prop drillingu ponad 3 poziomy; zamiast tego używaj atomów Jotai
- Importy absolutne z `@/` są obowiązkowe
- Cel FCP < 1 s
- Responsywne breakpointy: 320px, 768px, 1024px, 1440px

**Zasoby:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md` i `checklist.md`.

**Lista kontrolna bramki jakości:**
- Dostępność: etykiety ARIA, semantyczne nagłówki, nawigacja klawiaturą
- Mobile: weryfikacja w widokach mobilnych
- Wydajność: brak CLS, szybkie ładowanie
- Odporność: Error Boundaries i Loading Skeletons
- Testy: logika pokryta przez Vitest
- Jakość: typecheck i lint przechodzą

---

### oma-backend

**Domena:** API, logika po stronie serwera, uwierzytelnianie i operacje bazodanowe.

**Kiedy używać:** API REST/GraphQL, migracje baz danych, uwierzytelnianie, logika biznesowa serwera i zadania w tle.

**Architektura:** Router (HTTP) -> Service (logika biznesowa) -> Repository (dostęp do danych) -> Models.

**Wykrywanie stosu:** Odczytuje manifesty projektu (pyproject.toml, package.json, Cargo.toml, go.mod itd.), aby ustalić język i framework. Jeśli brakuje konwencji właściwych dla projektu, prosi użytkownika o uruchomienie `/stack-set`; ta komenda materializuje rozstrzygnięte odwołania `stack/` z dostarczonego schematu i szablonów.

**Podstawowe reguły:**
- Czysta architektura: żadnej logiki biznesowej w handlerach tras
- Wszystkie dane wejściowe waliduj biblioteką walidacyjną projektu
- Używaj wyłącznie zapytań parametryzowanych (nigdy interpolacji ciągów w SQL)
- JWT + Argon2id do uwierzytelniania (bcrypt jest dopuszczalny wyłącznie dla zgodności ze starszym kodem); ograniczaj częstotliwość endpointów uwierzytelniania
- Stosuj async, gdy jest obsługiwane; dodaj adnotacje typów do wszystkich sygnatur
- Własne wyjątki obsługuj przez scentralizowany moduł błędów
- Jawnie określ strategię ładowania ORM, granice transakcji i bezpieczny cykl życia

**Zasoby:** `execution-protocol.md`, `orm-reference.md`, `checklist.md` i `error-playbook.md`. `variants/stack.schema.json` definiuje kształt manifestu stosu.

<!-- oma-docs:ignore-start -->
Właściwe dla projektu `stack/stack.yaml`, `stack/tech-stack.md`, fragmenty i szablony API są generowane przez `/stack-set`, gdy są potrzebne; nie istnieją, dopóki stos nie zostanie zmaterializowany.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Domena:** Aplikacje mobilne międzyplatformowe i natywne (Flutter, React Native oraz natywny Swift na iOS).

**Kiedy używać:** Natywne aplikacje mobilne (iOS + Android), wzorce UI właściwe dla urządzeń mobilnych, funkcje platformy (kamera, GPS, powiadomienia push), architektura offline-first; natywne aplikacje iOS w Swift korzystające z SwiftUI i `swift-openapi-generator`.

**Architektura:** Clean Architecture: domain -> data -> presentation. Dla natywnego Swift iOS: układ projektu `App/Core/Features/Shared`.

**Stosy technologiczne:**
- Flutter/Dart: Riverpod/Bloc (zarządzanie stanem), Dio z interceptorami (API), GoRouter (nawigacja), Material Design 3 (Android) + iOS HIG.
- Natywny Swift iOS (iOS 17+): SwiftUI + `@Observable` (framework Observation), Apple `swift-openapi-generator` dla klientów API, układ `App/Core/Features/Shared`.

**Podstawowe reguły:**
- Riverpod/Bloc do zarządzania stanem (bez surowego setState dla złożonej logiki)
- Wszystkie kontrolery usuwaj w metodzie `dispose()`
- Używaj Dio z interceptorami do wywołań API i obsługuj tryb offline
- Celuj w 60 kl./s; testuj na obu platformach
- Swift: na iOS 17+ używaj `@Observable` zamiast `ObservableObject`; generuj klientów API ze specyfikacji OpenAPI przez `swift-openapi-generator`

**Zasoby:** `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md` i `error-playbook.md`. Katalog `variants/` zawiera schemat stosu oraz wygenerowane odwołania platformowe, gdy `/stack-set` je zmaterializuje.

---

### oma-db

**Domena:** Architektura baz danych SQL, NoSQL i wektorowych.

**Kiedy używać:** Projektowanie schematów, ERD, normalizacja, indeksowanie, transakcje, szacowanie pojemności, strategia backupu, projektowanie migracji, architektura wektorowych baz danych/RAG, przegląd antywzorców, projektowanie z uwzględnieniem zgodności (ISO 27001/27002/22301).

**Domyślny workflow:** Eksploruj (ustal encje, wzorce dostępu i wolumen) -> Projektuj (schemat, ograniczenia, transakcje) -> Optymalizuj (indeksy, partycjonowanie, archiwizacja, antywzorce).

**Podstawowe reguły:**
- Najpierw wybierz model, potem silnik
- Domyślnie stosuj 3NF dla relacyjnych baz; dokumentuj kompromisy BASE dla rozproszonych
- Dokumentuj wszystkie trzy warstwy schematu: zewnętrzną, koncepcyjną i wewnętrzną
- Integralność traktuj jako podstawę: encji, domeny, referencyjna i reguł biznesowych
- Współbieżność nigdy nie jest niejawna: zdefiniuj granice transakcji i poziomy izolacji
- Bazy wektorowe są infrastrukturą wyszukiwania, nie źródłem prawdy
- Nigdy nie traktuj wyszukiwania wektorowego jako zamiennika wyszukiwania leksykalnego

**Wymagane rezultaty:** Podsumowanie schematu zewnętrznego, schemat koncepcyjny, schemat wewnętrzny, tabela standardów danych, glosariusz, szacowanie pojemności oraz strategia backupu/odzyskiwania. Dla wektorowych baz/RAG: polityka wersjonowania embeddingów, polityka chunkowania i strategia wyszukiwania hybrydowego.

**Zasoby:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domena:** Systemy projektowe, UI/UX i zarządzanie DESIGN.md.

**Kiedy używać:** Tworzenie systemów projektowych, stron docelowych, tokenów projektowych, palet kolorów, typografii, układów responsywnych i przeglądów dostępności.

**Workflow:** 7 faz: konfiguracja (zbieranie kontekstu) -> ekstrakcja (opcjonalnie z URL-i referencyjnych) -> ulepszenie (rozszerzenie niejasnego promptu) -> propozycja (2–3 kierunki projektowe) -> generowanie (DESIGN.md + tokeny) -> audyt (responsywność, WCAG, Nielsen, kontrola AI slop) -> przekazanie.

**Wymuszanie antywzorców („bez AI slop”):**
- Typografia: domyślnie systemowy stos fontów; żadnych domyślnych Google Fonts bez uzasadnienia
- Kolor: żadnych fioletowo-niebieskich gradientów, gradientowych kul/blobów ani czystej bieli na czystej czerni
- Układ: żadnych zagnieżdżonych kart, układów wyłącznie desktopowych ani sztampowych układów z 3 metrykami
- Ruch: żadnego bounce easing wszędzie ani animacji > 800 ms; trzeba respektować prefers-reduced-motion
- Komponenty: żadnego glassmorphismu wszędzie; każdy element interaktywny potrzebuje alternatywy klawiaturowej/dotykowej

**Podstawowe reguły:**
- Najpierw sprawdź `.design-context.md`; utwórz go, jeśli brakuje
- Domyślnie stosuj systemowy stos fontów (fonty gotowe na CJK dla ko/ja/zh)
- Minimum WCAG AA dla każdego projektu
- Responsive-first (mobile jako domyślne)
- Przedstaw 2–3 kierunki i uzyskaj potwierdzenie

**Zasoby:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md` oraz katalog `reference/` (typografia, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d).

---

### oma-tf-infra

**Domena:** Infrastruktura jako kod z Terraformem i obsługa wielu chmur.

**Kiedy używać:** Provisionowanie na AWS/GCP/Azure/Oracle Cloud, konfiguracja Terraform, uwierzytelnianie CI/CD (OIDC), CDN/load balancers/storage/networking, zarządzanie stanem i infrastruktura zgodna z ISO.

**Wykrywanie chmury:** Odczytuje providery Terraform i prefiksy zasobów (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Zawiera pełną tabelę mapowania zasobów wielochmurowych.

**Podstawowe reguły:**
- Niezależność od providera: wykryj chmurę z kontekstu projektu
- Zdalny stan z wersjonowaniem i blokadą
- OIDC jako pierwszy wybór uwierzytelniania CI/CD
- Zawsze wykonaj plan przed apply
- Uprawnienia IAM zgodne z zasadą najmniejszych uprawnień
- Otaguj wszystko (Environment, Project, Owner, CostCenter)
- Żadnych sekretów w kodzie
- Przypnij wersje wszystkich providerów i modułów
- Żadnego auto-approve na produkcji

**Zasoby:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domena:** Automatyzacja zadań monorepo i CI/CD.

**Kiedy używać:** Uruchamianie serwerów deweloperskich, wykonywanie lint/format/typecheck w aplikacjach, migracje baz danych, generowanie API, buildy i18n, buildy produkcyjne, optymalizacja CI/CD oraz walidacja pre-commit.

**Podstawowe reguły:**
- Zawsze używaj zadań `mise run` zamiast bezpośrednich poleceń menedżera pakietów
- Uruchamiaj lint/test tylko dla zmienionych aplikacji
- Weryfikuj komunikaty commitów przez commitlint
- CI powinno pomijać niezmienione aplikacje
- Gdy istnieją zadania mise, nigdy nie używaj bezpośrednich poleceń menedżera pakietów

**Zasoby:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**Domena:** Router obserwowalności i śledzenia oparty na intencji, działający przez warstwy, granice i sygnały.

**Kiedy używać:** Konfiguracja potoku obserwowalności (SDK OTel + Collector + backend dostawcy), śledzenie przez granice usług i domen (propagatory W3C, baggage, multi-tenant, multi-cloud), strojenie transportu (progi UDP/MTU, OTLP gRPC vs HTTP, topologia Collector DaemonSet vs sidecar, receptury samplingu), analiza śledcza incydentów (lokalizacja w 6 wymiarach: kod / usługa / warstwa / host / region / infra), wybór kategorii dostawcy (pełny stos OSS vs komercyjny SaaS vs specjalista high-cardinality vs specjalista profilowania), obserwowalność jako kod (dashboardy Grafana Jsonnet, CRD PrometheusRule, OpenSLO YAML, alerty SLO burn-rate), metaobserwowalność (samo‑zdrowie potoku, przesunięcie zegara, ograniczenia cardinality, macierz retencji), pokrycie sygnałów MELT+P (metrics, logs, traces, profiles, cost, audit, privacy), migracja z przestarzałych narzędzi (Fluentd -> Fluent Bit albo OTel Collector).

**Kiedy NIE używać:** Operacje LLM / obserwowalność gen_ai (użyj Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage potoków danych (OpenLineage + Marquez, test dbt, lineage Airflow), telemetria fizycznej warstwy IoT / data center (Nlyte, Sunbird, Device42), orkiestracja chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), infrastruktura GPU / TPU (NVIDIA DCGM Exporter), łańcuch dostaw oprogramowania (sigstore, in-toto, SLSA), workflow reagowania na incydenty / paging (PagerDuty, OpsGenie, Grafana OnCall), konfiguracja pojedynczego dostawcy już objęta jego własną umiejętnością.

**Podstawowe reguły:**
- Najpierw sklasyfikuj intencję: setup | migrate | investigate | alert | trace | tune | route
- Najpierw kategoria, nie rejestr dostawców: deleguj do umiejętności należących do dostawcy przez `resources/vendor-categories.md`; nie duplikuj dokumentacji dostawcy
- Strojenie transportu to przewaga: progi UDP/MTU, wybór protokołu OTLP, topologia Collectora i receptury samplingu to głębia, której nie pokrywają inne umiejętności
- Metaobserwowalność jest obowiązkowa: sprawdź samo‑zdrowie potoku, synchronizację zegara (< 100 ms dryfu), cardinality i retencję przed uznaniem konfiguracji za ukończoną
- Preferuj CNCF: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd jest przestarzały (CNCF 2025-10): dla nowych wdrożeń i migracji zalecaj Fluent Bit albo OTel Collector
- Domyślnie propaguj W3C Trace Context; tłumacz per chmura (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Prywatność przed funkcjami: redakcja PII, reguły baggage uwzględniające sampling, niezmienny audyt SOC2/ISO i usuwanie GDPR/PIPA stosuj podczas zbierania, nie tylko w magazynie

**Zasoby:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, a także głębokie zasoby w `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) i `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domena:** Zapewnianie jakości obejmujące bezpieczeństwo, wydajność, dostępność i jakość kodu.

**Kiedy używać:** Końcowy przegląd przed wdrożeniem, audyty bezpieczeństwa, analiza wydajności, zgodność z dostępnością i analiza pokrycia testami.

**Kolejność przeglądu:** Bezpieczeństwo > wydajność > dostępność > jakość kodu.

**Poziomy ważności:**
- **CRITICAL**: naruszenie bezpieczeństwa, ryzyko utraty danych
- **HIGH**: blokuje wydanie
- **MEDIUM**: napraw w tym sprincie
- **LOW**: backlog

**Podstawowe reguły:**
- Każde ustalenie musi zawierać plik:wiersz, opis i poprawkę
- Najpierw uruchamiaj narzędzia automatyczne (npm audit, bandit, lighthouse)
- Żadnych fałszywych alarmów; każde ustalenie musi dać się odtworzyć
- Dostarczaj kod remediacji, a nie tylko opisy

**Zasoby:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

---

### oma-debug

**Domena:** Diagnozowanie i naprawianie błędów.

**Kiedy używać:** Błędy zgłaszane przez użytkowników, crashe, problemy z wydajnością, sporadyczne awarie, wyścigi i regresje.

**Metodyka:** Najpierw odtwórz, potem diagnozuj. Nigdy nie zgaduj poprawek.

**Podstawowe reguły:**
- Ustal przyczynę źródłową, nie tylko objawy
- Minimalna poprawka: zmieniaj tylko to, co konieczne
- Każda poprawka otrzymuje test regresji
- Wyszukaj podobne wzorce w innych miejscach
- Udokumentuj wynik w `.agents/results/`

**Narzędzia code intelligence (Gortex lub Serena):**
- `find_symbol("functionName")` lub nawigacja po symbolach Gortex: znajdź funkcję
- `find_referencing_symbols("Component")` lub analiza wpływu Gortex: znajdź wszystkie użycia
- `search_for_pattern("error pattern")` lub wyszukiwanie Gortex: znajdź podobne problemy

**Zasoby:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

---

### oma-translation

**Domena:** Wielojęzyczne tłumaczenie uwzględniające kontekst.

**Kiedy używać:** Tłumaczenie tekstów UI, dokumentacji i marketingu, przegląd istniejących tłumaczeń, tworzenie glosariuszy.

**Sześć scen:** Przygotuj, pozyskaj, rozumuj, działaj, zweryfikuj i sfinalizuj. Metoda tłumaczenia ma cztery kroki: przeczytaj znaczenie i chronioną składnię, wybierz rejestr, odtwórz tekst w języku docelowym i zachowaj styl autora tam, gdzie jest to właściwe.

**Podstawowe reguły:**
- Najpierw przejrzyj pliki istniejącej lokalizacji, aby dopasować konwencje
- Tłumacz znaczenie, nie słowa
- Zachowaj konotacje emocjonalne
- Nigdy nie twórz tłumaczenia słowo w słowo
- Nie mieszaj rejestrów w jednym tekście
- Zachowuj terminologię właściwą dla domeny bez zmian

**Zasoby:** `translation-rubric.md`, `anti-ai-patterns.md` (oba niezależne od języka) oraz profil języka docelowego w `resources/lang/` (`ko`, `ja`, `zh`, `en`; `_template.md` służy do dodawania kolejnych języków).

---

### oma-orchestration

**Domena:** Automatyczna koordynacja wieloagentowa przez uruchamianie CLI.

**Kiedy używać:** Złożone funkcje wymagające wielu agentów działających równolegle, implementacja full-stack i automatyczne wykonywanie.

**Domyślna konfiguracja:**

| Ustawienie | Domyślnie | Opis |
|---------|---------|---------|
| MAX_PARALLEL | 3 | Maksymalna liczba równoczesnych subagentów |
| MAX_RETRIES | 2 | Próby ponowienia dla każdego nieudanego zadania |
| POLL_INTERVAL | 30s | Interwał sprawdzania stanu |

**Fazy workflowu:** Plan -> konfiguracja (ID sesji, inicjalizacja pamięci) -> wykonanie (uruchamianie według poziomów priorytetu) -> monitorowanie (odczyt postępu) -> weryfikacja (automatyczna i pętla przeglądu między agentami) -> zebranie wyników.

**Pętla przeglądu agent-agent:**
1. Samoprzegląd: agent sprawdza własny diff względem kryteriów akceptacji
2. Automatyczna weryfikacja: `oma verify agent {agent-type} --workspace {workspace}`
3. Przegląd krzyżowy: agent QA sprawdza zmiany
4. Po niepowodzeniu: problemy trafiają do poprawki (łącznie maksymalnie 5 iteracji pętli)

**Dowody sesji:** Zapisuje istotne korekty i rozstrzygnięte ustalenia przeglądu, gdy jest to pomocne, wraz z przyczyną, wpływem i weryfikacją. Nie obowiązuje żadna punktacja karna ani wstrzymanie sesji wyzwalane punktami.

**Zasoby:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domena:** Zarządzanie konfiguracją oprogramowania (SCM) i Git, obejmujące gałęzie, konflikty, worktree, baseline'y, gotowość audytową i Conventional Commits.

**Kiedy używać:** Po zmianach kodu (`/scm`), przy konfliktach scalania, strategii branchy, wydaniach/tagach albo dowolnym pytaniu o zarządzanie konfiguracją repozytorium.

**Typy commitów:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow (commity):** Przeanalizuj zmiany -> w razie potrzeby podziel według funkcji -> type -> scope -> description (tryb rozkazujący, poniżej 72 znaków, małe litery, bez kropki na końcu) -> commit z jawnymi ścieżkami.

**Reguły:**
- Nigdy nie używaj `git add -A` ani `git add .`
- Nigdy nie commituj plików z sekretami
- Zawsze podawaj pliki podczas stagingu
- Do wielowierszowych komunikatów commitów używaj HEREDOC
- Przyczepy współautora są dodawane tylko wtedy, gdy aktywna konfiguracja `scm.co_author` je włącza i podaje nazwę oraz adres e-mail

---

### oma-coordination

**Domena:** Ręczny przewodnik krok po kroku po koordynacji wieloagentowej.

**Kiedy używać:** Przy złożonych projektach, gdy potrzebujesz kontroli człowieka na każdej bramce, wskazówek ręcznego uruchamiania agentów i recept krok po kroku.

**Kiedy NIE używać:** W pełni automatyczne wykonanie równoległe (użyj oma-orchestration), zadania w jednej domenie (użyj bezpośrednio właściwego agenta domenowego).

**Podstawowe reguły:**
- Zawsze przedstaw plan do potwierdzenia użytkownika przed uruchomieniem agentów
- Jeden poziom priorytetu naraz; poczekaj na ukończenie przed kolejnym
- Użytkownik zatwierdza każde przejście przez bramkę
- Przegląd QA jest obowiązkowy przed scaleniem
- Pętla remediacji problemów dla ustaleń CRITICAL/HIGH

**Workflow:** PM planuje -> użytkownik potwierdza -> uruchom według poziomów priorytetu -> monitoruj -> przegląd QA -> popraw problemy -> dostarcz.

**Różnica względem oma-orchestration:** Koordynacja jest ręczna i prowadzona (użytkownik kontroluje tempo), a orkiestrator działa automatycznie (agenci uruchamiają się przy minimalnej interwencji użytkownika).

---

### oma-search

**Domena:** Router wyszukiwania oparty na intencji i ocenie zaufania domeny. Kieruje zapytania do Context7 (dokumentacja), natywnego wyszukiwania webowego, `gh`/`glab` (kod) i lokalnego code intelligence (Gortex lub Serena).

**Kiedy używać:** Wyszukiwanie oficjalnej dokumentacji bibliotek/frameworków, badania webowe poradników/przykładów/porównań/rozwiązań, wyszukiwanie wzorców implementacyjnych w GitHub/GitLab, dowolne zapytanie, gdy kanał wyszukiwania jest niejasny (automatyczny routing), oraz jako infrastruktura wyszukiwania dla innych umiejętności (wspólne wywołanie).

**Kiedy NIE używać:** Eksploracja wyłącznie lokalnej bazy kodu (użyj bezpośrednio code intelligence), analiza historii Git lub blame (użyj oma-scm), pełne badania architektury (użyj oma-architecture, która może wewnętrznie wywołać tę umiejętność).

**Podstawowe reguły:**
- Najpierw sklasyfikuj intencję; każde zapytanie przechodzi przez IntentClassifier
- Jedno zapytanie, jedna najlepsza trasa; unikaj redundantnych tras, chyba że intencja jest niejednoznaczna
- Oceniaj zaufanie każdego wyniku; wyniki nielokalne otrzymują etykiety zaufania domeny z rejestru
- Flagi nadpisują klasyfikator: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Posuwaj pracę naprzód mimo błędu: jeśli główna trasa nie działa, płynnie przejdź do zapasowej (docs→web, web→strategie `oma search fetch`)
- Nie jest potrzebny dodatkowy MCP: Context7 dla dokumentacji, runtime dla webu, CLI dla kodu, skonfigurowany provider (Gortex lub Serena) lokalnie
- Wyszukiwanie webowe niezależne od dostawcy: użyj tego, co udostępnia bieżący runtime (WebSearch, Google, Bing)
- Zaufanie oceniaj na poziomie domeny, bez punktacji ścieżek podrzędnych ani pojedynczych stron

**Zasoby:** `SKILL.md`, katalog `resources/` z klasyfikatorem intencji, definicjami tras i rejestrem zaufania.

---

### oma-recap

**Domena:** Analiza historii konwersacji z wielu narzędzi AI (Claude, Codex, Qwen, Cursor) i tematyczne podsumowania dzienne/okresowe.

**Kiedy używać:** Podsumowanie dnia lub okresu pracy, zrozumienie przebiegu pracy w wielu narzędziach AI, analiza przełączania narzędzi między sesjami, przygotowanie codziennych stand-upów, tygodniowych retrospektyw i dzienników pracy.

**Kiedy NIE używać:** Retrospektywa zmian kodu oparta na commitach Git (użyj `oma retro`), monitorowanie agentów w czasie rzeczywistym (użyj `oma dashboard terminal`), metryki produktywności (użyj `oma stats get`).

**Proces:**
1. Rozstrzygnij datę lub okno czasowe z języka naturalnego (dzisiaj, wczoraj, ostatni poniedziałek, jawna data)
2. Pobierz dane rozmów przez `oma recap --date YYYY-MM-DD` albo `--since` / `--until`
3. Grupuj według narzędzia i sesji
4. Wyodrębnij tematy (funkcje, nad którymi pracowano, naprawione błędy, poznane narzędzia)
5. Wygeneruj tematyczne podsumowanie dnia/okresu

**Zasoby:** `SKILL.md`. Ciężką pracę przekazuje do CLI `oma recap`.

---

### oma-hwp

**Domena:** Konwersja HWP / HWPX / HWPML (koreański edytor dokumentów) do Markdown za pomocą `kordoc`.

**Kiedy używać:** Konwersja koreańskich dokumentów HWP (`.hwp`, `.hwpx`, `.hwpml`) do Markdown, przygotowanie koreańskich dokumentów rządowych/firmowych dla kontekstu LLM lub RAG, wydobywanie struktury (tabele, nagłówki, listy, obrazy, przypisy, hiperłącza) z HWP.

**Kiedy NIE używać:** Pliki PDF (użyj oma-pdf), XLSX/DOCX (poza zakresem), generowanie/edycja HWP (poza zakresem), pliki już tekstowe (użyj bezpośrednio narzędzia Read).

**Podstawowe reguły:**
- Uruchamiaj przez `bunx kordoc@latest` (bez instalacji); zawsze podawaj `@latest` albo przypiętą wersję
- Domyślny format wyniku to Markdown
- Gdy nie podasz katalogu wyjściowego, zapisuj do tego samego katalogu co plik wejściowy
- kordoc zachowuje strukturę (nagłówki, tabele, tabele zagnieżdżone, przypisy, hiperłącza, obrazy)
- kordoc zapewnia ochronę (ZIP bomb, XXE, SSRF, XSS); nie dodawaj własnych zabezpieczeń
- Przy HWP zaszyfrowanym lub z DRM jasno zgłoś użytkownikowi ograniczenie
- Po konwersji użyj `resources/flatten-tables.ts`, aby przekształcić bloki HTML `<table>` w tabele GFM i usunąć znaki Hancom z obszaru Private Use Area

**Zasoby:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Domena:** Konwersja PDF do Markdown za pomocą `opendataloader-pdf`.

**Kiedy używać:** Konwersja PDF do Markdown na potrzeby kontekstu LLM lub RAG, wydobywanie uporządkowanej treści (tabel, nagłówków, list, obrazów) z PDF-ów, przygotowanie ich do użycia przez AI.

**Kiedy NIE używać:** Generowanie PDF-ów (użyj właściwych narzędzi dokumentowych), edycja istniejących PDF-ów (poza zakresem), proste czytanie już tekstowych plików (użyj bezpośrednio narzędzia Read).

**Podstawowe reguły:**
- Uruchamiaj przez `uvx opendataloader-pdf` (bez instalacji)
- Domyślny format wyniku to Markdown
- Gdy nie podasz katalogu wyjściowego, zapisuj do tego samego katalogu co wejściowy PDF
- Zachowuj strukturę dokumentu (nagłówki, tabele, listy, obrazy)
- Dla skanowanych PDF-ów używaj trybu hybrydowego z OCR
- Zawsze uruchamiaj `uvx mdformat` na wyjściu, aby ujednolicić formatowanie Markdown
- Zweryfikuj, czy wynikowy Markdown jest czytelny i ma dobrą strukturę
- Zgłoś użytkownikowi problemy z konwersją (brakujące tabele, zniekształcony tekst)

**Zasoby:** `SKILL.md`, `config/`, `resources/`.

---

### oma-academic-writing

**Domena:** Publikacyjna proza akademicka po angielsku: tworzenie, redagowanie i audyt esejów, raportów, sekcji analitycznych, podsumowań dla kadry kierowniczej, zakończeń i przeglądów literatury.

**Kiedy używać:** Tworzenie lub redagowanie raportów/esejów/sekcji analitycznych, pisanie podsumowań, zakończeń albo przeglądów literatury, przepisywanie prozy brzmiącej jak AI na naturalny akademicki angielski, dopracowywanie tekstu do najwyższego poziomu rubryki (HD, A, top-band), przegląd zróżnicowania zdań, jakości czasowników, hedgingu i zgodności z regułami anty-AI.

**Kiedy NIE używać:** Tłumaczenie (użyj oma-translation), wyszukiwanie źródeł/cytowań/literatury (użyj oma-scholar), interpretacja rubryki i dekompozycja zadań (użyj oma-pm), dokumentacja kodu / README / tekst referencji API (użyj odpowiedniej umiejętności domenowej), tekst nieformalny lub marketingowy, tekst akademicki w innym języku (najpierw napisz po angielsku, potem przekaż do oma-translation).

**Tryby:** `draft` (nagłówek + proza + Writing Notes + Claim-Evidence Map), `revise` (oryginał + wersja poprawiona + lista zmian), `review` (raport PASS/FAIL dla struktury zdań, jakości czasowników, anty-AI, konkretności, hedgingu, jasności akapitów, rytmu i zgodności twierdzeń z dowodami).

**Podstawowe reguły:**
- Najpierw zacytuj, potem oceniaj: przytocz dosłowny tekst rubryki/ograniczenia przed zastosowaniem reguły
- Każde zdanie musi dać się zweryfikować; nigdy nie wymyślaj danych, statystyk ani cytowań
- Zakazane czasowniki ogólne (`show`, `have`, `make`, `do`, `get`, `use`, …) nie mogą być czasownikami głównymi
- Zmieniaj typ, długość i początek zdań; nigdy nie twórz 3+ zdań tego samego typu z rzędu
- Siłę hedgingu dopasuj do siły dowodów; nie używaj pierwszoosobowego `I think`/`I believe`
- Każde twierdzenie mapuj do dowodu w Claim-Evidence Map; osłab lub usuń twierdzenia bez poparcia

**Workflow:** 6 kroków — przeczytaj rubrykę/projekt i zacytuj ograniczenia, zaplanuj akapity jako Topic-Support-Conclude, napisz według wszystkich czterech protokołów, przeprowadź audyt względem checklisty anty-AI, zrób REVERSE-OUTLINE + Claim-Evidence Map, dopracuj (czytanie na głos, spójność, konkretność, liczba słów, rytm).

**Zasoby:** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md` oraz współdzielone `context-loading`, `quality-principles`.

---

### oma-deepsec

**Domena:** Bezpieczne i oszczędne kosztowo prowadzenie skanera podatności Vercel `deepsec` z agentami w docelowym repozytorium, od początku do końca.

**Kiedy używać:** Pierwsza instalacja deepsec w repozytorium (`init`, zapis `INFO.md`, skan kalibracyjny), pełny lub ograniczony skan i przetwarzanie ustaleń, konfiguracja bramki CI per PR z `process --diff`, tworzenie matcherów właściwych dla projektu, triage zaległych ustaleń (grupowanie severity, redukcja FP przez `revalidate`, eksport), diagnozowanie błędów deepsec.

**Kiedy NIE używać:** Ogólny przegląd OWASP/lint bez deepsec (użyj oma-qa), ogólne porady CVE/zależności (użyj oma-qa lub oma-search), projektowanie potoku SAST innego niż deepsec (użyj oma-architecture), pisanie lub audyt kodu aplikacji (skieruj do oma-backend/frontend/mobile), utwardzanie chmury/IAM/Terraform (użyj oma-tf-infra), rozumowanie nad poprawką ustalenia w kodzie produktu (użyj oma-debug po wygenerowaniu ustalenia przez deepsec).

**Podstawowe reguły:**
- Nigdy nie uruchamiaj nieograniczonego `process` dla repozytorium, którego rozmiaru nie zmierzono; najpierw wykonaj kalibrację (`--limit 50 --concurrency 5`), gdy liczba plików jest nieznana lub przekracza 500
- Przed każdym przebiegiem AI podaj koszt i warunek zatrzymania (około 25–60 USD za 100 plików do 500–1200 USD za 2000, z wahaniem ×2–3)
- Wznawiaj, nie resetuj: po przerwaniu z powodu limitu, sieci lub Ctrl-C uruchom ponownie tę samą komendę; nigdy nie usuwaj `data/<id>/`, aby zacząć od nowa
- `INFO.md` utrzymuj krótkie i właściwe dla projektu (50–100 linii, 3–5 przykładów na sekcję)
- Dla bramek PR/CI używaj wzorca z dwoma zadaniami; nigdy nie przyznawaj `pull-requests: write` zadaniu uruchamiającemu kod kontrolowany przez PR; w produkcji przypinaj akcje pełnymi SHA
- Przed pierwszym płatnym wywołaniem zapytaj o wybór agenta (`codex`/`gpt-5.5` lub `claude`/`claude-opus-4-8`); nigdy nie wypisuj ani nie commituj poświadczeń

**Workflow:** PREPARE (intencja, katalog główny repozytorium, poświadczenie, budżet, minimalny poziom ważności, agent) -> ACQUIRE (konfiguracja, `INFO.md`, historia uruchomień, sygnały repozytorium) -> REASON (wybierz najmniejszy wystarczający przebieg) -> ACT (uruchom wewnątrz `.deepsec/`) -> VERIFY (`status`, `RunMeta`, kod wyjścia) -> FINALIZE (ustalenia według ważności/werdyktu, koszt w dolarach, dalsze kroki).

**Zasoby:** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Domena:** Wykrywanie dryfu dokumentacji: weryfikacja odnośników `docs/**/*.md` względem bieżącej bazy kodu (tryb verify) i proponowanie poprawek dla dokumentów dotkniętych diffem (tryb sync).

**Kiedy używać:** Po refaktoryzacji/zmianie nazwy/usunięciu pliku w celu znalezienia nieaktualnych odwołań w dokumentacji, przed wydaniem w celu potwierdzenia istnienia komend CLI / ścieżek plików / kluczy konfiguracji, po znaczącym diffie Git w celu znalezienia dokumentów odwołujących się do zmienionych plików, przy rutynowych kontrolach dryfu w repozytorium z dużą ilością dokumentacji.

**Kiedy NIE używać:** Generowanie dokumentacji od zera dla nieudokumentowanych funkcji, wielojęzyczne tłumaczenie dokumentów (użyj oma-translation), dryf semantyczny na poziomie symboli, egzekwowanie blokujące CI (v1 tylko ostrzega).

**Podstawowe reguły:**
- Nigdy nie modyfikuj `.agents/` (ochrona SSOT) w żadnym trybie
- Nigdy nie stosuj automatycznie poprawek sync; tryb sync jest zawsze interaktywny (wymaga potwierdzenia `[y]` dla każdego dokumentu)
- Brak LLM -> łagodne ograniczenie: verify zwraca surowy JSON, a sync tylko listę kandydatów
- Pliki zawierające sekrety (`.env*`, `*.pem`, `*.key`, `id_rsa*`, ignorowane przez git) nigdy nie pojawiają się w wynikach sync
- CLI nie wykonuje bezpośrednich wywołań API LLM: emituje dane strukturalne, a host LLM wykonuje całą syntezę i tworzenie propozycji poprawek (niezależnie od dostawcy)
- Sprawdzanie odnośników URL przekazuje się do `lychee`; hook w v1 tylko ostrzega i nigdy nie blokuje ukończenia workflowu

**Workflow:** tryb verify — ekstrakcja -> rozstrzygnięcie -> raport (deterministyczny CLI, kod wyjścia 0 dla czystego wyniku / 1 przy uszkodzonych odnośnikach). Tryb sync — diff Git -> wyszukiwanie odwrotne -> lista kandydatów -> propozycje poprawek hosta LLM -> interaktywna akceptacja/odrzucenie -> ponowne utworzenie `doc-refs.json`.

**Zasoby:** Korzysta wyłącznie ze współdzielonych zasobów; implementacja znajduje się w `cli/commands/docs/` (`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-explanation

**Domena:** Interaktywne objaśnienia zmian w kodzie.

**Kiedy używać:** Objaśnianie diffu, pull requestu, brancha albo zakresu commitów odbiorcy, który potrzebuje tła, intuicji, przejścia po kodzie i krótkiego quizu w jednym samodzielnym pliku HTML działającym offline.

**Workflow:** Odczytuje żądaną zmianę, buduje samodzielne objaśnienie HTML z sekcjami Background / Intuition / Code / Quiz, waliduje artefakt i zapisuje go w `.agents/results/explain/`.

**Kiedy NIE używać:** Zwykła strona dokumentacji, implementacja działającej funkcji albo talia slajdów (prezentacji używa `oma-slide`).

**Zasoby:** Korzysta ze współdzielonych zasobów execution i quality oraz z walidacji artefaktów workflowu `/explain`.

---

### oma-image

**Domena:** Wielodostawcowe generowanie obrazów AI z dyspozycją uwzględniającą uwierzytelnianie (Codex `gpt-image-2`, modele rodziny Antigravity Gemini „nano-banana” przez `agy` z dokładnym modelem wybieranym wewnętrznie, Pollinations flux/zimage).

**Kiedy używać:** Generowanie obrazów, zasobów wizualnych, ilustracji, zdjęć produktu, concept artu lub makiet; porównywanie wyników wielu modeli obrazu dla tego samego promptu; generowanie obrazów z promptów w workflowach edytora.

**Kiedy NIE używać:** Edycja istniejącego obrazu lub manipulacja zdjęciem, generowanie wideo albo audio (użyj oma-video / oma-voice), składanie wektorów/SVG z danych strukturalnych w treści, proste zmiany rozmiaru lub konwersja formatów.

**Podstawowe reguły:**
- Przed wywołaniem doprecyzuj: jeśli temat/styl/kompozycja/zastosowanie są niejasne, zapytaj albo rozbuduj prompt i pokaż użytkownikowi rozszerzoną wersję
- Dyspozycja uwzględniająca uwierzytelnianie: uruchamiaj tylko uwierzytelnionych dostawców; przy `--vendor all` każdy żądany dostawca musi być dostępny
- Bramka kosztów: potwierdź przed przebiegami o szacowanym koszcie >= $0.20 (`--yes`/`OMA_IMAGE_YES=1` omija); domyślne `pollinations` i `antigravity` są darmowe
- Bezpieczeństwo ścieżki: wynik poza `$PWD` wymaga `--allow-external-output`; maksymalne `n` = 5
- Rejestrowane wyniki: każdy przebieg zapisuje obok obrazów `manifest.json` z promptem, dostawcą/modelem, wejściami i metadanymi artefaktów. Zapisuje dane odtwarzalności, ale nie obiecuje identyczności pikseli.
- Dołączone obrazy referencyjne automatycznie przekaż przez `--reference <path>` (codex/antigravity)

**Workflow:** PREPARE (doprecyzuj/rozszerz prompt, wybierz dostawcę) -> ACQUIRE (zweryfikuj uwierzytelnienie i odwołania, ścieżkę wyniku) -> ACT (`oma image generate`) -> VERIFY (manifest, pliki, kod wyjścia) -> FINALIZE (ścieżki wyników + ostrzeżenia).

**Zasoby:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md` oraz `config/image-config.yaml`.

---

### oma-market

**Domena:** Badania rynku oparte na sygnałach społeczności: wydobywanie problemów, wykrywanie trendów, pozycjonowanie konkurencji i odkrywanie. Badania korzystają z upstreamowego silnika [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web i inne), który oma automatycznie utrzymuje przy najnowszym wydaniu.

**Kiedy używać:** Wydobywanie prawdziwych problemów użytkowników z postów społeczności, wykrywanie trendów w kategorii w oknie 7/30/90/180 dni, analiza sentymentu konkurencji i pozycjonowanie SWOT / 5F Portera, otwarte odkrywanie (`--discover`), badania osoby / firmy / tickera, sygnały rekrutacyjne i dalsze analizy.

**Kiedy NIE używać:** Ogólne badania webowe bez ram rynkowych (użyj bezpośrednio oma-search), literatura akademicka (użyj oma-scholar), aktywne dashboardy lub monitorowanie harmonogramu (opakuj tę umiejętność w `oma schedule <action>`).

**Podstawowe reguły:**
- Najpierw detect-trap: nigdy nie uruchamiaj silnika bez preflight (`--force` tylko po jawnym ponownym potwierdzeniu użytkownika)
- Jeden silnik, zawsze najnowszy: `oma market resolve` odświeża zarządzaną kopię (`~/.cache/oma-market/last30days/<tag>/`) przed użyciem; stara kopia zainstalowana przez użytkownika jest zapasowa tylko wtedy, gdy nic nie jest zapisane w cache offline
- Postępuj dokładnie według rozstrzygniętego `SKILL.md` silnika; jedyna zamiana to `oma market run <args>` zamiast surowego wywołania `python3 scripts/last30days.py`
- Nigdy tylko WebSearch: brak silnika, brak Pythona 3.12+ lub kod wyjścia różny od zera -> zatrzymaj i zgłoś
- Źródła wymagające klucza są włączane tylko przez kreator konfiguracji upstream za zgodą użytkownika; pominięte źródła pozostają widoczne w stopce
- Frameworki cytują wyłącznie klastry silnika; pierwsza linia odznaki i upstreamowe LAWs muszą być spełnione przed zapisem pliku
- Jeden brief na przebieg w `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; framework dobiera się automatycznie do intencji (ból/trend -> SWOT, konkurencja -> SWOT + 5F Portera, odkrywanie -> SWOT + PESTEL)

**Workflow:** detect-trap -> `oma market resolve` -> odczytaj upstream SKILL.md -> upstreamowe kroki przed badaniem (kreator konfiguracji, rozstrzyganie handle/subreddit, plan zapytań) -> `oma market run … --emit=compact` -> synteza zgodnie z upstreamowym kontraktem OUTPUT -> dołącz frameworki -> samokontrola -> zapis.

**Zasoby:** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md` oraz `frameworks/` (swot, porters-5f, pestel). CLI: `oma market detect-trap | resolve | update | run`.

---

### oma-refactor

**Domena:** Refaktoryzacja zachowująca działanie: bezpieczna, stopniowa restrukturyzacja z kierowaniem przez code smell / SATD / hotspoty, testami charakterystyki jako siatką bezpieczeństwa i commitami wyłącznie refaktoryzacyjnymi.

**Kiedy używać:** Refaktoryzacja wskazanych plików/modułów (extract, move, rename, decompose, dostosowanie idiomów), refaktoryzacja przygotowująca funkcję, ratowanie legacy/brownfield (odkrywanie seamów + testy charakterystyki), wybór celu przez hotspot (churn × complexity), audyt gotowości do refaktoryzacji.

**Kiedy NIE używać:** Naprawa zgłoszonego błędu lub niepoprawnego działania (użyj oma-debug; refaktoryzacja nie może zmienić zachowania), audyt bezpieczeństwa/wydajności/dostępności (użyj oma-qa), projekt systemu/granice modułów/ADR-y (użyj oma-architecture), projektowanie schematu lub mechanika migracji bazy (użyj oma-db), dzielenie commitów/staging (użyj oma-scm), optymalizacja wydajności jako cel.

**Podstawowe reguły:**
- Zachowanie bez zmian: kontrakt konsumenta (świadomy Hyruma) jest nienaruszalny; strojenie jest skutkiem ubocznym, nigdy celem
- Weryfikowalność: nigdy nie restrukturyzuj bez siatki; jeśli jest nieobecna/słaba, NAJPIERW napisz testy charakterystyki (golden-master) jako oddzielne commity
- Przyrostowość: jedna nazwana transformacja na commit; przy powtarzającym się niepowodzeniu użyj Mikado (zapisz warunek wstępny, w pełni cofnij, rekurencyjnie)
- Rozdzielenie (dwa kapelusze): nigdy nie mieszaj zmian zachowania z commitami refaktoryzacyjnymi (tylko typ `refactor:`)
- Ekonomika: czytelność jest głównym celem; nie refaktoryzuj kodu przeznaczonego do usunięcia ani zimnego kodu o małej liczbie zmian
- Odstępstwo od konwencji wymaga ścieżki ADR oma-architecture, a nie lokalnej zmiany; wszystkie metryki są przybliżeniami (Goodhart)

**Workflow:** PREPARE (sklasyfikuj green/brownfield, bramki rozmiaru, ranking hotspotów) -> ACQUIRE (odczytaj kod przez narzędzia symboli, zbierz metryki + sygnały git) -> REASON (zaplanuj sekwencję atomowych transformacji / expand-contract) -> ACT (jedna transformacja engine-first) -> VERIFY (ponownie uruchom niezmienione testy -> commit albo cofnięcie Mikado) -> FINALIZE (delta metryk + werdykt czytelności).

**Zasoby:** `definition.md`, `measurement.md`, `governance.md` oraz współdzielone `context-loading`, `quality-principles`.

---

### oma-scholar

**Domena:** Towarzysz badań naukowych korzystający ze specyfikacji sidecarów Knows `.knows.yaml`: generowanie, walidowanie, przeglądanie, odpytywanie i porównywanie sidecarów artykułów oraz pobieranie z knows.academy.

**Kiedy używać:** Czytanie artykułów przez sidecary oszczędzające tokeny (około 700 tokenów tylko dla twierdzeń zamiast około 10 tys. pełnego PDF), generowanie `.knows.yaml` z draftów/LaTeX/notatek, walidowanie struktury przed udostępnieniem, tworzenie recenzji jako sidecarów, odpytywanie lub podsumowywanie istniejących sidecarów, strukturalne porównywanie dwóch artykułów, wyszukiwanie/pobieranie z knows.academy.

**Kiedy NIE używać:** Ogólne wyszukiwanie webowe lub treści nieakademickie (użyj oma-search), tłumaczenie artykułów (użyj oma-translation), samo parsowanie PDF bez sidecara (użyj oma-pdf), pełny workflow recenzji z systemem redakcyjnym.

**Tryby:** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Podstawowe reguły:**
- Docelowa specyfikacja to profil v0.9.0 / `paper@1`; host LLM generuje sidecary (nigdy nie uruchamiaj zewnętrznego SDK LLM z shella)
- Nie fabrykuj: jeśli DOI/wydawca/rok nie są widoczne w źródle, pomiń klucz całkowicie; nigdy nie wpisuj `doi: TODO` ani nie zgaduj
- Dokładne nazwy pól, pojedynczy obiekt `provenance.actor`, zamknięte enumy, liczby bez cudzysłowów
- Gęstość relacji ≥ 1.5 na twierdzenie; każde twierdzenie potrzebuje dowodu `supported_by`
- Waliduj przed udostępnieniem (`oma scholar lint`); dla sidecarów zewnętrznych użyj `--lenient`
- knows.academy -> OpenAlex jako fallback dla starszych/nie-2026 artykułów; publiczne API proxy nie wymaga uwierzytelniania

**Workflow:** PREPARE (tryb + źródło) -> ACQUIRE (metadane, sekcje lub lokalny tekst) -> REASON (wydobądź twierdzenia/dowody/relacje) -> ACT (generuj/lintuj/recenzuj/analizuj/porównuj/pobierz) -> VERIFY (schemat, enumy, ID, relacje) -> FINALIZE (sidecar/raport/podsumowanie z zastrzeżeniami).

**Zasoby:** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md` oraz `config/scholar-config.yaml`.

---

### oma-skill-creation

**Domena:** Tworzenie i walidowanie umiejętności OMA w formacie Markdown SSL-lite (Scheduling / Structural Flow / Logical Operations / References).

**Kiedy używać:** Tworzenie umiejętności pod `.agents/skills/{name}/SKILL.md`, aktualizacja umiejętności do formatu SSL-lite, dodanie kanonicznej ścieżki komendy/workflowu do umiejętności wymagającej wykonania, audyt wystarczalności routingu/wykonania/walidacji/odzyskiwania, rozstrzyganie, czy szczegóły wariantów umieścić inline, czy w `resources/`.

**Kiedy NIE używać:** Instalowanie zewnętrznych umiejętności do `$CODEX_HOME/skills` (zewnętrzne), tworzenie pakietu pluginu Codex (zewnętrzne), pisanie ogólnego planu projektu niezwiązanego z tworzeniem umiejętności (użyj oma-pm), bezpośrednia edycja kodu produktu/infrastruktury/frontend/backend/mobile (użyj właściwej umiejętności specjalistycznej).

**Podstawowe reguły:**
- Zachowaj dokładnie cztery sekcje najwyższego poziomu: Scheduling, Structural Flow, Logical Operations, References
- Zachowaj frontmatter YAML z czytelnymi `name` i `description`; po edycji opisu uruchom `oma skill audit` (ostrzeżenie przy >= 60%, błąd przy >= 75% kolizji cosinusowej TF-IDF)
- Zawieraj konkretne granice `When NOT to use` z trasami do sąsiednich umiejętności
- Dodaj dokładnie jedną kanoniczną ścieżkę inline (`Canonical command path` dla kruchych/powtarzalnych komend, `Canonical workflow path` dla przepływów wymagających osądu/badań)
- Długie szczegóły wariantów umieszczaj w `resources/`, nie w głównej treści; nie twórz README/changelog/install docs w umiejętności

**Workflow:** PREPARE (cel, wyzwalacze, granice, I/O, zależności) -> ACQUIRE (przeczytaj 1–3 analogiczne umiejętności i konwencje) -> REASON (inline czy `resources/`) -> ACT (utwórz draft na podstawie szablonu SSL-lite) -> VERIFY (sprawdzenia struktury/routingu/wykonania/formatu) -> FINALIZE (zmienione pliki + raport walidacji).

**Zasoby:** `ssl-lite-template.md`, `validation-checklist.md` oraz współdzielone `context-loading`, `quality-principles`.

---

### oma-slide

**Domena:** Generowanie bogatych animacyjnie prezentacji HTML na stałej planszy 1920×1080, z deterministyczną walidacją, bundlowaniem i eksportem do PDF/PNG/PPTX przez CLI `oma slide`.

**Kiedy używać:** Tworzenie prezentacji na podstawie tematu lub konspektu, ulepszanie albo przeformatowanie istniejącej talii, generowanie per-slajdowego HTML z animacjami i estetyką zgodną z doktryną projektu, eksport talii do PDF/PNG/PPTX, zastosowanie nazwanego presetu stylu, eksport do Canvy lub import z Canvy.

**Kiedy NIE używać:** Zwykłe tworzenie dokumentu bez slajdów, samo generowanie obrazów (użyj bezpośrednio oma-image), definiowanie marki/systemu projektowego (użyj oma-design), deterministyczne operacje CLI (validate/bundle/export) bez generowania (wywołaj bezpośrednio CLI `oma slide`).

**Podstawowe reguły:**
- Umiejętność tworzy HTML, a CLI wykonuje resztę (scaffold, validate, bundle, export)
- Tylko lokalne zasoby: żadnych zdalnych URL-i w `<img src>`/`<video src>`, wyłącznie `./assets/<file>`
- CJK -> na każdym slajdzie koreańskim/japońskim/chińskim wymagany jest font Pretendard
- Opakowanie `prefers-reduced-motion`, widoczne stany focus i `data-om-validate` są wymagane na każdym slajdzie
- Maksymalnie 3 iteracje automatycznej poprawki podczas walidacji, potem pokaż użytkownikowi diff
- Generowanie obrazów przekazuj do oma-image; Canva MCP jest opcjonalny i dostarczany automatycznie wyłącznie po jawnym potwierdzeniu użytkownika

**Workflow:** 7 faz — DETECT (tryb), DISCOVER (doprecyzuj + oceń zasoby), STYLE (3 podglądy na żywo -> użytkownik wybiera), GENERATE (`slide-NN.html` w 1920×1080), VALIDATE (`oma slide validate`, maks. 3 pętle automatycznej poprawki), REVIEW (viewer + opcjonalny edytor bbox), DELIVER (`bundle` + opcjonalny eksport PDF/PNG/PPTX).

**Zasoby:** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md` oraz katalog `assets/`.

---

### oma-video

**Domena:** Generowanie krótkich, objaśniających i nagrywanych przez człowieka filmów przez CLI `oma video`, które składa skrypt -> narrację -> wizualia -> napisy -> render HyperFrames.

**Kiedy używać:** Generowanie krótkich filmów (shorts/reels, 9:16) na podstawie tematu, objaśnień (16:9/9:16) z README/kodu/danych, demonstracji/walkthroughów z przechwycenia ekranu (`--source file`) albo nadzorowanego przechwycenia aplikacji webowej w przeglądarce z widocznym interfejsem dla dowolnego URL-a (`--source web`), deterministyczne ponowne renderowanie istniejącego uruchomienia.

**Kiedy NIE używać:** Generowanie pojedynczego obrazu (użyj oma-image), generowanie talii slajdów (użyj oma-slide; video wywołuje je wewnętrznie dla klatek objaśnień), generowanie samego audio mowy (użyj oma-voice), nieliniowa edycja istniejącego gotowego mp4, transmisja na żywo (nadzorowane przechwycenie webowe jest objęte zakresem).

**Podstawowe reguły:**
- Przed wywołaniem doprecyzuj lub wywnioskuj tryb; pokaż użytkownikowi wywnioskowany plan zamiast po cichu renderować niejasny brief
- Konfiguracja dostawcy jest opcjonalna pod względem klucza dla obsługiwanych fallbacków zasobów; płatni dostawcy (Pexels, Pixelle) włączają się automatycznie tylko, gdy istnieje ich klucz środowiskowy, a błąd kompozytora nigdy nie jest zastępowany zapasowym wideo
- Bramka kosztów od >= `$0.20` (`--yes`/`OMA_VIDEO_YES=1` omija); limit 180 s / 40 scen
- Wejścia renderowania zapisują się w `render-spec.json`, zasobach, seedzie i osadzonym Pretendard; `OMA_VIDEO_MOCK=1` to harness testowy dla złotych fixture'ów, nie artefakt dla użytkownika
- Demo jest human-in-the-loop: przechwycenie webu otwiera tylko przeglądarkę z widocznym interfejsem i nagrywa, gdy człowiek prowadzi przebieg — ŻADNEJ automatyzacji poświadczeń; `--url` i tokeny są maskowane w logach/manifeście
- Bezpieczeństwo ścieżki (`--allow-external-output` dla wyniku poza `$PWD`)

**Workflow:** PREPARE (tryb/proporcje/locale, doprecyzuj/rozszerz brief) -> ACQUIRE (sprawdź dostępność dostawców, zweryfikuj ścieżkę przechwytywania i koszt) -> ACT (skrypt -> voice ∥ wizualia ∥ napisy -> render-spec -> render) -> VERIFY (schemat, hashe manifestu, kod wyjścia, mp4) -> FINALIZE (katalog uruchomienia + ścieżka mp4 + ostrzeżenia o pokryciu).

**Zasoby:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, a także przewodniki trybów `hyperframes-authoring/`, sterownik web-capture i zapasowy kompozytor `mpt/`; `config/video-config.yaml`.

---

### oma-voice

**Domena:** Lokalne, działające na urządzeniu zamiany tekstu na mowę i mowy na tekst przez serwer MCP Voicebox — bez chmury, kluczy API i kosztu za wywołanie.

**Kiedy używać:** Generowanie krótkiego audio powiadomień o ukończeniu zadań agenta lub blokadach, tworzenie voiceoveru/narracji/zasobów audio (mp3 lub wav), transkrypcja lokalnych plików audio (mp3, wav, m4a, webm, flac) do Markdown, porównywanie profili głosu przez ponowne uruchomienie tego samego tekstu z różnymi identyfikatorami profili.

**Kiedy NIE używać:** Chmurowe TTS lub wysokiej jakości wielojęzyczne głosy chmurowe, dyktowanie z mikrofonu terminala w czasie rzeczywistym (użyj dyktowania skrótem Voicebox), przesyłanie próbki do klonowania głosu / tworzenie profilu (odbywa się w UI aplikacji Voicebox), projektowanie wideo/muzyki/dźwięku.

**Podstawowe reguły:**
- Voicebox jest wymagany: po nieudanym handshake / `GET /health` zakończ z jednorazową wskazówką instalacji/uruchomienia; nie ponawiaj i nie uruchamiaj automatycznie ponownie
- Profil jest wymagany: jeśli `voicebox_list_profiles` zwróci pustą listę, wskaż użytkownikowi UI aplikacji i zakończ
- Limity długości: TTS maksymalnie 5000 znaków na wywołanie (ostrzeż przy 2000), STT 30 minut; v1 nie dzieli automatycznie tekstu na części
- Przejrzystość automatycznego wywołania: powiadomienia pojawiają się dopiero, gdy zadanie przekracza `auto_notify_after_sec` (domyślnie 60 s); zawsze ogłoś zamiar w jednej linii
- Bezpieczeństwo ścieżki (ostrzeż + potwierdź dla wyniku poza `$PWD`); SIGINT nie zapisuje częściowego wyniku
- Manifest wymagany przy każdej generacji; brak bramki kosztów (Voicebox jest darmowy)

**Workflow:** PREPARE (zweryfikuj tekst/audio/język/ścieżkę/profil) -> ACQUIRE (raz doprecyzuj, jeśli brakuje sygnału) -> ACT (MCP `voicebox_speak` lub `voicebox_transcribe`) -> VERIFY (obecność audio/transkryptu + pola manifestu) -> FINALIZE (zapisz `manifest.json`, zaraportuj ścieżkę).

**Zasoby:** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md` oraz `config/voice-config.yaml`.

---

## Preflight karty (CHARTER_CHECK)

Przed napisaniem kodu każdy agent implementacyjny musi wypisać blok CHARTER_CHECK:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**Cel:**
- Deklaruje, co agent zrobi i czego nie zrobi
- Ujawnia rozszerzanie zakresu przed napisaniem kodu
- Umożliwia jawny przegląd założeń przez użytkownika
- Dostarcza kryteria, które można sprawdzić

**Poziomy wyjaśnienia:**
- **LOW**: wymagania są jasne. Działaj z podanymi założeniami.
- **MEDIUM**: wymagania są częściowo niejednoznaczne. Wymień opcje i wybierz najbardziej prawdopodobną.
- **HIGH**: wymagania są bardzo niejednoznaczne. Ustaw status blocked, wypisz pytania i NIE pisz kodu.

W trybie subagenta (uruchamianym z CLI) agenci nie mogą pytać użytkownika bezpośrednio. Przy LOW działaj, przy MEDIUM zawężaj i interpretuj, a przy HIGH zablokuj zadanie i zwróć pytania orkiestratorowi.

---

## Dwuwarstwowe ładowanie umiejętności

Wiedza każdego agenta jest podzielona na dwie warstwy:

**Warstwa 1: SKILL.md (ładowana po routingu umiejętności)**
Zawiera frontmatter (name, description), sekcje kiedy używać / kiedy nie używać, podstawowe reguły, przegląd architektury, listę bibliotek i odwołania do zasobów warstwy 2.

**Warstwa 2: resources/ (ładowana na żądanie)**
Ładowana tylko podczas aktywnej pracy agenta i tylko z zasobami, których potrzebuje zadanie. Poziom trudności wyznacza miękki budżet tokenów, a nie stałą listę plików; zobacz [Ładowanie zasobów według zadania](./skills.md#resource-loading-by-task).

Dodatkowe zasoby ładuje się podczas wykonania, gdy są potrzebne:
- `checklist.md`: na etapie Verify
- `error-playbook.md`: tylko przy błędach
- `common-checklist.md`: do końcowej weryfikacji złożonych zadań

---

## Wykonanie w zakresie

Agenci działają w ścisłych granicach domen:

- Agent frontendowy nie modyfikuje kodu backendu
- Agent backendowy nie dotyka komponentów UI
- Agent DB nie implementuje endpointów API
- Agenci dokumentują zależności spoza zakresu dla innych agentów

Jeśli podczas wykonywania okaże się, że zadanie należy do innej domeny, agent zapisuje to jako eskalację w pliku wyniku zamiast próbować je obsłużyć.

---

## Strategia przestrzeni roboczych

W projektach wieloagentowych oddzielne przestrzenie robocze zapobiegają konfliktom:

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Przestrzenie robocze podaje się przez flagę `-w` podczas uruchamiania agentów:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Przepływ orkiestracji

Podczas workflowu wieloagentowego (`/orchestrate` lub `/work`):

1. **Agent PM** rozkłada żądanie na zadania domenowe z priorytetami
2. **Inicjalizacja sesji:** generowane jest ID sesji, a `orchestrator-session-{sessionId}.md` i `task-board-{sessionId}.md` są tworzone w skonfigurowanym magazynie pamięci
3. **Zadania P0** uruchamiają się równolegle (maksymalnie MAX_PARALLEL agentów)
4. **Monitorowanie postępu:** orkiestrator odczytuje pliki `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` co POLL_INTERVAL
5. **Zadania P1** uruchamiają się po zakończeniu P0 itd.
6. **Pętla weryfikacji** działa dla każdego ukończonego agenta (samoprzegląd -> automatyczna weryfikacja -> przegląd krzyżowy QA)
7. **Zebranie wyników** z plików wyników dla danego uruchomienia i ustrukturyzowanych twierdzeń
8. **Raport końcowy** z podsumowaniem sesji, zmienionymi plikami i pozostałymi problemami

---

## Definicje agentów

Agenci są zdefiniowani w dwóch lokalizacjach:

**`.agents/agents/`:** Zawiera 12 śledzonych źródłowych definicji subagentów, w tym:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`
- `docs-curator.md`
- `refactor-engineer.md`
- `research-explorer.md`

Pliki te definiują tożsamość agenta, odwołanie do protokołu wykonania, szablon CHARTER_CHECK, skrót architektury i reguły. Służą do uruchamiania subagentów przez narzędzie Task/Agent (Claude Code) albo CLI.

Runtime udostępnia też 13 kanonicznych ról dyspozycyjnych: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` i `explore`. `research-explorer.md` jest śledzoną definicją przypisaną do `explore`, a `orchestrator` jest rolą koordynacyjną runtime bez osobnego pliku definicji.

**Projekcje natywne dla dostawcy:** OMA materializuje definicje źródłowe w plikach agentów właściwych dla runtime'u:
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` i inne projekcje wybranego dostawcy, jeśli są obsługiwane

Te wygenerowane pliki odświeżają się przez `oma link`, `oma install` i `oma update`.

---

## Stan runtime (magazyn pamięci projektu)

Podczas sesji orkiestracji agenci koordynują się przez współdzielone pliki pamięci w `.agents/state/memories/` (starsze projekty przechodzą do starszej ścieżki `.serena/memories/`; można ją skonfigurować przez `mcp.json`):

| Plik | Właściciel | Cel | Inni |
|------|------------|-----|------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | ID sesji, status, czas rozpoczęcia, śledzenie faz | Tylko odczyt |
| `task-board-{sessionId}.md` | Orchestrator | Przydziały zadań, priorytety, statusy | Tylko odczyt |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | To uruchomienie | Postęp tury po turze: wykonane działania, przeczytane/zmodyfikowane pliki, bieżący status | Orchestrator odczytuje |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | To uruchomienie | Wynik końcowy: status (completed/failed), podsumowanie, zmienione pliki, checklista kryteriów akceptacji | Orchestrator odczytuje |
| `session-metrics.md` | Orchestrator | Opcjonalne dowody sesji i zmierzone wyniki eksperymentów | QA odczytuje |
| `experiment-ledger.md` | Orchestrator/QA | Dowody dla rzeczywistych eksperymentów | Wszyscy odczytują |

Narzędzia pamięci można konfigurować. Domyślnie agenci odczytują i zapisują te pliki koordynacji bezpośrednio przez natywne narzędzia plikowe (`Read`, `Write`, `Edit`), ale w `mcp.json` można skonfigurować własne narzędzia i ścieżkę bazową:

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```

Dashboardy (`oma dashboard terminal` i `oma dashboard web`) obserwują te pliki pamięci w czasie rzeczywistym.
