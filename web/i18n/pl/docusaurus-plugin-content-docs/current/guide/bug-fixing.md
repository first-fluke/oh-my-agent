---
title: "Przewodnik: naprawianie błędów"
sidebar_label: Naprawianie błędów
description: "Ustrukturyzowany, siedmioetapowy workflow debugowania z triage ważności, sygnałami eskalacji, diagnozą opartą na źródłach i walidacją po poprawce."
---

# Przewodnik: naprawianie błędów

## Kiedy używać workflowu debugowania

Użyj `/debug` (albo powiedz w języku naturalnym „fix bug”, „fix error” lub „debug”), gdy masz konkretny błąd do zdiagnozowania i naprawienia. Workflow daje uporządkowane, odtwarzalne podejście do debugowania, które pomaga uniknąć typowej pułapki naprawiania objawów zamiast przyczyn źródłowych.

Workflow debugowania obsługuje wszystkich skonfigurowanych dostawców. Etapy 1–5 działają inline. Etap 6 (wyszukiwanie podobnych wzorców) może delegować zadanie do subagenta `debug-investigator`, gdy zakres skanu jest szeroki (co najmniej 10 plików albo błędy obejmują wiele domen), a następnie etap 7 zapisuje wynik w pamięci.

---

## Szablon raportu błędu

Przy zgłaszaniu błędu podaj jak najwięcej poniższych informacji. Każde pole pomaga workflowowi debugowania szybciej zawęzić wyszukiwanie.

### Pola wymagane

| Pole | Opis | Przykład |
|:------|:-----------|:--------|
| **Komunikat błędu** | Dokładny tekst błędu albo stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Kroki odtworzenia** | Uporządkowane działania wywołujące błąd | 1. Zaloguj się jako administrator. 2. Przejdź do /users. 3. Kliknij „Delete” przy dowolnym użytkowniku. |
| **Oczekiwane zachowanie** | Co powinno się stać | Użytkownik zostaje usunięty i znika z listy. |
| **Rzeczywiste zachowanie** | Co faktycznie się dzieje | Strona kończy się białym ekranem. |

### Pola opcjonalne (bardzo zalecane)

<!-- oma-docs:ignore-start -->
| Pole | Opis | Przykład |
|:------|:-----------|:--------|
| **Środowisko** | Przeglądarka, system operacyjny, wersja Node, urządzenie | Chrome 124, macOS 15.3, Node 22.1 |
| **Częstotliwość** | Zawsze, czasami, tylko za pierwszym razem | Zawsze możliwe do odtworzenia |
| **Ostatnie zmiany** | Co zmieniło się przed pojawieniem się błędu | Scalony PR #142 (funkcja usuwania użytkowników) |
| **Powiązany kod** | Podejrzane pliki albo funkcje | `src/api/users.ts`, `deleteUser()` |
| **Logi** | Logi serwera, wyjście konsoli | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Zrzuty ekranu/nagrania** | Dowody wizualne | Zrzut ekranu z widokiem błędu |
<!-- oma-docs:ignore-end -->

Im więcej kontekstu podasz na początku, tym mniej dodatkowych pytań będzie potrzebował workflow debugowania.

---

## Triage ważności (P0–P3)

Ważność określa sposób obsługi błędu i szybkość naprawy.

### P0: krytyczny (natychmiastowa reakcja)

**Definicja:** Produkcja nie działa, dane są tracone lub uszkadzane albo trwa naruszenie bezpieczeństwa.

**Oczekiwana reakcja:** Odłóż wszystko. To jedyne zadanie do czasu rozwiązania.

**Przykłady:**
- Ominięto system uwierzytelniania; wszyscy użytkownicy mogą wejść do endpointów administracyjnych.
- Migracja bazy uszkodziła tabelę użytkowników; konta są niedostępne.
- Przetwarzanie płatności pobiera od klientów podwójną opłatę.
- Endpoint API zwraca dane osobowe innych użytkowników.

**Podejście debugowania:** Pomiń pełny szablon. Podaj komunikat błędu i ewentualny stack trace. Workflow od razu zaczyna od kroku 2 (odtworzenie).

### P1: wysoki (ta sama sesja)

**Definicja:** Kluczowa funkcja jest zepsuta dla znacznej liczby użytkowników. Może istnieć obejście, ale długoterminowo jest nieakceptowalne.

**Oczekiwana reakcja:** Napraw w bieżącej sesji pracy. Nie rozpoczynaj nowych funkcji, dopóki problem nie zostanie rozwiązany.

