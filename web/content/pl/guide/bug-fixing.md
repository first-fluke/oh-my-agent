---
title: "Przypadek użycia: Naprawianie błędów"
description: Strukturalna pętla odtworzenie-diagnoza-naprawa-regresja z eskalacją opartą na priorytecie.
---

# Przypadek użycia: Naprawianie błędów

## Format zgłoszenia

Zacznij od odtwarzalnego raportu:

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## Triage priorytetów

Klasyfikuj wcześnie, aby wybrać szybkość reakcji:

- `P0`: utrata danych, obejście autoryzacji, awaria produkcyjna
- `P1`: główny przepływ użytkownika zablokowany
- `P2`: pogorszone działanie z obejściem
- `P3`: drobny/nieblokujący

`P0/P1` powinny zawsze obejmować przegląd QA/bezpieczeństwa.

## Pętla wykonania

1. Odtwórz dokładnie w minimalnym środowisku.
2. Wyizoluj przyczynę źródłową (nie tylko łatanie objawów).
3. Zaimplementuj najmniejszą bezpieczną poprawkę.
4. Dodaj testy regresji dla wadliwej ścieżki.
5. Sprawdź ponownie sąsiednie ścieżki, które mogą mieć ten sam tryb awarii.

## Szablon promptu dla oma-debug

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## Typowe sygnały eskalacji

Eskaluj do QA lub bezpieczeństwa, gdy błąd dotyczy:

- autoryzacji/sesji/odświeżania tokenów
- granic uprawnień
- spójności płatności/transakcji
- regresji wydajności pod obciążeniem

## Walidacja po naprawie

- oryginalne odtworzenie nie kończy się już niepowodzeniem
- brak nowych błędów w powiązanych przepływach
- testy kończą się niepowodzeniem przed naprawą i przechodzą po naprawie
- ścieżka wycofania jest jasna, jeśli wymagana jest pilna poprawka

## Kryteria zakończenia

Naprawianie błędów jest zakończone, gdy:

- przyczyna źródłowa jest zidentyfikowana i udokumentowana
- poprawka jest zweryfikowana poprzez odtwarzalne kontrole
- pokrycie regresji jest zapewnione
