---
title: Projektstruktur
description: Aktualisierter Verzeichnisbaum nach Trennung der CLI- und Web-Docs-Workspaces.
---

# Projektstruktur

Detaillierter Verzeichnisbaum für dieses Repository.

```text
.
├── .agents/
│   ├── config/
│   │   └── user-preferences.yaml   # Sprache, Zeitzone, CLI-Mapping
│   ├── workflows/
│   │   ├── brainstorm.md           # /brainstorm (Design-First-Ideenfindung)
│   │   ├── coordinate.md           # /coordinate (Multi-Agent-Orchestrierung via UI)
│   │   ├── debug.md                # /debug (strukturierte Bug-Behebung)
│   │   ├── deepinit.md             # /deepinit (Projekt-Harness-Initialisierung)
│   │   ├── exec-plan.md            # /exec-plan (Ausführungsplan-Management)
│   │   ├── orchestrate.md          # /orchestrate (automatisierte CLI-parallele Ausführung)
│   │   ├── plan.md                 # /plan (PM Task-Zerlegung)
│   │   ├── review.md               # /review (vollständige QA-Pipeline)
│   │   ├── setup.md                # /setup (CLI & MCP-Konfiguration)
│   │   ├── tools.md                # /tools (MCP-Tool-Management)
│   │   └── ultrawork.md            # /ultrawork (5-Phasen-Entwicklung)
│   └── skills/
│       ├── _shared/                    # Gemeinsame Ressourcen (kein Skill)
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
│       ├── oma-brainstorm/                 # Design-First-Ideenfindung
│       ├── oma-commit/                     # Conventional Commits Skill
│       ├── oma-db/                   # Datenbankmodellierung & Query-Tuning
│       ├── oma-debug/                # Bug-Behebung
│       ├── oma-dev-workflow/               # Entwickler-Workflow-Optimierung
│       ├── oma-frontend/             # React/Next.js
│       ├── oma-mobile/               # Flutter
│       ├── oma-orchestrator/               # CLI-basierter Sub-Agent-Spawner
│       ├── oma-pm/                   # Produktmanager
│       ├── oma-qa/                   # Sicherheit & QA
│       ├── oma-tf-infra/             # Terraform IaC
│       ├── oma-translator/                 # Mehrsprachige Übersetzung
│       └── oma-coordination/             # Multi-Agent-Koordination
│       # Jeder Skill hat:
│       #   SKILL.md              (~40 Zeilen, token-optimiert)
│       #   resources/
│       #     ├── execution-protocol.md  (Chain-of-Thought-Schritte)
│       #     ├── examples.md            (Few-Shot Ein-/Ausgabe)
│       #     ├── checklist.md           (Selbst-Verifikation)
│       #     ├── error-playbook.md      (Fehlerwiederherstellung)
│       #     ├── tech-stack.md          (detaillierte Tech-Specs)
│       #     └── snippets.md            (Copy-Paste-Patterns)
├── .serena/
│   └── memories/                   # Laufzeit-Status (gitignored)
├── package.json
├── docs/
│   ├── USAGE.md                    # Detaillierte Verwendungsanleitung (Englisch)
│   ├── USAGE.ko.md                 # Detaillierte Verwendungsanleitung (Koreanisch)
│   ├── USAGE.de.md                 # Detaillierte Verwendungsanleitung (Deutsch)
│   ├── project-structure.md        # Vollständige Strukturreferenz (Englisch)
│   ├── project-structure.ko.md     # Vollständige Strukturreferenz (Koreanisch)
│   └── project-structure.de.md     # Vollständige Strukturreferenz (Deutsch)
├── README.md                       # Projektübersicht (Englisch)
├── README.ko.md                    # Projektübersicht (Koreanisch)
└── README.de.md                    # Projektübersicht (Deutsch)
```
