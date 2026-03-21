---
title: Struktura Projektu
description: Zaktualizowane drzewo katalogów po rozdzieleniu workspace CLI i dokumentacji web.
---

# Struktura projektu

Szczegółowe drzewo katalogów dla tego repozytorium.

```text
.
├── .agents/
│   ├── config/
│   │   └── user-preferences.yaml   # Język, strefa czasowa, mapowanie CLI
│   ├── workflows/
│   │   ├── brainstorm.md           # /brainstorm (ideacja i eksploracja koncepcji)
│   │   ├── coordinate.md           # /coordinate (orkiestracja multi-agentowa przez UI)
│   │   ├── deepinit.md             # /deepinit (głęboka inicjalizacja projektu)
│   │   ├── exec-plan.md            # /exec-plan (zarządzanie planem wykonania)
│   │   ├── orchestrate.md          # /orchestrate (automatyczne równoległe wykonywanie przez CLI)
│   │   ├── plan.md                 # /plan (dekompozycja zadań PM)
│   │   ├── review.md               # /review (pełny pipeline QA)
│   │   ├── debug.md                # /debug (strukturalne naprawianie błędów)
│   │   ├── setup.md                # /setup (konfiguracja CLI i MCP)
│   │   ├── tools.md                # /tools (zarządzanie narzędziami MCP)
│   │   └── ultrawork.md            # /ultrawork (maksymalna równoległość z bramkami fazowymi)
│   └── skills/
│       ├── _shared/                    # Wspólne zasoby (nie jest umiejętnością)
│       │   ├── serena-memory-protocol.md
│       │   ├── common-checklist.md
│       │   ├── skill-routing.md
│       │   ├── context-loading.md
│       │   ├── context-budget.md
│       │   ├── reasoning-templates.md
│       │   ├── clarification-protocol.md
│       │   ├── difficulty-guide.md
│       │   ├── lessons-learned.md
│       │   ├── verify.sh
│       │   └── api-contracts/
│       ├── oma-backend/              # FastAPI
│       ├── oma-brainstorm/                 # Ideacja i eksploracja koncepcji
│       ├── oma-commit/                     # Umiejętność conventional commits
│       ├── oma-db/                   # Modelowanie baz danych i optymalizacja
│       ├── oma-debug/                # Naprawianie błędów
│       ├── oma-dev-workflow/               # CI/CD i optymalizacja przepływu pracy
│       ├── oma-frontend/             # React/Next.js
│       ├── oma-mobile/               # Flutter
│       ├── oma-orchestrator/               # Uruchamiacz pod-agentów przez CLI
│       ├── oma-pm/                   # Product manager
│       ├── oma-qa/                   # Bezpieczeństwo i QA
│       ├── oma-tf-infra/             # Terraform i infrastruktura jako kod
│       ├── oma-translator/                 # Tłumaczenie wielojęzyczne
│       └── oma-coordination/             # Koordynacja multi-agentowa
│       # Każda umiejętność ma:
│       #   SKILL.md              (~40 linii, zoptymalizowany tokenowo)
│       #   resources/
│       #     ├── execution-protocol.md  (kroki chain-of-thought)
│       #     ├── examples.md            (few-shot wejście/wyjście)
│       #     ├── checklist.md           (samoweryfikacja)
│       #     ├── error-playbook.md      (odzyskiwanie po awarii)
│       #     ├── tech-stack.md          (szczegółowe specyfikacje techniczne)
│       #     └── snippets.md            (wzorce kopiuj-wklej)
├── .serena/
│   └── memories/                   # Stan runtime (ignorowany przez git)
├── package.json
├── docs/
│   ├── USAGE.md                    # Szczegółowy przewodnik użycia (angielski)
│   ├── USAGE.ko.md                 # Szczegółowy przewodnik użycia (koreański)
│   ├── project-structure.md        # Pełne odniesienie do struktury (angielski)
│   └── project-structure.ko.md     # Pełne odniesienie do struktury (koreański)
├── README.md                       # Ten plik (angielski)
└── README.ko.md                    # Przewodnik koreański
```
