---
title: "Przewodnik: Naprawianie błędów"
description: Kompleksowy przewodnik debugowania obejmujący ustrukturyzowaną 5-krokową pętlę debugowania, triage ważności, sygnały eskalacji i walidację po naprawie.
---

# Przewodnik: Naprawianie błędów

## Kiedy używać workflow debugowania

Użyj `/debug` (lub powiedz "fix bug", "fix error", "debug" w języku naturalnym) gdy masz konkretny błąd do zdiagnozowania i naprawy. Workflow zapewnia ustrukturyzowane, odtwarzalne podejście do debugowania.

---

## Szablon zgłoszenia błędu

### Pola wymagane

| Pole | Opis | Przykład |
|:------|:-----------|:--------|
| **Komunikat błędu** | Dokładny tekst błędu lub stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Kroki reprodukcji** | Uporządkowane akcje wyzwalające błąd | 1. Zaloguj się jako admin. 2. Przejdź do /users. 3. Kliknij "Delete". |
| **Oczekiwane zachowanie** | Co powinno się stać | Użytkownik usunięty z listy. |
| **Rzeczywiste zachowanie** | Co faktycznie się dzieje | Strona zawiesza się z białym ekranem. |

---

## Triage ważności (P0-P3)

### P0 — Krytyczny (natychmiastowa reakcja)
Produkcja nie działa, utrata/uszkodzenie danych, aktywne naruszenie bezpieczeństwa. Porzuć wszystko inne.

### P1 — Wysoki (ta sama sesja)
Podstawowa funkcjonalność zepsuta dla znacznej liczby użytkowników. Napraw w bieżącej sesji.

### P2 — Średni (ten sprint)
Funkcjonalność działa ale z pogorszoną jakością. Zaplanuj na bieżący sprint.

### P3 — Niski (backlog)
Problem kosmetyczny, przypadek brzegowy lub drobna niedogodność.

---

## 5-krokowa pętla debugowania

### Krok 1: Zbieranie informacji o błędzie
Komunikat błędu, stack trace, kroki reprodukcji, oczekiwane vs rzeczywiste zachowanie.

### Krok 2: Reprodukcja błędu
**Narzędzia:** `search_for_pattern` z komunikatem błędu, `find_symbol` do lokalizacji funkcji.

### Krok 3: Diagnoza przyczyny źródłowej
**Narzędzia:** `find_referencing_symbols` do śledzenia ścieżki wykonania wstecz od punktu błędu.

Typowe wzorce przyczyn: dostęp do null/undefined, warunki wyścigu, brak obsługi błędów, złe typy danych, nieaktualny stan, brak walidacji.

### Krok 4: Propozycja minimalnej poprawki
Prezentacja przyczyny źródłowej z dowodem, proponowana poprawka zmieniająca tylko minimum. **Workflow blokuje tutaj do potwierdzenia użytkownika.**

### Krok 5: Zastosowanie poprawki i napisanie testu regresji
Test musi: (a) nie przechodzić bez poprawki, (b) przechodzić z poprawką, (c) zapobiegać ponownemu wprowadzeniu błędu.

### Krok 6: Skan podobnych wzorców
`search_for_pattern` z wzorcem zidentyfikowanym jako przyczyna źródłowa. Subagent `debug-investigator` uruchamiany gdy zakres > 10 plików lub wielodomenowy.

### Krok 7: Dokumentacja błędu
Plik pamięci z: symptomem, przyczyną źródłową, zastosowaną poprawką, zmienionymi plikami, lokalizacją testu regresji, znalezionymi podobnymi wzorcami.

---

## Sygnały eskalacji

1. **Ta sama poprawka próbowana dwukrotnie** — Problem głębszy niż początkowa diagnoza. Aktywuje Pętlę eksploracji.
2. **Wielodomenowa przyczyna źródłowa** — Eskaluj do `/coordinate` lub `/orchestrate`.
3. **Brak środowiska reprodukcji** — Zbierz logi produkcyjne, rozważ dodanie instrumentacji.
4. **Awaria infrastruktury testowej** — Najpierw napraw infrastrukturę, potem wróć do debugowania.

---

## Lista kontrolna walidacji po naprawie

- [ ] **Test regresji nie przechodzi bez poprawki**
- [ ] **Test regresji przechodzi z poprawką**
- [ ] **Istniejące testy nadal przechodzą**
- [ ] **Build przechodzi**
- [ ] **Podobne wzorce zeskanowane** i naprawione lub udokumentowane
- [ ] **Poprawka jest minimalna** — tylko konieczne linie zmienione
- [ ] **Przyczyna źródłowa udokumentowana**