**Przykłady:**
- Wyszukiwanie nie zwraca wyników dla zapytań zawierających znaki specjalne.
- Przesyłanie pliku nie działa dla plików większych niż 5 MB (limit powinien wynosić 50 MB).
- Aplikacja mobilna wyłącza się podczas uruchamiania na urządzeniach z Androidem 14.
- E-maile resetowania hasła nie są wysyłane (integracja usługi e-mail jest zepsuta).

**Podejście debugowania:** Pełna pętla siedmiu etapów. Po poprawce zalecany jest przegląd QA.

### P2: średni (w tym sprincie)

**Definicja:** Funkcja działa, ale z gorszym zachowaniem. Wpływa na użyteczność, nie na działanie.

**Oczekiwana reakcja:** Zaplanuj pracę w bieżącym sprincie. Napraw przed kolejnym wydaniem.

**Przykłady:**
- Sortowanie tabeli rozróżnia wielkość liter („apple” jest po „Zebra”).
- Tryb ciemny pokazuje nieczytelny tekst w panelu ustawień.
- Czas odpowiedzi endpointu /users wynosi 8 sekund (powinien być krótszy niż 1 s).
- Paginacja pokazuje „Page 1 of 0”, gdy lista jest pusta.

**Podejście debugowania:** Pełna pętla siedmiu etapów. Dodaj wynik do zestawu regresji QA.

### P3: niski (backlog)

**Definicja:** Problem kosmetyczny, przypadek brzegowy albo drobna niedogodność.

**Oczekiwana reakcja:** Dodaj do backlogu. Napraw przy okazji albo połącz z powiązanymi zmianami.

**Przykłady:**
- Tekst tooltipu zawiera literówkę: „Delet” zamiast „Delete”.
- Ostrzeżenie konsoli o przestarzałej metodzie cyklu życia Reacta.
- Wyrównanie stopki jest przesunięte o 2 piksele dla szerokości viewportu 768–800 px.
- Spinner ładowania działa jeszcze 200 ms po wyświetleniu treści.

**Podejście debugowania:** Pełna pętla debugowania może nie być potrzebna. Wystarczy bezpośrednia poprawka z testem regresji.

---

## Szczegółowa siedmioetapowa pętla debugowania

Workflow `/debug` wykonuje poniższe etapy w kolejności. Korzysta ze skonfigurowanego dostawcy code intelligence. Natywne wyszukiwanie służy wyłącznie do ścieżek spoza projektu lub ścieżek ignorowanych, gdy ten dostawca jest niedostępny lub przekracza limit czasu.

### Krok 1: zbierz informacje o błędzie

Workflow prosi użytkownika o (albo otrzymuje od niego):
- komunikat błędu i stack trace
- kroki odtworzenia
- oczekiwane i rzeczywiste zachowanie
- szczegóły środowiska

Jeśli komunikat błędu jest już w promptcie, workflow od razu przechodzi do kroku 2.

### Krok 2: odtwórz błąd

**Używane narzędzia:** skonfigurowane narzędzia wyszukiwania i symboli albo natywne `rg` i odczyty w ograniczonym zakresie, gdy skonfigurowane narzędzia są niedostępne.

Celem jest znalezienie błędu w bazie kodu: dokładnej linii, w której rzucany jest wyjątek, dokładnej funkcji tworzącej zły wynik albo dokładnego warunku powodującego nieoczekiwane zachowanie.

