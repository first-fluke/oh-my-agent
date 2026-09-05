---
title: Dlaczego oh-my-agent
description: Pozycjonowanie oh-my-agent w nasyconej kategorii multi-agent CLI. Os kosztow przesunela sie z implementacji na testy i utrzymanie; oh-my-agent dostarcza quality gates, niezalezna weryfikacje, multi-vendor dispatch oraz personalizacje repo-native jako odpowiedz na to przesuniecie.
---

# Dlaczego oh-my-agent

Kategoria multi-agent CLI jest juz nasycona. W samym ostatnim kwartale pojawilo sie ponad dwadziescia multi-agent orchestratorow: Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy i inne. Wiekszosc optymalizuje te sama os - sprawienie, by agenci pisali kod szybciej.

oh-my-agent optymalizuje inna os. Hipoteza wyjsciowa: przy wystarczajaco zdolnych modelach koszt analizy, projektowania i implementacji w SDLC zbliza sie do zera. Droga czesc tworzenia oprogramowania to zawsze byly testy i utrzymanie - utrzymanie systemu dzialajacego, bezpiecznego i zrozumialego po pierwszym commicie. Na tej osi zaprojektowano oh-my-agent.

Ta strona konkretyzuje to pozycjonowanie. Dluga dyskusja, ktora doprowadzila do tego ujecia, znajduje sie w [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## Os kosztow sie przesunela

Gdy pojedynczy zdolny model produkuje dzialajaca feature w minute, waskim gardlem przestaje byc przepustowosc implementacji. Waskim gardlem staje sie: weryfikacja, czy wyprodukowany kod faktycznie robi to, co deklaruje; lapanie cichych regresji miedzy iteracjami; trzymanie sekretow z dala od promptow i logow; uwidacznianie wydatkow na tokeny, zanim zaskocza zespol.

Harness, ktory tylko spawnuje agentow szybciej, nie rozwiazuje nic z tego. Harness zaprojektowany dla fazy po-implementacyjnej - rozwiazuje.

---

## Co oh-my-agent dostarcza prawdziwemu cost center

Kazda ponizsza zdolnosc odpowiada na konkretny tryb awarii zgloszony w kategorii multi-agent CLI.

### Niezalezna weryfikacja, nie samoocena LLM

`oma verify <agent>` uruchamia czternascie deterministycznych sprawdzen na typ agenta. Wszystkie sa mechaniczne: exit code komendy testow, TypeScript strict przechodzi, wykrywanie wzorcow raw SQL, skan twardo zakodowanych sekretow, Flutter analyze, skan inline styles, scope violation wzgledem charteru agenta. Zaden LLM nie ocenia, czy praca "wyglada poprawnie". Sprawdzenie przechodzi wtedy i tylko wtedy, gdy lezaca u podstaw komenda zglosi sukces.

To odpowiada na najczestsza skarge w kategorii, podsumowana w jednym poscie spolecznosci jako "agents lie - they say tests pass when tests do not". Liste sprawdzen znajdziesz w `cli/commands/verify/verify.ts`.

### Re-weryfikacja miedzy iteracjami

Workflow `ralph` opakowuje `ultrawork` niezalezna faza JUDGE. Po kazdej iteracji JUDGE re-weryfikuje kazde criterion - lacznie z tymi, ktore przeszly w poprzednich iteracjach. To lapie przypadek, gdy poprawienie C2 cicho psuje C1, co jest faktycznym mechanizmem wiekszosci regresji w dlugich sesjach agentow.

Ciezkie weryfikacje (ponad trzydziesci sekund) sa cachowane wzgledem dotknietych sciezek plikow, dzieki czemu re-weryfikacja pozostaje tania. Pelny protokol w `.agents/workflows/ralph/resources/judge-protocol.md`.

### Quota cap blokujace przed szkoda

Kazde wywolanie `oma agent spawn` zapisuje szacunek tokenow tego spawnu do `.serena/memories/session-cost-{sessionId}.md`. Przed nastepnym spawnem `checkCap` konsultuje skonfigurowany quota cap i odmawia uruchomienia, jesli ktorykolwiek wymiar zostal przekroczony. Wymuszane sa trzy wymiary: lacznie tokeny, lacznie spawny, budzet tokenow per vendor.

To roznica miedzy dowiedzeniem sie po fakcie, ze wydano czterdziesci tysiecy dolarow, a otrzymaniem przy spawnie pietnastym informacji, ze w budzecie zostal jeden spawn. Zobacz `cli/io/session-cost.ts` i skonfiguruj pod `session.quota_cap` w `.agents/oma-config.yaml`.

### Retry potem explore, nie retry w nieskonczonosc

Gdy `orchestrate` Step 5 wykryje porazke weryfikacji, ponawia agenta maksymalnie dwa razy z kontekstem bledu. Jesli druga proba dalej nie powiedzie i cap kosztu nie jest jeszcze przekroczony, workflow przelacza sie na Exploration Loop: rownolegle spawnuje dwa lub trzy alternatywne warianty hipotez w oddzielnych workspace'ach i zachowuje tylko wynik z najwyzsza punktacja. Niepowodzeniowe podejscia sa odrzucane z zarejestrowanym kosztem.

To strukturyzowana odpowiedz na przypadek, gdy podejscie jest fundamentalnie zle. Ponawianie tego samego nigdy nie konwerguje; probowanie roznych podejsc rownolegle - konwerguje.

### Monorepo-swiadome routing workspace

`detectWorkspace` czyta konfiguracje pnpm, nx, turbo i lerna i routuje kazdego agenta do jego odpowiadajacego sub-workspace'a automatycznie. Backend agent dziala wzgledem `apps/api/`, frontend agent wzgledem `apps/web/` - bez potrzeby manualnego skladania sciezek przez orchestrator. Zobacz `cli/io/workspaces.ts`.

---

## Multi-vendor nie jest opcjonalne

Druga hipoteza projektowa: kazdy zespol robiacy powaznie wspomagane AI tworzenie oprogramowania uzywa wiecej niz jednego providera. Dzis to oznacza Claude, Codex, Gemini, Copilot, Qwen, Kimi i to, co pojawi sie w nastepnym kwartale. Zmiana vendora to fakt, a nie edge case - Anthropic przenosi funkcje agentowe do osobnego platnego planu, OpenAI wypuszcza Codex CLI w tym samym tygodniu, w ktorym degraduja sie modele Anthropic, GitHub Copilot przechodzi na rozliczanie konsumpcyjne.

oh-my-agent traktuje wybor vendora jako konfiguracje per-agent przez `model_preset` i `agents.<id>.model` w `.agents/oma-config.yaml`. Przenosny katalog `.agents/` jest single source of truth; kazdy wspierany runtime z niego projektuje. Lock-in vendora nie jest potrzebny do uzywania oh-my-agent, a migracja nie jest potrzebna przy zmianie.

---

## Personalizacja repo-native

Trzecia hipoteza: zadne dwa zespoly nie dziela tej samej definicji "done". Jeden zespol wymaga skanow OWASP Top 10 przy kazdej zmianie backendu. Inny wymaga raportu QA po koreansku. Trzeci wymaga, aby kazda migration byla zrewiewowana przez database agenta przed merge'em.

Poniewaz `.agents/` to po prostu pliki w twoim repozytorium, kazdy zespol moze dodawac lub modyfikowac agentow, skille, workflowy i quality gate'y, aby dopasowac do wlasnego kodu postepowania i postawy compliance. Personalizacja to `git commit`, a nie ticket wsparcia vendora.

---

## Co to znaczy w praktyce

Jesli twoim priorytetem jest "spawnowac agentow rownolegle szybko", wiele narzedzi pokrywa te powierzchnie. Jesli twoim priorytetem jest "dostarczyc kod, ktory dalej dziala po wyjsciu agentow z pokoju", oh-my-agent jest zbudowany dla tego konkretnego celu. `oma verify`, JUDGE, Exploration Loop, quota cap i routing monorepo nie sa opcjonalnymi dodatkami - sa powodem istnienia projektu.

Dla szczegolow kazdej zdolnosci zobacz sekcje Core Concepts (Agents, Parallel Execution) w pasku bocznym.
