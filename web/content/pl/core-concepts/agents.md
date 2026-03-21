---
title: Agenci
description: Typy agentów, strategia przestrzeni roboczych i przepływ orkiestracji.
---

# Agenci

## Kategorie agentów

- Ideacja: Brainstorm
- Planowanie: PM agent
- Implementacja: Frontend, Backend, Mobile, DB
- Infrastruktura: TF-infra agent
- DevOps: Dev-workflow
- Zapewnienie jakości: QA, Debug
- Lokalizacja: Translator
- Koordynacja: oma-coordination, oma-orchestrator

## Strategia przestrzeni roboczych

Oddzielne przestrzenie robocze zmniejszają konflikty scalania:

```text
./apps/api      -> backend
./apps/web      -> frontend
./apps/mobile   -> mobile
```

## Przepływ menedżera agentów

1. PM definiuje dekompozycję zadań
2. Agenci domenowi wykonują zadania równolegle
3. Postęp jest strumieniowany do pamięci Serena
4. QA waliduje spójność na poziomie systemu

## Pliki uruchomieniowe Serena

- `orchestrator-session.md`
- `task-board.md`
- `progress-{agent}.md`
- `result-{agent}.md`
