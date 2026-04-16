---
title: "Przewodnik: Naprawianie błędów"
description: Kompleksowy przewodnik debugowania obejmujący ustrukturyzowaną 5-krokową pętlę debugowania, triage ważności, sygnały eskalacji i walidację po naprawie.
---

# Przewodnik: Naprawianie błędów

## Kiedy używać workflow debugowania

Użyj `/debug` (lub powiedz "fix bug", "fix error", "debug" w języku naturalnym) gdy masz konkretny błąd do zdiagnozowania i naprawy. Workflow zapewnia ustrukturyzowane, odtwarzalne podejście do debugowania, które unika typowej pułapki naprawiania symptomów zamiast przyczyn źródłowych.

Workflow debugowania obsługuje wszystkich dostawców (Gemini, Claude, Codex, Qwen). Kroki 1-5 wykonywane są inline. Krok 6 (skanowanie podobnych wzorców) może delegować do subagenta `debug-investigator` gdy zakres skanowania jest szeroki (10+ plików lub błędy wielodomenowe).

---

## Szablon zgłoszenia błędu

### Pola wymagane

| Pole | Opis | Przykład |
|:------|:-----------|:--------|
| **Komunikat błędu** | Dokładny tekst błędu lub stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Kroki reprodukcji** | Uporządkowane akcje wyzwalające błąd | 1. Zaloguj się jako admin. 2. Przejdź do /users. 3. Kliknij "Delete". |
| **Oczekiwane zachowanie** | Co powinno się stać | Użytkownik usunięty z listy. |
| **Rzeczywiste zachowanie** | Co faktycznie się dzieje | Strona zawiesza się z białym ekranem. |

### Pola opcjonalne (bardzo zalecane)

| Pole | Opis | Przykład |
|:------|:-----------|:--------|
| **Środowisko** | Przeglądarka, system operacyjny, wersja Node, urządzenie | Chrome 124, macOS 15.3, Node 22.1 |
| **Częstotliwość** | Zawsze, czasami, tylko za pierwszym razem | Zawsze odtwarzalny |
| **Ostatnie zmiany** | Co zmieniło się przed pojawieniem błędu | Zmergowano PR #142 (funkcja usuwania użytkownika) |
| **Powiązany kod** | Pliki lub funkcje, które podejrzewasz | `src/api/users.ts`, `deleteUser()` |
| **Logi** | Logi serwera, wyjście konsoli | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Zrzuty ekranu/nagrania** | Dowód wizualny | Zrzut ekranu ekranu błędu |

Im więcej kontekstu dostarczysz z góry, tym mniej pytań zwrotnych workflow debugowania będzie potrzebować.

---

## Triage ważności (P0-P3)

Ważność determinuje sposób obsługi błędu i szybkość, z jaką powinien zostać naprawiony.

### P0 — Krytyczny (natychmiastowa reakcja)

**Definicja:** Produkcja nie działa, dane są tracone lub uszkadzane, aktywne naruszenie bezpieczeństwa.

**Oczekiwana reakcja:** Porzuć wszystko inne. To jedyne zadanie do rozwiązania.

**Przykłady:**
- Obejście systemu uwierzytelniania — wszyscy użytkownicy mają dostęp do endpointów admina.
- Migracja bazy danych uszkodziła tabelę użytkowników — konta niedostępne.
- Przetwarzanie płatności podwójnie obciąża klientów.
- Endpoint API zwraca dane osobowe innych użytkowników.

**Podejście do debugowania:** Pomiń pełny szablon. Podaj komunikat błędu i stack trace. Workflow zaczyna natychmiast od Kroku 2 (Reprodukcja).

### P1 — Wysoki (ta sama sesja)

**Definicja:** Podstawowa funkcjonalność zepsuta dla znacznej liczby użytkowników. Obejście może istnieć, ale nie jest akceptowalne długoterminowo.

**Oczekiwana reakcja:** Napraw w bieżącej sesji roboczej. Nie rozpoczynaj nowych funkcjonalności do czasu rozwiązania.

**Przykłady:**
- Wyszukiwanie nie zwraca wyników dla zapytań zawierających znaki specjalne.
- Przesyłanie plików nie działa dla plików powyżej 5MB (limit powinien wynosić 50MB).
- Aplikacja mobilna zawiesza się przy uruchomieniu na urządzeniach Android 14.
- E-maile resetu hasła nie są wysyłane (integracja z usługą e-mail uszkodzona).

