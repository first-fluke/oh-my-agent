---
title: Układ artefaktów
sidebar_label: Układ artefaktów
description: Gdzie OMA przechowuje utrzymywane dokumenty, raporty wykonania i stan runtime'u oraz jak migrować starsze lokalizacje.
---

# Układ artefaktów {#artifact-layout}

OMA używa trzech lokalizacji: `docs/` dla utrzymywanych dokumentów projektu, `.agents/results/` dla czytelnych dla człowieka raportów wykonania oraz `.agents/state/` dla dowodów koordynacji i wykonania. Ścieżki poniżej są względne wobec katalogu głównego projektu.

## Utrzymywane dokumenty {#maintained-documents}

| Lokalizacja | Treść |
|----------|---------|
| `docs/decisions/` | Propozycje podejścia, kompromisy i rekordy decyzji architektonicznych (ADR) |
| `docs/plans/work/` | Plany pracy, postęp, dzienniki decyzji i rejestr długu technicznego |
| `docs/plans/contracts/` | Przyjęte kontrakty API |
| `DESIGN.md` | System projektowy UI: typografia, kolor, odstępy, ruch i komponenty |

W dokumentach decyzji użyj pola `Status`, aby zapisać `draft`, `accepted` albo `superseded`. Zachowaj decyzję zastąpioną i podlinkuj jej następcę, aby rozumowanie pozostało dostępne. W OMA `design` oznacza projekt UI; propozycje techniczne i ADR-y dzielą `docs/decisions/`.

Użyj indeksu dokumentów projektu, na przykład `docs/README.md`, aby linkować do utrzymywanych dokumentów. Migracja artefaktów przenosi istniejące pliki; nie tworzy indeksu ani nie zmienia statusu dokumentu.

## Raporty wykonania i stan runtime'u {#execution-reports-and-runtime-state}

| Lokalizacja | Treść |
|----------|---------|
| `.agents/results/result-*.md` | Czytelne dla człowieka raporty wyników agentów i workflowów |
| `.agents/results/architecture/` | Analiza architektury i rekomendacje |
| `.agents/results/bugs/` | Raporty błędów |
| `.agents/results/refactor/` | Plany i raporty refaktoryzacji |
| `.agents/results/security/` | Raporty skanów bezpieczeństwa |
| `.agents/results/market/` | Briefy badań rynku |
| `.agents/results/recap/` | Podsumowania pracy |
| `.agents/results/explain/` | Wyjaśnienia HTML |
| `.agents/results/api-contracts/` | Szkice kontraktów API |
| `.agents/results/plan-{sessionId}.json` | Bieżący plan zadań |
| `.agents/state/memories/` | Podsumowania sesji, tablice zadań, postęp, lekcje i rekordy eksperymentów |
| Runtime `agent-runs/` | Ustrukturyzowane pokwitowania, zgłoszenia i dowody weryfikacji |
| Runtime `agent-plans/` | Zamrożone plany wykonania |

Podkatalogi raportów pozostają rozdzielone według domeny. Czytelne dla człowieka raporty uzupełniają ustrukturyzowane dowody; same nie ustanawiają zweryfikowanego ukończenia. Zobacz [Wyniki i wznawianie](../agent-results-and-resume/).

Bieżące pokwitowania i zamrożone plany leżą w katalogu stanu projektu aktywnego profilu. Starsze projekty mogą je nadal trzymać w `.agents/state/`. Ich powiązania przechowywania i weryfikacji nie zmieniają się przez tę migrację.

## Promuj utrzymywany dokument {#promote-a-maintained-document}

Gdy artefakt wykonania staje się odwołaniem projektu, przenieś go do pasującej utrzymywanej lokalizacji. Na przykład przenieś przyjęty kontrakt z `.agents/results/api-contracts/` do `docs/plans/contracts/` albo zamień rekomendację architektury w rekord decyzji w `docs/decisions/`. Zostaw link w starej lokalizacji i zaktualizuj indeks dokumentów.

Jeśli ustrukturyzowane dowody wykonania zapisują oryginalny plik albo jego hash, zostaw ten plik nietknięty i utwórz zamiast niego wersję utrzymywaną. Podlinkuj utrzymywany dokument z indeksu projektu.

Install, update i link domyślnie ignorują w Git `.agents/results/`, `.agents/state/` oraz `docs/plans/`. `docs/decisions/` jest poza tym domyślnym ignorowaniem. Przejrzyj `.gitignore` projektu, gdy przyjmujesz kontrakt albo plan pracy, który zespół powinien wersjonować.

## Migruj istniejący projekt {#migrate-an-existing-project}

Najpierw wyświetl podgląd migracji:

```bash
oma docs migrate --dry-run
```

Dla ustrukturyzowanego wyjścia dodaj `--json`. Zastosuj tę samą migrację jawnie, gdy będziesz gotowy:

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` i `oma update` również uruchamiają tę migrację. Konsoliduje ona te starsze lokalizacje:

<!-- oma-docs:ignore-start -->
| Starsza lokalizacja | Miejsce docelowe |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` i ich autorskie sidecar'y diagramów | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Dokumenty decyzji zachowują strukturę podkatalogów. Starsze ADR-y architektury przenoszą się wraz z autorskimi sidecarami `.archify.json` i `.archify.html`. Przeglądy, rekomendacje i dzienniki walidacji właściwe dla uruchomienia pozostają w katalogu wyników. Migracja wyników obejmuje pliki `result-*.md` najwyższego poziomu w obu katalogach pamięci; pozostałe pliki pamięci zostają na miejscu.

Migracja zachowuje istniejące pliki docelowe. Jeśli inny plik ma tę samą nazwę, dodaje sufiks źródła, na przykład `001-cache--from-plan-designs.md`, i raportuje wybraną ścieżkę. Jeśli ta nazwa jest zajęta, dodaje stabilny hash treści. Ponowne uruchomienie migracji nie tworzy zduplikowanych kopii ani nie zmienia nazw plików, które już zostały zmigrowane.

Aktualizuje obsługiwane linki Markdown i odwołania do ścieżek w przeniesionych dokumentach, notatkach koordynacji Markdown, `docs/**/*.md` oraz plikach `README*.md` i `AGENTS.md` w katalogu głównym. Przejrzyj te zmiany wraz z raportem migracji i diffem Git. Ustrukturyzowane dowody runtime'u i pliki UI `DESIGN.md` są wyłączone z przepisywania odwołań. Istniejące bloki `oma-docs:ignore-start` / `oma-docs:ignore-end` zachowują przykłady starszych ścieżek.

Przejrzyj raport pod kątem plików odroczonych. Raport wyniku, do którego odwołują się ustrukturyzowane dowody wykonania, zostaje na oryginalnej ścieżce, aby zapisane pokwitowanie i hash pozostały ważne. Pokwitowania, zgłoszenia, zamrożone plany wykonania i inne dowody runtime'u pozostają na miejscu. Migracja nie promuje szkiców kontraktów, nie przyjmuje decyzji ani nie zmienia systemu projektowego UI.
