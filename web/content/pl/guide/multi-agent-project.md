---
title: "Przewodnik: Projekty wieloagentowe"
description: Kompletny przewodnik koordynacji wielu agentów domenowych w zakresie frontend, backend, bazy danych, mobile i QA — od planowania po merge.
---

# Przewodnik: Projekty wieloagentowe

## Kiedy używać koordynacji wieloagentowej

Funkcjonalność obejmuje wiele domen — API backend + UI frontend + schemat bazy danych + klient mobilny + przegląd QA. Jeden agent nie jest w stanie obsłużyć pełnego zakresu, a domeny muszą postępować równolegle bez wzajemnego nadpisywania plików.

Koordynacja wieloagentowa jest właściwym wyborem gdy:
- Zadanie obejmuje 2 lub więcej domen
- Istnieją kontrakty API między domenami
- Chcesz równoległego wykonania aby skrócić czas
- Potrzebujesz przeglądu QA po implementacji we wszystkich domenach

---

## Pełna sekwencja: /plan do /review

### Krok 1: /plan — Wymagania i dekompozycja zadań
Workflow `/plan` działa inline i produkuje ustrukturyzowany plan zapisywany do `.agents/plan.json`.

### Krok 2: /work lub /orchestrate — Wykonanie

| Aspekt | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interakcja** | Interaktywne — użytkownik potwierdza na każdym etapie | Automatyczne — działa do zakończenia |
| **Planowanie PM** | Wbudowane | Wymaga plan.json z /plan |
| **Tryb trwały** | Tak | Tak |
| **Najlepsze dla** | Pierwsze użycie, złożone projekty | Powtarzane uruchomienia, dobrze zdefiniowane zadania |

### Krok 3: agent:spawn — Zarządzanie agentami na poziomie CLI
Niskopoziomowy mechanizm wywoływany wewnętrznie przez workflow, dostępny też bezpośrednio.

### Krok 4: /review — Weryfikacja QA
Pipeline QA: bezpieczeństwo OWASP Top 10, wydajność, dostępność WCAG 2.1 AA, jakość kodu.

---

## Reguła kontraktu-first

Kontrakty API są mechanizmem synchronizacji między agentami. Definiowane przed implementacją, zawierają: metodę HTTP, ścieżkę, schematy żądania/odpowiedzi, wymagania auth i formaty błędów.

Bez kontraktów, agent backend może zwrócić `{ "user_id": 1 }` podczas gdy agent frontend konsumuje `{ "userId": 1 }`. Reguła kontraktu-first eliminuje tę klasę błędów integracji.

---

## Bramki merge: 4 warunki

1. **Build przechodzi** — Cały kod kompiluje się bez błędów
2. **Testy przechodzą** — Istniejące testy nadal przechodzą, nowe testy pokrywają implementację
3. **Zmodyfikowane tylko zaplanowane pliki** — Agenci nie modyfikują plików poza przydzielonym zakresem
4. **Przegląd QA czysty** — Brak CRITICAL lub HIGH, MEDIUM/LOW dokumentowane na przyszłe sprinty

---

## Anty-wzorce do unikania

1. **Pomijanie planu** — `/orchestrate` bez plan.json odmówi kontynuacji
2. **Nakładające się przestrzenie robocze** — Dwóch agentów w tym samym katalogu tworzy konflikty plików
3. **Brak kontraktów API** — Agenci będą czynić niekompatybilne założenia
4. **Ignorowanie znalezisk QA** — CRITICAL i HIGH to prawdziwe błędy które pojawią się w produkcji
5. **Ręczna koordynacja plików** — Automatyczny pipeline wychwytuje problemy które ręczny przegląd pomija
6. **Nadmierna równoległość** — Uruchamianie P1 przed zakończeniem P0 narusza zależności
7. **Pomijanie weryfikacji** — Krok weryfikacji wychwytuje awarie buildu i regresje testów

---

## Kiedy jest gotowe

Projekt wieloagentowy jest zakończony gdy:
- Wszystkie agenci we wszystkich poziomach priorytetów zakończyli pomyślnie
- Skrypty weryfikacyjne przechodzą dla każdego agenta
- Przegląd QA raportuje zero CRITICAL i zero HIGH
- Zgodność kontraktów API między domenami potwierdzona
- Build przechodzi i wszystkie testy przechodzą
- Użytkownik daje końcowe zatwierdzenie
