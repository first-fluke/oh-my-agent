---
title: Wprowadzenie
description: Czym jest oh-my-agent i jak działa współpraca wieloagentowa.
---

# Wprowadzenie

oh-my-agent to wieloagentowy orkiestrator dla Antigravity IDE. Kieruje żądania do wyspecjalizowanych umiejętności i koordynuje agentów za pośrednictwem pamięci Serena.

## Co otrzymujesz

- Routing umiejętności oparty na żądaniach
- Wykonanie oparte na przepływach pracy dla planowania/przeglądu/debugowania
- Orkiestracja CLI do równoległego uruchamiania agentów
- Panele czasu rzeczywistego do monitorowania sesji

## Role agentów

| Agent | Odpowiedzialność |
|---|---|
| oma-coordination | Koordynuje złożone projekty wielodomenowe |
| oma-pm | Planowanie i dekompozycja architektury |
| oma-frontend | Implementacja React/Next.js |
| oma-backend | Implementacja API/bazy danych/autoryzacji |
| oma-mobile | Implementacja Flutter/mobile |
| oma-qa | Przegląd bezpieczeństwa/wydajności/dostępności |
| oma-debug | Analiza przyczyn źródłowych i poprawki bezpieczne dla regresji |
| oma-brainstorm | Ideacja z priorytetem projektowania i eksploracja koncepcji |
| oma-db | Modelowanie baz danych, projektowanie schematów i optymalizacja zapytań |
| oma-dev-workflow | Optymalizacja przepływu pracy deweloperskiej i CI/CD |
| oma-tf-infra | Provisioning infrastruktury jako kodu z Terraform |
| oma-translator | Kontekstowe tłumaczenie wielojęzyczne |
| oma-orchestrator | Orkiestracja podagentów oparta na CLI |
| oma-commit | Przepływ pracy konwencjonalnych commitów |

## Struktura projektu

- `.agents/skills/`: definicje umiejętności i zasoby
- `.agents/workflows/`: jawne komendy przepływów pracy
- `.serena/memories/`: stan orkiestracji w czasie wykonania
- `cli/cli.ts`: źródło prawdy dla interfejsów komend

## Progresywne ujawnianie

1. Zidentyfikuj intencję żądania
2. Załaduj tylko wymagane zasoby umiejętności
3. Wykonaj za pomocą wyspecjalizowanych agentów
4. Zweryfikuj i iteruj przez pętle QA/debug