**Podejście do debugowania:** Pełna 5-krokowa pętla. Przegląd QA zalecany po naprawie.

### P2 — Średni (ten sprint)

**Definicja:** Funkcjonalność działa, ale z pogorszoną jakością. Wpływa na użyteczność, ale nie na funkcjonalność.

**Oczekiwana reakcja:** Zaplanuj na bieżący sprint. Napraw przed następnym wydaniem.

**Przykłady:**
- Sortowanie tabeli uwzględnia wielkość liter ("apple" sortuje się po "Zebra").
- Tryb ciemny ma nieczytelny tekst w panelu ustawień.
- Czas odpowiedzi API dla endpointu /users wynosi 8 sekund (powinien być poniżej 1s).
- Paginacja pokazuje "Strona 1 z 0" gdy lista jest pusta.

**Podejście do debugowania:** Pełna 5-krokowa pętla. Włącz do zestawu testów regresji QA.

### P3 — Niski (backlog)

**Definicja:** Problem kosmetyczny, przypadek brzegowy lub drobna niedogodność.

**Oczekiwana reakcja:** Dodaj do backlogu. Napraw gdy będzie okazja lub zgrupuj z powiązanymi zmianami.

**Przykłady:**
- Tekst tooltipa ma literówkę: "Delet" zamiast "Delete".
- Ostrzeżenie konsoli o przestarzałej metodzie cyklu życia React.
- Wyrównanie stopki jest przesunięte o 2 piksele przy szerokościach viewportu 768-800px.
- Spinner ładowania kontynuuje przez 200ms po wyświetleniu treści.

**Podejście do debugowania:** Może nie wymagać pełnej pętli debugowania. Bezpośrednia naprawa z testem regresji jest wystarczająca.

---

## 5-krokowa pętla debugowania w szczegółach

Workflow `/debug` wykonuje te kroki w ścisłej kolejności. Używa narzędzi MCP do analizy kodu przez cały proces — nigdy surowego odczytu plików ani grep.

### Krok 1: Zbieranie informacji o błędzie

Workflow pyta o (lub otrzymuje od użytkownika):
- Komunikat błędu i stack trace
- Kroki reprodukcji
- Oczekiwane vs rzeczywiste zachowanie
- Szczegóły środowiska

Jeśli komunikat błędu został już podany w prompcie, workflow przechodzi natychmiast do Kroku 2.

### Krok 2: Reprodukcja błędu

**Narzędzia:** `search_for_pattern` z komunikatem błędu lub słowami kluczowymi stack trace, `find_symbol` do lokalizacji dokładnej funkcji i pliku.

Celem jest zlokalizowanie błędu w bazie kodu — znalezienie dokładnej linii, w której rzucany jest wyjątek, dokładnej funkcji produkującej błędne wyjście lub dokładnego warunku powodującego nieoczekiwane zachowanie.

Ten krok przekształca symptom zgłoszony przez użytkownika ("strona się zawiesza") w lokalizację na poziomie bazy kodu (`src/api/users.ts:47, deleteUser() rzuca TypeError`).

### Krok 3: Diagnoza przyczyny źródłowej

**Narzędzia:** `find_referencing_symbols` do śledzenia ścieżki wykonania wstecz od punktu błędu.

Workflow śledzi wstecz od lokalizacji błędu, aby znaleźć rzeczywistą przyczynę. Sprawdza typowe wzorce przyczyn źródłowych:

| Wzorzec | Na co zwracać uwagę |
|:--------|:----------------|
| **Dostęp do null/undefined** | Brak sprawdzeń null, potrzebne optional chaining, niezainicjalizowane zmienne |
| **Warunki wyścigu** | Operacje asynchroniczne kończące się w złej kolejności, brakujący await, współdzielony mutowalny stan |
| **Brak obsługi błędów** | Brak try/catch, nieobsłużone odrzucenie promise, brak error boundary |
| **Złe typy danych** | String zamiast oczekiwanej liczby, brak konwersji typów, nieprawidłowy schemat |
| **Nieaktualny stan** | Stan React nie aktualizuje się, niewymienione wartości z cache, closure przechwytujące starą wartość |
| **Brak walidacji** | Dane wejściowe użytkownika nie oczyszczone, body żądania API nie zwalidowane, warunki brzegowe niesprawdzone |