Ten krok zamienia objaw zgłoszony przez użytkownika („strona się wyłącza”) na lokalizację w bazie kodu (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Krok 3: zdiagnozuj przyczynę źródłową

**Używane narzędzia:** nawigacja po referencjach i symbolach, gdy jest dostępna, a potem celowane natywne odczyty, gdy nie jest.

Workflow cofa się od miejsca błędu, aby znaleźć prawdziwą przyczynę. Sprawdza następujące typowe wzorce przyczyn źródłowych:

| Wzorzec | Czego szukać |
|:--------|:----------------|
| **Dostęp do null/undefined** | Brakujące sprawdzenia wartości null, potrzebne optional chaining, niezainicjalizowane zmienne |
| **Race conditions** | Operacje async kończące się w złej kolejności, brak await, współdzielony zmienny stan |
| **Brak obsługi błędów** | Brak try/catch, nieobsłużone odrzucenie promise, brak error boundary |
| **Błędne typy danych** | Ciąg znaków zamiast liczby, brak konwersji typu, niepoprawny schemat |
| **Nieaktualny stan** | Stan Reacta się nie aktualizuje, cache nie został unieważniony, closure przechwytuje starą wartość |
| **Brak walidacji** | Dane użytkownika nie są oczyszczone, body żądania API nie jest walidowane, nie sprawdzono warunków brzegowych |

Diagnozuj przyczynę źródłową, nie objaw. Jeśli `user.id` jest niezdefiniowane, ustal, dlaczego user jest niezdefiniowane w tym miejscu ścieżki wykonania, zamiast tylko zabezpieczać dostęp do undefined.

### Krok 4: zaproponuj minimalną poprawkę

Workflow przedstawia:
1. Ustaloną przyczynę źródłową (z dowodami ze śledzenia kodu).
2. Proponowaną poprawkę (zmieniającą tylko to, co konieczne).
3. Wyjaśnienie, dlaczego poprawka usuwa przyczynę źródłową, a nie tylko objaw.

Workflow przedstawia propozycję przed edycją. Czeka na potwierdzenie, gdy zmiana nie została wcześniej autoryzowana przez żądanie albo politykę wykonania; istniejąca autoryzacja pozwala kontynuować bez drugiego pytania.

**Zasada minimalnej poprawki:** Zmieniaj jak najmniej linii. Nie refaktoryzuj, nie poprawiaj stylu kodu i nie dodawaj niepowiązanych funkcji. Poprawka powinna dać się przejrzeć w mniej niż 2 minuty.

### Krok 5: zastosuj poprawkę i napisz test regresji

W tym kroku dzieją się dwie rzeczy:

1. **Zaimplementuj poprawkę:** Zastosuj zatwierdzoną minimalną zmianę.
2. **Napisz test regresji:** Test, który:
   - odtwarza pierwotny błąd (bez poprawki test musi się nie udać)
   - sprawdza działanie poprawki (z poprawką test musi przejść)
   - zapobiega powrotowi tego samego błędu w przyszłych zmianach

Test regresji jest najważniejszym wynikiem workflowu debugowania. Bez niego każda przyszła zmiana może ponownie wprowadzić ten sam błąd.

### Krok 6: wyszukaj podobne wzorce

Po zastosowaniu poprawki workflow przeszukuje całą bazę kodu pod kątem wzorca, który spowodował błąd.

**Używane narzędzia:** skonfigurowane wyszukiwanie wzorca albo ograniczone natywne wyszukiwanie z wzorcem rozpoznanym jako przyczyna źródłowa.

Na przykład jeśli błąd wynikał z dostępu do `user.organization.id` bez sprawdzenia, czy `organization` jest nullem, skan szuka wszystkich innych użyć `organization.id` bez sprawdzeń null.

**Kryteria delegowania do subagenta:** Workflow uruchamia subagenta `debug-investigator`, gdy:
- błąd obejmuje wiele domen (np. dotyczy frontendu i backendu)
- zakres skanu podobnych wzorców obejmuje co najmniej 10 plików
- do pełnej diagnozy potrzebne jest głębokie śledzenie zależności

Metody uruchamiania zależne od dostawcy:

| Dostawca | Sposób uruchomienia |
|:-------|:------------|
| Claude Code | Narzędzie agenta z `.claude/agents/debug-investigator.md` |
| Codex CLI | Prośba o subagenta pośredniczona przez model, wyniki jako JSON |
| Gemini CLI | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / fallback | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |

Raportowane są wszystkie podatne lokalizacje podobnych wzorców. Potwierdzone przypadki naprawia się w tej samej sesji.

### Krok 7: udokumentuj błąd

Workflow zapisuje w pamięci plik zawierający:
- objaw i przyczynę źródłową
- zastosowaną poprawkę i zmienione pliki
- lokalizację testu regresji
- podobne wzorce znalezione w bazie kodu

---

## Szablon promptu dla /debug

Przy wywoływaniu workflowu debugowania możesz podać prompt w uporządkowanej formie:

```
/debug

Error: TypeError: Cannot read properties of undefined (reading 'id')
Stack trace:
  at deleteUser (src/api/users.ts:47:23)
  at handleDelete (src/routes/users.ts:112:5)

Steps to reproduce:
1. Log in as admin
2. Navigate to /users
3. Click "Delete" on a user whose organization was deleted

Expected: User is deleted
Actual: 500 Internal Server Error

Environment: Node 22.1, PostgreSQL 16
```

**Dlaczego ta struktura działa:**

- **Błąd + stack trace** pozwalają w kroku 2 od razu zlokalizować kod (`search_for_pattern` z „deleteUser” znajduje funkcję; `find_symbol` wskazuje dokładną lokalizację).
- **Kroki odtworzenia** z konkretnym warunkiem wyzwalającym („użytkownik, którego organizacja została usunięta”) wskazują przyczynę źródłową (null foreign key).
- **Środowisko** eliminuje fałszywe tropy zależne od wersji.

Dla prostszych błędów wystarczy krótszy prompt:

```
/debug The login page shows "Invalid credentials" even with correct password
```

Workflow poprosi o dodatkowe szczegóły, jeśli będą potrzebne.

---

## Sygnały eskalacji

Poniższe sygnały oznaczają, że błąd wymaga eskalacji poza standardową pętlę debugowania:

### Sygnał 1: ta sama poprawka została podjęta dwa razy

Jeśli workflow proponuje i stosuje poprawkę, a ten sam błąd wraca, problem jest głębszy niż początkowa diagnoza. Oceń przyczynę ponownie. Jeśli alternatywy warto przetestować, a istniejący budżet odzyskiwania na to pozwala, użyj **Exploration Loop** w aktywnym workflowie (ultrawork, orchestrate, work):

- Wygeneruj 2–3 alternatywne hipotezy przyczyny źródłowej.
- Wyizoluj każdy eksperyment i zachowaj jego baseline, dowody oraz niezwiązaną z nim pracę.
- Wybierz podejście, które spełnia wymagane zachowanie i porównywalne kryteria pomiarowe, a następnie zweryfikuj zintegrowany wynik.

### Sygnał 2: przyczyna źródłowa obejmuje wiele domen

Błąd frontendu wynika ze zmiany backendu, którą spowodowała migracja schematu bazy danych. Gdy przyczyna źródłowa przekracza granice domen, eskaluj do `/work` albo `/orchestrate`, aby włączyć właściwych agentów domenowych.

**Przykład:** Frontend wyświetla „undefined” jako nazwę użytkownika. Backend zwraca null dla `user.display_name`. Migracja bazy dodała kolumnę, ale istniejące wiersze mają wartości NULL. Poprawka wymaga: migracji bazy (backfill), obsługi wartości null w backendzie i zapasowego wyświetlania we frontendzie.

### Sygnał 3: brak środowiska do odtworzenia

Błąd występuje tylko na produkcji i nie da się go odtworzyć lokalnie. Sygnały obejmują:
- Różnice w konfiguracji zależne od środowiska.
- Race conditions występujące tylko przy obciążeniu produkcyjnym.
- Różnice w działaniu usługi zewnętrznej między stagingiem a produkcją.

**Działanie:** Zbierz logi produkcyjne, poproś o dostęp do monitoringu produkcji i rozważ dodanie instrumentacji/logowania przed próbą poprawki.

### Sygnał 4: awaria infrastruktury testowej

Nie można napisać testu regresji, ponieważ infrastruktura testowa jest zepsuta, nieobecna albo niewystarczająca.

**Działanie:** Najpierw napraw infrastrukturę testową (albo użyj `oma install`, aby ją skonfigurować), potem wróć do workflowu debugowania. Jeśli wykonywalna kontrola nie ma zastosowania, zapisz przyczynę w kontrakcie wyniku zamiast wymyślać zaliczoną kontrolę.

---

## Checklista weryfikacji po poprawce

Po zastosowaniu poprawki i testu regresji sprawdź:

- [ ] **Test regresji nie przechodzi bez poprawki:** tymczasowo cofnij poprawkę i potwierdź, że test wykrywa błąd.
- [ ] **Test regresji przechodzi z poprawką:** zastosuj poprawkę i potwierdź, że test przechodzi.
- [ ] **Odpowiednie istniejące kontrole nadal przechodzą:** uruchom kontrole projektu obejmujące zmienione zachowanie. Build uruchamiaj tylko, gdy zadanie wyraźnie tego wymaga.
- [ ] **Przeskanowano podobne wzorce:** ukończono krok 6, a wszystkie znalezione przypadki naprawiono albo udokumentowano.
- [ ] **Poprawka jest minimalna:** zmieniono tylko konieczne linie, bez niepowiązanej refaktoryzacji.
- [ ] **Udokumentowano przyczynę źródłową:** plik pamięci zawiera objaw, przyczynę źródłową, zastosowaną poprawkę, zmienione pliki, lokalizację testu regresji i znalezione podobne wzorce.

---

## Kryteria ukończenia

Workflow debugowania jest ukończony, gdy:

1. Przyczyna źródłowa została rozpoznana i udokumentowana, a nie tylko objaw.
2. Zastosowano minimalną poprawkę zgodnie z autoryzacją zadania.
3. Istnieje test regresji, który nie przechodzi bez poprawki i przechodzi z poprawką.
4. Bazę kodu przeskanowano pod kątem podobnych wzorców, a wszystkie potwierdzone przypadki obsłużono.
5. W pamięci zapisano raport błędu z: objawem, przyczyną źródłową, zastosowaną poprawką, zmienionymi plikami, lokalizacją testu regresji i znalezionymi podobnymi wzorcami.
6. Po poprawce wszystkie istniejące testy nadal przechodzą.