Kluczowa dyscyplina: diagnozuj **przyczynę źródłową**, nie symptom. Jeśli `user.id` jest undefined, pytanie nie brzmi "jak sprawdzić undefined?" lecz "dlaczego user jest undefined w tym punkcie ścieżki wykonania?"

### Krok 4: Propozycja minimalnej poprawki

Workflow prezentuje:
1. Zidentyfikowaną przyczynę źródłową (z dowodem ze śledzenia kodu).
2. Proponowaną poprawkę (zmieniającą tylko minimum konieczne).
3. Wyjaśnienie dlaczego to naprawia przyczynę źródłową, a nie tylko symptom.

**Workflow blokuje tutaj do potwierdzenia użytkownika.** Zapobiega to wprowadzaniu zmian przez agenta debugującego bez zatwierdzenia.

**Zasada minimalnej poprawki:** Zmień jak najmniej linii. Nie refaktoryzuj, nie poprawiaj stylu kodu, nie dodawaj niezwiązanych funkcjonalności. Poprawka powinna dać się przejrzeć w mniej niż 2 minuty.

### Krok 5: Zastosowanie poprawki i napisanie testu regresji

Dwie akcje w tym kroku:

1. **Implementacja poprawki** — Zatwierdzona minimalna zmiana jest zastosowana.
2. **Napisanie testu regresji** — Test, który:
   - Reprodukuje oryginalny błąd (test musi nie przechodzić bez poprawki)
   - Weryfikuje działanie poprawki (test musi przechodzić z poprawką)
   - Zapobiega ponownemu wprowadzeniu tego samego błędu w przyszłych zmianach

Test regresji jest najważniejszym produktem workflow debugowania. Bez niego ten sam błąd może zostać ponownie wprowadzony przez każdą przyszłą zmianę.

### Krok 6: Skan podobnych wzorców

Po zastosowaniu poprawki workflow skanuje całą bazę kodu w poszukiwaniu tego samego wzorca, który spowodował błąd.

**Narzędzia:** `search_for_pattern` z wzorcem zidentyfikowanym jako przyczyna źródłowa.

Na przykład, jeśli błąd był spowodowany dostępem do `user.organization.id` bez sprawdzenia czy `organization` jest null, skan szuka wszystkich innych instancji dostępu do `organization.id` bez sprawdzenia null.

**Kryteria delegacji do subagenta** — Workflow uruchamia subagenta `debug-investigator` gdy:
- Błąd obejmuje wiele domen (np. zarówno frontend jak i backend dotknięte).
- Zakres skanu podobnych wzorców obejmuje 10+ plików.
- Potrzebne głębokie śledzenie zależności do pełnej diagnozy problemu.

Metody uruchamiania specyficzne dla dostawcy:

| Dostawca | Metoda uruchamiania |
|:-------|:------------|
| Claude Code | Narzędzie Agent z `.claude/agents/debug-investigator.md` |
| Codex CLI | Żądanie subagenta mediowane przez model, wyniki jako JSON |
| Gemini CLI | `oma agent:spawn debug "prompt skanu" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oma agent:spawn debug "prompt skanu" {session_id} -w {workspace}` |

Wszystkie znalezione podatne lokalizacje są raportowane. Potwierdzone instancje są naprawiane w ramach tej samej sesji.

### Krok 7: Dokumentacja błędu

Workflow zapisuje plik pamięci zawierający:
- Symptom i przyczynę źródłową
- Zastosowaną poprawkę i zmienione pliki
- Lokalizację testu regresji
- Podobne wzorce znalezione w bazie kodu

---

## Szablon promptu dla /debug

Przy wyzwalaniu workflow debugowania możesz podać ustrukturyzowany prompt:

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

- **Błąd + stack trace** pozwala Krokowi 2 natychmiast zlokalizować kod (`search_for_pattern` z "deleteUser" znajduje funkcję; `find_symbol` wskazuje dokładną lokalizację).
- **Kroki reprodukcji** ze specyficznym warunkiem wyzwalającym ("użytkownik, którego organizacja została usunięta") sugerują przyczynę źródłową (null foreign key).
- **Środowisko** eliminuje fałszywe tropy specyficzne dla wersji.

Dla prostszych błędów krótszy prompt wystarczy:

```
/debug The login page shows "Invalid credentials" even with correct password
```

Workflow zapyta o dodatkowe szczegóły w razie potrzeby.

---

## Sygnały eskalacji

Te sygnały wskazują, że błąd wymaga eskalacji poza standardową pętlę debugowania:

### Sygnał 1: Ta sama poprawka próbowana dwukrotnie

Jeśli workflow proponuje poprawkę, zastosuje ją, a ten sam błąd powraca, problem jest głębszy niż początkowa diagnoza. Aktywuje to **Pętlę eksploracji** w workflow, które ją obsługują (ultrawork, orchestrate, work):

- Wygeneruj 2-3 alternatywne hipotezy dotyczące przyczyny źródłowej.
- Przetestuj każdą hipotezę w oddzielnej przestrzeni roboczej (git stash na próbę).
- Oceń wyniki i przyjmij najlepsze podejście.

### Sygnał 2: Wielodomenowa przyczyna źródłowa

Błąd na frontendzie jest spowodowany zmianą w backendzie, która jest spowodowana migracją schematu bazy danych. Gdy przyczyna źródłowa przekracza granice domen, eskaluj do `/work` lub `/orchestrate` aby zaangażować odpowiednich agentów domenowych.

**Przykład:** Frontend wyświetla "undefined" jako nazwę użytkownika. Backend zwraca null dla `user.display_name`. Migracja bazy danych dodała kolumnę, ale istniejące wiersze mają wartości NULL. Naprawa wymaga: migracji bazy danych (uzupełnienie danych), obsługi null w backendzie i fallback wyświetlania na frontendzie.

### Sygnał 3: Brak środowiska reprodukcji

Błąd występuje tylko w produkcji i nie można go odtworzyć lokalnie. Sygnały obejmują:
- Różnice konfiguracji specyficzne dla środowiska.
- Warunki wyścigu, które manifestują się tylko pod obciążeniem produkcyjnym.
- Różnice zachowania usług zewnętrznych między stagingiem a produkcją.

**Akcja:** Zbierz logi produkcyjne, poproś o dostęp do monitoringu produkcji i rozważ dodanie instrumentacji/logowania przed próbą naprawy.

### Sygnał 4: Awaria infrastruktury testowej

Testu regresji nie można napisać, ponieważ infrastruktura testowa jest uszkodzona, brakuje jej lub jest niewystarczająca.

**Akcja:** Najpierw napraw infrastrukturę testową (lub użyj `oma install` do jej skonfigurowania), a potem wróć do workflow debugowania.

---

## Lista kontrolna walidacji po naprawie

- [ ] **Test regresji nie przechodzi bez poprawki**
- [ ] **Test regresji przechodzi z poprawką**
- [ ] **Istniejące testy nadal przechodzą**
- [ ] **Build przechodzi**
- [ ] **Podobne wzorce zeskanowane** i naprawione lub udokumentowane
- [ ] **Poprawka jest minimalna** — tylko konieczne linie zmienione
- [ ] **Przyczyna źródłowa udokumentowana** — Plik pamięci zapisuje: symptom, przyczynę źródłową, zastosowaną poprawkę, zmienione pliki, lokalizację testu regresji i znalezione podobne wzorce.

---

## Kryteria zakończenia

Workflow debugowania jest ukończony gdy:

1. Przyczyna źródłowa jest zidentyfikowana i udokumentowana (nie tylko symptom).
2. Minimalna poprawka jest zastosowana z zatwierdzeniem użytkownika.
3. Istnieje test regresji, który nie przechodzi bez poprawki i przechodzi z poprawką.
4. Baza kodu została przeskanowana w poszukiwaniu podobnych wzorców, a wszystkie potwierdzone instancje są zaadresowane.
5. Raport o błędzie jest zapisany w pamięci zawierając: symptom, przyczynę źródłową, zastosowaną poprawkę, zmienione pliki, lokalizację testu regresji i znalezione podobne wzorce.
6. Wszystkie istniejące testy nadal przechodzą po naprawie.
